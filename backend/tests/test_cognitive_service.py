import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.services.cognitive_service import (
    start_session,
    submit_test,
    get_cognitive_history,
    compute_cognitive_summary
)
from app.models.cognitive import SessionStartRequest, TestSubmissionRequest, TestType, Difficulty

def mock_supabase_builder(*args, **kwargs):
    mock = MagicMock()
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.single.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    return mock

@pytest.fixture
def sb_mock():
    with patch("app.services.cognitive_service.get_supabase") as mock_get_supabase:
        sb = MagicMock()
        mock_get_supabase.return_value = sb
        yield sb

# ====================
# SESSION LIFECYCLE
# ====================

def test_start_session(sb_mock):
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    mock_response = MagicMock(data=[{"id": "session_123", "status": "in_progress", "test_config": {"words": ["apple", "chair", "blue"]}}])
    table_mock.execute.return_value = mock_response
    
    payload = SessionStartRequest(test_type=TestType.memory_recall, difficulty=Difficulty.easy)
    res = start_session("pat_1", payload)
    
    assert res["status"] == "in_progress"
    assert "test_config" in res
    assert table_mock.insert.called

def test_submit_test_success(sb_mock):
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    session_res = MagicMock(data={"id": "session_123", "patient_id": "pat_1", "status": "in_progress", "test_type": "memory_recall", "test_config": {"words": ["apple", "blue", "chair"]}, "started_at": datetime.now(timezone.utc).isoformat()})
    result_insert_res = MagicMock(data=[{"id": "res_1", "score": 100.0}])
    update_res = MagicMock()
    # session fetch, result insert, session update, cache recompute (results query), cache upsert
    cache_recompute_res = MagicMock(data=[{"score": 100.0}])
    cache_upsert_res = MagicMock()
    
    table_mock.execute.side_effect = [session_res, result_insert_res, update_res, cache_recompute_res, cache_upsert_res]
    
    payload = TestSubmissionRequest(responses={"words": ["apple", "blue", "chair"]}, time_taken_seconds=10)
    res = submit_test("pat_1", "session_123", payload)
    
    assert res["score"] == 100.0
    assert table_mock.update.called

def test_submit_duplicate(sb_mock):
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    session_res = MagicMock(data={"id": "session_123", "patient_id": "pat_1", "status": "completed", "test_type": "memory_recall", "test_config": {}})
    table_mock.execute.return_value = session_res
    
    payload = TestSubmissionRequest(responses={}, time_taken_seconds=10)
    
    with pytest.raises(HTTPException) as excinfo:
        submit_test("pat_1", "session_123", payload)
    assert excinfo.value.status_code == 409
    assert "already completed" in excinfo.value.detail

def test_session_not_found(sb_mock):
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    table_mock.execute.return_value = MagicMock(data=None)
    payload = TestSubmissionRequest(responses={}, time_taken_seconds=10)
    
    with pytest.raises(HTTPException) as excinfo:
        submit_test("pat_1", "invalid_id", payload)
    assert excinfo.value.status_code == 404

# ====================
# SCORING CORRECTNESS
# ====================

def test_memory_scoring():
    import app.utils.cognitive_tests.memory as memory_test
    config = {"words": ["apple", "chair", "blue"]}
    res = {"words": ["apple", "blue"]}
    
    assert memory_test.validate_responses(res) == True
    score, components = memory_test.calculate_score(res, config)
    assert score == 66.67  # 2/3
    assert components["words_recalled"] == 2
    assert components["expected"] == 3

def test_fluency_scoring():
    import app.utils.cognitive_tests.fluency as fluency_test
    config = {"category": "animals"}
    res = {"words": ["dog", "cat", "dog", "lion"]}
    
    assert fluency_test.validate_responses(res) == True
    score, components = fluency_test.calculate_score(res, config)
    assert score == 18.75  # 3 unique words -> 3 * 6.25 = 18.75 (maxes at 16)
    assert components["unique_count"] == 3
    assert components["duplicates_removed"] == 1
    
def test_reaction_scoring():
    import app.utils.cognitive_tests.reaction as reaction_test
    config = {}
    res = {"reaction_time_ms": 400}
    
    assert reaction_test.validate_responses(res) == True
    score, components = reaction_test.calculate_score(res, config)
    assert 50 < score <= 100  # Normalization logic check
    assert components["reaction_time_ms"] == 400
    assert components["clamped_to_max"] == False

def test_sequence_scoring():
    import app.utils.cognitive_tests.sequence as sequence_test
    config = {"sequence": [1, 4, 7, 2]}
    res = {"sequence": [1, 4, 6, 2]}
    
    assert sequence_test.validate_responses(res) == True
    score, components = sequence_test.calculate_score(res, config)
    assert score == 75.0  # 3 out of 4 matching directly
    assert components["correct_positions"] == 3
    assert components["expected_length"] == 4


# ====================
# EDGE CASE TESTS
# ====================

def test_expired_session(sb_mock):
    """Sessions older than 30 minutes should be rejected."""
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    # Session started 31 minutes ago
    from datetime import datetime, timezone, timedelta
    old_start = (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat()
    
    session_res = MagicMock(data={
        "id": "session_expired", "patient_id": "pat_1", "status": "in_progress",
        "test_type": "memory_recall", "test_config": {"words": ["apple"]},
        "started_at": old_start,
    })
    update_res = MagicMock()  # for the expiration update
    table_mock.execute.side_effect = [session_res, update_res]
    
    payload = TestSubmissionRequest(responses={"words": ["apple"]}, time_taken_seconds=10)
    
    with pytest.raises(HTTPException) as excinfo:
        submit_test("pat_1", "session_expired", payload)
    assert excinfo.value.status_code == 400
    assert "expired" in excinfo.value.detail.lower()


def test_submit_duplicate_returns_409(sb_mock):
    """Submitting to an already-completed session should be HTTP 409."""
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    session_res = MagicMock(data={
        "id": "session_done", "patient_id": "pat_1", "status": "completed",
        "test_type": "memory_recall", "test_config": {},
    })
    table_mock.execute.return_value = session_res
    
    payload = TestSubmissionRequest(responses={"words": ["apple"]}, time_taken_seconds=5)
    
    with pytest.raises(HTTPException) as excinfo:
        submit_test("pat_1", "session_done", payload)
    assert excinfo.value.status_code == 409


def test_summary_cache_updated_on_submit(sb_mock):
    """Verify _update_summary_cache is called after successful submission."""
    table_mock = mock_supabase_builder()
    sb_mock.table.return_value = table_mock
    
    session_res = MagicMock(data={
        "id": "session_cache", "patient_id": "pat_1", "status": "in_progress",
        "test_type": "memory_recall", "test_config": {"words": ["apple", "chair"]},
        "started_at": datetime.now(timezone.utc).isoformat(),
    })
    result_insert_res = MagicMock(data=[{"id": "res_c", "score": 50.0}])
    update_res = MagicMock()
    cache_recompute_res = MagicMock(data=[{"score": 50.0}])
    cache_upsert_res = MagicMock()
    
    table_mock.execute.side_effect = [session_res, result_insert_res, update_res, cache_recompute_res, cache_upsert_res]
    
    payload = TestSubmissionRequest(responses={"words": ["apple"]}, time_taken_seconds=8)
    submit_test("pat_1", "session_cache", payload)
    
    # Check that the cache table was accessed (upsert call)
    table_calls = [str(call) for call in sb_mock.table.call_args_list]
    assert any("cognitive_summary_cache" in c for c in table_calls)
