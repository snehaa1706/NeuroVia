from pydantic import BaseModel, Field
from typing import Optional

class DemoGenerateRequest(BaseModel):
    scenario: str = Field(default="mixed", description="'mixed', 'stable', 'declining', 'critical'")
    patient_count: int = Field(default=3, description="Number of patients to generate")
    days: int = Field(default=90, description="Amount of historical timeline to generate")

class DemoStatusResponse(BaseModel):
    status: str
    message: str
    generated_users: Optional[int] = None
    generated_logs: Optional[int] = None
