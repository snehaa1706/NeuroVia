from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_resume():
    # Make a dummy user request
    response = client.get("/screening/resume", headers={"Authorization": "Bearer dummy_dev_token"})
    print("RESUME RESPONSE:", response.json())

if __name__ == "__main__":
    test_resume()
