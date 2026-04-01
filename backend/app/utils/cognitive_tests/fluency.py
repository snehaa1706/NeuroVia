from typing import Any, Dict, Tuple

# A reasonable expected cap for maximum fluency words
MAX_FLUENCY_WORDS = 16
MAX_SCORE = 100.0


def validate_responses(responses: Dict[str, Any]) -> bool:
    if "words" not in responses:
        return False

    words = responses["words"]
    if not isinstance(words, list):
        return False

    # Strings only allowed
    for w in words:
        if not isinstance(w, str) or w is None:
            return False

    return True


def calculate_score(responses: Dict[str, Any], test_config: Dict[str, Any]) -> Tuple[float, dict]:
    # Fluency just wants sheer unique volume
    actual_words = [str(w).strip().lower() for w in responses.get("words", [])]

    # Empty list → 0
    if not actual_words:
        return 0.0, {"unique_count": 0, "duplicates_removed": 0, "max_possible": MAX_FLUENCY_WORDS}

    # Remove duplicates
    unique_words = set(actual_words)
    duplicates_removed = len(actual_words) - len(unique_words)

    score = (len(unique_words) / MAX_FLUENCY_WORDS) * MAX_SCORE
    score = min(score, MAX_SCORE)

    components = {
        "unique_count": len(unique_words),
        "duplicates_removed": duplicates_removed,
        "max_possible": MAX_FLUENCY_WORDS,
        "unique_words": sorted(list(unique_words)),
    }
    return score, components
