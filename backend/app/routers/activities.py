from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.activity import (
    ActivityResponse,
    ActivityResultSubmit,
    ActivityResultResponse,
    FamilyMemberCreate,
    FamilyMemberResponse,
)
from app.services.activity_service import evaluate_activity_result

router = APIRouter()


def _get_user_id(request: Request) -> str:
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    user_response = sb.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_response.user.id


@router.get("/{patient_id}")
async def get_activities(request: Request, patient_id: str):
    """Get cognitive activities for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    result = (
        sb.table("activities")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    return {"activities": result.data}


@router.post("/{activity_id}/submit", response_model=ActivityResultResponse)
async def submit_activity_result(
    request: Request, activity_id: str, data: ActivityResultSubmit
):
    """Submit activity results and get AI feedback."""
    sb = get_supabase()
    _get_user_id(request)

    # Fetch activity
    activity = (
        sb.table("activities")
        .select("*")
        .eq("id", activity_id)
        .single()
        .execute()
    )
    if not activity.data:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Evaluate result
    score, feedback = evaluate_activity_result(
        activity.data.get("content", {}), data.responses
    )

    record = {
        "activity_id": activity_id,
        "responses": data.responses,
        "score": score,
        "ai_feedback": feedback,
    }
    result = sb.table("activity_results").insert(record).execute()
    activity_result = result.data[0]

    return ActivityResultResponse(
        id=activity_result["id"],
        activity_id=activity_result["activity_id"],
        responses=activity_result["responses"],
        score=activity_result["score"],
        ai_feedback=activity_result.get("ai_feedback"),
        completed_at=activity_result.get("completed_at"),
    )


@router.get("/{patient_id}/progress")
async def get_activity_progress(request: Request, patient_id: str):
    """Get activity progress and performance trends."""
    sb = get_supabase()
    _get_user_id(request)

    # Get activities with results
    activities = (
        sb.table("activities")
        .select("*, activity_results(*)")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .execute()
    )

    # Calculate performance stats
    total_activities = len(activities.data) if activities.data else 0
    completed = 0
    total_score = 0
    scores_over_time = []

    for act in (activities.data or []):
        results = act.get("activity_results", [])
        if results:
            completed += 1
            latest_score = results[-1].get("score", 0)
            total_score += latest_score
            scores_over_time.append(
                {
                    "activity_type": act["activity_type"],
                    "score": latest_score,
                    "date": act["created_at"],
                }
            )

    avg_score = total_score / completed if completed > 0 else 0

    return {
        "total_activities": total_activities,
        "completed": completed,
        "average_score": round(avg_score, 1),
        "scores_over_time": scores_over_time,
    }


@router.post("/family-members", response_model=FamilyMemberResponse)
async def add_family_member(request: Request, data: FamilyMemberCreate):
    """Add a family member for photo recognition activities."""
    sb = get_supabase()
    _get_user_id(request)

    record = {
        "patient_id": data.patient_id,
        "name": data.name,
        "relationship": data.relationship,
        "photo_url": data.photo_url,
    }
    result = sb.table("family_members").insert(record).execute()
    member = result.data[0]

    return FamilyMemberResponse(**member)


@router.get("/family-members/{patient_id}")
async def get_family_members(request: Request, patient_id: str):
    """Get family members for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    result = (
        sb.table("family_members")
        .select("*")
        .eq("patient_id", patient_id)
        .execute()
    )

    return {"family_members": result.data}
