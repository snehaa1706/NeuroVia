from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class DataPoint(BaseModel):
    date: str
    score: float

class CognitiveTrendResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    screening_scores: List[DataPoint]
    ai_risk_scores: List[DataPoint]
    last_computed: datetime

class ActivityTrendResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    daily_engagement_minutes: List[DataPoint]
    average_success_rate: List[DataPoint]
    last_computed: datetime

class CaregiverObservationTrendResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    confusion_levels: List[DataPoint]
    sleep_hours: List[DataPoint]
    last_computed: datetime

class MedicationAdherenceTrendResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    daily_adherence_percent: List[DataPoint]
    last_computed: datetime

class AlertFrequencyResponse(BaseModel):
    patient_id: str
    timeframe_days: int
    critical_alerts: List[DataPoint]
    warning_alerts: List[DataPoint]
    last_computed: datetime

class DoctorPatientOverview(BaseModel):
    patient_id: str
    full_name: str
    status_indicator: str  # 'Stable', 'Declining', 'Critical'
    recent_critical_alerts: int
    last_cognitive_score: Optional[float]
