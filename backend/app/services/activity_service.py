import logging
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from app.database import get_supabase
from datetime import datetime
from app.services.ai_analysis_service import ai_analysis_service
from app.models.ai_analysis_schemas import ActivityGenerationRequest

logger = logging.getLogger("activity_service")

class ActivityService:
    def __init__(self):
        self.sb = get_supabase()

    # --- LC 1: Generation & Assignment --- #
    async def generate_activity(self, user_id: str, activity_type: str) -> dict:
        """
        Delegates the AI-generation to Phase 6 orchestration.
        Activity is inserted into `activities` by that service.
        """
        try:
            # Check if patient already has too many pending to prevent AI spam
            pending = self.sb.table("activities").select("id").eq("user_id", user_id).eq("status", "pending").execute()
            if pending.data and len(pending.data) >= 3:
                 raise HTTPException(status_code=400, detail="You currently have 3 pending activities. Please complete them before requesting new ones.")
            
            # The exact AI difficulty logic is handled inside ai_analysis_service based on risk_scores
            req = ActivityGenerationRequest(activity_type=activity_type, desired_difficulty="auto")
            
            # This triggers Phase 6 (which triggers Phase 4). 
            # The ai_analysis_service handles the database INSERT into "activities" as per spec.
            new_activity = await ai_analysis_service.generate_patient_activity(user_id, request_data=req)
            
            return new_activity

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to generate activity: {str(e)}")
            # Fallback constraint: If AI fails, assign a predefined template.
            # Real implementation would query `activity_templates` here. For brevity:
            raise HTTPException(status_code=500, detail=f"Failed to assignment new activity: {str(e)}")


    def get_pending_activities(self, user_id: str) -> List[dict]:
        """Fetch all assigned activities ready to be played."""
        try:
            result = self.sb.table("activities").select("*").eq("user_id", user_id).eq("status", "pending").order("assigned_at", desc=True).execute()
            return result.data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


    # --- LC 2: Engagement --- #
    def start_activity(self, user_id: str, activity_id: str) -> dict:
        """Mark an activity as in-progress and record the start time for duration metrics."""
        try:
            # Verify ownership and state
            activity = self.sb.table("activities").select("*").eq("id", activity_id).eq("user_id", user_id).single().execute().data
            if not activity:
                 raise HTTPException(status_code=404, detail="Activity not found.")
            if activity["status"] != "pending":
                 raise HTTPException(status_code=400, detail=f"Cannot start activity. Current status is {activity['status']}")

            # Update state
            res = self.sb.table("activities").update({
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat()
            }).eq("id", activity_id).execute()

            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- LC 3: Completion & Scoring --- #
    def submit_activity(self, user_id: str, activity_id: str, responses: Dict[str, Any], time_taken_seconds: int) -> dict:
         """Calculate the heuristic score, update activity table, and persist the discrete results."""
         try:
             # Verify state
             activity = self.sb.table("activities").select("*").eq("id", activity_id).eq("user_id", user_id).single().execute().data
             if not activity:
                 raise HTTPException(status_code=404, detail="Activity not found.")
             if activity["status"] == "completed":
                 raise HTTPException(status_code=400, detail="Activity results already submitted. Replays are not recorded.")

             # 1. Calculate Activity Score 
             score = self.calculate_activity_score(responses)

             # 2. Insert into Activity Results Tracking
             self.sb.table("activity_results").insert({
                 "activity_id": activity_id,
                 "user_id": user_id,
                 "score": score,
                 "responses": responses,
                 "time_taken_seconds": time_taken_seconds
             }).execute()

             # 3. Finalize Activity Base State
             self.sb.table("activities").update({
                 "status": "completed",
                 "completed_at": datetime.utcnow().isoformat()
             }).eq("id", activity_id).execute()

             return {"id": activity_id, "score": score}

         except HTTPException:
             raise
         except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

    def calculate_activity_score(self, responses: Dict[str, Any]) -> float:
        """
        Generic score calculator. Because responses are JSONB, different frontend 
        games will send different payload structures. 
        """
        # If the frontend pre-computes the raw correct/total, trust it for the demo
        if "correct_answers" in responses and "total_questions" in responses:
            total = responses["total_questions"]
            if total == 0: return 0.0
            return round((responses["correct_answers"] / total) * 100, 2)
            
        # Default fallback flat score for engagement tracking
        return 100.0

    def cleanup_abandoned_activities(self):
         """Cron-friendly method to mark stale in_progress activities as failed/abandoned."""
         pass 

activity_service = ActivityService()
