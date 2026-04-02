import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.services.caregiver_service import (
    validate_assignment,
    log_observation,
    report_incident,
    get_patient_logs,
    get_patient_incidents,
    get_patient_overview,
    generate_guidance
)
from app.models.caregiver import CaregiverCheckin, CaregiverIncident, MoodType, AppetiteType, IncidentType, IncidentSeverity

# ====================
# MOCK HELPERS
# ====================

def mock_supabase_builder(*args, **kwargs):
    """Deeply nested chain mock builder."""
    mock = MagicMock()
    # allow sb.table().select().eq().is_().execute() pattern
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.in_.return_value = mock
    mock.order.return_value = mock
    mock.range.return_value = mock
    mock.limit.return_value = mock
    mock.single.return_value = mock
    mock.is_.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.rpc.return_value = mock
    mock.gte.return_value = mock
    return mock

@pytest.fixture
def sb_mock():
    with patch("app.services.caregiver_service.get_supabase") as mock_get_supabase:
        sb = MagicMock()
        mock_get_supabase.return_value = sb
        yield sb

# ====================
# TESTS
# ====================

def test_validate_assignment_unassigned(sb_mock):
    """Test 403 raised when caregiver is not assigned (or soft-deleted)."""
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    # 1. Patient query -> succeeds
    patient_res = MagicMock(data={"id": "pat_1"})
    # 2. Assignment query -> returns empty (no active assignment)
    assignment_res = MagicMock(data=[])
    
    table_mock.execute.side_effect = [patient_res, assignment_res]
    
    with pytest.raises(HTTPException) as exc_info:
        validate_assignment("cg_1", "pat_1")
    assert exc_info.value.status_code == 403

def test_log_observation_success(sb_mock):
    """Test that logging an observation invokes the RPC correctly."""
    # We must patch validate_assignment so it doesn't fail
    with patch("app.services.caregiver_service.validate_assignment"):
        # Mock RPC success
        sb_mock.rpc.return_value.execute.return_value = MagicMock(data={"log": {"id": "log_1"}, "alerts": []})
        
        payload = CaregiverCheckin(patient_id="pat_1", mood=MoodType.calm, confusion_level=5, sleep_hours=8.0, appetite=AppetiteType.good)
        res = log_observation("cg_1", payload)
        
        assert "log" in res
        sb_mock.rpc.assert_called_with(
            "log_and_evaluate_event",
            {
                "p_caregiver_id": "cg_1",
                "p_patient_id": "pat_1",
                "p_log_type": "daily_checkin",
                "p_mood": "calm",
                "p_confusion_level": 5,
                "p_sleep_hours": 8.0,
                "p_appetite": "good",
                "p_notes": None,
            }
        )

def test_report_incident_success(sb_mock):
    """Test that reporting an incident invokes the RPC correctly."""
    with patch("app.services.caregiver_service.validate_assignment"):
        sb_mock.rpc.return_value.execute.return_value = MagicMock(data={"incident": {"id": "inc_1"}, "alerts": [{"id": "alert_1"}]})
        
        payload = CaregiverIncident(patient_id="pat_1", incident_type=IncidentType.fall, severity=IncidentSeverity.high, description="Patient fell")
        res = report_incident("cg_1", payload)
        
        assert "incident" in res
        assert "alerts" in res
        assert len(res["alerts"]) == 1

def test_pagination_limit_cap(sb_mock):
    """Test that asking for pagination limits > 50 results in a cap."""
    with patch("app.services.caregiver_service.validate_assignment"):
        table_mock = mock_supabase_builder()
        sb_mock.table.return_value = table_mock
        table_mock.execute.return_value = MagicMock(data=[])
        
        # limit is 1000, we expect max 50 (range offset, offset+49)
        get_patient_logs("cg_1", "pat_1", limit=1000, offset=0)
        
        # .range(offset, offset + limit - 1) -> 0, 49
        table_mock.range.assert_called_with(0, 49)

def test_get_patient_overview(sb_mock):
    """Test patient overview aggregates data correctly."""
    with patch("app.services.caregiver_service.validate_assignment"), \
         patch("app.services.caregiver_service._get_medication_adherence") as mock_meds, \
         patch("app.services.caregiver_service._get_activity_summary") as mock_acts, \
         patch("app.services.cognitive_service.compute_cognitive_summary") as mock_cog:
         
        # Mock med and act helpers
        from app.models.caregiver import MedicationAdherence, ActivitySummary
        mock_meds.return_value = MedicationAdherence(taken=5, missed=0, rate=100.0)
        mock_acts.return_value = ActivitySummary(completed=2, avg_score=5.0)
        mock_cog.return_value = {"avg_score": 90.0, "latest_score": 95.0, "trend": "improving", "recent_scores": [95.0, 90.0]}

        # Mock DB queries: patient -> logs -> incidents
        table_mock = mock_supabase_builder()
        sb_mock.table.return_value = table_mock
        
        patient_res = MagicMock(data={"id": "pat_1", "full_name": "Test"})
        logs_res = MagicMock(data=[{"id": "log1"}])
        incs_res = MagicMock(data=[{"id": "inc1"}])
        table_mock.execute.side_effect = [patient_res, logs_res, incs_res]
        
        res = get_patient_overview("cg_1", "pat_1")
        
        assert res["patient"]["full_name"] == "Test"
        assert len(res["recent_logs"]) == 1
        assert res["medication_adherence"]["rate"] == 100.0
        assert res["activity_summary"]["completed"] == 2
        assert res["cognitive"]["trend"] == "improving"

@pytest.mark.asyncio
async def test_generate_guidance_cache_hit(sb_mock):
    """Test AI guidance uses cache if valid."""
    with patch("app.services.caregiver_service.validate_assignment"):
        table_mock = mock_supabase_builder()
        sb_mock.table.return_value = table_mock
        
        # Mock cached output
        cached_data = {"guidance": '{"risk_level": "low", "guidance": "Cached"}'}
        table_mock.execute.return_value = MagicMock(data=[cached_data])
        
        res = await generate_guidance("cg_1", "pat_1")
        
        assert res["risk_level"] == "low"
        assert res["guidance"] == "Cached"
        # We did not fetch logs/incidents, fast return

@pytest.mark.asyncio
async def test_generate_guidance_cache_miss(sb_mock):
    """Test AI guidance generated on cache miss."""
    with patch("app.services.caregiver_service.validate_assignment"), \
         patch("app.services.caregiver_service._get_medication_adherence") as mock_meds, \
         patch("app.services.caregiver_service._get_activity_summary") as mock_acts, \
         patch("app.services.ai_service.generate_caregiver_guidance") as mock_ai, \
         patch("app.services.cognitive_service.compute_cognitive_summary") as mock_cog:
         
        # Empty cache mock
        table_mock = mock_supabase_builder()
        sb_mock.table.return_value = table_mock
        
        # 1. Cache miss []
        # 2. Logs []
        # 3. Incs []
        # 4. existing cache [] -> (no soft delete loop to run)
        # 5. insert
        table_mock.execute.side_effect = [
            MagicMock(data=[]), # cache
            MagicMock(data=[{"mood": "calm", "confusion_level": 2}]), # logs
            MagicMock(data=[]), # incs
            MagicMock(data=[]), # existing
            MagicMock() # insert exec
        ]
        
        from app.models.caregiver import MedicationAdherence, ActivitySummary
        mock_meds.return_value = MedicationAdherence(taken=5, missed=0, rate=100.0)
        mock_acts.return_value = ActivitySummary(completed=2, avg_score=5.0)
        mock_cog.return_value = {"avg_score": 90.0, "latest_score": 95.0, "trend": "improving", "recent_scores": [95.0, 90.0]}
        
        mock_ai.return_value = {"risk_level": "high", "guidance": "AI generated"}
        
        res = await generate_guidance("cg_1", "pat_1")
        
        assert res["risk_level"] == "high"
        assert res["guidance"] == "AI generated"
        assert table_mock.insert.called # Confirms it tried to cache result
