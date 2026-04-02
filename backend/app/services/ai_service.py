import os
import json
import requests
from openai import OpenAI
from app.config import settings

# Initialize OpenAI client (it will only be used if AI_PROVIDER="openai")
client = OpenAI(api_key=settings.OPENAI_API_KEY)


def get_ai_provider() -> str:
    """Get the current AI provider from environment variables."""
    return os.getenv("AI_PROVIDER", "ollama").lower()


async def generate_ai_response(system_prompt: str, user_prompt: str) -> str:
    """Generate a response using the configured AI provider."""
    provider = get_ai_provider()

    full_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"

    if provider == "ollama":
        try:
            # Step 1: Use the Ollama API
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model = os.getenv("OLLAMA_MODEL", "llama3")
            url = f"{base_url}/api/generate"
            payload = {
                "model": model,
                "prompt": full_prompt,
                "stream": False
            }
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
        except Exception as e:
            return json.dumps({"error": f"Ollama failed: {str(e)}"})

    elif provider == "openai":
        try:
            # Step 2: Use the OpenAI SDK
            response = client.chat.completions.create(
                model="gpt-4.1",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            return json.dumps({"error": f"OpenAI failed: {str(e)}"})
    else:
        return json.dumps({"error": f"Unknown AI provider: {provider}"})


# ==========================================
# Legacy OpenAI Service wrappers now using the switchable layer
# These functions previously returned parsed JSON directly.
# We will wrap it to parse the output from `generate_ai_response`.
# ==========================================

async def _get_json_response(system_prompt: str, user_prompt: str) -> dict:
    """Helper to parse the string response back into a dict for existing services."""
    
    # If using OpenAI, we might want to enforce JSON formatting via prompt instructions,
    # since we removed `response_format={"type": "json_object"}` from the core method 
    # to support simple text completions for Ollama/Test Endpoint.
    system_prompt_with_json = system_prompt + "\n\nCRITICAL: Respond ONLY with a valid JSON object. Do not include markdown code block wrappers or any conversational text. Just the raw JSON object."
    
    response_text = await generate_ai_response(system_prompt_with_json, user_prompt)
    
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback to try to clean markdown blocks if the LLM output them
        if "```json" in response_text:
            try:
                cleaned = response_text.split("```json")[1].split("```")[0].strip()
                return json.loads(cleaned)
            except Exception:
                pass
        return {"error": "Failed to parse AI response as JSON", "raw": response_text}
    except Exception as e:
        return {"error": str(e)}


async def analyze_screening(level: str, test_results: str) -> dict:
    from app.prompts.screening_prompts import (
        SCREENING_ANALYSIS_SYSTEM,
        SCREENING_ANALYSIS_USER,
    )
    user_prompt = SCREENING_ANALYSIS_USER.format(
        level=level, test_results=test_results
    )
    return await _get_json_response(SCREENING_ANALYSIS_SYSTEM, user_prompt)


async def generate_caregiver_guidance(
    mood: str,
    confusion_level: int,
    sleep_hours: float,
    appetite: str,
    notes: str,
    recent_logs: str,
) -> dict:
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
    return await _get_json_response(CAREGIVER_GUIDANCE_SYSTEM, user_prompt)


async def generate_activity(
    activity_type: str, difficulty: str, severity: str = "mild"
) -> dict:
    from app.prompts.activity_prompts import (
        ACTIVITY_GENERATION_SYSTEM,
        ACTIVITY_GENERATION_USER,
    )
    user_prompt = ACTIVITY_GENERATION_USER.format(
        severity=severity, activity_type=activity_type, difficulty=difficulty
    )
    return await _get_json_response(ACTIVITY_GENERATION_SYSTEM, user_prompt)


async def generate_consultation_summary(
    screening_data: str, ai_analysis: str
) -> dict:
    from app.prompts.consultation_prompts import (
        CONSULTATION_SUMMARY_SYSTEM,
        CONSULTATION_SUMMARY_USER,
    )
    user_prompt = CONSULTATION_SUMMARY_USER.format(
        screening_data=screening_data, ai_analysis=ai_analysis
    )
    return await _get_json_response(CONSULTATION_SUMMARY_SYSTEM, user_prompt)
