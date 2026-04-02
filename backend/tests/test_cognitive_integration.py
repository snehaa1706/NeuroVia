import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_generate_guidance_ai_sanitization():
    """Verify AI context contains sanitized cognitive data and excludes raw data."""
    with patch("app.services.caregiver_service.validate_assignment"), \
         patch("app.services.caregiver_service.get_supabase") as mock_get_supabase, \
         patch("app.services.caregiver_service._get_medication_adherence") as mock_meds, \
         patch("app.services.caregiver_service._get_activity_summary") as mock_acts, \
         patch("app.services.ai_service.generate_caregiver_guidance") as mock_ai_call, \
         patch("app.services.cognitive_service.compute_cognitive_summary") as mock_compute:
         
        # Mock dependencies perfectly
        mock_meds.return_value = MagicMock(taken=5, missed=0, rate=100.0)
        mock_acts.return_value = MagicMock(completed=2, avg_score=5.0)
        
        # The key assertion: mock compute_cognitive_summary heavily
        mock_compute.return_value = {
            "avg_score": 75.5,
            "latest_score": 60.0,
            "trend": "declining",
            "recent_scores": [60.0, 70.0, 75.0, 80.0, 85.0, 90.0, 95.0] # 7 scores
        }
        
        # Database mocks simply to bypass cache and logs queries
        sb = MagicMock()
        mock_get_supabase.return_value = sb
        table_mock = MagicMock()
        sb.table.return_value = table_mock
        table_mock.select.return_value.eq.return_value.is_.return_value.gte.return_value.order.return_value.limit.return_value.execute.side_effect = [
            MagicMock(data=[]), # no cache
        ]
        # Additional table execute bypasses for logs, incs
        table_mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.side_effect = [
            MagicMock(data=[]), # logs
            MagicMock(data=[]), # incs
        ]
        
        mock_ai_call.return_value = {
            "risk_level": "high", "guidance": "Test", "recommended_actions": [],
            "assessment": "", "care_strategies": [], "warning_signs": []
        }
        
        from app.services.caregiver_service import generate_guidance
        await generate_guidance("cg_1", "pat_1")
        
        # Assert what was passed to generate_caregiver_guidance!
        assert mock_ai_call.called
        kwargs = mock_ai_call.call_args.kwargs
        cognitive_summary = kwargs.get("cognitive_summary")
        
        # It MUST include avg_score, trend, and recent_scores (Capped at 5!)
        assert cognitive_summary is not None
        assert cognitive_summary["avg_score"] == 75.5
        assert cognitive_summary["trend"] == "declining"
        assert len(cognitive_summary["recent_scores"]) == 5 # Strict cap enforced
        
        # MUST NOT include raw test_config or response JSON anywhere down the chain
        assert "test_config" not in cognitive_summary
