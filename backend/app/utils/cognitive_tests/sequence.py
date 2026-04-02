from typing import Any, Dict, Tuple

MAX_SCORE = 100.0


def validate_responses(responses: Dict[str, Any]) -> bool:
    if "sequence" not in responses:
        return False

    seq = responses["sequence"]
    if not isinstance(seq, list):
        return False

    return True


def calculate_score(responses: Dict[str, Any], test_config: Dict[str, Any]) -> Tuple[float, dict]:
    expected_seq = test_config.get("sequence", [])
    if not expected_seq:
        return 0.0, {"correct_positions": 0, "expected_length": 0, "submitted_length": 0}

    actual_seq = responses.get("sequence", [])

    correct_positions = 0
    # Pair items up to the shortest length
    for exp, act in zip(expected_seq, actual_seq):
        if str(exp).strip().lower() == str(act).strip().lower():
            correct_positions += 1

    score = (correct_positions / len(expected_seq)) * MAX_SCORE
    score = min(score, MAX_SCORE)

    components = {
        "correct_positions": correct_positions,
        "expected_length": len(expected_seq),
        "submitted_length": len(actual_seq),
    }
    return score, components
