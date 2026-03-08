from fastapi import Depends, HTTPException
from app.security import get_token_from_header, verify_supabase_token
from app.database import get_supabase

def get_current_user(token: str = Depends(get_token_from_header)):
    """
    Validates the bearer token using Supabase Auth 
    and returns the authenticated user object.
    """
    user = verify_supabase_token(token)
    return user

def get_current_user_profile(user=Depends(get_current_user)):
    """
    Fetches the user's detailed profile (including role) 
    from the public.users PostgreSQL table.
    """
    sb = get_supabase()
    try:
        result = sb.table("users").select("*").eq("id", user.id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User profile not found in database")
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user profile: {str(e)}")

def require_role(allowed_roles: list[str]):
    """Closure that returns a dependency function to check for specific roles."""
    def role_checker(user_profile: dict = Depends(get_current_user_profile)):
        user_role = user_profile.get("role")
        if user_role not in allowed_roles and user_role != "admin":
            raise HTTPException(status_code=403, detail=f"Access denied. Requires one of: {', '.join(allowed_roles)}")
        return user_profile
    return role_checker

require_patient = require_role(["patient"])
require_caregiver = require_role(["caregiver"])
require_doctor = require_role(["doctor"])
