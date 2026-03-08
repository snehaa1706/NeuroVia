from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase

security = HTTPBearer()

def get_token_from_header(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Extracts the JWT token from the Authorization header."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials lying")
    return credentials.credentials

def verify_supabase_token(token: str) -> dict:
    """Verifies the token using Supabase's auth api."""
    try:
        # Supabase auth.get_user validates the JWT and returns the user
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token or expired: {str(e)}")
