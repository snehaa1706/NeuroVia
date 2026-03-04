from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DoctorProfile(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    specialization: str
    hospital: Optional[str] = None
    experience_years: Optional[int] = None
    available: bool = True


class ConsultRequest(BaseModel):
    doctor_id: str
    screening_id: Optional[str] = None
    message: Optional[str] = None


class ConsultRequestResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    screening_id: Optional[str] = None
    summary: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
