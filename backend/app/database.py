import logging
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


class DummyResponse:
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

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
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
            return DummyResponse(rows)

        rows = self.client._select(self.table, self.filters, self.order_by, self.limit_n)
        return DummyResponse(rows)


class DummyClient:
    def __init__(self):
        self.tables = defaultdict(list)

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
