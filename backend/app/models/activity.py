from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum
from datetime import datetime


class ActivityType(str, Enum):
    photo_recognition = "photo_recognition"
    memory_recall = "memory_recall"
    verbal_recall = "verbal_recall"
    object_matching = "object_matching"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class ActivityResponse(BaseModel):
    id: str
    patient_id: str
    activity_type: ActivityType
    content: dict[str, Any]
    difficulty: Difficulty
    created_at: Optional[datetime] = None


class ActivityResultSubmit(BaseModel):
    responses: dict[str, Any]


class ActivityResultResponse(BaseModel):
    id: str
    activity_id: str
    responses: dict[str, Any]
    score: float
    ai_feedback: Optional[str] = None
    completed_at: Optional[datetime] = None


class FamilyMemberCreate(BaseModel):
    patient_id: str
    name: str
    relationship: str
    photo_url: Optional[str] = None


class FamilyMemberResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    relationship: str
    photo_url: Optional[str] = None
