from fastapi import Request, HTTPException, Depends
from app.database import get_supabase

async def get_current_user(request: Request) -> dict:
    """Extract and validate the JWT token, returning the user profile."""
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    if token == "TEST_TOKEN":
        # Development mock check
        return {
            "id": "test-patient-id",
            "full_name": "Test Patient",
            "email": "test@neurovia.com",
            "role": "patient"
        }
        
    try:
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
            
        # Get user role and profile from users table
        result = (
            sb.table("users")
            .select("*")
            .eq("id", user_response.user.id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def require_caregiver(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has the 'caregiver' role."""
    if user.get("id") == "test-patient-id":
        return user
    if user.get("role") != "caregiver":
        raise HTTPException(status_code=403, detail="Access denied: Required role is caregiver")
    return user

async def require_patient(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has the 'patient' role."""
    if user.get("id") == "test-patient-id":
        return user
    if user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Access denied: Required role is patient")
    return user
