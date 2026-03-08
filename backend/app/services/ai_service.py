import os
import json
import requests
import logging
from openai import OpenAI
from pydantic import ValidationError

from app.config import settings
from app.models.ai_schemas import (
    ScreeningAnalysisResponse,
    ActivityGenerationResponse,
    CaregiverGuidanceResponse,
    ConsultationSummaryResponse
)
from app.prompts.screening_prompts import SCREENING_SYSTEM_PROMPT, SCREENING_USER_PROMPT
from app.prompts.activity_prompts import ACTIVITY_GENERATION_SYSTEM, ACTIVITY_GENERATION_USER
from app.prompts.caregiver_prompts import CAREGIVER_GUIDANCE_SYSTEM, CAREGIVER_GUIDANCE_USER
from app.prompts.consultation_prompts import CONSULTATION_SUMMARY_SYSTEM, CONSULTATION_SUMMARY_USER

# Configure basic logging for AI service
logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

# Initialize OpenAI Client (Lazy initialization on use)
_openai_client = None

class AIProcessingException(Exception):
    """Custom exception raised when AI fails to generate valid structured data."""
    pass

def get_ai_provider() -> str:
    return os.getenv("AI_PROVIDER", "ollama").lower()

def _get_openai_client():
    global _openai_client
    if not _openai_client:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client

def _clean_json_output(raw_text: str) -> str:
    """Aggressively strips markdown markdown code blocks if the LLM hallucinates them."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

async def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    full_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3",
        "prompt": full_prompt,
        "stream": False
    }
    
    response = requests.post(url, json=payload, timeout=60) # 60s timeout for local inference
    response.raise_for_status()
    return response.json().get("response", "")

async def _call_openai(system_prompt: str, user_prompt: str) -> str:
    client = _get_openai_client()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    return response.choices[0].message.content

async def _generate(system_prompt: str, user_prompt: str, retries: int = 2) -> str:
    """Core LLM execution router."""
    provider = get_ai_provider()
    
    for attempt in range(retries + 1):
        try:
            logger.info(f"AI Generation Request | Provider: {provider} | Attempt: {attempt + 1}")
            if provider == "ollama":
                raw_output = await _call_ollama(system_prompt, user_prompt)
            elif provider == "openai":
                raw_output = await _call_openai(system_prompt, user_prompt)
            else:
                 # Support Fallback
                fallback = os.getenv("AI_FALLBACK_PROVIDER", "ollama")
                logger.warning(f"Unknown provider: {provider}, falling back to {fallback}")
                if fallback == "ollama":
                    raw_output = await _call_ollama(system_prompt, user_prompt)
                else:
                    raw_output = await _call_openai(system_prompt, user_prompt)
                    
            return _clean_json_output(raw_output)
            
        except Exception as e:
            logger.error(f"Provider {provider} failed on attempt {attempt + 1}: {str(e)}")
            if attempt == retries:
                raise AIProcessingException(f"AI Generation failed after {retries} retries: {str(e)}")

async def _generate_and_validate(system_prompt: str, user_prompt: str, schema_class, retries: int = 2):
    """Executes the LLM request and enforces Pydantic validation."""
    for attempt in range(retries + 1):
        try:
            raw_json_str = await _generate(system_prompt, user_prompt, retries=0) # Do not compound retries
            return schema_class.model_validate_json(raw_json_str)
            
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Validation Error on attempt {attempt + 1}: {str(e)}")
            try: 
                 logger.error(f"Raw Output causing failure: {raw_json_str}")
            except UnboundLocalError:
                 pass
            if attempt == retries:
                raise AIProcessingException(f"Failed to generate valid JSON according to schema after {retries} retries.")
        except Exception as e:
            if attempt == retries:
                raise AIProcessingException(f"Unexpected error during generation: {str(e)}")


# ==========================================
# Public Service Endpoints (Typed & Validated)
# ==========================================

async def analyze_screening(level: str, test_results: str) -> ScreeningAnalysisResponse:
    user_prompt = SCREENING_USER_PROMPT.format(
        patient_age="Unknown", # Or inject actual age securely
        level=level, 
        test_results=test_results
    )
    return await _generate_and_validate(SCREENING_SYSTEM_PROMPT, user_prompt, ScreeningAnalysisResponse)


async def generate_activity(activity_type: str, difficulty: str, severity: str = "mild") -> ActivityGenerationResponse:
    user_prompt = ACTIVITY_GENERATION_USER.format(
        severity=severity, 
        activity_type=activity_type, 
        difficulty=difficulty
    )
    return await _generate_and_validate(ACTIVITY_GENERATION_SYSTEM, user_prompt, ActivityGenerationResponse)


async def generate_caregiver_guidance(
    mood: str, confusion_level: int, sleep_hours: float, appetite: str, notes: str, recent_logs: str
) -> CaregiverGuidanceResponse:
    user_prompt = CAREGIVER_GUIDANCE_USER.format(
        mood=mood,
        confusion_level=confusion_level,
        sleep_hours=sleep_hours,
        appetite=appetite,
        notes=notes or "None",
        recent_logs=recent_logs or "No recent logs available",
    )
    return await _generate_and_validate(CAREGIVER_GUIDANCE_SYSTEM, user_prompt, CaregiverGuidanceResponse)


async def generate_consultation_summary(screening_data: str, ai_analysis: str) -> ConsultationSummaryResponse:
    user_prompt = CONSULTATION_SUMMARY_USER.format(
        screening_data=screening_data, 
        ai_analysis=ai_analysis
    )
    return await _generate_and_validate(CONSULTATION_SUMMARY_SYSTEM, user_prompt, ConsultationSummaryResponse)
