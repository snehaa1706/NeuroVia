import json
import logging
import requests
from openai import OpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI Client (Assuming OPENAI_API_KEY is in env)
client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a clinical cognitive assessment assistant.
Evaluate the clock drawing based on:
- Presence of numbers 1-12
- Correct order and spacing
- Circle shape
- Clock hands placement

Return ONLY valid JSON:
{
  "score": integer (0 to 5),
  "confidence": "high" | "medium" | "low"
}
"""

def _call_openai_vision(base64_image: str) -> dict:
    completion = client.chat.completions.create(
        model="gpt-4o",
        response_format={ "type": "json_object" },
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": SYSTEM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        timeout=10
    )
    result = json.loads(completion.choices[0].message.content)
    return {
        "clock_score": max(0, min(int(result.get("score", 0)), 5)),
        "normalized_score": max(0, min(int(result.get("score", 0)), 5)) / 5.0,
        "scoring_method": "openai",
        "confidence": result.get("confidence", "low")
    }

def _call_ollama_fallback(base64_image: str) -> dict:
    url = f"{settings.OLLAMA_HOST}/api/generate"
    payload = {
        "model": "llava",  # Local multimodal fallback
        "prompt": SYSTEM_PROMPT + "\nRespond purely with JSON.",
        "stream": False,
        "images": [base64_image]
    }
    response = requests.post(url, json=payload, timeout=12)
    response.raise_for_status()
    
    # Try to extract JSON from raw LLaVA string (which can be noisy)
    raw_text = response.json().get("response", "{}")
    result = json.loads(raw_text) # Assumes decent prompt adherence
    
    return {
        "clock_score": max(0, min(int(result.get("score", 0)), 5)),
        "normalized_score": max(0, min(int(result.get("score", 0)), 5)) / 5.0,
        "scoring_method": "ollama",
        "confidence": result.get("confidence", "low")
    }

def evaluate_clock_drawing(base64_image: str) -> dict:
    """
    Orchestrates the AI fallback chain with explicit transient connection retries.
    """
    # 1. Primary OpenAI Vision Retry Wrapper
    for attempt in range(2):
        try:
            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your_"):
                raise ValueError("No valid OpenAI Key configured")
            res = _call_openai_vision(base64_image)
            logger.info("Successfully scored via OpenAI")
            return res
        except Exception as e_openai:
            logger.warning(f"OpenAI Attempt {attempt + 1} failed. Error: {e_openai}")
            if attempt == 1:
                logger.error("OpenAI failed completely, bubbling logic to Ollama cascade.")
                break # Bubble out to local fallback if double-timeout

    # 2. Local Ollama LLava Fallback Retry Wrapper
    for attempt in range(2):
        try:
            res = _call_ollama_fallback(base64_image)
            logger.info("Successfully scored via Ollama fallback")
            return res
        except Exception as e_ollama:
            logger.warning(f"Ollama Attempt {attempt + 1} failed. Error: {e_ollama}")
            if attempt == 1:
                logger.error("Ollama fallback failed completely. Firing default safety wrapper.")
                # HARD FALLBACK (Guarantees system remains functional)
                return {
                    "clock_score": 2.5,
                    "normalized_score": 0.5,
                    "scoring_method": "fallback",
                    "confidence": "low"
                }
