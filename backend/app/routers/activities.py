from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.dependencies import get_current_user_profile, require_patient
from app.models.activity_schemas import (
    ActivityInstanceResponse,
    ActivityResultSubmitRequest,
    ActivityResultResponse,
    ActivityHistoryItem
)
from app.services.activity_service import activity_service

router = APIRouter()

@router.get("/pending", response_model=List[ActivityInstanceResponse])
async def get_pending_activities(user: dict = Depends(get_current_user_profile)):
    """Fetch all assigned activities ready to be played."""
    activities = activity_service.get_pending_activities(user["id"])
    return [ActivityInstanceResponse(**a) for a in activities]

@router.post("/generate", response_model=Dict[str, Any])
async def generate_activity(activity_type: str, user: dict = Depends(require_patient)):
    """Request a dynamically tailored AI activity for the patient."""
    # This triggers the async pipeline
    return await activity_service.generate_activity(user["id"], activity_type)

@router.post("/{activity_id}/start", response_model=ActivityInstanceResponse)
async def start_activity(activity_id: str, user: dict = Depends(get_current_user_profile)):
    """Mark an assigned activity as 'in_progress'."""
    activity = activity_service.start_activity(user["id"], activity_id)
    return ActivityInstanceResponse(**activity)

@router.post("/{activity_id}/submit", response_model=ActivityResultResponse)
async def submit_activity(
    activity_id: str, 
    payload: ActivityResultSubmitRequest, 
    user: dict = Depends(get_current_user_profile)
):
    """Submit the user's answers/interactions, evaluate the score, and mark as completed."""
    result = activity_service.submit_activity(
        user["id"], 
        activity_id, 
        responses=payload.responses, 
        time_taken_seconds=payload.time_taken_seconds
    )
    return ActivityResultResponse(
        id=result["id"],
        activity_id=result["id"],
        score=result["score"]
    )

@router.get("/history", response_model=List[ActivityHistoryItem])
async def get_activity_history(user: dict = Depends(get_current_user_profile)):
     """Return completed activity stats for analytics dashboards."""
     # Direct query abstraction for brevity mapping history
     history_data = activity_service.sb.table("activity_results")\
         .select("id as result_id, activity_id, score, time_taken_seconds, completed_at:activities!inner(completed_at), type:activities!inner(type), difficulty:activities!inner(difficulty)")\
         .eq("user_id", user["id"])\
         .order("completed_at", desc=True)\
         .execute().data
         
     history_items = []
     for item in history_data:
         history_items.append(ActivityHistoryItem(
             activity_id=item["activity_id"],
             type=item.get("activities", {}).get("type", "Unknown"),
             difficulty=item.get("activities", {}).get("difficulty", "auto"),
             score=item["score"],
             time_taken_seconds=item["time_taken_seconds"],
             completed_at=item.get("activities", {}).get("completed_at")
         ))
     return history_items
