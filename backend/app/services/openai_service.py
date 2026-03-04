import json
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

MODEL = "gpt-4.1"


async def get_ai_response(system_prompt: str, user_prompt: str) -> dict:
    """Send a prompt to OpenAI and return parsed JSON response."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response as JSON", "raw": content}
    except Exception as e:
        return {"error": str(e)}


async def analyze_screening(level: str, test_results: str) -> dict:
    """Analyze screening results using OpenAI."""
    from app.prompts.screening_prompts import (
        SCREENING_ANALYSIS_SYSTEM,
        SCREENING_ANALYSIS_USER,
    )

    user_prompt = SCREENING_ANALYSIS_USER.format(
        level=level, test_results=test_results
    )
    return await get_ai_response(SCREENING_ANALYSIS_SYSTEM, user_prompt)


async def generate_caregiver_guidance(
    mood: str,
    confusion_level: int,
    sleep_hours: float,
    appetite: str,
    notes: str,
    recent_logs: str,
) -> dict:
    """Generate caregiver guidance using OpenAI."""
    from app.prompts.caregiver_prompts import (
        CAREGIVER_GUIDANCE_SYSTEM,
        CAREGIVER_GUIDANCE_USER,
    )

    user_prompt = CAREGIVER_GUIDANCE_USER.format(
        mood=mood,
        confusion_level=confusion_level,
        sleep_hours=sleep_hours,
        appetite=appetite,
        notes=notes or "None",
        recent_logs=recent_logs or "No recent logs available",
    )
    return await get_ai_response(CAREGIVER_GUIDANCE_SYSTEM, user_prompt)


async def generate_activity(
    activity_type: str, difficulty: str, severity: str = "mild"
) -> dict:
    """Generate a cognitive activity using OpenAI."""
    from app.prompts.activity_prompts import (
        ACTIVITY_GENERATION_SYSTEM,
        ACTIVITY_GENERATION_USER,
    )

    user_prompt = ACTIVITY_GENERATION_USER.format(
        severity=severity, activity_type=activity_type, difficulty=difficulty
    )
    return await get_ai_response(ACTIVITY_GENERATION_SYSTEM, user_prompt)


async def generate_consultation_summary(
    screening_data: str, ai_analysis: str
) -> dict:
    """Generate a consultation summary for a doctor."""
    from app.prompts.consultation_prompts import (
        CONSULTATION_SUMMARY_SYSTEM,
        CONSULTATION_SUMMARY_USER,
    )

    user_prompt = CONSULTATION_SUMMARY_USER.format(
        screening_data=screening_data, ai_analysis=ai_analysis
    )
    return await get_ai_response(CONSULTATION_SUMMARY_SYSTEM, user_prompt)
