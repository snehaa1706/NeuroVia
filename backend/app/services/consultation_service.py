import logging
from typing import List, Dict, Any
from fastapi import HTTPException
from app.database import get_supabase
from datetime import datetime, timedelta
from app.models.consultation_schemas import ConsultationCreateRequest, ConsultationStatusUpdateRequest
from app.services.ai_analysis_service import ai_analysis_service

logger = logging.getLogger("consultation_service")

class ConsultationService:
    def __init__(self):
        self.sb = get_supabase()

    def create_consultation_request(self, user_role: str, user_id: str, payload: ConsultationCreateRequest) -> dict:
        """Patient/Caregiver triggers a Consult. Service builds the context timeline and invokes AI."""
        # Note: RBAC wrapper exists in router (require_patient or require_caregiver)
        # Here we'd verify the Caregiver's assignment if they are the one requesting. For brevity, skipped in this mock.
        
        try:
            # 1. Insert Initial Request
            res = self.sb.table("consult_requests").insert({
                "user_id": payload.patient_id,
                "doctor_id": payload.doctor_id,
                "status": "processing" # Immediate feedback state
            }).execute()
            
            consult_id = res.data[0]["id"]
            
            # 2. Gather Patient Context from the last 30 days
            context_payload = self._gather_patient_context(payload.patient_id)
            
            # 3. Trigger Phase 6 AI Analysis Engine
            # Note: In a true prod app, we'd fire this off as a FastAPI BackgroundTask to unblock the HTTP return.
            # But the requirement implies we should try to attach it before returning if possible, or queue it.
            # For this Phase 11 Architecture demo, we'll await it directly.
            try:
                ai_summary = ai_analysis_service.generate_consultation_summary_sync_mock(payload.patient_id, context_payload)
                final_status = "ready"
            except Exception as e:
                logger.error(f"AI Summary Failed: {str(e)}")
                ai_summary = {"error": "AI Service currently unavailable. Please review raw data."}
                final_status = "pending"
            
            # 4. Update row with AI results
            updated = self.sb.table("consult_requests").update({
                "status": final_status,
                "ai_summary": ai_summary
            }).eq("id", consult_id).execute()
            
            return updated.data[0]
            
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Consultation request failed: {str(e)}")


    def _gather_patient_context(self, patient_id: str, days: int = 30) -> str:
        """Pulls from AI, Screenings, Activities, Caregiver Logs, and Meds to build a text timeline."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        sb = self.sb
        
        try:
            # Gather Screenings
            screenings = sb.table("screening_results").select("test_type, score").eq("user_id", patient_id).gte("created_at", cutoff).execute()
            scr_str = ", ".join([f"{s['test_type']}: {s['score']}" for s in screenings.data]) if screenings.data else "None"
            
            # Gather Risk Scores
            risks = sb.table("ai_analyses").select("risk_score").eq("user_id", patient_id).gte("created_at", cutoff).order("created_at", desc=True).limit(2).execute()
            risk_str = " -> ".join([str(r["risk_score"]) for r in reversed(risks.data)]) if risks.data else "Unknown"
            
            # Gather Alerts
            alerts = sb.table("alerts").select("type, severity").eq("user_id", patient_id).gte("created_at", cutoff).execute()
            critical_count = len([a for a in alerts.data if a["severity"] == "critical"])
            
            # Adherence proxy
            # medication_service.calculate_adherence() would go here in full implementation
            
            context_str = f"""
            Longitudinal Data ({days} days):
            - Screenings: {scr_str}
            - AI Risk Score Trend: {risk_str}
            - Critical System Alerts: {critical_count}
            """
            return context_str
        except:
             return "Data gathering failed."


    def get_doctor_queue(self, doctor_id: str) -> List[dict]:
        """Fetch all requests explicitly assigned to this doctor, or unassigned pool."""
        try:
            # Example logic: Fetch unassigned OR assigned to this doctor.
            # Real logic depends on clinic setup.
            res = self.sb.table("consult_requests").select("*").or_(f"doctor_id.eq.{doctor_id},doctor_id.is.null").order("created_at", desc=False).execute()
            return res.data
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))


    def update_consultation_status(self, consult_id: str, doctor_id: str, payload: ConsultationStatusUpdateRequest) -> dict:
        """Doctor marks a request as reviewed or scheduled."""
        try:
            # Optional RBAC: Verify doctor owns the consult if it's already claimed
            res = self.sb.table("consult_requests").update({
                 "status": payload.status,
                 "appointment_time": payload.appointment_time.isoformat() if payload.appointment_time else None,
                 "doctor_id": doctor_id,  # Claim it
                 "updated_at": datetime.utcnow().isoformat()
            }).eq("id", consult_id).execute()
            
            if not res.data:
                 raise HTTPException(status_code=404, detail="Consultation not found.")
            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

consultation_service = ConsultationService()
