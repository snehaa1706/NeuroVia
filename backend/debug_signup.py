"""
Minimal script to reproduce the signup 500 error.
Simulates exactly what the /auth/register endpoint does,
with logging to capture the exact exception.
"""
import sys
import traceback

# Add parent dir to path so we can import app modules
sys.path.insert(0, ".")

from app.database import get_supabase
from app.models.user import UserRegister, UserRole, UserProfile, AuthResponse


def test_signup():
    print("=" * 60)
    print("Step 1: Testing Supabase connection...")
    try:
        sb = get_supabase()
        print(f"  [OK] Supabase client created")
    except Exception as e:
        print(f"  [FAIL] FAILED to create Supabase client: {e}")
        traceback.print_exc()
        return

    print()
    print("Step 2: Testing Supabase Auth sign_up()...")
    try:
        auth_response = sb.auth.sign_up({
            "email": "debugtest_" + str(hash("test"))[:6] + "@example.com",
            "password": "password123",
            "options": {
                "data": {
                    "full_name": "Debug Tester",
                    "role": "patient",
                    "phone": None,
                    "date_of_birth": None,
                }
            }
        })
        print(f"  [OK] sign_up() returned successfully")
        print(f"    user: {auth_response.user}")
        print(f"    user.id: {auth_response.user.id if auth_response.user else 'N/A'}")
        print(f"    user.id type: {type(auth_response.user.id) if auth_response.user else 'N/A'}")
        print(f"    session: {auth_response.session}")
        print(f"    session type: {type(auth_response.session)}")
        if auth_response.session:
            print(f"    access_token: {auth_response.session.access_token[:30]}...")
        else:
            print(f"    [WARN] session is None (email confirmation likely enabled)")
    except Exception as e:
        print(f"  [FAIL] sign_up() FAILED: {e}")
        print(f"    Exception type: {type(e).__name__}")
        traceback.print_exc()
        return

    if not auth_response.user:
        print("  [FAIL] No user returned from sign_up()")
        return

    print()
    print("Step 3: Testing users table insert...")
    user_record = {
        "id": str(auth_response.user.id),
        "email": auth_response.user.email,
        "full_name": "Debug Tester",
        "role": "patient",
        "phone": None,
        "date_of_birth": None,
    }
    print(f"  Inserting: {user_record}")
    try:
        result = sb.table("users").insert(user_record).execute()
        print(f"  [OK] Insert succeeded: {result.data}")
    except Exception as e:
        print(f"  [FAIL] Insert FAILED: {e}")
        print(f"    Exception type: {type(e).__name__}")
        traceback.print_exc()
        return

    print()
    print("Step 4: Testing UserProfile construction...")
    try:
        profile = UserProfile(
            id=str(auth_response.user.id),
            email=auth_response.user.email or "debugtest@example.com",
            full_name="Debug Tester",
            role=UserRole.patient,
            phone=None,
            date_of_birth=None,
        )
        print(f"  [OK] UserProfile: {profile}")
    except Exception as e:
        print(f"  [FAIL] UserProfile construction FAILED: {e}")
        traceback.print_exc()
        return

    print()
    print("Step 5: Testing AuthResponse construction...")
    try:
        access_token = auth_response.session.access_token if auth_response.session else ""
        resp = AuthResponse(
            access_token=access_token,
            user=profile,
        )
        print(f"  [OK] AuthResponse: {resp.model_dump()}")
    except Exception as e:
        print(f"  [FAIL] AuthResponse construction FAILED: {e}")
        traceback.print_exc()
        return

    print()
    print("Step 6: Testing JSON serialization (what FastAPI does)...")
    try:
        json_str = resp.model_dump_json()
        print(f"  [OK] JSON serialization OK: {json_str[:200]}...")
    except Exception as e:
        print(f"  [FAIL] JSON serialization FAILED: {e}")
        traceback.print_exc()
        return

    print()
    print("=" * 60)
    print("ALL STEPS PASSED — signup flow works correctly")
    print("=" * 60)


if __name__ == "__main__":
    test_signup()
