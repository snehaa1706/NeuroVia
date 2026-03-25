from typing import Dict, Any

# Trail Making Test — Measures processing speed and executive function.
# Part A: connect numbers in order. Part B: alternate numbers and letters.
# Scoring is time-based with error penalty (deterministic formula).

MAX_SCORE = 100.0

SEVERITY_THRESHOLDS = {
    "normal": (70, 100),
    "mild": (50, 69),
    "moderate": (30, 49),
    "severe": (0, 29),
}

ALLOWED_PARTS = ["A", "B"]


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate trail making test response structure."""
    if not isinstance(responses, dict):
        return False

    # completion_time_seconds must be a positive number
    if "completion_time_seconds" not in responses:
        return False
    time_val = responses["completion_time_seconds"]
    if not isinstance(time_val, (int, float)):
        return False
    if time_val <= 0:
        return False

    # errors must be a non-negative integer
    if "errors" not in responses:
        return False
    errors_val = responses["errors"]
    if not isinstance(errors_val, int):
        return False
    if errors_val < 0:
        return False

    # part must be "A" or "B"
    if "part" not in responses:
        return False
    if responses["part"] not in ALLOWED_PARTS:
        return False

    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate Trail Making Test score using deterministic formula.

    Formula:
        base_score = 100 - (completion_time_seconds * 0.5)
        error_penalty = errors * 5
        score = clamp(base_score - error_penalty, 0, 100)
    """
    completion_time = responses.get("completion_time_seconds", 0)
    errors = responses.get("errors", 0)

    base_score = 100 - (completion_time * 0.5)
    error_penalty = errors * 5

    score = base_score - error_penalty
    score = max(0.0, min(score, MAX_SCORE))

    return round(score, 2)
