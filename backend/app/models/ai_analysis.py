from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class RiskLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"


class AIAnalysisRequest(BaseModel):
    screening_id: str


class AIAnalysisResponse(BaseModel):
    id: str
    screening_id: str
    risk_level: RiskLevel
    risk_score: float
    interpretation: str
    recommendations: list[str]
    created_at: Optional[datetime] = None


class ActivityGenerationRequest(BaseModel):
    patient_id: str
    activity_type: Optional[str] = None
    difficulty: Optional[str] = "easy"


class CaregiverGuidanceRequest(BaseModel):
    caregiver_log_id: str
    patient_id: str


class CaregiverGuidanceResponse(BaseModel):
    assessment: str
    care_strategies: list[str]
    warning_signs: list[str]
    suggested_activities: list[str]


class ConsultationSummaryRequest(BaseModel):
    patient_id: str
    screening_id: str


class ConsultationSummaryResponse(BaseModel):
    summary: str
    key_symptoms: list[str]
    cognitive_scores: dict
    suggested_diagnostics: list[str]
    questions_for_doctor: list[str]
