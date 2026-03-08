import logging
from typing import List, Dict, Any
from fastapi import HTTPException
from app.database import get_supabase
from datetime import datetime, timedelta
from app.models.medication_schemas import MedicationCreateRequest, MedicationLogSubmitRequest
from app.services.caregiver_service import caregiver_service

logger = logging.getLogger("medication_service")

class MedicationService:
    def __init__(self):
        self.sb = get_supabase()

    def _verify_module_access(self, accessor_role: str, accessor_id: str, patient_id: str):
        """Allow patient (self), doctor (any for now), or explicitly assigned caregiver."""
        if accessor_role == "patient" and accessor_id != patient_id:
            raise HTTPException(status_code=403, detail="Patients can only access their own medications.")
        if accessor_role == "caregiver":
            caregiver_service.verify_caregiver_assignment(accessor_id, patient_id)
        # Doctors have global clinic access in Phase 9 architecture.

    def add_medication(self, user_role: str, user_id: str, payload: MedicationCreateRequest) -> dict:
        self._verify_module_access(user_role, user_id, payload.user_id)
        
        try:
            res = self.sb.table("medications").insert({
                "user_id": payload.user_id,
                "name": payload.name,
                "dosage": payload.dosage,
                "frequency": payload.frequency,
                "interval_hours": payload.interval_hours,
                "time_of_day": payload.time_of_day,
                "days_of_week": payload.days_of_week,
                "is_active": True
            }).execute()
            return res.data[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create prescription: {str(e)}")


    def get_patient_medications(self, user_role: str, user_id: str, patient_id: str) -> List[dict]:
        self._verify_module_access(user_role, user_id, patient_id)
        
        try:
            res = self.sb.table("medications").select("*").eq("user_id", patient_id).eq("is_active", True).is_("deleted_at", "null").order("created_at").execute()
            return res.data
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

            
    def get_today_schedule(self, user_role: str, user_id: str, patient_id: str) -> List[dict]:
         """
         Returns all active medications joined with today's dose logs, so the UI 
         knows which have been 'taken' and which are pending.
         """
         self._verify_module_access(user_role, user_id, patient_id)
         
         # Note: A real implementation computes complex localized recurrences here.
         # For architecture demonstration: fetch active meds -> fetch today's logs -> zip them.
         active_meds = self.get_patient_medications(user_role, user_id, patient_id)
         
         today_str = datetime.utcnow().date().isoformat()
         try:
              logs = self.sb.table("medication_logs").select("*").eq("user_id", patient_id).gte("scheduled_time", f"{today_str}T00:00:00Z").lte("scheduled_time", f"{today_str}T23:59:59Z").execute()
              
              log_map = {}
              for log in logs.data:
                   med_id = log["medication_id"]
                   if med_id not in log_map:
                       log_map[med_id] = []
                   log_map[med_id].append(log)
                   
              # Combine
              for med in active_meds:
                  med["today_logs"] = log_map.get(med["id"], [])
                  
              return active_meds
              
         except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))


    def log_medication_dose(self, user_role: str, user_id: str, medication_id: str, payload: MedicationLogSubmitRequest) -> dict:
        """Insert a specific interaction log and immediately check adherence alerts."""
        try:
             # Verify ownership
             med = self.sb.table("medications").select("user_id").eq("id", medication_id).single().execute()
             if not med.data:
                  raise HTTPException(status_code=404, detail="Medication not found")
             
             patient_id = med.data["user_id"]
             self._verify_module_access(user_role, user_id, patient_id)
             
             # Prevent Duplicate Exact Logging (same Med_id, same exactly scheduled_time)
             duplicate = self.sb.table("medication_logs").select("id").eq("medication_id", medication_id).eq("scheduled_time", payload.scheduled_time.isoformat()).execute()
             if.duplicate.data:
                 raise HTTPException(status_code=409, detail="A dose event for this specific scheduled time has already been logged.")

             # Record the dose
             res = self.sb.table("medication_logs").insert({
                 "medication_id": medication_id,
                 "user_id": patient_id,
                 "status": payload.status,
                 "scheduled_time": payload.scheduled_time.isoformat(),
                 "logged_by": user_id
             }).execute()
             
             # Immediately evaluate alert conditions if this is a negative occurrence
             if payload.status == "missed":
                  self.evaluate_missed_doses(patient_id, medication_id)
                  
             return res.data[0]
             
        except HTTPException:
             raise
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))
             

    def evaluate_missed_doses(self, patient_id: str, medication_id: str):
        """Alert Engine Integration: Checks if recent consecutive logs are 'missed'."""
        try:
             # Get the last 2 logs ordered chronologically by scheduled time
             recent = self.sb.table("medication_logs").select("status").eq("medication_id", medication_id).order("scheduled_time", desc=True).limit(2).execute()
             
             if len(recent.data) == 2:
                  if recent.data[0]["status"] == "missed" and recent.data[1]["status"] == "missed":
                       logger.warning(f"ALERT TRIGGERED: Medication adherence failure. >= 2 consecutive missed doses for patient {patient_id}.")
                       # Hand off to Phase 10 Alert Queue
                       # alert_service.create_alert("missed_medication", severity="critical")
        except Exception as e:
            logger.error(f"Failed to evaluate consecutive missed doses threshold: {str(e)}")


    def calculate_adherence(self, user_role: str, user_id: str, patient_id: str, days: int = 30) -> dict:
        """Query trailing x days to build the analytics percentage metric. taken / (taken + missed)"""
        self._verify_module_access(user_role, user_id, patient_id)
        
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            # Since skipped usually implies 'doc said not to take today', they exclude from adherence denom.
            # Base denom is taken + missed.
            logs = self.sb.table("medication_logs").select("status").eq("user_id", patient_id).gte("scheduled_time", cutoff).execute()
            
            total_scheduled = 0
            total_taken = 0
            
            for log in logs.data:
                 if log["status"] in ["taken", "missed"]:
                      total_scheduled += 1
                      if log["status"] == "taken":
                           total_taken += 1
                           
            adj_perc = 100.0 if total_scheduled == 0 else round((total_taken / total_scheduled) * 100, 2)
            
            # Simple Alert Detection for Adherence Plunges
            if adj_perc < 50.0 and total_scheduled >= 5:
                # E.g., drops below 50%
                logger.warning(f"ALERT TRIGGERED: Medication adherence below 50% for patient {patient_id}")
                # alert_service.create_alert("low_adherence", severity="high")
            
            return {
                 "patient_id": patient_id,
                 "timeframe_days": days,
                 "adherence_percentage": adj_perc,
                 "total_scheduled": total_scheduled,
                 "total_taken": total_taken
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Adherence calculation failed: {str(e)}")

medication_service = MedicationService()
