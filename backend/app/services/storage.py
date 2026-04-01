import base64
import logging
from typing import Optional
from app.database import supabase_admin

logger = logging.getLogger(__name__)

BUCKET_NAME = "clock_drawings"

class StorageService:
    """
    Handles all interactions with the Supabase Storage Bucket ('clock_drawings').
    Ensures files are uploaded and downloaded securely using the backend service key.
    """

    @staticmethod
    def upload_clock_drawing(user_id: str, assessment_id: str, file_bytes: bytes, file_ext: str = "png") -> str:
        """
        Uploads an image to the private bucket mapped uniquely to the user.
        Returns the storage relative path.
        """
        try:
            # Secure path composition limiting file collision and enforcing tenant isolation visually
            file_path = f"{user_id}/{assessment_id}_clock.{file_ext}"
            
            # Upsert ensures if they retry the level, it overwrites the old image cleanly
            res = supabase_admin.storage.from_(BUCKET_NAME).upload(
                file_path, 
                file_bytes, 
                file_options={"content-type": f"image/{file_ext}", "upsert": "true"}
            )
            
            return file_path
        except Exception as e:
            logger.error(f"Failed to upload clock drawing to Supabase Storage: {e}")
            raise e

    @staticmethod
    def download_and_encode_image(file_path: str) -> str:
        """
        Downloads a private image strictly via the backend service key and encodes it as Base64 for the AI.
        """
        try:
            response = supabase_admin.storage.from_(BUCKET_NAME).download(file_path)
            
            if not response:
                raise ValueError(f"Failed to download image from path: {file_path}")
                
            base64_img = base64.b64encode(response).decode('utf-8')
            return base64_img
            
        except Exception as e:
            logger.error(f"Storage download failed: {str(e)}")
            raise e

    @staticmethod
    def retrieve_signed_url(file_path: str, user_id: str, expires_in: int = 3600) -> str:
        """
        Creates a temporary signed URL for the frontend or external API to access the private bucket.
        Enforces path validation binding.
        """
        try:
            if not file_path.startswith(f"{user_id}/"):
                raise ValueError("Unauthorized storage access attempt")
                
            res = supabase_admin.storage.from_(BUCKET_NAME).create_signed_url(file_path, expires_in)
            return res.get("signedURL", "")
            
        except Exception as e:
            logger.error(f"Failed generating signed URL: {str(e)}")
            raise e
