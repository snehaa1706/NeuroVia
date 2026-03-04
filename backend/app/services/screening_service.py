"""Screening scoring engine.

Calculates scores for each test type based on responses.
"""

from app.models.screening import TestType


def score_ad8(responses: dict) -> tuple[float, float]:
    """Score the AD8 questionnaire. Each 'yes' = 1 point. Score >= 2 suggests concern."""
    max_score = 8.0
    score = sum(1 for v in responses.values() if v in [True, "yes", 1])
    return float(score), max_score


def score_orientation(responses: dict) -> tuple[float, float]:
    """Score orientation questions. Each correct answer = 1 point."""
    max_score = 5.0  # date, day, month, year, place
    score = sum(1 for v in responses.values() if v in [True, "correct", 1])
    return float(score), max_score


def score_verbal_fluency(responses: dict) -> tuple[float, float]:
    """Score verbal fluency. Count of valid words in category."""
    max_score = 20.0  # typical ceiling
    words = responses.get("words", [])
    if isinstance(words, list):
        score = float(len(words))
    else:
        score = float(responses.get("count", 0))
    return min(score, max_score), max_score


def score_trail_making(responses: dict) -> tuple[float, float]:
    """Score trail making test. Based on time and errors."""
    max_score = 100.0
    time_seconds = responses.get("time_seconds", 300)
    errors = responses.get("errors", 0)

    # Lower time & fewer errors = higher score
    time_score = max(0, 100 - (time_seconds / 3))
    error_penalty = errors * 10
    score = max(0, time_score - error_penalty)
    return float(score), max_score


def score_clock_drawing(responses: dict) -> tuple[float, float]:
    """Score clock drawing test. Uses simplified scoring (0-10)."""
    max_score = 10.0
    # If AI has already scored it, use that score
    score = float(responses.get("score", 0))
    return min(score, max_score), max_score


def score_moca(responses: dict) -> tuple[float, float]:
    """Score MoCA-inspired tasks. Max 30 points."""
    max_score = 30.0
    score = float(responses.get("total_score", 0))
    return min(score, max_score), max_score


SCORING_FUNCTIONS = {
    TestType.ad8: score_ad8,
    TestType.orientation: score_orientation,
    TestType.verbal_fluency: score_verbal_fluency,
    TestType.trail_making: score_trail_making,
    TestType.clock_drawing: score_clock_drawing,
    TestType.moca: score_moca,
}


def calculate_score(test_type: TestType, responses: dict) -> tuple[float, float]:
    """Calculate score for a given test type and responses."""
    scoring_fn = SCORING_FUNCTIONS.get(test_type)
    if scoring_fn:
        return scoring_fn(responses)
    return 0.0, 0.0
