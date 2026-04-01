from typing import Any, Dict, Tuple

MAX_SCORE = 100.0


def validate_responses(responses: Dict[str, Any]) -> bool:
    if "words" not in responses:
        return False

    words = responses["words"]
    if not isinstance(words, list):
        return False

    for w in words:
        if not isinstance(w, str) or w is None:
            return False

    return True


def calculate_score(responses: Dict[str, Any], test_config: Dict[str, Any]) -> Tuple[float, dict]:
    expected_words = test_config.get("words", [])
    if not expected_words:
        return 0.0, {"words_recalled": 0, "expected": 0, "correct_words": []}

    actual_words = [str(w).strip().lower() for w in responses.get("words", [])]

    # Remove duplicates from actual words
    unique_actual = set(actual_words)
    unique_expected = set(str(w).strip().lower() for w in expected_words)

    correct_matches = unique_actual.intersection(unique_expected)

    # Normalize score out of 100
    score = (len(correct_matches) / len(unique_expected)) * MAX_SCORE
    score = round(min(score, MAX_SCORE), 2)

    components = {
        "words_recalled": len(correct_matches),
        "expected": len(unique_expected),
        "correct_words": sorted(list(correct_matches)),
    }
    return score, components

