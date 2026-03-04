from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class AlertType(str, Enum):
    medication_missed = "medication_missed"
    confusion_spike = "confusion_spike"
    score_decline = "score_decline"
    incident = "incident"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertResponse(BaseModel):
    id: str
    patient_id: str
    caregiver_id: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    ai_interpretation: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None
