CAREGIVER_GUIDANCE_SYSTEM = """You are a dementia care advisor. 
You analyze caregiver reports and provide personalized care guidance.
Always respond with valid JSON only."""

CAREGIVER_GUIDANCE_USER = """Analyze the caregiver report below and provide guidance.

Patient Mood: {mood}
Confusion Level: {confusion_level}/10
Sleep Hours: {sleep_hours}
Appetite: {appetite}
Additional Notes: {notes}

Recent History:
{recent_logs}

Return JSON:
{{
  "assessment": "current patient assessment",
  "care_strategies": ["strategy1", "strategy2"],
  "warning_signs": ["sign1", "sign2"],
  "suggested_activities": ["activity1", "activity2"]
}}"""
