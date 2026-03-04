import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.screening import (
    ScreeningCreate,
    ScreeningResponse,
    TestSubmission,
    ScreeningResultResponse,
    ScreeningStatus,
)
from app.services.screening_service import calculate_score

router = APIRouter()


def _get_user_id(request: Request) -> str:
    """Extract user ID from auth token."""
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    user_response = sb.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_response.user.id


@router.post("/start", response_model=ScreeningResponse)
async def start_screening(request: Request, data: ScreeningCreate):
    """Start a new screening session."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    record = {
        "user_id": user_id,
        "level": data.level.value,
        "status": ScreeningStatus.in_progress.value,
        "started_at": datetime.utcnow().isoformat(),
    }
    result = sb.table("screenings").insert(record).execute()
    screening = result.data[0]

    return ScreeningResponse(
        id=screening["id"],
        user_id=screening["user_id"],
        level=screening["level"],
        status=screening["status"],
        started_at=screening.get("started_at"),
    )


@router.post("/{screening_id}/submit", response_model=ScreeningResultResponse)
async def submit_test(
    request: Request, screening_id: str, submission: TestSubmission
):
    """Submit test responses for a screening session."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    # Verify screening belongs to user
    screening = (
        sb.table("screenings")
        .select("*")
        .eq("id", screening_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not screening.data:
        raise HTTPException(status_code=404, detail="Screening not found")

    # Calculate score
    score, max_score = calculate_score(submission.test_type, submission.responses)

    record = {
        "screening_id": screening_id,
        "test_type": submission.test_type.value,
        "responses": submission.responses,
        "score": score,
        "max_score": max_score,
    }
    result = sb.table("screening_results").insert(record).execute()
    test_result = result.data[0]

    return ScreeningResultResponse(
        id=test_result["id"],
        screening_id=test_result["screening_id"],
        test_type=test_result["test_type"],
        responses=test_result["responses"],
        score=test_result["score"],
        max_score=test_result["max_score"],
    )


@router.get("/{screening_id}", response_model=ScreeningResponse)
async def get_screening(request: Request, screening_id: str):
    """Get screening details."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    result = (
        sb.table("screenings")
        .select("*")
        .eq("id", screening_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Screening not found")

    s = result.data
    return ScreeningResponse(
        id=s["id"],
        user_id=s["user_id"],
        level=s["level"],
        status=s["status"],
        started_at=s.get("started_at"),
        completed_at=s.get("completed_at"),
    )


@router.get("/history/list")
async def get_screening_history(request: Request):
    """Get user's screening history."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    result = (
        sb.table("screenings")
        .select("*, ai_analyses(*)")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )

    return {"screenings": result.data}


@router.post("/{screening_id}/complete")
async def complete_screening(request: Request, screening_id: str):
    """Mark a screening as completed."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    result = (
        sb.table("screenings")
        .update(
            {
                "status": ScreeningStatus.completed.value,
                "completed_at": datetime.utcnow().isoformat(),
            }
        )
        .eq("id", screening_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Screening not found")

    return {"message": "Screening completed", "screening": result.data[0]}
