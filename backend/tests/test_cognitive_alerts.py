import pytest
from app.services.alert_service import evaluate_event

def test_cognitive_decline_alert():
    patient_id = "pat_1"
    # 6 scores: [recent_3] and [previous_3]
    # recent = 60+68+72 / 3 = 66.6
    # previous = 80+82+85 / 3 = 82.3
    # drop = 15.6 -> should trigger critical alert
    scores = [60, 68, 72, 80, 82, 85]
    
    alerts = evaluate_event(patient_id, "cognitive", {"recent_scores": scores})
    
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["alert_type"] == "score_decline"
    assert alert["severity"] == "critical"
    assert "decline trend" in alert["message"]

def test_cognitive_stable_no_alert():
    patient_id = "pat_1"
    # recent = 74+73+71 / 3 = 72.6
    # previous = 72+70+71 / 3 = 71
    # no drop
    scores = [74, 73, 71, 72, 70, 71]
    
    alerts = evaluate_event(patient_id, "cognitive", {"recent_scores": scores})
    
    assert len(alerts) == 0

def test_cognitive_not_enough_scores():
    patient_id = "pat_1"
    scores = [70, 72, 71, 73, 74] # Only 5 scores
    
    alerts = evaluate_event(patient_id, "cognitive", {"recent_scores": scores})
    
    assert len(alerts) == 0
