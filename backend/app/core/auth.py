from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    
    # 🧪 Frontend Tester Override (DO NOT DEPLOY TO PRODUCTION)
    if token == "dummy_dev_token":
        from app.database import supabase_admin
        temp_uuid = "00000000-0000-0000-0000-000000000000"
        try:
            # Upsert the test user to satisfy Foreign Key constraints safely
            supabase_admin.table("users").upsert({
                "id": temp_uuid,
                "email": "dev_tester@neurovia.local",
                "full_name": "NeuroVia Local Tester",
                "role": "patient"
            }).execute()
        except:
            pass
        return temp_uuid

    try:
        # MVP: HS256 JWT validation using SUPABASE JWT_SECRET
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": False}  # Relaxed for MVP
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
