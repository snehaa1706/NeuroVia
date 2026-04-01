import pytest
import asyncio
from unittest.mock import patch
from app.services.ai_service import generate_caregiver_guidance

@pytest.mark.asyncio
async def test_ai_valid_response():
    """Test valid structured JSON response from AI."""
    async def mock_success(*args, **kwargs):
        return {
            "risk_level": "low",
            "guidance": "Test guidance",
            "recommended_actions": ["Action 1"],
            "assessment": "Stable",
            "care_strategies": ["Strategy 1"],
            "warning_signs": ["None"]
        }

    with patch('app.services.ai_service._get_json_response', side_effect=mock_success):
        res = await generate_caregiver_guidance(
            confusion_trend=[],
            recent_incidents=[],
            medication_adherence="100%",
            activity_scores="5",
            mood="happy",
            notes="good",
            recent_logs="[]"
        )
        assert res["risk_level"] == "low"
        assert res["guidance"] == "Test guidance"

@pytest.mark.asyncio
async def test_ai_invalid_response_fallback():
    """Test that a broken or throwing AI response falls back safely."""
    async def mock_fail(*args, **kwargs):
        raise ValueError("AI Down")

    with patch('app.services.ai_service._get_json_response', side_effect=mock_fail):
        res = await generate_caregiver_guidance(
            confusion_trend=[], recent_incidents=[], medication_adherence="", activity_scores="", mood="", notes="", recent_logs=""
        )
        assert res["risk_level"] == "medium"
        assert "Unable to generate guidance" in res["guidance"]

@pytest.mark.asyncio
async def test_ai_large_input_sanitization():
    """Test that large inputs are truncated inside the function implicitly via sanitizer."""
    # We just ensure it doesn't crash when passing massive strings.
    async def mock_success(*args, **kwargs):
        return {"risk_level": "low"} # Partial

    with patch('app.services.ai_service._get_json_response', side_effect=mock_success):
        res = await generate_caregiver_guidance(
            confusion_trend=[1]*100, # Large array
            recent_incidents=[],
            medication_adherence="",
            activity_scores="",
            mood="happy",
            notes="x" * 1000, # Large string
            recent_logs="[]"
        )
        assert res["risk_level"] == "low"
        assert res["guidance"] == "Unable to generate guidance at the moment." # Fallback for missing key filled in
