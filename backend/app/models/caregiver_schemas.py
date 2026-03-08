from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class CaregiverLogSubmitRequest(BaseModel):
    patient_id: str
    log_date: date = Field(default_factory=date.today)
    mood: str = Field(..., description="Observed mood: 'Anxious', 'Calm', 'Agitated', etc.")
    confusion_level: int = Field(..., ge=1, le=10, description="1 (clear) to 10 (highly confused)")
    sleep_hours: float = Field(..., ge=0, le=24, description="Hours slept last night")
    appetite: str = Field(..., description="'Good', 'Fair', 'Poor'")
    notes: Optional[str] = Field("", max_length=1000)

class CaregiverLogResponse(BaseModel):
    id: str
    user_id: str
    caregiver_id: str
    log_date: date
    mood: str
    confusion_level: int
    sleep_hours: float
    appetite: str
    created_at: datetime

class IncidentReportRequest(BaseModel):
    patient_id: str
    incident_type: str = Field(..., description="e.g., 'wandering', 'aggression', 'fall', 'hallucination'")
    description: str = Field(..., max_length=2000)
    severity: str = Field(..., description="'low', 'medium', 'high', 'critical'")

class IncidentResponse(BaseModel):
    id: str
    patient_id: str
    caregiver_id: str
    incident_type: str
    severity: str
    created_at: datetime

class CaregiverAssignmentResponse(BaseModel):
    caregiver_id: str
    patient_id: str
    relationship: str
    created_at: datetime
