from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import time

from app.services import ai_service
from app.config import settings

router = APIRouter()

class AITestRequest(BaseModel):
    system_prompt: str = "You are a helpful assistant."
    user_prompt: str = "Say 'Hello World' and output a valid JSON like {'status': 'success'}."

class AITestResponse(BaseModel):
    provider: str
    latency_ms: float
    raw_output: str

@router.post("/test", response_model=AITestResponse)
async def test_ai_connection(request: AITestRequest):
    """
    Diagnostic endpoint to test raw LLM connectivity and speed.
    Bypasses Pydantic validation to return the raw unparsed string.
    """
    start_time = time.time()
    try:
        # We call the internal _generate function directly to bypass schema validation for simply testing connectivity
        raw_output = await ai_service._generate(request.system_prompt, request.user_prompt, retries=0)
        latency = (time.time() - start_time) * 1000
        
        return AITestResponse(
            provider=ai_service.get_ai_provider(),
            latency_ms=latency,
            raw_output=raw_output
        )
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail=f"AI connection test failed. Provider: {ai_service.get_ai_provider()}. Error: {str(e)}"
        )
