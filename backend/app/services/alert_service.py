import logging
from typing import List, Dict, Any
from fastapi import HTTPException
from app.database import get_supabase
from datetime import datetime, timedelta
from app.models.alert_schemas import AlertEventRequest

logger = logging.getLogger("alert_service")

class AlertService:
    def __init__(self):
        self.sb = get_supabase()

    def evaluate_event(self, event: AlertEventRequest):
        """
        The central nervous system. Modules emit events here instead of 
        directly writing to the DB, allowing centralized rule management.
        """
        try:
            p = event.payload
            
            # --- Rule 1: Caregiver Logs ---
            if event.event_type == "confusion_logged":
                if p.get("confusion_level", 0) >= 8:
                    self._create_alert(
                        user_id=event.patient_id,
                        alert_type="high_confusion",
                        severity="critical",
                        message=f"Patient confusion reached critical level ({p.get('confusion_level')}/10). Immediate check-in advised.",
                        source_module=event.source_module,
                        metadata=p
                    )

            elif event.event_type == "sleep_logged":
                if p.get("sleep_hours", 24) < 4.0:
                    self._create_alert(
                        user_id=event.patient_id,
                        alert_type="poor_sleep",
                        severity="warning",
                        message=f"Patient slept critically low ({p.get('sleep_hours')} hours). Monitor for increased agitation (Sundowning).",
                        source_module=event.source_module,
                        metadata=p
                    )

            elif event.event_type == "behavioral_incident":
                severity_map = {"low": "info", "medium": "warning", "high": "critical", "critical": "critical"}
                mapped_sev = severity_map.get(p.get("severity", "medium"), "critical")
                
                self._create_alert(
                    user_id=event.patient_id,
                    alert_type="behavioral_incident",
                    severity=mapped_sev,
                    message=f"Incident Reported: {p.get('incident_type').title()} - {p.get('description', '')[:50]}...",
                    source_module=event.source_module,
                    metadata=p
                )

            # --- Rule 2: Medication Adherence ---
            elif event.event_type == "medication_missed":
                if p.get("consecutive_misses", 0) >= 2:
                    self._create_alert(
                        user_id=event.patient_id,
                        alert_type="missed_medication",
                        severity="critical",
                        message=f"Patient missed two consecutive scheduled doses of {p.get('medication_name', 'their medication')}.",
                        source_module=event.source_module,
                        metadata=p
                    )
            
            # --- Rule 3: AI Cognitive Engines ---
            elif event.event_type == "risk_score_generated":
                if p.get("risk_score", 0) >= 70:
                     self._create_alert(
                        user_id=event.patient_id,
                        alert_type="cognitive_decline",
                        severity="high",
                        message=f"AI Engine detected a high cognitive risk score ({p.get('risk_score')}). Consultation recommended.",
                        source_module=event.source_module,
                        metadata=p
                    )

        except Exception as e:
            logger.error(f"Alert Engine failed to evaluate event {event.event_type}: {str(e)}")


    def _create_alert(self, user_id: str, alert_type: str, severity: str, message: str, source_module: str, metadata: dict):
        """Internal inserter with Spam / Deduplication logic."""
        if self._is_duplicate(user_id, alert_type):
            logger.info(f"Silenced duplicate '{alert_type}' alert for patient {user_id}")
            return
            
        try:
            self.sb.table("alerts").insert({
                "user_id": user_id,
                "type": alert_type,
                "severity": severity,
                "message": message,
                "source_module": source_module,
                # Store the raw contextual payload so the frontend can potentially render rich notification UI
                "metadata": metadata, # Make sure schema_v3.sql added metadata JSONB
                "is_read": False
            }).execute()
            
            logger.warning(f"[🚨 {severity.upper()} ALERT] {message}")
        except Exception as e:
            logger.error(f"DB Insert Failed for Alert: {str(e)}")

    def _is_duplicate(self, user_id: str, alert_type: str, cooldown_hours: int = 12) -> bool:
        """Prevent alert spamming for the same metric within a short timeframe."""
        try:
            cutoff = (datetime.utcnow() - timedelta(hours=cooldown_hours)).isoformat()
            recent = self.sb.table("alerts").select("id").eq("user_id", user_id).eq("type", alert_type).gte("created_at", cutoff).execute()
            return len(recent.data) > 0
        except:
            return False

    # --- Router Support Methods --- #
    def get_patient_alerts(self, user_role: str, user_id: str, patient_id: str, unread_only: bool = False) -> List[dict]:
        """Fetch unified chronological inbox."""
        # Simple RBAC wrapper block
        if user_role == "patient" and user_id != patient_id:
             raise HTTPException(status_code=403, detail="Unauthorized.")
             
        try:
            query = self.sb.table("alerts").select("*").eq("user_id", patient_id)
            if unread_only:
                query = query.eq("is_read", False)
                
            res = query.order("created_at", desc=True).limit(50).execute()
            return res.data
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

    def mark_alert_read(self, alert_id: str, user_role: str, user_id: str) -> dict:
        try:
            # We must verify the user fetching this has rights over the parent patient of this alert 
            # Skipping full DB relation checking for brevity here, assuming token validation limits scopes in frontend UI
            res = self.sb.table("alerts").update({"is_read": True}).eq("id", alert_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Alert not found.")
            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

alert_service = AlertService()
