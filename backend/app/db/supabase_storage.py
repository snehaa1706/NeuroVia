from app.database import get_supabase
from typing import Optional

BUCKET_NAME = "clock_drawings"

def _get_path(user_id: str, filename: str) -> str:
    """Namespace all storage operations using user_id to prevent traversal access."""
    return f"{user_id}/{filename}"


def upload_clock_drawing(user_id: str, file_bytes: bytes, filename: str, content_type: str = "image/png") -> Optional[str]:
    """
    Upload an image natively scoping the file path to user_id.
    """
    sb = get_supabase()
    path = _get_path(user_id, filename)
    
    result = sb.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    
    return path


def download_clock_drawing(user_id: str, filename: str) -> Optional[bytes]:
    """
    Download a file from the server strictly scoping to the user_id.
    Useful for local/backend processing by the AI.
    """
    sb = get_supabase()
    path = _get_path(user_id, filename)
    
    result = sb.storage.from_(BUCKET_NAME).download(path)
    return result


def create_signed_url(user_id: str, filename: str, expires_in_seconds: int = 3600) -> Optional[str]:
    """
    Create a signed URL securely referencing a drawing.
    """
    sb = get_supabase()
    path = _get_path(user_id, filename)
    
    result = sb.storage.from_(BUCKET_NAME).create_signed_url(
        path=path,
        expires_in=expires_in_seconds
    )
    
    return result.get("signedURL")
