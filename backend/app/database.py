import hashlib
import hmac
import json
import logging
import time
from collections import defaultdict
from uuid import uuid4

from app.config import settings

try:
    from supabase import Client, create_client
    from supabase._sync.client import SupabaseException
except ImportError:
    Client = None
    create_client = None
    SupabaseException = Exception

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dummy auth helpers – used when no real Supabase instance is available
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    """Simple salted hash for dummy auth (NOT production-grade)."""
    salt = "neurovia_dummy_salt"
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _make_token(user_id: str) -> str:
    """Create a simple JWT-like token for the dummy client."""
    import base64
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_data = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400,
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")
    signature = hmac.new(settings.JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{signature}"


def _decode_token(token: str) -> dict | None:
    """Decode the simple JWT-like token and return the payload (or None)."""
    import base64
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = parts[1]
        # re-pad
        payload += "=" * (4 - len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


class _DummyUser:
    """Mimics the Supabase user object returned by auth calls."""
    def __init__(self, id: str, email: str, user_metadata: dict | None = None):
        self.id = id
        self.email = email
        self.user_metadata = user_metadata or {}


class _DummySession:
    """Mimics the Supabase session object."""
    def __init__(self, access_token: str):
        self.access_token = access_token


class _DummyAuthResponse:
    """Mimics the combined auth response from Supabase (user + session)."""
    def __init__(self, user: _DummyUser, session: _DummySession | None):
        self.user = user
        self.session = session


class _DummyUserResponse:
    """Mimics the response from get_user (user only, no session)."""
    def __init__(self, user: _DummyUser | None):
        self.user = user


class DummyAuth:
    """In-memory authentication that mirrors the Supabase auth interface."""

    def __init__(self):
        # email -> {id, email, password_hash, user_metadata}
        self._users: dict[str, dict] = {}

    def sign_up(self, credentials: dict) -> _DummyAuthResponse:
        email = credentials["email"]
        password = credentials["password"]
        options = credentials.get("options", {})
        metadata = options.get("data", {})

        if email in self._users:
            raise Exception("User already registered")

        user_id = str(uuid4())
        self._users[email] = {
            "id": user_id,
            "email": email,
            "password_hash": _hash_password(password),
            "user_metadata": metadata,
        }

        token = _make_token(user_id)
        user = _DummyUser(id=user_id, email=email, user_metadata=metadata)
        session = _DummySession(access_token=token)
        return _DummyAuthResponse(user=user, session=session)

    def sign_in_with_password(self, credentials: dict) -> _DummyAuthResponse:
        email = credentials["email"]
        password = credentials["password"]

        record = self._users.get(email)
        if not record or record["password_hash"] != _hash_password(password):
            raise Exception("Invalid login credentials")

        token = _make_token(record["id"])
        user = _DummyUser(id=record["id"], email=email, user_metadata=record.get("user_metadata", {}))
        session = _DummySession(access_token=token)
        return _DummyAuthResponse(user=user, session=session)

    def get_user(self, token: str) -> _DummyUserResponse:
        payload = _decode_token(token)
        if not payload:
            return _DummyUserResponse(user=None)

        user_id = payload.get("sub")
        # Find user by id
        for record in self._users.values():
            if record["id"] == user_id:
                return _DummyUserResponse(
                    user=_DummyUser(id=record["id"], email=record["email"], user_metadata=record.get("user_metadata", {}))
                )
        return _DummyUserResponse(user=None)


# ---------------------------------------------------------------------------
# Dummy database helpers
# ---------------------------------------------------------------------------

class DummyResponse:
    def __init__(self, data):
        self.data = data


class DummySingleResponse:
    """Wraps a single row (mimics .single().execute())."""
    def __init__(self, data):
        self.data = data


class DummyQuery:
    def __init__(self, table, client):
        self.table = table
        self.client = client
        self.filters = []
        self.insert_payload = None
        self.update_payload = None
        self.upsert_mode = False
        self.order_by = None
        self.limit_n = None
        self._single = False

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def single(self):
        self._single = True
        return self

    def order(self, column, desc=False):
        self.order_by = (column, desc)
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def insert(self, data):
        self.insert_payload = data
        return self

    def upsert(self, data):
        self.insert_payload = data
        self.upsert_mode = True
        return self

    def update(self, data):
        self.update_payload = data
        return self

    def execute(self):
        if self.insert_payload is not None:
            rows = self.client._insert(self.table, self.insert_payload, self.upsert_mode)
            return DummyResponse(rows)
        if self.update_payload is not None:
            rows = self.client._update(self.table, self.filters, self.update_payload)
            if self._single:
                return DummySingleResponse(rows[0] if rows else None)
            return DummyResponse(rows)

        rows = self.client._select(self.table, self.filters, self.order_by, self.limit_n)
        if self._single:
            return DummySingleResponse(rows[0] if rows else None)
        return DummyResponse(rows)


class DummyClient:
    def __init__(self):
        self.tables = defaultdict(list)
        self.auth = DummyAuth()

    def table(self, name):
        return DummyQuery(name, self)

    def _select(self, table, filters, order_by, limit_n):
        rows = list(self.tables[table])
        for key, value in filters:
            rows = [row for row in rows if row.get(key) == value]
        if order_by:
            column, desc = order_by
            rows.sort(key=lambda x: x.get(column, None), reverse=bool(desc))
        if limit_n is not None:
            rows = rows[:limit_n]
        return rows

    def _insert(self, table, payload, upsert=False):
        if isinstance(payload, list):
            rows = []
            for item in payload:
                rows.append(self._insert(table, item, upsert=upsert)[0])
            return rows

        row = dict(payload)
        if not row.get("id"):
            row["id"] = str(uuid4())
        existing = None
        if upsert:
            for i, existing_row in enumerate(self.tables[table]):
                if existing_row.get("id") == row.get("id"):
                    self.tables[table][i] = {**existing_row, **row}
                    existing = self.tables[table][i]
                    break
        if existing is not None:
            return [existing]

        self.tables[table].append(row)
        return [row]

    def _update(self, table, filters, payload):
        rows = self._select(table, filters, None, None)
        updated_rows = []
        for row in rows:
            for key, value in payload.items():
                row[key] = value
            updated_rows.append(row)
        return updated_rows


def _build_dummy_clients():
    dummy = DummyClient()
    return dummy, dummy


def _create_supabase_client(url, key):
    if not create_client or not url or not key:
        raise SupabaseException("Missing Supabase client or credentials")
    return create_client(url, key)


try:
    supabase = _create_supabase_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    supabase_admin = _create_supabase_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
except Exception as exc:
    logger.warning(f"Supabase initialization failed, using dummy local client: {exc}")
    supabase, supabase_admin = _build_dummy_clients()


def get_supabase():
    return supabase


def get_supabase_admin():
    return supabase_admin
