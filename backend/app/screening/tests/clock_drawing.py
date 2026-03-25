from typing import Dict, Any

# Clock Drawing Test — Assesses visuospatial and executive function.
# Patient draws a clock face; scored on 6 boolean criteria.
# Raw score (0–6) is normalized to clinical 0–5 scale.

MAX_SCORE = 5.0

SEVERITY_THRESHOLDS = {
    "normal": (4, 5),
    "mild": (3, 3),
    "moderate": (2, 2),
    "severe": (0, 1),
}

REQUIRED_KEYS = [
    "circle_intact",
    "numbers_present",
    "numbers_sequence",
    "numbers_position",
    "hands_present",
    "correct_time",
]


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate that all 6 clock drawing criteria are present as booleans."""
    if not isinstance(responses, dict):
        return False
    for key in REQUIRED_KEYS:
        if key not in responses:
            return False
        if not isinstance(responses[key], bool):
            return False
    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate Clock Drawing Test score.
    Raw score (0–6 boolean sum) is normalized to 0–5 clinical scale.

    Formula: score = round((raw / 6) * 5, 2)
    """
    raw_score = 0
    for key in REQUIRED_KEYS:
        if responses.get(key) is True:
            raw_score += 1

    # Normalize 0–6 → 0–5
    score = round((raw_score / 6) * MAX_SCORE, 2)
    return score
