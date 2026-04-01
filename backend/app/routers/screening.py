import logging
import random
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
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
from app.services.ai_provider import get_provider
from app.services import test_generator
from app.services.anti_repetition import AntiRepetitionEngine

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================
# METADATA GENERATION UTILITIES (generate-only-if-not-exists)
# All use AntiRepetitionEngine for cross-session deduplication
# ============================================================

def _ensure_level1_metadata(assessment_id: str, user_id: str, local_hour: int = None) -> Dict[str, Any]:
    """Generate Level 1 context (orientation + recall words) ONLY IF NOT EXISTS."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
    changed = False
    
    # Fetch cross-session exclusions
    exclusions = AntiRepetitionEngine.get_exclusion_lists(user_id)

    if not metadata.get("orientation"):
        metadata["orientation"] = {
            "questions": test_generator.generate_orientation_questions(local_hour, pick_count=4),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        changed = True

    if not metadata.get("recall"):
        # Variable word count: 3-5
        word_count = random.choice([3, 4, 5])
        words = test_generator.generate_recall_words(
            count=word_count,
            exclude=exclusions.get("recall_words", [])
        )
        metadata["recall"] = {
            "words": words,
            "word_count": word_count,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        # Track used items
        metadata.setdefault("used", {})
        metadata["used"]["recall_words"] = words
        changed = True

    if changed:
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated L1 metadata for assessment {assessment_id}")

    return metadata


def _ensure_digit_span_metadata(assessment_id: str, user_id: str) -> str:
    """Generate a digit span sequence ONLY IF one does not already exist."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
    exclusions = AntiRepetitionEngine.get_exclusion_lists(user_id)

    if not metadata.get("digit_span"):
        # Variable difficulty: -1, 0, or +1
        difficulty_offset = random.choice([-1, 0, 0, 1])  # Bias toward base
        digit_data = test_generator.generate_digit_span(
            difficulty_offset=difficulty_offset,
            exclude_sequences=exclusions.get("digit_sequences", [])
        )
        metadata["digit_span"] = {
            **digit_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated digit span for assessment {assessment_id}")

    return metadata["digit_span"]["expected"]


def _ensure_visual_recognition_metadata(assessment_id: str, user_id: str) -> Dict[str, Any]:
    """Generate visual recognition data ONLY IF NOT EXISTS."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
    exclusions = AntiRepetitionEngine.get_exclusion_lists(user_id)

    if not metadata.get("visual_recognition"):
        # Variable counts
        target_count = random.choice([3, 4, 5])
        distractor_count = random.choice([2, 3])

        exclude_ids = exclusions.get("visual_objects", [])
        # Also exclude any used in same session
        session_used = metadata.get("used", {}).get("visual_objects", [])
        all_exclude = list(set(exclude_ids + session_used))

        vr_data = test_generator.generate_visual_recognition(
            target_count=target_count,
            distractor_count=distractor_count,
            exclude_ids=all_exclude
        )
        metadata["visual_recognition"] = {
            **vr_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        # Track used objects
        metadata.setdefault("used", {})
        metadata["used"]["visual_objects"] = (
            [t["id"] for t in vr_data["targets"]] +
            [d["id"] for d in vr_data["distractors"]]
        )
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated visual recognition for assessment {assessment_id}")

    return metadata["visual_recognition"]


def _ensure_visual_pattern_metadata(assessment_id: str, user_id: str) -> Dict[str, Any]:
    """Generate visual pattern question ONLY IF NOT EXISTS."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
    exclusions = AntiRepetitionEngine.get_exclusion_lists(user_id)

    if not metadata.get("visual_pattern"):
        exclude_types = exclusions.get("pattern_types", [])
        # Also exclude current session's type if exists
        session_type = metadata.get("used", {}).get("pattern_type")
        if session_type and session_type not in exclude_types:
            exclude_types.append(session_type)

        pattern_data = test_generator.generate_visual_pattern(exclude_types=exclude_types)
        metadata["visual_pattern"] = {
            **pattern_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        metadata.setdefault("used", {})
        metadata["used"]["pattern_type"] = pattern_data["type"]
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated visual pattern for assessment {assessment_id}")

    return metadata["visual_pattern"]


def _ensure_fluency_metadata(assessment_id: str, user_id: str) -> Dict[str, Any]:
    """Generate verbal fluency category ONLY IF NOT EXISTS."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
    exclusions = AntiRepetitionEngine.get_exclusion_lists(user_id)

    if not metadata.get("verbal_fluency"):
        fluency_data = test_generator.generate_fluency_category(
            exclude_categories=exclusions.get("fluency_categories", [])
        )
        metadata["verbal_fluency"] = {
            **fluency_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        metadata.setdefault("used", {})
        metadata["used"]["fluency_category"] = fluency_data["category"]
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated fluency category '{fluency_data['category']}' for assessment {assessment_id}")

    return metadata["verbal_fluency"]


def _ensure_stroop_metadata(assessment_id: str, user_id: str) -> Dict[str, Any]:
    """Generate Stroop Test trials ONLY IF NOT EXISTS."""
    metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)

    if not metadata.get("stroop"):
        stroop_data = test_generator.generate_stroop_trials(
            total=10, incongruent_ratio=0.6, time_limit_ms=3000
        )
        metadata["stroop"] = {
            **stroop_data,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        AssessmentDBService.update_assessment_metadata(assessment_id, user_id, metadata)
        logger.info(f"Generated Stroop trials for assessment {assessment_id}")

    return metadata["stroop"]


# ============================================================
# CONTEXT BUILDERS (strip secrets before sending to frontend)
# ============================================================

def _build_level1_context(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Build level1_context for the frontend. Strips correct answers for orientation."""
    orientation_questions = metadata.get("orientation", {}).get("questions", [])
    safe_questions = []
    for q in orientation_questions:
        safe_q = {"id": q["id"], "label": q["label"], "options": q["options"]}
        safe_questions.append(safe_q)

    return {
        "orientation": {"questions": safe_questions},
        "recall_words": metadata.get("recall", {}).get("words", [])
    }


def _build_level2_context(
    sequence: str,
    vr_data: Dict[str, Any],
    pattern_data: Dict[str, Any],
    fluency_data: Dict[str, Any],
    digit_span_metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Build level2_context. Includes all L2 test data, stripped of correct answers."""
    ctx = {
        "digit_span": {
            "sequence": sequence,
            "display_duration": 4000,
            "length": digit_span_metadata.get("length", len(sequence)) if digit_span_metadata else len(sequence)
        },
        "visual_recognition": {
            "targets": vr_data.get("targets", []),
            "mixed_set": vr_data.get("mixed_set", []),
            "display_duration": vr_data.get("display_duration", 6000)
        },
        "visual_pattern": {
            "type": pattern_data.get("type", ""),
            "instruction": pattern_data.get("instruction", "What comes next?"),
            "sequence": pattern_data.get("sequence", []),
            "options": pattern_data.get("options", {})
            # NOTE: "correct" key is intentionally NOT included
        },
        "verbal_fluency": {
            "category": fluency_data.get("category", "animals"),
            "time_limit_seconds": fluency_data.get("time_limit_seconds", 60),
            "instruction": fluency_data.get("instruction", "Name as many items as you can in 60 seconds.")
        }
    }
    return ctx


def _build_level3_context(stroop_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build level3_context. Stroop colors are sent — user must identify them."""
    return {
        "stroop": {
            "trials": stroop_data.get("trials", []),
            "total": stroop_data.get("total", 10),
            "time_limit_ms": stroop_data.get("time_limit_ms", 3000),
            "color_options": stroop_data.get("color_options", [])
        }
    }


# ============================================================
# RESPONSE MODEL
# ============================================================

class UnifiedScreeningResponse(BaseModel):
    assessment_id: str
    current_level: int
    cognitive_score: float
    risk_score: float
    risk_band: str
    next_step: str
    clinical_recommendation: str
    ai_explanation: Optional[str] = None
    ai_recommendation: Optional[str] = None
    ai_confidence: Optional[str] = None
    method_breakdown: Optional[Dict[str, str]] = None
    level1_context: Optional[Dict[str, Any]] = None
    level2_context: Optional[Dict[str, Any]] = None
    level3_context: Optional[Dict[str, Any]] = None


def _validate_digit_span_input(span_response: Any, field_name: str):
    if getattr(span_response, "dont_remember", False):
        return
    raw_value = getattr(span_response, "response", "")
    if raw_value is None:
        return
    if not isinstance(raw_value, str):
        raise HTTPException(status_code=422, detail=f"{field_name} input must be a string.")
    stripped_value = raw_value.strip()
    if stripped_value and not stripped_value.isdigit():
        raise HTTPException(status_code=422, detail=f"{field_name} input must be numeric.")


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/start")
async def start_screening(user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.create_assessment(user_id=user_id, level=1)
        assessment_id = assessment["id"]

        # Generate Level 1 context (orientation MCQs + recall words)
        metadata = _ensure_level1_metadata(assessment_id, user_id)
        level1_ctx = _build_level1_context(metadata)

        return {
            "assessment_id": assessment_id,
            "current_level": assessment["level"],
            "level1_context": level1_ctx
        }
    except Exception as e:
        logger.error(f"Failed to start screening: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resume")
async def resume_screening(user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.get_latest_in_progress_assessment(user_id)
        if not assessment:
            raise HTTPException(status_code=404, detail="No active assessment found.")

        aid = assessment["id"]
        response = {
            "assessment_id": aid,
            "current_level": assessment["level"],
            "status": assessment["status"]
        }

        # Level 1 resume
        if assessment.get("level") == "scd":
            metadata = _ensure_level1_metadata(aid, user_id)
            response["level1_context"] = _build_level1_context(metadata)

        # Level 2 resume
        if assessment.get("level") == "mci":
            metadata = AssessmentDBService.get_assessment_metadata(aid, user_id)
            sequence = _ensure_digit_span_metadata(aid, user_id)
            vr_data = _ensure_visual_recognition_metadata(aid, user_id)
            pattern_data = _ensure_visual_pattern_metadata(aid, user_id)
            fluency_data = _ensure_fluency_metadata(aid, user_id)
            # Re-fetch metadata to get digit_span length
            metadata = AssessmentDBService.get_assessment_metadata(aid, user_id)
            response["level2_context"] = _build_level2_context(
                sequence, vr_data, pattern_data, fluency_data,
                metadata.get("digit_span", {})
            )

        # Level 3 resume
        if assessment.get("level") == "dementia":
            stroop_data = _ensure_stroop_metadata(aid, user_id)
            response["level3_context"] = _build_level3_context(stroop_data)

        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resume screening: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/{assessment_id}/level1", response_model=UnifiedScreeningResponse)
async def submit_level1(assessment_id: str, request: Level1Request, user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment: raise HTTPException(status_code=404, detail="Not Found")

        FlowController.validate_state(assessment, 1, user_id)

        # Fetch expected answers from stored metadata ONLY — no fallbacks
        metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
        orientation_data = metadata.get("orientation", {}).get("questions")
        recall_words = metadata.get("recall", {}).get("words")

        if not orientation_data:
            raise HTTPException(status_code=400, detail="Orientation data missing from metadata. Please restart assessment.")
        if not recall_words:
            raise HTTPException(status_code=400, detail="Recall words missing from metadata. Please restart assessment.")

        ad8_vals = [1 if v else 0 for v in request.ad8_answers.values()]

        # Score using metadata-driven expected answers
        score_data = await scoring.score_level_1(
            ad8_vals, request.orientation_answers, orientation_data,
            request.recall_words, recall_words
        )
        cog_score = score_data["normalized_score"]

        risk_data = risk_engine.determine_risk(cog_score)

        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 1, request.model_dump())
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level1", cog_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 1, cog_score, risk_data["risk_band"])

        # If advancing to Level 2, generate ALL L2 context
        level2_ctx = None
        if next_step != "COMPLETE":
            sequence = _ensure_digit_span_metadata(assessment_id, user_id)
            vr_data = _ensure_visual_recognition_metadata(assessment_id, user_id)
            pattern_data = _ensure_visual_pattern_metadata(assessment_id, user_id)
            fluency_data = _ensure_fluency_metadata(assessment_id, user_id)
            # Re-fetch metadata for digit_span details
            fresh_metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
            level2_ctx = _build_level2_context(
                sequence, vr_data, pattern_data, fluency_data,
                fresh_metadata.get("digit_span", {})
            )

        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=2 if next_step != "COMPLETE" else 1,
            cognitive_score=cog_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            clinical_recommendation=risk_data["recommendation"],
            method_breakdown={"recall": score_data.get("method")},
            level2_context=level2_ctx
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Level 1 failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Transaction failed")

@router.post("/{assessment_id}/level2", response_model=UnifiedScreeningResponse)
async def submit_level2(assessment_id: str, request: Level2Request, user_id: str = Depends(get_current_user)):
    try:
        assessment = AssessmentDBService.get_assessment(assessment_id, user_id)
        if not assessment: raise HTTPException(status_code=404)

        FlowController.validate_state(assessment, 2, user_id)

        # Fetch ALL expected data from metadata — no fallbacks
        metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)

        # Digit Span
        digit_span_data = metadata.get("digit_span", {})
        expected_sequence = digit_span_data.get("expected", "")
        if not expected_sequence:
            raise HTTPException(status_code=400, detail="Digit span sequence was not generated. Please restart.")
        _validate_digit_span_input(request.digit_span_forward, "Forward digit span")
        _validate_digit_span_input(request.digit_span_backward, "Backward digit span")

        # Visual Recognition
        vr_metadata = metadata.get("visual_recognition", {})
        vr_targets = [t["id"] for t in vr_metadata.get("targets", [])]
        vr_distractors = [d["id"] for d in vr_metadata.get("distractors", [])]

        # Visual Pattern
        pattern_metadata = metadata.get("visual_pattern", {})
        expected_pattern = pattern_metadata.get("correct", "")

        # Recall words from L1 metadata — no fallback to constants
        recall_words = metadata.get("recall", {}).get("words")
        if not recall_words:
            raise HTTPException(status_code=400, detail="Recall words not found in metadata. Assessment data may be corrupted.")

        # Verbal Fluency category
        fluency_metadata = metadata.get("verbal_fluency", {})
        fluency_category = fluency_metadata.get("category", "animals")

        # Score ALL L2 components
        score_data = await scoring.score_level_2(
            animals_list=request.animals,
            fluency_category=fluency_category,
            expected_sequence=expected_sequence,
            digit_forward=request.digit_span_forward,
            digit_backward=request.digit_span_backward,
            visual_selected=request.visual_recognition_selected,
            vr_targets=vr_targets,
            vr_distractors=vr_distractors,
            pattern_answer=request.pattern_answer,
            expected_pattern=expected_pattern,
            delayed_recall=request.delayed_recall,
            level1_words=recall_words
        )
        cog_score = score_data["normalized_score"]

        risk_data = risk_engine.determine_risk(cog_score)

        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 2, request.model_dump())
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level2", cog_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 2, cog_score, risk_data["risk_band"])

        # If advancing to Level 3, generate Stroop trials
        level3_ctx = None
        if next_step != "COMPLETE":
            stroop_data = _ensure_stroop_metadata(assessment_id, user_id)
            level3_ctx = _build_level3_context(stroop_data)

        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=3 if next_step != "COMPLETE" else 2,
            cognitive_score=cog_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            clinical_recommendation=risk_data["recommendation"],
            method_breakdown=score_data.get("method_breakdown"),
            level3_context=level3_ctx
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

        # === Clock Drawing ===
        if request.clock_image_url.startswith("data:image"):
            b64_image = request.clock_image_url.split(",", 1)[1] if "," in request.clock_image_url else request.clock_image_url
        else:
            b64_image = StorageService.download_and_encode_image(request.clock_image_url)

        ai_result = evaluate_clock_drawing(b64_image)
        clock_score = ai_result["normalized_score"]

        # === Stroop Test Scoring ===
        metadata = AssessmentDBService.get_assessment_metadata(assessment_id, user_id)
        stroop_trials = metadata.get("stroop", {}).get("trials", [])
        stroop_result = scoring.score_stroop(stroop_trials, request.stroop_responses)
        stroop_score = stroop_result["normalized_score"]

        # === L3 Composite: Clock Drawing 60% + Stroop 40% ===
        l3_score = scoring.calculate_level3_composite(clock_score, stroop_score)

        results = AssessmentDBService.get_assessment_results(assessment_id, user_id)
        if not results: raise ValueError("Critical data failure: Prior phase history unavailable")

        l1_score = next((r.get("cognitive_score", r.get("score", 0)) for r in results if r.get("test_type") == "level1"), 0)
        l2_score = next((r.get("cognitive_score", r.get("score", 0)) for r in results if r.get("test_type") == "level2"), 0)

        final_composite_score = scoring.calculate_final_composite(l1_score, l2_score, l3_score)

        risk_data = risk_engine.determine_risk(final_composite_score)

        # AI Explanation Layer
        provider = get_provider()
        ai_payload = {
            "scores": {"level1": l1_score, "level2": l2_score, "level3": l3_score},
            "risk_band": risk_data["risk_band"],
            "risk_score": risk_data["risk_score"]
        }

        ai_exp = "No extra clinical insight provided due to AI network fallback."
        ai_rec = "Please adhere strictly to the Baseline recommendation parameters."
        ai_conf = "low"

        try:
            exp_res = await provider.generate_explanation(ai_payload)
            rec_res = await provider.generate_recommendation(ai_payload)
            if exp_res.get("method") != "fallback":
                ai_exp = exp_res.get("result", {}).get("explanation", ai_exp)
                ai_rec = rec_res.get("result", {}).get("recommendation", ai_rec)
                ai_conf = exp_res.get("confidence", "low")
        except Exception as ai_e:
            logger.error(f"Phase F AI Explanation failed: {ai_e}")

        AssessmentDBService.insert_assessment_response(assessment_id, user_id, 3, {
            "clock_url": request.clock_image_url,
            "ai": ai_result,
            "stroop": stroop_result
        })
        AssessmentDBService.insert_assessment_result(assessment_id, user_id, "level3", l3_score, risk_data["risk_score"])
        AssessmentDBService.insert_recommendation(assessment_id, user_id, risk_data["recommendation"])

        status, next_step = FlowController.process_transition(assessment_id, user_id, 3, l3_score, risk_data["risk_band"])

        return UnifiedScreeningResponse(
            assessment_id=assessment_id,
            current_level=3,
            cognitive_score=final_composite_score,
            risk_score=risk_data["risk_score"],
            risk_band=risk_data["risk_band"],
            next_step=next_step,
            clinical_recommendation=risk_data["recommendation"],
            ai_explanation=ai_exp,
            ai_recommendation=ai_rec,
            ai_confidence=ai_conf,
            method_breakdown={
                "clock_drawing": ai_result.get("scoring_method"),
                "stroop": "deterministic"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Level 3 failed: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed")
