from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum
from datetime import datetime


class MedicationStatus(str, Enum):
    taken = "taken"
    missed = "missed"
    skipped = "skipped"


class MedicationCreate(BaseModel):
    patient_id: str
    name: str
    dosage: str
    frequency: str
    time_slots: list[str]  # e.g. ["08:00", "20:00"]


class MedicationResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    dosage: str
    frequency: str
    time_slots: list[str]
    active: bool = True


class MedicationLogCreate(BaseModel):
    status: MedicationStatus
    notes: Optional[str] = None


class MedicationLogResponse(BaseModel):
    id: str
    medication_id: str
    taken_at: Optional[datetime] = None
    status: MedicationStatus
    notes: Optional[str] = None
