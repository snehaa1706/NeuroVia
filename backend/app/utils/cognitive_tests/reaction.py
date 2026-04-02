from typing import Any, Dict, Tuple

MAX_SCORE = 100.0
SCALING_FACTOR = 50.0  # Defines how harsh the penalty is per millisecond. 1000ms reduces score by 20. 5000ms reduces by 100.


def validate_responses(responses: Dict[str, Any]) -> bool:
    if "reaction_time_ms" not in responses:
        return False

    time_ms = responses["reaction_time_ms"]

    if not isinstance(time_ms, (int, float)):
        return False

    if time_ms <= 0:
        return False

    if time_ms > 10000:  # Over 10 seconds is unrealistic / invalid
        return False

    return True


def calculate_score(responses: Dict[str, Any], test_config: Dict[str, Any]) -> Tuple[float, dict]:
    time_ms = responses.get("reaction_time_ms", 5000)

    clamped = False
    # Extremely fast clamp -> considered unrealistic cheat or maxed perfection
    if time_ms < 100:
        clamped = True
        score = MAX_SCORE
    else:
        score = max(0.0, MAX_SCORE - (time_ms / SCALING_FACTOR))
        score = min(score, MAX_SCORE)

    components = {
        "reaction_time_ms": time_ms,
        "clamped_to_max": clamped,
    }
    return score, components
