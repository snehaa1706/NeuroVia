from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.dependencies import get_current_user_profile, require_doctor
from app.models.consultation_schemas import (
    ConsultationCreateRequest,
    ConsultationResponse,
    ConsultationStatusUpdateRequest
)
from app.services.consultation_service import consultation_service

router = APIRouter()

@router.post("/request", response_model=ConsultationResponse)
def request_consultation(payload: ConsultationCreateRequest, user: dict = Depends(get_current_user_profile)):
    """Patient or Caregiver initiates a clinical review. Service builds AI summary."""
    # RBAC mapping inside service or dependency injection block
    if user["role"] not in ["patient", "caregiver"]:
        raise HTTPException(status_code=403, detail="Only patients or caregivers can request consultations.")
    
    # Enforce patient_id logic
    if user["role"] == "patient" and payload.patient_id != user["id"]:
         raise HTTPException(status_code=403, detail="Cannot request on behalf of someone else as a patient.")
         
    consult_request = consultation_service.create_consultation_request(user["role"], user["id"], payload)
    return ConsultationResponse(**consult_request)


@router.get("/patient/{patient_id}", response_model=List[ConsultationResponse])
def get_patient_consultations(patient_id: str, user: dict = Depends(get_current_user_profile)):
    """Fetch status or completed AI summaries for the patient dashboard."""
    if user["role"] == "patient" and patient_id != user["id"]:
         raise HTTPException(status_code=403, detail="Unauthorized")
    # For brevity, pulling straight from sb in router (Normally via service)
    data = consultation_service.sb.table("consult_requests").select("*").eq("user_id", patient_id).order("created_at", desc=True).execute()
    return [ConsultationResponse(**r) for r in data.data]


@router.get("/doctor", response_model=List[ConsultationResponse])
def get_doctor_consultations(user: dict = Depends(require_doctor)):
    """Doctor fetches their queue of pending AI clinical hand-offs."""
    requests = consultation_service.get_doctor_queue(user["id"])
    return [ConsultationResponse(**r) for r in requests]


@router.put("/{consult_id}/status", response_model=ConsultationResponse)
def update_status(consult_id: str, payload: ConsultationStatusUpdateRequest, user: dict = Depends(require_doctor)):
    """Doctor advances a consultation from 'ready' -> 'scheduled' or 'completed'."""
    updated = consultation_service.update_consultation_status(consult_id, user["id"], payload)
    return ConsultationResponse(**updated)
