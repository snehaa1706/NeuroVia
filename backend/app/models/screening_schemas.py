from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class ScreeningStartResponse(BaseModel):
    id: str = Field(..., description="The UUID of the newly created screening session")
    status: str = Field(..., description="The status of the screening session (e.g., 'in_progress')")
    started_at: datetime = Field(..., description="When the screening session was started")

class TestSubmitRequest(BaseModel):
    test_type: str = Field(..., description="The specific test being submitted (e.g., 'AD8', 'WordRecall')")
    responses: Dict[str, Any] = Field(..., description="The raw JSON answers provided by the patient")

class TestSubmitResponse(BaseModel):
    id: str = Field(..., description="The UUID of the saved test result")
    score: Optional[float] = Field(None, description="The raw numeric score computed for this specific test")
    message: str = Field("Test result recorded successfully.")

class ScreeningHistoryItem(BaseModel):
    id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    risk_level: Optional[str] = None

class ScreeningResultResponse(BaseModel):
    screening_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    test_results: List[Dict[str, Any]]
    ai_analysis: Optional[Dict[str, Any]] = None
