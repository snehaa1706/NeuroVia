from fastapi import APIRouter, Depends
from typing import List, Dict, Any

from app.dependencies import get_current_user_profile
from app.models.medication_schemas import (
    MedicationCreateRequest,
    MedicationResponse,
    MedicationLogSubmitRequest,
    MedicationLogResponse,
    AdherenceResponse
)
from app.services.medication_service import medication_service

router = APIRouter()

@router.get("/{patient_id}", response_model=List[MedicationResponse])
def get_medications(patient_id: str, user: dict = Depends(get_current_user_profile)):
    """Fetch all active prescriptions for a patient."""
    meds = medication_service.get_patient_medications(user["role"], user["id"], patient_id)
    return [MedicationResponse(**m) for m in meds]

@router.post("/add", response_model=MedicationResponse)
def add_medication(payload: MedicationCreateRequest, user: dict = Depends(get_current_user_profile)):
    """Create a new medication schedule. Allowed for Caregivers/Doctors."""
    med = medication_service.add_medication(user["role"], user["id"], payload)
    return MedicationResponse(**med)

@router.post("/{med_id}/log", response_model=MedicationLogResponse)
def log_dose(med_id: str, payload: MedicationLogSubmitRequest, user: dict = Depends(get_current_user_profile)):
    """Log a taken/missed dose. Automatically triggers adherence safety alerts under the hood."""
    log = medication_service.log_medication_dose(user["role"], user["id"], med_id, payload)
    return MedicationLogResponse(**log)

@router.get("/adherence/{patient_id}", response_model=AdherenceResponse)
def get_adherence(patient_id: str, days: int = 30, user: dict = Depends(get_current_user_profile)):
    """Calculate the trailing adherence percentage used for Analytics."""
    return medication_service.calculate_adherence(user["role"], user["id"], patient_id, days)

@router.get("/today/{patient_id}", response_model=List[Dict[str, Any]])
def get_today_meds(patient_id: str, user: dict = Depends(get_current_user_profile)):
    """Fetch schedules combined with today's logs specifically to populate the Daily Dashboard UI."""
    return medication_service.get_today_schedule(user["role"], user["id"], patient_id)
