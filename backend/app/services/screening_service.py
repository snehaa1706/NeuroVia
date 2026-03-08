from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from app.database import get_supabase
from app.screening.tests import ad8
from app.services.ai_service import analyze_screening
from datetime import datetime

class ScreeningService:
    def __init__(self):
        self.sb = get_supabase()

    # --- Core Lifecycle --- #

    def create_session(self, user_id: str) -> dict:
        """Create a new screening session for the user."""
        try:
            result = self.sb.table("screenings").insert({
                "user_id": user_id,
                "status": "in_progress"
            }).execute()
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to create screening session.")
            return result.data[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def validate_session_state(self, screening_id: str, user_id: str):
        """Ensure session exists, belongs to user, and is active."""
        try:
            result = self.sb.table("screenings").select("*").eq("id", screening_id).eq("deleted_at", None).single().execute()
            session = result.data
            
            if not session:
               raise HTTPException(status_code=404, detail="Screening session not found or deleted.")
            if session["user_id"] != user_id:
               raise HTTPException(status_code=403, detail="Unauthorized: Access denied to this screening.")
            if session["status"] != "in_progress":
               raise HTTPException(status_code=400, detail=f"Screening cannot be modified. Status: {session['status']}")
            
            return session
        except HTTPException:
            raise
        except Exception as e:
           raise HTTPException(status_code=400, detail=f"Invalid session access: {str(e)}")

    def record_test_result(self, screening_id: str, user_id: str, test_type: str, responses: Dict[str, Any]) -> dict:
        """Process test answers, score, and store."""
        self.validate_session_state(screening_id, user_id)

        # Dispatcher Pattern for Test Validation & Scoring
        score = None
        if test_type.lower() == "ad8":
            if not ad8.validate_responses(responses):
                raise HTTPException(status_code=422, detail="Invalid AD8 response structure. Requires q1-q8 with Yes/No/N/A.")
            score = ad8.calculate_score(responses)
        else:
            # Flexible JSONB system allows blind recording of arbitrary future tests 
            # without strict python validation out of the gate if necessary, 
            # though validation modules (like ad8.py) are preferred.
            pass

        try:
            result = self.sb.table("screening_results").insert({
                "screening_id": screening_id,
                "user_id": user_id,
                "test_type": test_type,
                "responses": responses,
                "score": score
            }).execute()
            
            return result.data[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def finalize_session(self, screening_id: str, user_id: str):
        """Mark session complete. (Router triggers AI background task immediately after this)."""
        self.validate_session_state(screening_id, user_id)
        
        # Verify they actually submitted tests
        res = self.sb.table("screening_results").select("id").eq("screening_id", screening_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Cannot finalize: No test results have been recorded for this screening.")

        try:
            result = self.sb.table("screenings").update({
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat()
            }).eq("id", screening_id).execute()
            
            return {"status": "success", "message": "Screening finalized and queued for AI analysis"}
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

    # --- Background AI Orchestration --- #

    async def run_ai_analysis_background(self, screening_id: str, user_id: str):
        """
        Background task: fetch all answers, prompt ai_service, save validated Pydantic JSON to ai_analyses.
        Must not raise API HTTP Exceptions (fails silently/logs instead).
        """
        import logging
        logger = logging.getLogger("ai_background_task")
        logger.info(f"Starting background AI analysis for screening {screening_id}")

        try:
            # 1. Gather Context
            session_resp = self.sb.table("screenings").select("status").eq("id", screening_id).single().execute()
            if session_resp.data.get("status") != "completed":
                logger.warning("Screening is not marked completed. Aborting AI analysis.")
                return 

            results_resp = self.sb.table("screening_results").select("*").eq("screening_id", screening_id).execute()
            tests = results_resp.data

            if not tests:
                return

            # Combine all results into a text dump for the LLM
            test_results_dump = []
            for t in tests:
                test_results_dump.append(f"--- Test: {t['test_type']} ---\nRaw Score: {t.get('score')}\nDetailed Responses: {t['responses']}")
            
            formatted_tests = "\n".join(test_results_dump)

            # 2. Call the AI Service Layer
            # We don't have absolute explicit patient severity at this direct juncture 
            # for the `level` prompt param, so we infer "Baseline Evaluation"
            analysis_pydantic = await analyze_screening(level="Baseline Evaluation", test_results=formatted_tests)

            # 3. Save Structured Result
            self.sb.table("ai_analyses").insert({
                "screening_id": screening_id,
                "user_id": user_id,
                "risk_level": analysis_pydantic.risk_level.value,
                "risk_score": analysis_pydantic.risk_score,
                "interpretation": analysis_pydantic.interpretation,
                "recommendations": analysis_pydantic.recommendations,
                "provider": "ai_service_layer" # abstract tracking
            }).execute()

            logger.info(f"Successfully saved AI Analysis for screening {screening_id}")

        except Exception as e:
            logger.error(f"Failed to generate AI analysis for screening {screening_id}: {str(e)}")
            # Real production often stores a failure row in ai_analyses or an error log table here.
            
    # --- Retrievals --- #

    def get_screening_history(self, user_id: str) -> List[dict]:
        try:
            result = self.sb.table("screenings").select("*").eq("user_id", user_id).is_("deleted_at", "null").order('created_at', desc=True).execute()
            history = result.data
            
            # Decorate history quickly with risk scores if they exist
            # Optimization note: in massive dbs this is slow, but perfectly acceptable here
            ai_results = self.sb.table("ai_analyses").select("screening_id, risk_level").eq("user_id", user_id).execute()
            ai_map = {row['screening_id']: row['risk_level'] for row in ai_results.data}
            
            for item in history:
                item['risk_level'] = ai_map.get(item['id'])

            return history
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_screening_results(self, screening_id: str, user_id: str) -> dict:
        try:
            # Ensure ownership
            session = self.sb.table("screenings").select("*").eq("id", screening_id).eq("user_id", user_id).single().execute().data
            if not session:
                 raise HTTPException(status_code=404, detail="Screening not found")

            tests = self.sb.table("screening_results").select("*").eq("screening_id", screening_id).execute().data
            
            ai = self.sb.table("ai_analyses").select("*").eq("screening_id", screening_id).execute().data
            ai_analysis = ai[0] if ai else None

            return {
                "screening_id": session["id"],
                "status": session["status"],
                "started_at": session["started_at"],
                "completed_at": session.get("completed_at"),
                "test_results": tests,
                "ai_analysis": ai_analysis
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

screening_service = ScreeningService()
