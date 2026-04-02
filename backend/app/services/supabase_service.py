from typing import Dict, Any, List, Optional
from app.db import supabase_helpers
from app.db import supabase_storage

class SupabaseIntegrationService:
    """
    A service class designated exclusively to act as a secure boundary and access layer
    for Supabase interactions. It forces row-level security through the application
    layer since the underlying service client bypasses native RLS.
    
    Contains NO business logic.
    """

    def __init__(self, user: Dict[str, Any]):
        """
        Initializes the service bounded to a specific user context extracted
        from the verified JWT via FastAPI dependencies.
        """
        if "id" not in user:
            raise ValueError("Invalid user payload: Missing user_id")
        self.user_id: str = user["id"]

    # Database wrappers
    def get_records(self, table: str, limit: int = 100, custom_filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return supabase_helpers.get_records(self.user_id, table, limit, custom_filters)

    def insert_record(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return supabase_helpers.insert_record(self.user_id, table, data)

    def update_record(self, table: str, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return supabase_helpers.update_record_safely(self.user_id, table, record_id, data)

    def delete_record(self, table: str, record_id: str) -> bool:
        return supabase_helpers.delete_record_safely(self.user_id, table, record_id)

    # Storage wrappers
    def upload_drawing(self, file_bytes: bytes, filename: str, content_type: str = "image/png") -> Optional[str]:
        return supabase_storage.upload_clock_drawing(self.user_id, file_bytes, filename, content_type)

    def download_drawing(self, filename: str) -> Optional[bytes]:
        return supabase_storage.download_clock_drawing(self.user_id, filename)

    def get_drawing_url(self, filename: str, expires_in_seconds: int = 3600) -> Optional[str]:
        return supabase_storage.create_signed_url(self.user_id, filename, expires_in_seconds)
