import logging
from fastapi import HTTPException
from app.database import get_supabase
from app.services import ai_service
from app.models.ai_analysis_schemas import (
    ActivityGenerationRequest,
    CaregiverGuidanceRequest
)

logger = logging.getLogger("ai_analysis_service")

class AIAnalysisService:
    def __init__(self):
        self.sb = get_supabase()

    async def generate_patient_activity(self, user_id: str, request_data: ActivityGenerationRequest) -> dict:
        """
        Context Gathering: Fetch recent screening risk to cap the difficulty.
        Orchestration: Generate the Pydantic Activity model, save to DB, return it.
        """
        try:
            # 1. Context Gathering: Find highest risk score to understand cognitive severity capability
            ai_data = self.sb.table("ai_analyses").select("risk_score").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
            
            severity = "mild"
            if ai_data.data:
                latest_score = ai_data.data[0].get("risk_score", 0)
                if latest_score >= 70:
                    severity = "severe"
                elif latest_score >= 40:
                    severity = "moderate"

            logger.info(f"Generating activity for user {user_id}. Derived Severity: {severity}")

            # 2. Call AI Service Layer (Enforces Pydantic Validation Internally)
            activity_resp = await ai_service.generate_activity(
                activity_type=request_data.activity_type,
                difficulty=request_data.desired_difficulty,
                severity=severity
            )

            # 3. Store Database Result
            # Convert the Pydantic model to a dict for jsonb storage
            responses_json = activity_resp.model_dump()
            
            result = self.sb.table("activities").insert({
                "user_id": user_id,
                "activity_type": request_data.activity_type,
                "difficulty": request_data.desired_difficulty,
                "status": "pending",
                "ai_generated": True
                # In a real app we might store the pure JSONB output in an `ai_data` column or similar.
                # For Phase 6 architecture, just storing the fact that it was generated.
            }).execute()

            # Return the rich Pydantic dict to the router
            return responses_json

        except ai_service.AIProcessingException as e:
             logger.error(f"AI Service Failure: {str(e)}")
             raise HTTPException(status_code=503, detail="Our AI is currently busy. Please try again later.")
        except Exception as e:
             logger.error(f"Activity Gen Failure: {str(e)}")
             raise HTTPException(status_code=500, detail="Failed to generate customized activity")


    async def generate_caregiver_guidance(self, caregiver_id: str, request_data: CaregiverGuidanceRequest) -> dict:
        """
        Context Gathering: Fetch last 5 logs for chronological trajectory.
        Orchestration: Compile string context, trigger prompt, return advice.
        """
        try:
            # 1. Context Gathering
            recent = self.sb.table("caregiver_logs") \
                .select("mood, confusion_level, notes, created_at") \
                .eq("user_id", request_data.patient_id) \
                .order("created_at", desc=True) \
                .limit(5) \
                .execute()

            recent_logs_str = "No recent history available."
            if recent.data:
                log_strings = []
                for idx, log in enumerate(recent.data):
                    log_strings.append(f"[Log {idx+1}] Mood: {log.get('mood')}, Confusion: {log.get('confusion_level')}/10, Notes: {log.get('notes')}")
                recent_logs_str = "\n".join(log_strings)

            logger.info(f"Generating guidance for caregiver {caregiver_id} regarding patient {request_data.patient_id}")

            # 2. Call AI Core
            guidance_resp = await ai_service.generate_caregiver_guidance(
                mood=request_data.mood,
                confusion_level=request_data.confusion_level,
                sleep_hours=request_data.sleep_hours,
                appetite=request_data.appetite,
                notes=request_data.notes,
                recent_logs=recent_logs_str
            )

            # 3. Return to router (No specific DB insertion for the direct advice response mapped out in the plan, usually just displayed on screen)
            return guidance_resp.model_dump()

        except ai_service.AIProcessingException as e:
             logger.error(f"AI Service Failure: {str(e)}")
             raise HTTPException(status_code=503, detail="Our AI is currently busy. Please try again later.")
        except Exception as e:
             logger.error(f"Caregiver Guidance Gen Failure: {str(e)}")
             raise HTTPException(status_code=500, detail="Failed to generate AI guidance")

    async def generate_consultation_summary(self, user_id: str) -> dict:
         """
         Context Gathering: Strip PII, aggregate test arrays, analyze trajectory.
         """
         try:
             # Fetch all AI Analyses
             analyses = self.sb.table("ai_analyses").select("risk_score, risk_level, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
             
             # Fetch core aggregated screenings
             tests = self.sb.table("screening_results").select("test_type, score, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()

             # PII has been stripped (We are only sending raw scores over UUID context)
             
             ai_analyses_str = "None"
             if analyses.data:
                 ai_analyses_str = ", ".join([f"Date: {a['created_at'][:10]} | Score: {a['risk_score']} ({a['risk_level']})" for a in analyses.data])
                 
             tests_str = "None"
             if tests.data:
                 tests_str = ", ".join([f"[{t['test_type']}] Score: {t['score']}" for t in tests.data])

             # Call AI
             summary_resp = await ai_service.generate_consultation_summary(
                 screening_data=tests_str,
                 ai_analysis=ai_analyses_str
             )
             
             # Record request in db
             self.sb.table("consult_requests").insert({
                 "user_id": user_id,
                 "status": "pending",
                 "ai_summary": summary_resp.model_dump()
             }).execute()

             return summary_resp.model_dump()
             
         except ai_service.AIProcessingException as e:
             logger.error(f"AI Service Failure: {str(e)}")
             raise HTTPException(status_code=503, detail="Our AI is currently busy. Please try again later.")
         except Exception as e:
             logger.error(f"Consultation Summary Gen Failure: {str(e)}")
             raise HTTPException(status_code=500, detail="Failed to generate clinical summary")

ai_analysis_service = AIAnalysisService()
