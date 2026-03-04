"""Alert service with rule-based triggers.

Rule-based alerts fire first; AI interprets only after.
"""

from app.models.alert import AlertType, AlertSeverity


def check_medication_alerts(
    patient_id: str, missed_count: int
) -> dict | None:
    """Generate alert if 2+ medications missed."""
    if missed_count >= 2:
        return {
            "patient_id": patient_id,
            "alert_type": AlertType.medication_missed,
            "severity": AlertSeverity.warning if missed_count < 4 else AlertSeverity.critical,
            "message": f"Patient has missed {missed_count} medication doses recently.",
        }
    return None


def check_confusion_alert(
    patient_id: str, confusion_level: int
) -> dict | None:
    """Generate alert if confusion level >= 8."""
    if confusion_level >= 8:
        return {
            "patient_id": patient_id,
            "alert_type": AlertType.confusion_spike,
            "severity": AlertSeverity.critical if confusion_level >= 9 else AlertSeverity.warning,
            "message": f"Patient confusion level is critically high ({confusion_level}/10).",
        }
    return None


def check_score_decline(
    patient_id: str,
    previous_score: float,
    current_score: float,
) -> dict | None:
    """Generate alert if cognitive score declined significantly."""
    if previous_score > 0 and current_score < previous_score * 0.75:
        decline_pct = round((1 - current_score / previous_score) * 100)
        return {
            "patient_id": patient_id,
            "alert_type": AlertType.score_decline,
            "severity": AlertSeverity.warning,
            "message": f"Cognitive score declined by {decline_pct}% compared to previous screening.",
        }
    return None


def check_incident_alert(patient_id: str, description: str) -> dict:
    """Always generate an alert for logged incidents."""
    return {
        "patient_id": patient_id,
        "alert_type": AlertType.incident,
        "severity": AlertSeverity.warning,
        "message": f"Incident reported: {description[:200]}",
    }
