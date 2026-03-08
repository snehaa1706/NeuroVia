from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List

from app.dependencies import get_current_user_profile
from app.models.screening_schemas import (
    ScreeningStartResponse,
    TestSubmitRequest,
    TestSubmitResponse,
    ScreeningHistoryItem,
    ScreeningResultResponse
)
from app.services.screening_service import screening_service

router = APIRouter()

@router.post("/start", response_model=ScreeningStartResponse)
def start_screening(user: dict = Depends(get_current_user_profile)):
    """Initialize a new cognitive screening session."""
    session_data = screening_service.create_session(user["id"])
    return ScreeningStartResponse(
        id=session_data["id"],
        status=session_data["status"],
        started_at=session_data["started_at"]
    )

@router.post("/{screening_id}/submit-test", response_model=TestSubmitResponse)
def submit_test(
    screening_id: str,
    payload: TestSubmitRequest,
    user: dict = Depends(get_current_user_profile)
):
    """Submit responses for a specific test within an active screening session."""
    result = screening_service.record_test_result(
        screening_id=screening_id,
        user_id=user["id"],
        test_type=payload.test_type,
        responses=payload.responses
    )
    return TestSubmitResponse(
        id=result["id"],
        score=result.get("score")
    )

@router.post("/{screening_id}/finalize")
def finalize_screening(
    screening_id: str, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_profile)
):
    """
    Mark the screening as completed.
    Crucially dispatches the async AI Analysis task to the background queue, 
    allowing the client to render immediately without waiting for LLM inference.
    """
    # 1. Update DB to finalize
    response = screening_service.finalize_session(screening_id, user["id"])
    
    # 2. Add AI job to queue
    background_tasks.add_task(screening_service.run_ai_analysis_background, screening_id, user["id"])
    
    return response

@router.get("/history", response_model=List[ScreeningHistoryItem])
def get_screening_history(user: dict = Depends(get_current_user_profile)):
    """Get the patient's past screening sessions."""
    # Ensure they have permission to view (all users can view their own history)
    history = screening_service.get_screening_history(user["id"])
    return [ScreeningHistoryItem(**item) for item in history]

@router.get("/{screening_id}/results", response_model=ScreeningResultResponse)
def get_screening_results(screening_id: str, user: dict = Depends(get_current_user_profile)):
    """Get the full raw test scores and AI analysis for a specific finished session."""
    results = screening_service.get_screening_results(screening_id, user["id"])
    return ScreeningResultResponse(**results)
