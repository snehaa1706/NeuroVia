import json
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_supabase
from app.models.user import (
    UserRegister,
    UserLogin,
    UserProfile,
    UserProfileUpdate,
    AuthResponse,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister):
    """Register a new user."""
    sb = get_supabase()
    try:
        auth_response = sb.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "full_name": user_data.full_name,
                        "role": user_data.role.value,
                        "phone": user_data.phone,
                        "date_of_birth": str(user_data.date_of_birth) if user_data.date_of_birth else None,
                    }
                },
            }
        )

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Registration failed")

        # Create user record in users table
        user_record = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role.value,
            "phone": user_data.phone,
            "date_of_birth": str(user_data.date_of_birth) if user_data.date_of_birth else None,
        }
        sb.table("users").insert(user_record).execute()

        profile = UserProfile(
            id=auth_response.user.id,
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            phone=user_data.phone,
            date_of_birth=user_data.date_of_birth,
        )

        return AuthResponse(
            access_token=auth_response.session.access_token if auth_response.session else "",
            user=profile,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    """Login user."""
    sb = get_supabase()
    try:
        auth_response = sb.auth.sign_in_with_password(
            {"email": credentials.email, "password": credentials.password}
        )

        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch user profile from users table
        result = (
            sb.table("users")
            .select("*")
            .eq("id", auth_response.user.id)
            .single()
            .execute()
        )
        user_data = result.data

        profile = UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            phone=user_data.get("phone"),
            date_of_birth=user_data.get("date_of_birth"),
            avatar_url=user_data.get("avatar_url"),
            created_at=user_data.get("created_at"),
        )

        return AuthResponse(
            access_token=auth_response.session.access_token,
            user=profile,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me", response_model=UserProfile)
async def get_current_user(request: Request):
    """Get current authenticated user profile."""
    sb = get_supabase()
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "")
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        result = (
            sb.table("users")
            .select("*")
            .eq("id", user_response.user.id)
            .single()
            .execute()
        )
        user_data = result.data

        return UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            phone=user_data.get("phone"),
            date_of_birth=user_data.get("date_of_birth"),
            avatar_url=user_data.get("avatar_url"),
            created_at=user_data.get("created_at"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Not authenticated")


@router.put("/profile", response_model=UserProfile)
async def update_profile(request: Request, update_data: UserProfileUpdate):
    """Update user profile."""
    sb = get_supabase()
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "")
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        update_dict = update_data.model_dump(exclude_none=True)
        if "date_of_birth" in update_dict:
            update_dict["date_of_birth"] = str(update_dict["date_of_birth"])

        result = (
            sb.table("users")
            .update(update_dict)
            .eq("id", user_response.user.id)
            .execute()
        )

        user_data = result.data[0]
        return UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            phone=user_data.get("phone"),
            date_of_birth=user_data.get("date_of_birth"),
            avatar_url=user_data.get("avatar_url"),
            created_at=user_data.get("created_at"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
