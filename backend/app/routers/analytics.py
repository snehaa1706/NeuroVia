from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any
from datetime import datetime

from app.dependencies import get_current_user_profile, require_doctor
from app.models.analytics_schemas import AnalyticsResponse, DoctorOverviewPatient
from app.services.analytics_service import analytics_service

router = APIRouter()

def _build_response(patient_id: str, metric_type: str, data: Any) -> AnalyticsResponse:
    return AnalyticsResponse(
        patient_id=patient_id,
        metric_type=metric_type,
        computed_at=datetime.utcnow(),
        data=data
    )

# Static routes must precede parameterized routes
@router.get("/doctor-overview", response_model=List[DoctorOverviewPatient])
def get_doctor_overview_dashboard(user: dict = Depends(require_doctor)):
    """Fetch the high-level patient summary metrics for all patients assigned to this doctor."""
    return analytics_service.get_doctor_overview(user["id"])

@router.get("/{patient_id}/cognitive-trend", response_model=AnalyticsResponse)
def get_cognitive_trend(patient_id: str, days: int = Query(180, description="Trailing days"), user: dict = Depends(get_current_user_profile)):
    # Simple explicit self-patient check
    if user["role"] == "patient" and user["id"] != patient_id:
         raise HTTPException(status_code=403, detail="Unauthorized")
    data = analytics_service.fetch_analytics(patient_id, "cognitive_trend", days)
    return _build_response(patient_id, "cognitive_trend", data)

@router.get("/{patient_id}/activity-progress", response_model=AnalyticsResponse)
def get_activity_progress(patient_id: str, days: int = Query(30, description="Trailing days"), user: dict = Depends(get_current_user_profile)):
    if user["role"] == "patient" and user["id"] != patient_id: raise HTTPException(status_code=403)
    data = analytics_service.fetch_analytics(patient_id, "activity_progress", days)
    return _build_response(patient_id, "activity_progress", data)

@router.get("/{patient_id}/medication-adherence", response_model=AnalyticsResponse)
def get_medication_adherence(patient_id: str, days: int = Query(30, description="Trailing days"), user: dict = Depends(get_current_user_profile)):
    if user["role"] == "patient" and user["id"] != patient_id: raise HTTPException(status_code=403)
    data = analytics_service.fetch_analytics(patient_id, "medication_adherence", days)
    return _build_response(patient_id, "medication_adherence", data)

@router.get("/{patient_id}/caregiver-trends", response_model=AnalyticsResponse)
def get_caregiver_trends(patient_id: str, days: int = Query(30, description="Trailing days"), user: dict = Depends(get_current_user_profile)):
    if user["role"] == "patient" and user["id"] != patient_id: raise HTTPException(status_code=403)
    data = analytics_service.fetch_analytics(patient_id, "caregiver_trends", days)
    return _build_response(patient_id, "caregiver_trends", data)

@router.get("/{patient_id}/alert-frequency", response_model=AnalyticsResponse)
def get_alert_frequency(patient_id: str, days: int = Query(90, description="Trailing days"), user: dict = Depends(get_current_user_profile)):
    if user["role"] == "patient" and user["id"] != patient_id: raise HTTPException(status_code=403)
    data = analytics_service.fetch_analytics(patient_id, "alert_frequency", days)
    return _build_response(patient_id, "alert_frequency", data)
