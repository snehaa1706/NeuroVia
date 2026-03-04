from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class LogType(str, Enum):
    daily_checkin = "daily_checkin"
    incident = "incident"
    observation = "observation"


class CaregiverCheckin(BaseModel):
    patient_id: str
    mood: str
    confusion_level: int  # 1-10
    sleep_hours: float
    appetite: str  # poor, normal, good
    notes: Optional[str] = None


class CaregiverIncident(BaseModel):
    patient_id: str
    description: str
    severity: Optional[str] = "moderate"
    notes: Optional[str] = None


class CaregiverLogResponse(BaseModel):
    id: str
    caregiver_id: str
    patient_id: str
    log_type: LogType
    mood: Optional[str] = None
    confusion_level: Optional[int] = None
    sleep_hours: Optional[float] = None
    appetite: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
