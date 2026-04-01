import logging
from typing import Dict, Any, List, Optional
from app.database import supabase_admin

logger = logging.getLogger(__name__)

class AssessmentDBService:
    """
    Handles all Supabase Database interactions for Assessments utilizing the Service Role Key.
    CRITICAL: Because the Service Role key bypasses RLS, EVERY SINGLE QUERY must strictly
    filter by `user_id` natively in the Python `.eq()` chain to artificially enforce tenant isolation.
    """

    # --- QUERIES ---

    @staticmethod
    def get_assessment(assessment_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = supabase_admin.table("assessments").select("*").eq("id", assessment_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching assessment: {e}")
            raise e
            
    @staticmethod
    def get_latest_in_progress_assessment(user_id: str) -> Optional[Dict[str, Any]]:
        try:
            res = supabase_admin.table("assessments").select("*").eq("user_id", user_id).eq("status", "in_progress").order("started_at", desc=True).limit(1).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching latest assessment: {e}")
            raise e

    @staticmethod
    def get_assessment_responses(assessment_id: str, user_id: str) -> List[Dict[str, Any]]:
        # Validate ownership via explicit cascade
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            return []
            
        res = supabase_admin.table("assessment_responses").select("*").eq("assessment_id", assessment_id).execute()
        return res.data

    @staticmethod
    def get_assessment_results(assessment_id: str, user_id: str) -> List[Dict[str, Any]]:
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            return []
            
        res = supabase_admin.table("assessment_results").select("*").eq("assessment_id", assessment_id).execute()
        return res.data

    @staticmethod
    def get_recommendations(assessment_id: str, user_id: str) -> List[Dict[str, Any]]:
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            return []
            
        res = supabase_admin.table("ai_analyses").select("*").eq("assessment_id", assessment_id).execute()
        return res.data


    # --- INSERTS ---

    @staticmethod
    def create_assessment(user_id: str, level: int = 1) -> Dict[str, Any]:
        try:
            level_map = {1: "scd", 2: "mci", 3: "dementia"}
            enum_level = level_map.get(level, "scd")
            data = {"user_id": user_id, "level": enum_level, "status": "in_progress"}
            res = supabase_admin.table("assessments").insert(data).execute()
            return res.data[0]
        except Exception as e:
            logger.error(f"Error creating assessment: {e}")
            raise e

    @staticmethod
    def insert_assessment_response(assessment_id: str, user_id: str, level: int, responses: Dict[str, Any]) -> Dict[str, Any]:
        # Ownership validation before inserting foreign-linked data
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            raise ValueError("Unauthorized or assessment not found")

        # Map generic responses directly to the assessment_results table under a bulk test_type
        # since schema.sql lacks a dedicated raw responses table
        test_type_map = {1: "ad8", 2: "verbal_fluency", 3: "clock_drawing"}
        data = {
            "assessment_id": assessment_id, 
            "test_type": test_type_map.get(level, "moca"),
            "responses": responses
        }
        res = supabase_admin.table("assessment_results").insert(data).execute()
        return res.data[0]

    @staticmethod
    def insert_assessment_result(assessment_id: str, user_id: str, test_type: str, cognitive_score: float, risk_score: float) -> Dict[str, Any]:
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            raise ValueError("Unauthorized or assessment not found")

        # Must map to strict DB enum ('ad8', 'orientation', 'verbal_fluency', 'trail_making', 'clock_drawing', 'moca')
        # Note: 'trail_making' is legacy — replaced by digit_span in Phase 8 but enum preserved for backward compat
        enum_map = {"level1": "ad8", "level2": "verbal_fluency", "level3": "clock_drawing"}
        
        data = {
            "assessment_id": assessment_id,
            "test_type": enum_map.get(test_type, "moca"),
            "score": cognitive_score,
            "max_score": 1.0  # Base scoring is normalized out of 1.0
        }

        # NOTE: schema currently has 'score', not 'cognitive_score', so we must write 'score'
        res = supabase_admin.table("assessment_results").insert(data).execute()
        return res.data[0]

    @staticmethod
    def insert_recommendation(assessment_id: str, user_id: str, text: str) -> Dict[str, Any]:
        if not AssessmentDBService.get_assessment(assessment_id, user_id):
            raise ValueError("Unauthorized or assessment not found")
            
        # Recommendations are stored dynamically as arrays inside the ai_analyses table natively
        data = {
            "assessment_id": assessment_id, 
            "recommendations": [{"timestamp": "now", "text": text}],
            "risk_level": "moderate" # Fallback required by schema defaults
        }
        res = supabase_admin.table("ai_analyses").insert(data).execute()
        return res.data[0]


    # --- METADATA HELPERS ---

    @staticmethod
    def get_assessment_metadata(assessment_id: str, user_id: str) -> Dict[str, Any]:
        """Retrieve the structured metadata JSONB for a given assessment. Returns {} if NULL or missing."""
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment:
            return {}
        return assessment.get("metadata") or {}

    @staticmethod
    def update_assessment_metadata(assessment_id: str, user_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Merge-write to the metadata JSONB column. Enforces ownership via user_id filter."""
        try:
            res = supabase_admin.table("assessments").update({"metadata": metadata}).eq("id", assessment_id).eq("user_id", user_id).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error(f"Error updating assessment metadata: {e}")
            raise e

    # --- UPDATES ---

    @staticmethod
    def update_assessment_status(assessment_id: str, user_id: str, status: str, level: int) -> Dict[str, Any]:
        """
        Safely update records incorporating the user_id strictly in the .eq() filter cascade.
        """
        try:
            level_map = {1: "scd", 2: "mci", 3: "dementia"}
            enum_level = level_map.get(level, "scd")
            data = {"status": status, "level": enum_level}
            res = supabase_admin.table("assessments").update(data).eq("id", assessment_id).eq("user_id", user_id).execute()
            return res.data[0]
        except Exception as e:
            logger.error(f"Error updating assessment: {e}")
            raise e
