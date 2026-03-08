from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class ConsultationCreateRequest(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    notes: Optional[str] = Field(None, description="Optional extra context from the patient/caregiver requesting the consult.")

class ConsultationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="'processing', 'ready', 'scheduled', 'completed', 'cancelled'")
    appointment_time: Optional[datetime] = None

class ClinicalSummary(BaseModel):
    """The structured Pydantic schema enforcing the LLM output for Doctor Review."""
    primary_concerns: List[str]
    cognitive_trend: str
    medication_adherence_summary: str
    caregiver_observations: str
    risk_assessment: str
    suggested_clinical_actions: List[str]
    questions_for_patient: List[str]

class ConsultationResponse(BaseModel):
    id: str
    user_id: str
    doctor_id: Optional[str]
    status: str
    ai_summary: Optional[ClinicalSummary]
    appointment_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime
