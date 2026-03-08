from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class ActivityTemplateSchema(BaseModel):
    id: str
    type: str
    difficulty: str
    content: Dict[str, Any]
    created_at: datetime

class ActivityInstanceResponse(BaseModel):
    id: str
    user_id: str
    template_id: Optional[str] = None
    ai_generated: bool
    difficulty: str
    status: str
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ActivityResultSubmitRequest(BaseModel):
    responses: Dict[str, Any] = Field(..., description="The structured answers/interactions from the user")
    time_taken_seconds: int = Field(..., ge=1, description="How long the user spent on the activity in seconds")

class ActivityResultResponse(BaseModel):
    id: str
    activity_id: str
    score: float
    message: str = "Activity submitted successfully"

class ActivityHistoryItem(BaseModel):
    activity_id: str
    type: str
    difficulty: str
    score: float
    time_taken_seconds: int
    completed_at: datetime
