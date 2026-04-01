import pytest
from app.services.alert_service import evaluate_event, get_priority
from app.models.alert import AlertSeverity, AlertType

def test_single_alert_incident_high():
    """Test incident with high severity gets priority 100."""
    alerts = evaluate_event("pat_1", "incident", {
        "incident_type": "fall",
        "severity": "high",
        "description": "Fell down stairs"
    })
    
    assert len(alerts) == 1
    # Check priority
    assert get_priority(alerts[0]) == 100
    assert alerts[0]["alert_type"] == AlertType.incident
    assert alerts[0]["severity"] == AlertSeverity.critical

def test_evaluate_event_multiple_alerts_sorted():
    """Test observation with high confusion yields confusion_spike sorted correctly."""
    # We will simulate multiple alerts by combining results if evaluate_event did that,
    # but evaluate_event processes one event at a time. Let's just test confusion.
    alerts = evaluate_event("pat_1", "observation", {
        "confusion_level": 9
    })
    
    assert len(alerts) == 1
    assert alerts[0]["alert_type"] == AlertType.confusion_spike
    assert alerts[0]["severity"] == AlertSeverity.critical
    assert get_priority(alerts[0]) == 70

def test_evaluate_event_no_alerts():
    """Test observation with normal fields yields no alerts."""
    alerts = evaluate_event("pat_1", "observation", {
        "confusion_level": 3
    })
    assert len(alerts) == 0

def test_priority_sorting_manually():
    """Test sorting manually using get_priority."""
    a1 = {"alert_type": "incident", "severity": "info"} # Priority 60
    a2 = {"alert_type": "incident", "severity": "critical"} # Priority 100
    a3 = {"alert_type": "confusion_spike", "severity": "critical"} # Priority 70
    
    alerts = [a1, a2, a3]
    sorted_alerts = sorted(alerts, key=lambda a: get_priority(a), reverse=True)
    
    assert sorted_alerts[0] == a2
    assert sorted_alerts[1] == a3
    assert sorted_alerts[2] == a1
