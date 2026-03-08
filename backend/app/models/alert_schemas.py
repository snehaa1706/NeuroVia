from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AlertEventRequest(BaseModel):
    """Internal schema utilized by other modules to emit an event to the Alert Engine."""
    patient_id: str
    event_type: str = Field(..., description="'confusion_logged', 'sleep_logged', 'medication_missed', 'risk_score_generated', 'behavioral_incident'")
    source_module: str = Field(..., description="'caregiver_service', 'medication_service', 'ai_analysis_service'")
    payload: Dict[str, Any] = Field(..., description="The contextual data to evaluate (e.g., {'confusion_level': 9})")

class AlertResponse(BaseModel):
    id: str
    user_id: str
    type: str
    severity: str
    message: str
    source_module: str
    is_read: bool
    created_at: datetime
    # Optionally map metadata if needed by frontend
    metadata: Optional[Dict[str, Any]] = None

class AlertAcknowledgeRequest(BaseModel):
    is_read: bool = True
