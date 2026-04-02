import requests
import json
import sys

# Attempt a direct POST to the backend API running locally (if it's running)
# Alternatively, I can just use FastAPI TestClient
try:
    from fastapi.testclient import TestClient
    
    # Import app from backend
    sys.path.insert(0, ".")
    from app.main import app

    client = TestClient(app)

    payload = {
        "name": "Testers",
        "email": "test@example.com",
        "password": "password123",
        "role": "Patient"
    }

    res = client.post("/auth/register", json=payload)
    print(f"Status CODE RETURNED: {res.status_code}")
    print(f"Body RETURNED: {res.text}")

except Exception as e:
    print(f"Error testing: {e}")
