from enum import Enum
from typing import Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class TestType(str, Enum):
    __test__ = False
    memory_recall = "memory_recall"
    verbal_fluency = "verbal_fluency"
    reaction_time = "reaction_time"
    sequence_memory = "sequence_memory"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


# ============================================
# REQUEST SCHEMAS
# ============================================

class SessionStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    test_type: TestType
    difficulty: Difficulty = Difficulty.medium


class TestSubmissionRequest(BaseModel):
    __test__ = False
    model_config = ConfigDict(extra="forbid")
    responses: Dict[str, Any]
    time_taken_seconds: float = Field(..., gt=0, description="Time taken to finish the test in seconds")


# ============================================
# PER-TEST RESPONSE VALIDATION SCHEMAS
# ============================================

class MemoryRecallResponse(BaseModel):
    """Validates the response payload for memory recall tests."""
    model_config = ConfigDict(extra="forbid")
    words: List[str] = Field(..., description="List of recalled words")


class VerbalFluencyResponse(BaseModel):
    """Validates the response payload for verbal fluency tests."""
    model_config = ConfigDict(extra="forbid")
    words: List[str] = Field(..., description="List of generated words for the category")


class ReactionTimeResponse(BaseModel):
    """Validates the response payload for reaction time tests."""
    model_config = ConfigDict(extra="forbid")
    reaction_time_ms: float = Field(..., ge=0, le=10000, description="Reaction time in milliseconds")


class SequenceMemoryResponse(BaseModel):
    """Validates the response payload for sequence memory tests."""
    model_config = ConfigDict(extra="forbid")
    sequence: List[int] = Field(..., description="Recalled sequence of numbers")


# Map test types to their validation schemas
TEST_RESPONSE_SCHEMAS: Dict[str, type] = {
    TestType.memory_recall: MemoryRecallResponse,
    TestType.verbal_fluency: VerbalFluencyResponse,
    TestType.reaction_time: ReactionTimeResponse,
    TestType.sequence_memory: SequenceMemoryResponse,
}


# ============================================
# RESPONSE SCHEMAS
# ============================================

class CognitiveSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    test_type: TestType
    difficulty: Difficulty
    status: str
    test_config: Dict[str, Any]


class CognitiveResultResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    test_type: TestType
    score: float
    score_components: Dict[str, Any] = Field(default_factory=dict)
    time_taken_seconds: float
    created_at: datetime


class CognitiveSummaryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    avg_score: float | None = None
    latest_score: float | None = None
    trend: str  # "no_data" | "improving" | "stable" | "declining"
    recent_scores: List[float] = Field(default_factory=list)
    recent_results: List[Dict[str, Any]] = Field(default_factory=list)
