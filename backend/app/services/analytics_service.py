import logging
from typing import List, Dict, Any, Union
from fastapi import HTTPException
from app.database import get_supabase
from datetime import datetime, timedelta

logger = logging.getLogger("analytics_service")

class AnalyticsService:
    def __init__(self):
        self.sb = get_supabase()

    def get_cached_or_compute(self, user_id: str, metric_type: str, compute_func: callable, ttl_hours: int = 6) -> dict:
        """
        Cache-Aside orchestrator. Checks `analytics_cache` first.
        If missing or stale, invokes `compute_func()` to generate fresh data.
        """
        try:
            # 1. Check Cache
            cache_res = self.sb.table("analytics_cache").select("*").eq("user_id", user_id).eq("metric_type", metric_type).execute()
            
            if cache_res.data:
                cached = cache_res.data[0]
                calculated_at = datetime.fromisoformat(cached["calculated_at"].replace("Z", "+00:00"))
                expiration = calculated_at + timedelta(hours=ttl_hours)
                
                # Timezone naive/aware normalization
                now = datetime.now(calculated_at.tzinfo)
                
                if now < expiration:
                    return cached["data"]
            
            # 2. Compute Stale/Missing Data
            fresh_data = compute_func(user_id)
            
            # 3. UPSERT Cache
            upsert_payload = {
                "user_id": user_id,
                "metric_type": metric_type,
                "data": fresh_data,
                "calculated_at": datetime.utcnow().isoformat()
            }
            
            # Since Supabase python doesn't explicitly expose 'upsert' cleanly with a unique composite key without a specific RPC,
            # we'll delete the old one and insert the new one to simulate UPSERT for this architecture demo.
            if cache_res.data:
                self.sb.table("analytics_cache").delete().eq("id", cache_res.data[0]["id"]).execute()
                
            self.sb.table("analytics_cache").insert(upsert_payload).execute()
            
            return fresh_data
            
        except Exception as e:
            logger.error(f"Analytics failure for {metric_type}: {str(e)}")
            # Fail gracefully returning empty structures so charts don't crash
            return []

    # --- Core Computation Functions (Heavy SQL Readers) --- #
    
    def _compute_cognitive_trend(self, patient_id: str) -> List[dict]:
        """Aggregate screening_results and ai_analyses over 180 days."""
        cutoff = (datetime.utcnow() - timedelta(days=180)).isoformat()
        res = self.sb.table("ai_analyses").select("risk_score, created_at").eq("user_id", patient_id).gte("created_at", cutoff).order("created_at").execute()
        
        # Normalize into charting struct: [{"date": "2025-01-01", "value": 45}]
        formatted = []
        for row in res.data:
            date_str = row["created_at"].split("T")[0]
            formatted.append({"date": date_str, "value": row["risk_score"]})
        return formatted

    def _compute_activity_progress(self, patient_id: str) -> List[dict]:
        """Aggregate activity scores over 30 days."""
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
        res = self.sb.table("activity_results").select("performance_score, created_at").eq("user_id", patient_id).gte("created_at", cutoff).order("created_at").execute()
        
        formatted = []
        for row in res.data:
            date_str = row["created_at"].split("T")[0]
            formatted.append({"date": date_str, "value": row["performance_score"]})
        return formatted

    def _compute_medication_adherence(self, patient_id: str) -> List[dict]:
        """Calculate taken vs missed rolling percentage."""
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
        res = self.sb.table("medication_logs").select("status, scheduled_time").eq("user_id", patient_id).gte("scheduled_time", cutoff).order("scheduled_time").execute()
        
        # Complex GROUP BY logic mapped into Python for demo
        from collections import defaultdict
        daily_stats = defaultdict(lambda: {"taken": 0, "total": 0})
        
        for row in res.data:
            if row["status"] in ["taken", "missed"]:
                date_str = row["scheduled_time"].split("T")[0]
                daily_stats[date_str]["total"] += 1
                if row["status"] == "taken":
                    daily_stats[date_str]["taken"] += 1
                    
        formatted = []
        for date, stat in sorted(daily_stats.items()):
            perc = (stat["taken"] / stat["total"]) * 100 if stat["total"] > 0 else 0
            formatted.append({"date": date, "value": round(perc, 1)})
            
        return formatted

    def _compute_caregiver_trends(self, patient_id: str) -> List[dict]:
        """Extract multi-axis trends (confusion vs sleep)."""
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
        res = self.sb.table("caregiver_logs").select("confusion_level, sleep_hours, log_date").eq("user_id", patient_id).gte("log_date", cutoff.split("T")[0]).order("log_date").execute()
        
        formatted = []
        for row in res.data:
            formatted.append({
                "date": row["log_date"],
                "confusion": row["confusion_level"],
                "sleep": row["sleep_hours"]
            })
        return formatted

    def _compute_alert_frequency(self, patient_id: str) -> List[dict]:
        """Count critical/warning alerts grouped by week."""
        # For brevity in Phase 12 Architecture, returning a mock representation of the grouping logic.
        return [{"week": "Current", "critical": 2, "warning": 1}]

    def _compute_patient_summary(self, patient_id: str) -> dict:
        """The grand unified single-object summary for the Doctor Dashboard view."""
        # This function intrinsically forces the recalculation of the others, or grabs from cache!
        cognitive = self.get_cached_or_compute(patient_id, "cognitive_trend", self._compute_cognitive_trend)
        adherence = self.get_cached_or_compute(patient_id, "medication_adherence", self._compute_medication_adherence)
        
        latest_risk = cognitive[-1]["value"] if cognitive else None
        latest_adherence = adherence[-1]["value"] if adherence else None
        
        status = "Stable"
        if latest_risk and latest_risk >= 70: status = "Declining"
        if latest_adherence and latest_adherence <= 50: status = "Critical"
        
        return {
            "risk_score": latest_risk,
            "adherence": latest_adherence,
            "confusion_trend": "Unknown",
            "alerts_last_7_days": 1,
            "status": status
        }

    # --- Public Accessors --- #
    def fetch_analytics(self, patient_id: str, metric_type: str, days: int = 30) -> list | dict:
        """The public router gateway. Maps strings to internal compute funcs."""
        dispatch = {
            "cognitive_trend": self._compute_cognitive_trend,
            "activity_progress": self._compute_activity_progress,
            "medication_adherence": self._compute_medication_adherence,
            "caregiver_trends": self._compute_caregiver_trends,
            "alert_frequency": self._compute_alert_frequency,
            "patient_summary": self._compute_patient_summary
        }
        
        if metric_type not in dispatch:
             raise HTTPException(status_code=400, detail="Invalid metric_type")
             
        # Use 1hr TTL for the combined summary, 6hr TTL for strict chart data.
        ttl = 1 if metric_type == "patient_summary" else 6
        return self.get_cached_or_compute(patient_id, metric_type, dispatch[metric_type], ttl_hours=ttl)

    def get_doctor_overview(self, doctor_id: str) -> List[dict]:
        """Gathers the unified summaries for EVERY patient the doctor oversees."""
        # Mock logic: fetch assigned patients, then `fetch_analytics(patient_id, 'patient_summary')`
        try:
             # Just scanning all for architecture proof. Real app joins on assignments.
             users = self.sb.table("users").select("id, full_name").eq("role", "patient").execute()
             
             results = []
             for u in users.data:
                 summary = self.fetch_analytics(u["id"], "patient_summary")
                 results.append({
                     "patient_id": u["id"],
                     "patient_name": u["full_name"] or "Unknown",
                     "metrics": summary
                 })
             return results
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))

analytics_service = AnalyticsService()
