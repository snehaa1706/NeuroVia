from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class MedicationCreateRequest(BaseModel):
    user_id: str = Field(..., description="The patient this medication belongs to.")
    name: str = Field(..., description="Name of the medication, e.g., 'Donepezil'")
    dosage: str = Field(..., description="E.g., '5mg'")
    frequency: str = Field(..., description="'once_daily', 'twice_daily', 'as_needed', 'weekly'")
    interval_hours: Optional[int] = Field(None, description="Hours between doses if frequency is interval-based")
    time_of_day: List[str] = Field(default_factory=list, description="['morning', 'afternoon', 'evening', 'night']")
    days_of_week: List[str] = Field(default_factory=list, description="['monday', 'wednesday', ...]")

class MedicationResponse(BaseModel):
    id: str
    user_id: str
    name: str
    dosage: str
    frequency: str
    interval_hours: Optional[int]
    time_of_day: List[str]
    days_of_week: List[str]
    is_active: bool
    created_at: datetime

class MedicationLogSubmitRequest(BaseModel):
    status: str = Field(..., description="'taken', 'missed', 'skipped'")
    scheduled_time: datetime = Field(..., description="When this dose was supposed to be taken")

class MedicationLogResponse(BaseModel):
    id: str
    medication_id: str
    user_id: str
    status: str
    scheduled_time: datetime
    logged_at: datetime
    logged_by: str

class AdherenceResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    adherence_percentage: float
    total_scheduled: int
    total_taken: int
