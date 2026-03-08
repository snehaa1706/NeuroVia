from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional

class RiskLevel(str, Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"

class ScreeningAnalysisResponse(BaseModel):
    risk_level: RiskLevel = Field(..., description="The calculated cognitive risk level: Low, Moderate, or High")
    risk_score: int = Field(..., ge=0, le=100, description="A score from 0 to 100 representing cognitive decline probability")
    interpretation: str = Field(..., description="A short, professional clinical interpretation of the test results")
    recommendations: List[str] = Field(..., description="Actionable next steps or recommendations for the patient/caregiver")

class ActivityGenerationResponse(BaseModel):
    title: str = Field(..., description="The name of the generated cognitive exercise")
    description: str = Field(..., description="Instructions on how to perform the activity")
    difficulty: str = Field(..., description="The difficulty level of the activity")
    steps: List[str] = Field(..., description="Step-by-step instructions for the patient")

class CaregiverGuidanceResponse(BaseModel):
    care_strategies: List[str] = Field(..., description="Immediate practical strategies for the caregiver based on the recent logs")
    warning_signs: List[str] = Field(..., description="Specific symptoms or behaviors the caregiver should watch out for")
    suggested_activities: List[str] = Field(..., description="Gentle activities to improve the patient's current state (e.g., mood, sleep)")
    summary: str = Field(..., description="A brief encouraging summary for the caregiver")

class ConsultationSummaryResponse(BaseModel):
    clinical_summary: str = Field(..., description="A professional summary of the patient's current cognitive trajectory")
    reported_symptoms: List[str] = Field(..., description="Key symptoms identified from recent screenings and logs")
    risk_score: int = Field(..., ge=0, le=100, description="Current overall risk score")
    recommended_tests: List[str] = Field(..., description="Suggested clinical follow-up tests (e.g., MRI, blood work, specific neuropsychological exams)")
