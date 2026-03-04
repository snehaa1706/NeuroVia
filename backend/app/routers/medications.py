from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.medication import (
    MedicationCreate,
    MedicationResponse,
    MedicationLogCreate,
    MedicationLogResponse,
)
from app.services.alert_service import check_medication_alerts

router = APIRouter()


def _get_user_id(request: Request) -> str:
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    user_response = sb.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_response.user.id


@router.get("/{patient_id}")
async def get_medications(request: Request, patient_id: str):
    """Get all medications for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    result = (
        sb.table("medications")
        .select("*")
        .eq("patient_id", patient_id)
        .eq("active", True)
        .execute()
    )

    return {"medications": result.data}


@router.post("/", response_model=MedicationResponse)
async def add_medication(request: Request, data: MedicationCreate):
    """Add a new medication for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    record = {
        "patient_id": data.patient_id,
        "name": data.name,
        "dosage": data.dosage,
        "frequency": data.frequency,
        "time_slots": data.time_slots,
        "active": True,
    }
    result = sb.table("medications").insert(record).execute()
    med = result.data[0]

    return MedicationResponse(**med)


@router.post("/{medication_id}/log", response_model=MedicationLogResponse)
async def log_medication(
    request: Request, medication_id: str, data: MedicationLogCreate
):
    """Log medication intake (taken, missed, or skipped)."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    # Verify medication exists
    med = (
        sb.table("medications")
        .select("*")
        .eq("id", medication_id)
        .single()
        .execute()
    )
    if not med.data:
        raise HTTPException(status_code=404, detail="Medication not found")

    record = {
        "medication_id": medication_id,
        "status": data.status.value,
        "notes": data.notes,
    }
    result = sb.table("medication_logs").insert(record).execute()
    log = result.data[0]

    # Rule-based alert: check for missed medications
    if data.status.value == "missed":
        missed_logs = (
            sb.table("medication_logs")
            .select("id")
            .eq("medication_id", medication_id)
            .eq("status", "missed")
            .limit(10)
            .execute()
        )
        missed_count = len(missed_logs.data) if missed_logs.data else 0
        alert_data = check_medication_alerts(med.data["patient_id"], missed_count)
        if alert_data:
            sb.table("alerts").insert(alert_data).execute()

    return MedicationLogResponse(
        id=log["id"],
        medication_id=log["medication_id"],
        taken_at=log.get("taken_at"),
        status=log["status"],
        notes=log.get("notes"),
    )


@router.get("/{patient_id}/adherence")
async def get_adherence(request: Request, patient_id: str):
    """Get medication adherence statistics for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    # Get all medications for patient
    meds = (
        sb.table("medications")
        .select("id, name")
        .eq("patient_id", patient_id)
        .execute()
    )

    adherence_data = []
    for med in (meds.data or []):
        logs = (
            sb.table("medication_logs")
            .select("status")
            .eq("medication_id", med["id"])
            .execute()
        )
        total = len(logs.data) if logs.data else 0
        taken = sum(1 for l in (logs.data or []) if l["status"] == "taken")
        rate = (taken / total * 100) if total > 0 else 0

        adherence_data.append(
            {
                "medication_id": med["id"],
                "medication_name": med["name"],
                "total_logs": total,
                "taken": taken,
                "missed": total - taken,
                "adherence_rate": round(rate, 1),
            }
        )

    return {"adherence": adherence_data}
