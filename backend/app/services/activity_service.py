"""Activity service for generating and managing cognitive exercises."""

from app.services.ai_service import generate_activity as ai_generate_activity


async def create_activity(
    activity_type: str,
    difficulty: str = "easy",
    severity: str = "mild",
) -> dict:
    """Generate a cognitive activity using the AI service."""
    return await ai_generate_activity(activity_type, difficulty, severity)


def evaluate_activity_result(
    activity_content: dict, user_responses: dict
) -> tuple[float, str]:
    """Basic evaluation of activity results. Returns (score, feedback)."""
    expected = activity_content.get("expected_responses", [])
    prompts = activity_content.get("prompts", [])

    if not expected or not prompts:
        return 0.0, "Activity completed. Great effort!"

    total = len(expected)
    correct = 0

    user_answers = list(user_responses.values())
    for i, exp in enumerate(expected):
        if i < len(user_answers):
            if str(user_answers[i]).lower().strip() == str(exp).lower().strip():
                correct += 1

    score = (correct / total) * 100 if total > 0 else 0
    if score >= 80:
        feedback = "Excellent performance! Your memory skills are strong."
    elif score >= 50:
        feedback = "Good effort! Keep practicing to strengthen your cognitive abilities."
    else:
        feedback = "Keep trying! Regular practice will help improve your skills."

    return score, feedback
