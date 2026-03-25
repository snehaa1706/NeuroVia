from typing import Dict, Any

# Orientation Test — Assesses awareness of time and place.
# 10 questions covering: date, day, month, year, season, city, state, country, floor, location.
# 1 point per correct answer. Max score = 10.

MAX_SCORE = 10.0

SEVERITY_THRESHOLDS = {
    "normal": (8, 10),
    "mild": (6, 7),
    "moderate": (4, 5),
    "severe": (0, 3),
}

REQUIRED_KEYS = [f"q{i}" for i in range(1, 11)]
ALLOWED_VALUES = ["Correct", "Incorrect"]


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate that responses contain exactly q1–q10 with allowed values."""
    if not isinstance(responses, dict):
        return False
    for key in REQUIRED_KEYS:
        if key not in responses:
            return False
        if responses[key] not in ALLOWED_VALUES:
            return False
    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate the Orientation test score.
    Returns the count of 'Correct' answers (0–10).
    """
    score = 0
    for key in REQUIRED_KEYS:
        if responses.get(key) == "Correct":
            score += 1
    return float(score)
