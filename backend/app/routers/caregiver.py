from fastapi import APIRouter, Depends
from typing import List

from app.dependencies import require_caregiver
from app.models.caregiver_schemas import (
    CaregiverLogSubmitRequest,
    CaregiverLogResponse,
    IncidentReportRequest,
    IncidentResponse
)
from app.services.caregiver_service import caregiver_service

router = APIRouter()

@router.post("/checkin", response_model=CaregiverLogResponse)
def log_daily_checkin(
    payload: CaregiverLogSubmitRequest, 
    user: dict = Depends(require_caregiver)
):
    """
    Submit a daily tracking log for a patient.
    Checks underlying thresholds (like high confusion) and implicitly prompts Alerts.
    """
    log_entry = caregiver_service.create_daily_log(user["id"], payload)
    return CaregiverLogResponse(**log_entry)

@router.post("/incident", response_model=IncidentResponse)
def report_incident(
    payload: IncidentReportRequest,
    user: dict = Depends(require_caregiver)
):
    """
    Report an acute behavioral event (e.g. wandering, fall) outside the daily check-in flow.
    Always triggers a Phase 10 Alert downstream.
    """
    incident = caregiver_service.record_incident(user["id"], payload)
    return IncidentResponse(**incident)

@router.get("/history/{patient_id}", response_model=List[CaregiverLogResponse])
def get_caregiver_history(patient_id: str, user: dict = Depends(require_caregiver)):
    """Fetch all chronological logs for a specific patient under this caregiver."""
    logs = caregiver_service.get_patient_logs(user["id"], patient_id)
    return [CaregiverLogResponse(**log) for log in logs]
