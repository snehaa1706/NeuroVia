import json
from fastapi import HTTPException
from app.database import get_supabase
from app.models.user import UserRegister, UserLogin, UserProfile, UserProfileUpdate

DEMO_EMAIL = "demo@neurovia.health"
DEMO_PASSWORD = "Neurovia@Demo2024"
DEMO_NAME = "Demo User"

async def register_user(user_data: UserRegister) -> dict:
    sb = get_supabase()
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

    return {
        "access_token": auth_response.session.access_token if auth_response.session else "",
        "user": profile,
    }

async def login_user(credentials: UserLogin) -> dict:
    sb = get_supabase()
    try:
        auth_response = sb.auth.sign_in_with_password(
            {"email": credentials.email, "password": credentials.password}
        )

        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch user profile from users table
        result = sb.table("users").select("*").eq("id", auth_response.user.id).single().execute()
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

        return {
            "access_token": auth_response.session.access_token,
            "user": profile,
        }
    except Exception as e:
        err_msg = str(e).lower()
        if "email" in err_msg and "confirm" in err_msg:
            raise HTTPException(status_code=401, detail="Please confirm your email address before logging in. Check your inbox.")
        raise HTTPException(status_code=401, detail="Invalid credentials. Please check your email and password.")

async def update_user_profile(user_id: str, update_data: UserProfileUpdate) -> UserProfile:
    sb = get_supabase()
    try:
        update_dict = update_data.model_dump(exclude_none=True)
        if "date_of_birth" in update_dict:
            update_dict["date_of_birth"] = str(update_dict["date_of_birth"])

        result = sb.table("users").update(update_dict).eq("id", user_id).execute()
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def handle_demo_login() -> dict:
    sb = get_supabase()
    auth_response = None

    # Step 1: Always try sign-in first
    try:
        auth_response = sb.auth.sign_in_with_password({"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    except Exception:
        auth_response = None

    # Step 2: If sign-in failed, attempt sign-up
    if not auth_response or not auth_response.session:
        try:
            signup_response = sb.auth.sign_up({
                "email": DEMO_EMAIL,
                "password": DEMO_PASSWORD,
                "options": {"data": {"full_name": DEMO_NAME, "role": "patient"}},
            })
            if signup_response.user:
                try:
                    sb.table("users").insert({
                        "id": signup_response.user.id,
                        "email": DEMO_EMAIL,
                        "full_name": DEMO_NAME,
                        "role": "patient",
                    }).execute()
                except Exception:
                    pass
                try:
                    auth_response = sb.auth.sign_in_with_password({"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
                except Exception:
                    pass
        except Exception as signup_err:
            err_lower = str(signup_err).lower()
            if "already" in err_lower or "registered" in err_lower or "exists" in err_lower:
                try:
                    auth_response = sb.auth.sign_in_with_password({"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
                except Exception:
                    raise HTTPException(status_code=401, detail="Demo account exists but login failed.")
            elif "security" in err_lower or "rate" in err_lower or "seconds" in err_lower:
                try:
                    auth_response = sb.auth.sign_in_with_password({"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
                except Exception:
                    raise HTTPException(status_code=429, detail="Demo is being set up. Please wait 30 seconds.")
            else:
                raise HTTPException(status_code=400, detail=f"Demo setup failed: {str(signup_err)}")

    if not auth_response or not auth_response.session:
        raise HTTPException(status_code=400, detail="Demo requires email confirmation to be DISABLED in Supabase.")

    try:
        result = sb.table("users").select("*").eq("id", auth_response.user.id).single().execute()
        user_data = result.data
    except Exception:
        user_data = {
            "id": auth_response.user.id,
            "email": DEMO_EMAIL,
            "full_name": DEMO_NAME,
            "role": "patient",
        }

    profile = UserProfile(
        id=user_data["id"],
        email=user_data.get("email", DEMO_EMAIL),
        full_name=user_data.get("full_name", DEMO_NAME),
        role=user_data.get("role", "patient"),
        phone=user_data.get("phone"),
        date_of_birth=user_data.get("date_of_birth"),
        avatar_url=user_data.get("avatar_url"),
        created_at=user_data.get("created_at"),
    )

    return {
        "access_token": auth_response.session.access_token,
        "user": profile,
    }
