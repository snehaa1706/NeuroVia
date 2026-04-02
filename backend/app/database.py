"""
Supabase Client — Singleton Pattern

Provides two clients:
- supabase        : Uses anon/publishable key (respects RLS as the authenticated user)
- supabase_admin  : Uses service_role key (bypasses RLS — backend-only operations)

SECURITY:
- Never expose service_role key to frontend
- Always prefer `supabase` (anon) for user-facing queries
- Use `supabase_admin` ONLY for server-side admin operations
"""

from __future__ import annotations

import threading
from supabase import create_client, Client
from app.config import settings


class _SupabaseClientManager:
    """Thread-safe singleton manager for Supabase clients."""

    _instance: _SupabaseClientManager | None = None
    _lock: threading.Lock = threading.Lock()

    _client: Client | None = None
    _admin_client: Client | None = None

    def __new__(cls) -> _SupabaseClientManager:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def client(self) -> Client:
        """Anon/publishable key client — respects RLS."""
        if self._client is None:
            with self._lock:
                if self._client is None:
                    self._client = create_client(
                        settings.SUPABASE_URL, settings.SUPABASE_KEY
                    )
        return self._client

    @property
    def admin_client(self) -> Client:
        """Service role client — bypasses RLS. Backend-only."""
        if self._admin_client is None:
            with self._lock:
                if self._admin_client is None:
                    self._admin_client = create_client(
                        settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY
                    )
        return self._admin_client


# ------------------------------------
# Public accessors (backwards-compatible)
# ------------------------------------

_manager = _SupabaseClientManager()

# These maintain the same interface as the original database.py
supabase: Client = _manager.client
supabase_admin: Client = _manager.admin_client


def get_supabase() -> Client:
    """Get the anon Supabase client (respects RLS)."""
    return _manager.client


def get_supabase_admin() -> Client:
    """Get the service-role Supabase client (bypasses RLS)."""
    return _manager.admin_client
