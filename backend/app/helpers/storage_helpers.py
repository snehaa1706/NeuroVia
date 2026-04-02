"""
Storage Helper Functions — Supabase Storage (Private Bucket)

Handles secure file upload/download for medical assets
(e.g., clock drawing images for AI processing).

SECURITY:
- Uses private bucket — files NOT publicly accessible
- Upload/download via service_role client (backend-only)
- Signed URLs have configurable expiry (default: 1 hour)
- Never expose raw storage paths to the client
"""

from __future__ import annotations

import uuid
from typing import Optional
from fastapi import HTTPException, UploadFile
from app.database import get_supabase_admin


# Default bucket for medical assets
PRIVATE_BUCKET = "medical-assets"


# ============================================
# UPLOAD
# ============================================

async def upload_file(
    file: UploadFile,
    *,
    user_id: str,
    folder: str = "clock-drawings",
    bucket: str = PRIVATE_BUCKET,
) -> dict[str, str]:
    """
    Upload a file to private Supabase Storage.

    Files are stored under: {folder}/{user_id}/{unique_filename}
    This ensures user isolation and prevents filename collisions.

    Args:
        file:    FastAPI UploadFile from request.
        user_id: Authenticated user's ID (for path isolation).
        folder:  Subfolder within the bucket.
        bucket:  Storage bucket name.

    Returns:
        {"path": "folder/user_id/filename", "filename": "original_name"}

    Raises:
        HTTPException 400 if file is empty.
        HTTPException 500 on upload failure.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    # Generate unique filename to prevent collisions
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    storage_path = f"{folder}/{user_id}/{unique_name}"

    sb_admin = get_supabase_admin()
    try:
        sb_admin.storage.from_(bucket).upload(
            path=storage_path,
            file=contents,
            file_options={
                "content-type": file.content_type or "image/png",
                "upsert": "false",
            },
        )
        return {
            "path": storage_path,
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ============================================
# DOWNLOAD (for backend AI processing)
# ============================================

def download_file(
    storage_path: str,
    *,
    bucket: str = PRIVATE_BUCKET,
) -> bytes:
    """
    Download a file from private storage for backend processing.

    Used by AI services to read clock drawing images for analysis.

    Args:
        storage_path: Full path within the bucket (e.g. "clock-drawings/user_id/file.png").
        bucket:       Storage bucket name.

    Returns:
        Raw file bytes.

    Raises:
        HTTPException 404 if file not found.
        HTTPException 500 on download failure.
    """
    sb_admin = get_supabase_admin()
    try:
        data = sb_admin.storage.from_(bucket).download(storage_path)
        if not data:
            raise HTTPException(status_code=404, detail="File not found in storage")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


# ============================================
# SIGNED URL (time-limited access)
# ============================================

def create_signed_url(
    storage_path: str,
    *,
    expires_in: int = 3600,
    bucket: str = PRIVATE_BUCKET,
) -> Optional[str]:
    """
    Generate a time-limited signed URL for a private file.

    Useful when the backend needs to pass a temporary download
    link (e.g., to a doctor viewing a clock drawing in the UI).

    Args:
        storage_path: Full path within the bucket.
        expires_in:   Seconds until the URL expires (default: 1 hour).
        bucket:       Storage bucket name.

    Returns:
        Signed URL string, or None on failure.
    """
    sb_admin = get_supabase_admin()
    try:
        result = sb_admin.storage.from_(bucket).create_signed_url(
            storage_path, expires_in
        )
        return result.get("signedURL") or result.get("signedUrl")
    except Exception:
        return None


# ============================================
# DELETE
# ============================================

def delete_file(
    storage_path: str,
    *,
    bucket: str = PRIVATE_BUCKET,
) -> bool:
    """
    Delete a file from storage.

    Args:
        storage_path: Full path within the bucket.
        bucket:       Storage bucket name.

    Returns:
        True if deleted successfully.
    """
    sb_admin = get_supabase_admin()
    try:
        sb_admin.storage.from_(bucket).remove([storage_path])
        return True
    except Exception:
        return False
