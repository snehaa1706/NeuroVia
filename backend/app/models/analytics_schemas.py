from pydantic import BaseModel, Field
from typing import List, Dict, Any, Union, Optional
from datetime import datetime

class PatientSummary(BaseModel):
    """Aggregated status overview for a patient, heavily used in Doctor Dashboards."""
    risk_score: Optional[int] = None
    adherence: Optional[float] = None
    confusion_trend: Optional[str] = None
    alerts_last_7_days: Optional[int] = None
    status: str = "Stable"

class AnalyticsResponse(BaseModel):
    """Standardized response format wrapping the cached metrics."""
    patient_id: str
    metric_type: str
    computed_at: datetime
    data: Union[List[Dict[str, Any]], Dict[str, Any]]

class DoctorOverviewPatient(BaseModel):
    patient_id: str
    patient_name: str
    metrics: PatientSummary
