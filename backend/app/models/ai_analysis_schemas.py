from pydantic import BaseModel, Field
from typing import List

# Activity Generation Request
class ActivityGenerationRequest(BaseModel):
    activity_type: str = Field(..., description="The type of cognitive domain (e.g., 'memory', 'pattern_recognition')")
    desired_difficulty: str = Field(..., description="Target difficulty ('easy', 'medium', 'hard') based on user preference")

# Caregiver Guidance Request
class CaregiverGuidanceRequest(BaseModel):
    patient_id: str = Field(..., description="The ID of the patient")
    mood: str = Field(..., description="Patient's observed mood today")
    confusion_level: int = Field(..., ge=1, le=10, description="Confusion level from 1 (clear) to 10 (highly confused)")
    sleep_hours: float = Field(..., description="Hours slept last night")
    appetite: str = Field(..., description="Appetite level ('good', 'fair', 'poor')")
    notes: str = Field("", description="Any additional caregiver notes for context")

# Consultation Request 
class ConsultationSummaryRequest(BaseModel):
    # Depending on feature bounds, users might request summary covering specific dates.
    # We will keep it simple and just generate based on all historical context.
    pass
