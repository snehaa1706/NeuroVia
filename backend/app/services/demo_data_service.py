import logging
import random
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.database import get_supabase
from app.services.analytics_service import analytics_service

logger = logging.getLogger("demo_data_service")

class DemoDataService:
    def __init__(self):
        self.sb = get_supabase()

    def generate_demo_dataset(self, scenario: str, patient_count: int, days_history: int) -> dict:
        logger.info(f"Starting Demo Data Generation: {scenario} scenario, {patient_count} patients, {days_history} days.")
        
        try:
            # 1. Base Users
            doctor_id = str(uuid.uuid4())
            caregiver_id = str(uuid.uuid4())
            
            users_to_insert = [
                {"id": doctor_id, "email": "dr.demo@demo.neurovia.com", "full_name": "Dr. Sarah Demo", "role": "doctor"},
                {"id": caregiver_id, "email": "caregiver.demo@demo.neurovia.com", "full_name": "Mark Caregiver", "role": "caregiver"}
            ]
            
            patient_ids = [str(uuid.uuid4()) for _ in range(patient_count)]
            for i, p_id in enumerate(patient_ids):
                users_to_insert.append({
                    "id": p_id,
                    "email": f"patient{i}.demo@demo.neurovia.com",
                    "full_name": f"Patient Test {i}",
                    "role": "patient",
                    "date_of_birth": "1945-05-12"
                })
            
            # Since Supabase Auth API generates real users, we directly insert into public.users bypassing auth 
            # ONLY FOR DEMO ARCHITECTURE PURPOSES
            # (In production demo script, we'd mock auth.users using a raw SQL RPC bypass or handle properly)
            self.sb.table("users").insert(users_to_insert).execute()
            
            # 2. Caregiver Assignments
            assignments = [{"caregiver_id": caregiver_id, "patient_id": p_id, "relationship": "Child"} for p_id in patient_ids]
            self.sb.table("caregiver_assignments").insert(assignments).execute()
            
            total_logs = 0
            # 3. Time-Series per Patient
            for i, p_id in enumerate(patient_ids):
                # Distribute scenarios if 'mixed'
                pat_scen = scenario
                if scenario == "mixed":
                    pat_scen = ["stable", "declining", "critical"][i % 3]
                
                logs_inserted = self._generate_time_series_data(p_id, caregiver_id, pat_scen, days_history)
                total_logs += logs_inserted
                
                # 4. Analytics Precomputation
                logger.info(f"Precomputing Analytics for Patient {p_id} ({pat_scen})")
                analytics_service.fetch_analytics(p_id, "patient_summary")
                
            return {"status": "success", "message": f"Demo Data injected successfully.", "generated_users": len(users_to_insert), "generated_logs": total_logs}
            
        except Exception as e:
            logger.error(f"Failed to generate demo data: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Generation failed. Call /reset. Error: {str(e)}")


    def _generate_time_series_data(self, patient_id: str, caregiver_id: str, scenario: str, days: int) -> int:
        logs_count = 0
        now = datetime.utcnow()
        
        meds = self.sb.table("medications").insert({
            "user_id": patient_id,
            "name": "Donepezil 5mg",
            "dosage": "5mg",
            "frequency": "once_daily",
            "time_of_day": ["morning"],
            "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        }).execute()
        med_id = meds.data[0]["id"]
        
        cg_logs = []
        med_logs = []
        screenings = []
        activities = []
        alerts = []
        
        # Base modifiers per scenario
        if scenario == "stable":
            ad8_base, sleep_base, miss_chance = 2, 7.5, 0.02
        elif scenario == "declining":
            ad8_base, sleep_base, miss_chance = 4, 6.0, 0.15
        else: # critical
            ad8_base, sleep_base, miss_chance = 7, 4.5, 0.40
            
        for day_offset in range(days, -1, -1):
            target_date = now - timedelta(days=day_offset)
            target_str = target_date.isoformat()
            
            # Drift for declining
            drift = 0
            if scenario == "declining" and day_offset < 15:
                drift = 2 # Worsens in last 15 days
            
            # 1. Caregiver Log
            confusion = min(10, max(1, random.randint(ad8_base + drift - 1, ad8_base + drift + 1)))
            sleep = max(2.0, sleep_base - (drift * 0.5) + random.uniform(-1.0, 1.0))
            
            cg_logs.append({
                "user_id": patient_id,
                "caregiver_id": caregiver_id,
                "confusion_level": confusion,
                "sleep_hours": round(sleep, 1),
                "mood": "Anxious" if confusion > 6 else "Stable",
                "log_date": target_date.date().isoformat(),
                "created_at": target_str
            })
            
            # 2. Medication Log
            status = "missed" if random.random() < miss_chance else "taken"
            med_logs.append({
                "medication_id": med_id,
                "user_id": patient_id,
                "status": status,
                "scheduled_time": target_date.replace(hour=8, minute=0, second=0).isoformat(),
                "logged_at": target_str,
                "logged_by": patient_id
            })
            
            # 3. Weekly Screenings
            if day_offset % 7 == 0:
                score = min(8, max(0, ad8_base + drift))
                screenings.append({
                    "user_id": patient_id,
                    "test_type": "AD8",
                    "score": score,
                    "created_at": target_str
                })
                # Mock AI Risk Analysis
                risk = score * 10 + random.randint(0, 5)
                self.sb.table("ai_analyses").insert({
                    "user_id": patient_id,
                    "screening_id": str(uuid.uuid4()), # Mock orphaned ID for demo
                    "risk_level": "High" if risk > 70 else "Low",
                    "risk_score": min(100, risk),
                    "interpretation": "Generated Interpretation",
                    "provider": "ollama",
                    "created_at": target_str
                }).execute()
        
        # Batch Inserts
        if cg_logs:
            self.sb.table("caregiver_logs").insert(cg_logs).execute()
            logs_count += len(cg_logs)
            
        if med_logs:
            self.sb.table("medication_logs").insert(med_logs).execute()
            logs_count += len(med_logs)
            
        if screenings:
            self.sb.table("screening_results").insert(screenings).execute()
            logs_count += len(screenings)
            
        return logs_count


    def reset_demo_data(self) -> dict:
        """Purges all records associated with demo email domains. Cascades delete related logs."""
        logger.info("Resetting Demo Data...")
        try:
            # Finding all users with @demo.neurovia.com
            users = self.sb.table("users").select("id").like("email", "%@demo.neurovia.com").execute()
            user_ids = [u["id"] for u in users.data]
            
            if user_ids:
                # Assuming cascading deletes are configured at the DB layer on users(id)
                # If they aren't, we'd sequentially delete tables backwards here.
                # In Supabase, if auth user is deleted, public user cascades.
                self.sb.table("users").delete().in_("id", user_ids).execute()
                
            return {"status": "success", "message": f"Purged {len(user_ids)} demo users and cascading associated data."}
        except Exception as e:
            logger.error(f"Failed to reset demo data: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

demo_data_service = DemoDataService()
