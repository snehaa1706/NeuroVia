import json
import logging
import random
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from pydantic import ValidationError

from app.database import get_supabase
from app.models.cognitive import (
    SessionStartRequest,
    TestSubmissionRequest,
    TestType,
    Difficulty,
    TEST_RESPONSE_SCHEMAS,
)

import app.utils.cognitive_tests.memory as memory_test
import app.utils.cognitive_tests.fluency as fluency_test
import app.utils.cognitive_tests.reaction as reaction_test
import app.utils.cognitive_tests.sequence as sequence_test
from app.services.caregiver_service import validate_assignment

logger = logging.getLogger(__name__)

# ================================
# MOCK DATA FOR LOCAL DEVELOPMENT
# ================================
MOCK_SESSIONS = {}
_now = datetime.now(timezone.utc)
MOCK_RESULTS = [
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "memory_recall",
        "score": 88.0,
        "score_components": {"accuracy": 88, "response_time": 92},
        "responses": {},
        "time_taken_seconds": 38,
        "created_at": (_now - timedelta(days=1)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "verbal_fluency",
        "score": 82.0,
        "score_components": {"fluency": 82, "vocabulary": 78},
        "responses": {},
        "time_taken_seconds": 55,
        "created_at": (_now - timedelta(days=4)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "sequence_memory",
        "score": 75.0,
        "score_components": {"accuracy": 75, "sequence_length": 6},
        "responses": {},
        "time_taken_seconds": 42,
        "created_at": (_now - timedelta(days=8)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "reaction_time",
        "score": 70.0,
        "score_components": {"avg_reaction_ms": 450, "consistency": 70},
        "responses": {},
        "time_taken_seconds": 30,
        "created_at": (_now - timedelta(days=14)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "memory_recall",
        "score": 65.0,
        "score_components": {"accuracy": 65, "response_time": 60},
        "responses": {},
        "time_taken_seconds": 52,
        "created_at": (_now - timedelta(days=21)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "verbal_fluency",
        "score": 58.0,
        "score_components": {"fluency": 58, "vocabulary": 55},
        "responses": {},
        "time_taken_seconds": 60,
        "created_at": (_now - timedelta(days=30)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "sequence_memory",
        "score": 52.0,
        "score_components": {"accuracy": 52, "sequence_length": 4},
        "responses": {},
        "time_taken_seconds": 48,
        "created_at": (_now - timedelta(days=40)).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "patient_id": "test-patient-id",
        "test_type": "reaction_time",
        "score": 45.0,
        "score_components": {"avg_reaction_ms": 620, "consistency": 45},
        "responses": {},
        "time_taken_seconds": 35,
        "created_at": (_now - timedelta(days=50)).isoformat()
    },
]

# ================================
# CONSTANTS
# ================================
SESSION_MAX_AGE_MINUTES = 30

# ================================
# TEST DISPATCHER MAP
# ================================
TEST_MODULES = {
    TestType.memory_recall: memory_test,
    TestType.verbal_fluency: fluency_test,
    TestType.reaction_time: reaction_test,
    TestType.sequence_memory: sequence_test,
}

# ================================
# CONFIG GENERATORS
# ================================


def _generate_test_config(test_type: TestType, difficulty: Difficulty) -> dict:
    config: dict = {}

    if test_type == TestType.memory_recall:
        # Scale word count by difficulty
        count = {"easy": 3, "medium": 5, "hard": 8}[difficulty.value]
        pool = ["apple", "chair", "blue", "dog", "house", "car", "tree", "book", "sun", "water", "pen", "desk"]
        config["words"] = random.sample(pool, count)

    elif test_type == TestType.sequence_memory:
        length = {"easy": 4, "medium": 6, "hard": 8}[difficulty.value]
        config["sequence"] = [random.randint(0, 9) for _ in range(length)]

    elif test_type == TestType.verbal_fluency:
        # Provide a random letter or category for them to list words
        categories = ["animals", "foods", "countries", "items in a house"]
        config["category"] = random.choice(categories)

    # reaction_time needs no config
    return config


# ================================
# SESSION EXPIRATION HELPER
# ================================


def _check_session_expiration(session: dict, sb) -> None:
    """Mark session as expired and raise HTTP 400 if it exceeds SESSION_MAX_AGE_MINUTES."""
    started_at_str = session.get("started_at")
    if not started_at_str:
        return

    # Parse the ISO timestamp from the database
    if isinstance(started_at_str, str):
        started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
    else:
        started_at = started_at_str

    now = datetime.now(timezone.utc)
    age_minutes = (now - started_at).total_seconds() / 60.0

    if age_minutes > SESSION_MAX_AGE_MINUTES:
        # Mark session as expired in DB
        sb.table("cognitive_sessions").update({
            "status": "expired",
        }).eq("id", session["id"]).execute()

        logger.warning(
            "cognitive_session_expired",
            extra={"session_id": session["id"], "patient_id": session["patient_id"], "age_minutes": round(age_minutes, 1)},
        )
        raise HTTPException(
            status_code=400,
            detail=f"Session expired. Tests must be completed within {SESSION_MAX_AGE_MINUTES} minutes.",
        )


# ================================
# SUMMARY CACHE HELPERS
# ================================


def _recompute_summary_from_results(patient_id: str) -> dict:
    """Fallback: compute summary directly from cognitive_results rows."""
    sb = get_supabase()
    res = (
        sb.table("cognitive_results")
        .select("score")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    scores = [r["score"] for r in res.data]
    if not scores:
        return {
            "avg_score": None,
            "latest_score": None,
            "trend": "no_data",
            "recent_scores": [],
        }

    avg = sum(scores) / len(scores)
    latest = scores[0]

    # Trend Detection
    threshold = 5.0
    if latest < avg - threshold:
        trend = "declining"
    elif latest > avg + threshold:
        trend = "improving"
    else:
        trend = "stable"

    return {
        "avg_score": round(avg, 2),
        "latest_score": round(latest, 2),
        "trend": trend,
        "recent_scores": scores,
    }


def _update_summary_cache(patient_id: str) -> None:
    """Upsert the cognitive_summary_cache row for a patient after a new result."""
    try:
        summary = _recompute_summary_from_results(patient_id)
        sb = get_supabase()

        cache_record = {
            "patient_id": patient_id,
            "latest_score": summary["latest_score"],
            "average_score": summary["avg_score"],
            "trend_direction": summary["trend"],
            "recent_scores": json.dumps(summary["recent_scores"]),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert: ON CONFLICT (patient_id) DO UPDATE
        sb.table("cognitive_summary_cache").upsert(cache_record, on_conflict="patient_id").execute()

        logger.info(
            "cognitive_summary_cache_updated",
            extra={"patient_id": patient_id, "latest_score": summary["latest_score"]},
        )
    except Exception as e:
        # Cache update failure should never break the submission flow
        logger.error("cognitive_summary_cache_update_failed", extra={"patient_id": patient_id, "error": str(e)})


# ================================
# SERVICE FUNCTIONS
# ================================


def start_session(user_id: str, payload: SessionStartRequest) -> dict:
    """Creates a new test session and generates the mandatory test_config."""
    if user_id == "test-patient-id":
        # DEV MOCK OVERRIDE
        sess_id = str(uuid.uuid4())
        config = _generate_test_config(payload.test_type, payload.difficulty)
        session = {
            "id": sess_id,
            "patient_id": user_id,
            "test_type": payload.test_type.value,
            "difficulty": payload.difficulty.value,
            "status": "in_progress",
            "test_config": config,
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        MOCK_SESSIONS[sess_id] = session
        return session

    sb = get_supabase()

    config = _generate_test_config(payload.test_type, payload.difficulty)

    record = {
        "patient_id": user_id,
        "test_type": payload.test_type.value,
        "difficulty": payload.difficulty.value,
        "status": "in_progress",
        "test_config": config,
    }

    result = sb.table("cognitive_sessions").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create cognitive session")

    return result.data[0]


def submit_test(user_id: str, session_id: str, payload: TestSubmissionRequest) -> dict:
    """Validates inputs, calculates score, stores result, and locks session."""
    if user_id == "test-patient-id":
        if session_id not in MOCK_SESSIONS:
            raise HTTPException(status_code=404, detail="Session not found in mock store")
        session = MOCK_SESSIONS[session_id]
        if session["status"] != "in_progress":
            raise HTTPException(status_code=400, detail="Session not in progress")
        
        test_type = TestType(session["test_type"])
        module = TEST_MODULES.get(test_type)
        score, score_components = module.calculate_score(payload.responses, session["test_config"])
        session["status"] = "completed"
        res = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "patient_id": user_id,
            "test_type": test_type.value,
            "score": score,
            "score_components": score_components,
            "responses": payload.responses,
            "time_taken_seconds": payload.time_taken_seconds,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        MOCK_RESULTS.insert(0, res)
        return res

    sb = get_supabase()

    # 1. Fetch & Validate Session
    session_res = sb.table("cognitive_sessions").select("*").eq("id", session_id).single().execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_res.data

    # Ownership Control
    if session["patient_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to submit logic for this session")

    # Session State Control
    if session["status"] == "completed":
        raise HTTPException(status_code=409, detail="Duplicate submission. Session already completed.")
    if session["status"] == "expired":
        raise HTTPException(status_code=400, detail="Session has expired and cannot accept submissions.")
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress.")

    # 2. Session Expiration Check (30-minute window)
    _check_session_expiration(session, sb)

    test_type = TestType(session["test_type"])
    module = TEST_MODULES.get(test_type)
    if not module:
        raise HTTPException(status_code=500, detail="Test scoring module not found.")

    # 3. Pydantic Schema Validation (strict, internal)
    schema_class = TEST_RESPONSE_SCHEMAS.get(test_type)
    if schema_class:
        try:
            schema_class(**payload.responses)
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=f"Invalid test response format: {e.errors()}")

    # 4. Legacy Validation Layer (defense-in-depth)
    if not module.validate_responses(payload.responses):
        raise HTTPException(status_code=400, detail="Invalid test response format given test expectations.")

    # 5. Calculate Score + Components
    score, score_components = module.calculate_score(payload.responses, session["test_config"])

    # 6. Persist Result
    try:
        result_record = {
            "session_id": session["id"],
            "patient_id": user_id,
            "test_type": test_type.value,
            "score": score,
            "score_components": score_components,
            "responses": payload.responses,
            "time_taken_seconds": payload.time_taken_seconds,
        }
        res_db = sb.table("cognitive_results").insert(result_record).execute()

        # Mark session -> completed
        sb.table("cognitive_sessions").update({
            "status": "completed",
            "completed_at": "now()",
        }).eq("id", session["id"]).execute()

        logger.info(
            "cognitive_test_completed",
            extra={"patient_id": user_id, "session_id": session["id"], "score": score},
        )

        # 7. Update summary cache asynchronously (best-effort)
        _update_summary_cache(user_id)

        return res_db.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")


def get_cognitive_history(requesting_user: dict, patient_id: str) -> list[dict]:
    """Retrieve history. Allows patients to see own, and caregivers assigned."""
    if patient_id == "test-patient-id":
        return sorted(MOCK_RESULTS, key=lambda x: x["created_at"], reverse=True)

    sb = get_supabase()

    role = requesting_user.get("role")
    req_id = requesting_user.get("id")

    if role == "caregiver":
        # Will raise 403 if unassigned
        validate_assignment(req_id, patient_id)
    elif role == "patient" and req_id != patient_id:
        raise HTTPException(status_code=403, detail="Cannot access other patient's records")

    res = (
        sb.table("cognitive_results")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return res.data or []


def compute_cognitive_summary(patient_id: str) -> dict:
    """Read from cache first; fall back to live recompute if cache is missing."""
    if patient_id == "test-patient-id":
        scores = [r["score"] for r in MOCK_RESULTS]
        if not scores:
            return {"avg_score": None, "latest_score": None, "trend": "no_data", "recent_scores": [], "recent_results": []}
        avg = sum(scores) / len(scores)
        latest = scores[0]
        trend = "improving" if latest > avg + 5 else "declining" if latest < avg - 5 else "stable"
        recent_results = [
            {"score": r["score"], "test_type": r["test_type"], "created_at": r["created_at"]}
            for r in MOCK_RESULTS[:8]
        ]
        return {
            "avg_score": round(avg, 2),
            "latest_score": round(latest, 2),
            "trend": trend,
            "recent_scores": scores[:8],
            "recent_results": recent_results,
        }

    sb = get_supabase()

    # Try cache first
    try:
        cache_res = (
            sb.table("cognitive_summary_cache")
            .select("*")
            .eq("patient_id", patient_id)
            .single()
            .execute()
        )
        if cache_res.data:
            row = cache_res.data
            recent_scores = row.get("recent_scores", [])
            # Supabase may return JSONB as string or list
            if isinstance(recent_scores, str):
                recent_scores = json.loads(recent_scores)
            return {
                "avg_score": row.get("average_score"),
                "latest_score": row.get("latest_score"),
                "trend": row.get("trend_direction", "no_data"),
                "recent_scores": recent_scores,
            }
    except Exception:
        # Cache miss or table doesn't exist yet — fall through to live recompute
        logger.debug("cognitive_summary_cache_miss", extra={"patient_id": patient_id})

    # Fallback: recompute from results
    return _recompute_summary_from_results(patient_id)
