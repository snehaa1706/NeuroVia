from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum
from datetime import datetime


class ScreeningLevel(str, Enum):
    scd = "scd"            # Subjective Cognitive Decline
    mci = "mci"            # Mild Cognitive Impairment
    dementia = "dementia"  # Dementia Risk Assessment


class ScreeningStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class TestType(str, Enum):
    ad8 = "ad8"
    orientation = "orientation"
    verbal_fluency = "verbal_fluency"
    trail_making = "trail_making"
    clock_drawing = "clock_drawing"
    moca = "moca"


# Maps each screening level to required tests
LEVEL_TESTS = {
    ScreeningLevel.scd: [TestType.ad8, TestType.orientation],
    ScreeningLevel.mci: [TestType.verbal_fluency, TestType.trail_making],
    ScreeningLevel.dementia: [TestType.clock_drawing, TestType.moca],
}


class ScreeningCreate(BaseModel):
    level: ScreeningLevel = ScreeningLevel.scd


class ScreeningResponse(BaseModel):
    id: str
    user_id: str
    level: ScreeningLevel
    status: ScreeningStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TestSubmission(BaseModel):
    test_type: TestType
    responses: dict[str, Any]


class ScreeningResultResponse(BaseModel):
    id: str
    screening_id: str
    test_type: TestType
    responses: dict[str, Any]
    score: float
    max_score: float
