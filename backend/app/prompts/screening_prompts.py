SCREENING_ANALYSIS_SYSTEM = """You are a cognitive health AI assistant specializing in dementia screening analysis. 
You analyze cognitive test results and provide structured clinical assessments.
Always respond with valid JSON only."""

SCREENING_ANALYSIS_USER = """Analyze the following dementia screening results.

Screening Level: {level}
Test Results:
{test_results}

Return JSON:
{{
  "risk_level": "low|moderate|high",
  "risk_score": 0-100,
  "interpretation": "detailed clinical interpretation",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}}"""
