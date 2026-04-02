import sys
import os
import uuid
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.database import supabase_admin

doctors_mock = [
    {
        "name": "Dr. Sarah Jenkins",
        "specialization": "Neurologist",
        "experience_years": 12
    },
    {
        "name": "Dr. Michael Chen",
        "specialization": "Cardiologist",
        "experience_years": 20
    },
    {
        "name": "Dr. Emily Carter",
        "specialization": "General Physician",
        "experience_years": 5
    },
    {
        "name": "Dr. James Rodriguez",
        "specialization": "Psychiatrist",
        "experience_years": 15
    },
    {
        "name": "Dr. Aisha Patel",
        "specialization": "Dermatologist",
        "experience_years": 8
    }
]

inserted_doctors = 0

for doc in doctors_mock:
    # 1. Insert user
    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "email": f"{doc['name'].replace(' ', '').replace('.', '').lower()}_{str(uuid.uuid4())[:6]}@neurovia.com",
        "full_name": doc["name"],
        "role": "doctor"
    }
    supabase_admin.table("users").insert(user_data).execute()

    # 2. Insert doctor
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "user_id": user_id,
        "specialization": doc["specialization"],
        "experience_years": doc["experience_years"],
        "hospital": "NeuroVia General"
    }
    supabase_admin.table("doctors").insert(doc_data).execute()
    inserted_doctors += 1

print(f"Inserted {inserted_doctors} doctors successfully.")
