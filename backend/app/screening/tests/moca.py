from typing import Dict, Any

# MoCA (Montreal Cognitive Assessment) — Multi-domain cognitive screening.
# 7 domains with defined score ranges, composite score 0–30.
# Score < 26 suggests cognitive impairment.

MAX_SCORE = 30.0

SEVERITY_THRESHOLDS = {
    "normal": (26, 30),
    "mild": (18, 25),
    "moderate": (10, 17),
    "severe": (0, 9),
}

# Domain name → (min, max) allowed score range
DOMAIN_RANGES = {
    "visuospatial": (0, 5),
    "naming": (0, 3),
    "attention": (0, 6),
    "language": (0, 3),
    "abstraction": (0, 2),
    "recall": (0, 5),
    "orientation": (0, 6),
}


def validate_responses(responses: Dict[str, Any]) -> bool:
    """Validate that all 7 MoCA domains are present with values in allowed ranges."""
    if not isinstance(responses, dict):
        return False

    for domain, (min_val, max_val) in DOMAIN_RANGES.items():
        if domain not in responses:
            return False
        value = responses[domain]
        if not isinstance(value, int):
            return False
        if value < min_val or value > max_val:
            return False

    return True


def calculate_score(responses: Dict[str, Any]) -> float:
    """
    Calculate MoCA composite score.
    Returns the sum of all domain scores (0–30).
    """
    score = 0
    for domain in DOMAIN_RANGES:
        score += responses.get(domain, 0)
    return float(score)
