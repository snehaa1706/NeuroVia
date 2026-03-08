from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user_profile, require_patient, require_caregiver
from app.models.ai_analysis_schemas import (
    ActivityGenerationRequest,
    CaregiverGuidanceRequest,
    ConsultationSummaryRequest
)
from app.services.ai_analysis_service import ai_analysis_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/generate-activity", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def generate_activity(
    request: ActivityGenerationRequest,
    user: dict = Depends(get_current_user_profile)
):
    """Generate a custom cognitive exercise based on the user's recent screening performance."""
    return await ai_analysis_service.generate_patient_activity(user["id"], request)


@router.post("/caregiver-guidance", response_model=Dict[str, Any])
@limiter.limit("5/minute")
async def get_caregiver_guidance(
    request: CaregiverGuidanceRequest,
    user: dict = Depends(require_caregiver)
):
    """Submit a daily log and immediately receive AI-powered tactical advice based on trailing 5-day history."""
    # Ensure caregiver is requesting advice for a patient under their care
    # In a full system, we might query intermediate tables. We trust the frontend ID injection for this demo phase.
    return await ai_analysis_service.generate_caregiver_guidance(user["id"], request)


@router.post("/consultation-summary", response_model=Dict[str, Any])
@limiter.limit("2/minute")
async def request_consultation_summary(
    user: dict = Depends(require_patient)
):
    """Aggregate history and generate a structured clinical summary for physician hand-off."""
    return await ai_analysis_service.generate_consultation_summary(user["id"])
