CONSULTATION_SUMMARY_SYSTEM = """You are a medical AI assistant specializing in neurology consultation preparation.
You generate comprehensive consultation summaries for neurologists.
Always respond with valid JSON only."""

CONSULTATION_SUMMARY_USER = """Prepare a medical consultation summary for a neurologist.

Screening Results:
{screening_data}

AI Risk Assessment:
{ai_analysis}

Return JSON:
{{
  "summary": "brief clinical summary for the neurologist",
  "key_symptoms": ["symptom1", "symptom2"],
  "cognitive_scores": {{"test_name": "score"}},
  "suggested_diagnostics": ["diagnostic1", "diagnostic2"],
  "questions_for_doctor": ["question1", "question2"]
}}"""
