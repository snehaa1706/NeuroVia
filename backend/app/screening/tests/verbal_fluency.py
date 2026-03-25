from typing import Dict, Any

# Verbal Fluency Test — Patient names as many words in a category within 60 seconds.
# Score = count of unique valid words (lowercase, stripped, non-empty, deduplicated).
# Practical ceiling: 30 words.

MAX_SCORE = 30.0

SEVERITY_THRESHOLDS = {
    "normal": (18, 30),
    "mild": (14, 17),
    "moderate": (10, 13),
    "severe": (0, 9),
}


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate verbal fluency response structure."""
    if not isinstance(responses, dict):
        return False

    # 'words' must be a list
    if "words" not in responses or not isinstance(responses["words"], list):
        return False

    # All entries in 'words' must be strings
    for word in responses["words"]:
        if not isinstance(word, str):
            return False

    # 'category' must be a non-empty string
    if "category" not in responses or not isinstance(responses["category"], str):
        return False
    if responses["category"].strip() == "":
        return False

    # 'time_seconds' must be a number <= 60
    if "time_seconds" not in responses:
        return False
    time_val = responses["time_seconds"]
    if not isinstance(time_val, (int, float)):
        return False
    if time_val <= 0 or time_val > 60:
        return False

    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate verbal fluency score.
    Normalizes words (lowercase, strip), removes duplicates and empty strings.
    Returns the count of unique valid words, capped at MAX_SCORE.
    """
    raw_words = responses.get("words", [])

    # Normalize: lowercase, strip whitespace
    normalized = [w.strip().lower() for w in raw_words]

    # Remove empty strings and duplicates
    unique_valid = set(w for w in normalized if w != "")

    score = float(len(unique_valid))
    return min(score, MAX_SCORE)
