from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user, require_patient, require_caregiver
from app.models.cognitive import (
    SessionStartRequest,
    TestSubmissionRequest,
    CognitiveSessionResponse,
    CognitiveResultResponse,
    CognitiveSummaryResponse
)
import app.services.cognitive_service as cognitive_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/start", response_model=CognitiveSessionResponse)
async def start_cognitive_session(
    payload: SessionStartRequest,
    user: dict = Depends(require_patient)
):
    """Start a new cognitive testing session."""
    data = cognitive_service.start_session(user["id"], payload)
    return CognitiveSessionResponse(**data)


@router.post("/{session_id}/submit", response_model=CognitiveResultResponse)
@limiter.limit("10/minute")
async def submit_cognitive_test(
    request: Request,
    session_id: str,
    payload: TestSubmissionRequest,
    user: dict = Depends(require_patient)
):
    """Submit responses to a cognitive test session."""
    data = cognitive_service.submit_test(user["id"], session_id, payload)
    return CognitiveResultResponse(**data)


@router.get("/history", response_model=List[CognitiveResultResponse])
async def get_cognitive_history(
    patient_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Fetch history of cognitive test results."""
    # Enforce patient_id requirement for caregivers
    if user.get("role") == "caregiver":
        if not patient_id:
            raise HTTPException(status_code=400, detail="Caregivers must provide a patient_id query parameter")
        target_id = patient_id
    elif user.get("role") == "patient":
        target_id = user["id"]
    else:
        raise HTTPException(status_code=403, detail="Access denied")
        
    data = cognitive_service.get_cognitive_history(user, target_id)
    return [CognitiveResultResponse(**d) for d in data]


@router.get("/summary", response_model=CognitiveSummaryResponse)
async def get_cognitive_summary(
    patient_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Fetch aggregated insights from cognitive test results."""
    if user.get("role") == "caregiver":
        if not patient_id:
            raise HTTPException(status_code=400, detail="Caregivers must provide a patient_id query parameter")
        target_id = patient_id
        
        # We must re-verify assignment just to be safe as the history endpoint does inside its logic,
        # but here we hit summary directly. Since cognitive_service.compute_cognitive_summary doesn't internally check assignment,
        # we do it here or via get_cognitive_history logic. 
        from app.services.caregiver_service import validate_assignment
        validate_assignment(user["id"], target_id)
        
    elif user.get("role") == "patient":
        target_id = user["id"]
    else:
        raise HTTPException(status_code=403, detail="Access denied")
        
    data = cognitive_service.compute_cognitive_summary(target_id)
    return CognitiveSummaryResponse(**data)
