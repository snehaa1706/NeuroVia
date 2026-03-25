from typing import Dict, Any

# AD8 (Ascertain Dementia 8) - A brief informant interview to detect dementia
# Raw scoring: 1 point for every "Yes, a change" answer.
# Score >= 2 suggests cognitive impairment.

MAX_SCORE = 8.0

SEVERITY_THRESHOLDS = {
    "normal": (0, 1),
    "mild": (2, 3),
    "moderate": (4, 5),
    "severe": (6, 8),
}


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate that the given responses contain all 8 required AD8 questions."""
    required_keys = [f"q{i}" for i in range(1, 9)]
    for key in required_keys:
        if key not in responses:
            return False
        # Ensure answers are standard AD8 options (Yes, No, N/A)
        if responses[key] not in ["Yes", "No", "N/A"]:
            return False
    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate the AD8 raw score.
    Returns the sum of all 'Yes' answers (0-8).
    """
    score = 0
    for key in [f"q{i}" for i in range(1, 9)]:
        if responses.get(key) == "Yes":
            score += 1
    return float(score)
