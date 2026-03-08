from fastapi import APIRouter, Request, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.user import (
    UserRegister,
    UserLogin,
    UserProfile,
    UserProfileUpdate,
    AuthResponse,
)
from app.services import auth_service
from app.dependencies import get_current_user_profile

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/register", response_model=AuthResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister):
    """Register a new user."""
    return await auth_service.register_user(user_data)

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    """Login user."""
    return await auth_service.login_user(credentials)

@router.get("/me", response_model=UserProfile)
async def get_me(user_profile: dict = Depends(get_current_user_profile)):
    """Get current authenticated user profile."""
    return user_profile

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    update_data: UserProfileUpdate, 
    user_profile: dict = Depends(get_current_user_profile)
):
    """Update user profile."""
    return await auth_service.update_user_profile(user_profile['id'], update_data)

@router.post("/demo", response_model=AuthResponse)
async def demo_login():
    """One-click demo login."""
    return await auth_service.handle_demo_login()
