from typing import Dict, Any, Tuple
from fastapi import HTTPException
from app.services.db_service import AssessmentDBService

class FlowController:
    """
    Enforces atomic transitions, state validation, and anti-skip mechanics securely.
    """

    @staticmethod
    def validate_state(assessment: Dict[str, Any], request_level: int, user_id: str) -> None:
        """
        Core Security: Prevents duplicate submissions and bypassing sequence.
        """
        if str(assessment.get("user_id")) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this assessment")

        if assessment.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Assessment is already completed")

        db_level_map = {"scd": 1, "mci": 2, "dementia": 3}
        current_step = db_level_map.get(assessment.get("level", "scd"), 1)

        if current_step != request_level:
            raise HTTPException(status_code=400, detail=f"Expected level {current_step}, got request for {request_level}")

    @staticmethod
    def process_transition(assessment_id: str, user_id: str, level: int, cognitive_score: float, risk_band: str) -> Tuple[str, str]:
        """
        Determines if the flow should stop based dynamically on the engine's assessment.
        Returns: (new_status, next_step)
        """
        if level == 1:
            # Always proceed to the next level for full linear flow, irrespective of score.
            status = "in_progress"
            next_level = 2
            next_step = "LEVEL2"
        elif level == 2:
            # Likewise, proceed to level 3 irrespective of risk band
            status = "in_progress"
            next_level = 3
            next_step = "LEVEL3"
        else: # level 3
            status = "completed"
            next_level = 3
            next_step = "COMPLETE"

        # Update Database Atomically via Service wrapper
        AssessmentDBService.update_assessment_status(assessment_id, user_id, status, next_level)
        
        return status, next_step
