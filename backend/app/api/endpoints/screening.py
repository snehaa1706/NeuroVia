import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.assessment import Level1Request, Level2Request, Level3Request
from app.services.db_service import AssessmentDBService
from app.services.flow_controller import FlowController
from app.services import scoring
from app.services import risk_engine
from app.services.ai_scoring import evaluate_clock_drawing
from app.services.storage import StorageService

router = APIRouter()
logger = logging.getLogger(__name__)

# Unified Response format requested
class UnifiedScreeningResponse(BaseModel):
    assessment_id: str
    current_level: int
    cognitive_score: float
    risk_score: float
    risk_band: str
    next_step: str
    recommendation: str

@router.post("/start")
async def start_screening(user_id: str = Depends(get_current_user)):
    """Initialize a brand new screening securely"""
    try:
        assessment = AssessmentDBService.create_assessment(user_id=user_id, level=1)
        return {"assessment_id": assessment["id"], "current_level": assessment["level"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resume")
async def resume_screening(user_id: str = Depends(get_current_user)):
    """Fetches any active screening securely for immediate reload"""
    # Pseudo-fetch latest in_progress for user (For MVP we rely on ID logic, but this checks state)
    raise HTTPException(status_code=501, detail="Resume logic requires assessment_id tracking")

@router.post("/{assessment_id}/level1", response_model=UnifiedScreeningResponse)
async def submit_level1(assessment_id: str, request: Level1Request, user_id: str = Depends(get_current_user)):
    try:
        # Atomic unit wrap via pseudo blocks prioritizing error fast-fail
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment: raise HTTPException(status_code=404, detail="Not Found")
        
        FlowController.validate_state(assessment, 1, user_id)

        # Base Constants for Mock matching as MVP
        EXPECTED_O = {"year": "2026", "month": "march", "date": "28", "location": "clinic"}
        BASE_R = ["apple", "penny", "table"]

        # Run Engine
        ad8_vals = [1 if v else 0 for v in request.ad8_answers.values()]
        score_data = await scoring.score_level_1(ad8_vals, request.orientation_answers, EXPECTED_O, request.recall_words, BASE_R)
        cog_score = score_data["normalized_score"]

        risk_data = risk_engine.determine_risk(cog_score)

        # Database Commits (Sequential Atomicity Emulation)
        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 1, request.model_dump())
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level1", cog_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 1, cog_score, risk_data["risk_band"])
        
        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=2 if next_step != "COMPLETE" else 1,
            cognitive_score=cog_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            recommendation=risk_data["recommendation"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Level 1 failed: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.post("/{assessment_id}/level2", response_model=UnifiedScreeningResponse)
async def submit_level2(assessment_id: str, request: Level2Request, user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment: raise HTTPException(status_code=404)
        
        FlowController.validate_state(assessment, 2, user_id)

        BASE_R = ["apple", "penny", "table"]

        score_data = await scoring.score_level_2(
            animals_list=request.animals,
            fluency_category="animals",
            expected_sequence="12345",
            digit_forward=request.digit_span_forward,
            digit_backward=request.digit_span_backward,
            visual_selected=request.visual_recognition_selected,
            vr_targets=["apple"],
            vr_distractors=["banana"],
            pattern_answer=request.pattern_answer,
            expected_pattern="A",
            delayed_recall=request.delayed_recall,
            level1_words=BASE_R
        )
        cog_score = score_data["normalized_score"]

        risk_data = risk_engine.determine_risk(cog_score)

        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 2, request.model_dump())
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level2", cog_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 2, cog_score, risk_data["risk_band"])

        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=3 if next_step != "COMPLETE" else 2,
            cognitive_score=cog_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            recommendation=risk_data["recommendation"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Level 2 failed: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.post("/{assessment_id}/level3", response_model=UnifiedScreeningResponse)
async def submit_level3(assessment_id: str, request: Level3Request, user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment: raise HTTPException(status_code=404)
        
        FlowController.validate_state(assessment, 3, user_id)

        # 1. Image Download & AI Service Bridge
        b64_image = StorageService.download_and_encode_image(request.clock_image_url)
        ai_result = evaluate_clock_drawing(b64_image)
        l3_score = ai_result["normalized_score"]

        # 2. Extract Prior Scores Safely to calculate Final Composite
        # (MVP logic bypasses deep fetch and uses isolated L3 for composite demo, assuming pure composite mapping locally)
        # Using L3 individually to drive the final state as instructed.
        
        risk_data = risk_engine.determine_risk(l3_score)

        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 3, {"clock_url": request.clock_image_url, "ai": ai_result})
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level3", l3_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 3, l3_score, risk_data["risk_band"])

        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=3,
            cognitive_score=l3_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            recommendation=risk_data["recommendation"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Level 3 failed: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed")
