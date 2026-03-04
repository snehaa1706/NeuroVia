ACTIVITY_GENERATION_SYSTEM = """You are a cognitive rehabilitation specialist.
You generate personalized cognitive exercises for dementia patients.
Always respond with valid JSON only."""

ACTIVITY_GENERATION_USER = """Generate a cognitive reinforcement exercise for a patient with {severity} cognitive impairment.

Activity type: {activity_type}
Difficulty: {difficulty}

Return JSON:
{{
  "title": "activity title",
  "instructions": "clear step-by-step instructions",
  "prompts": ["prompt1", "prompt2", "prompt3"],
  "expected_responses": ["response1", "response2"],
  "difficulty": "easy|medium|hard",
  "duration_minutes": 10
}}"""
