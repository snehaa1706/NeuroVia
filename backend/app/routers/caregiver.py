from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.caregiver import (
    CaregiverCheckin,
    CaregiverIncident,
    CaregiverLogResponse,
    LogType,
)
from app.services.alert_service import (
    check_confusion_alert,
    check_incident_alert,
)

router = APIRouter()


def _get_user_id(request: Request) -> str:
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    user_response = sb.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_response.user.id


@router.post("/checkin", response_model=CaregiverLogResponse)
async def submit_checkin(request: Request, data: CaregiverCheckin):
    """Submit a daily patient check-in."""
    sb = get_supabase()
    caregiver_id = _get_user_id(request)

    record = {
        "caregiver_id": caregiver_id,
        "patient_id": data.patient_id,
        "log_type": LogType.daily_checkin.value,
        "mood": data.mood,
        "confusion_level": data.confusion_level,
        "sleep_hours": data.sleep_hours,
        "appetite": data.appetite,
        "notes": data.notes,
    }
    result = sb.table("caregiver_logs").insert(record).execute()
    log = result.data[0]

    # Rule-based alert check for confusion
    alert_data = check_confusion_alert(data.patient_id, data.confusion_level)
    if alert_data:
        alert_data["caregiver_id"] = caregiver_id
        sb.table("alerts").insert(alert_data).execute()

    return CaregiverLogResponse(**log)


@router.post("/incident", response_model=CaregiverLogResponse)
async def log_incident(request: Request, data: CaregiverIncident):
    """Log a patient incident."""
    sb = get_supabase()
    caregiver_id = _get_user_id(request)

    record = {
        "caregiver_id": caregiver_id,
        "patient_id": data.patient_id,
        "log_type": LogType.incident.value,
        "notes": data.description,
    }
    result = sb.table("caregiver_logs").insert(record).execute()
    log = result.data[0]

    # Rule-based alert for incidents
    alert_data = check_incident_alert(data.patient_id, data.description)
    alert_data["caregiver_id"] = caregiver_id
    sb.table("alerts").insert(alert_data).execute()

    return CaregiverLogResponse(**log)


@router.get("/logs/{patient_id}")
async def get_patient_logs(request: Request, patient_id: str):
    """Get caregiver logs for a patient."""
    sb = get_supabase()
    _get_user_id(request)

    result = (
        sb.table("caregiver_logs")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {"logs": result.data}


@router.get("/patients")
async def get_assigned_patients(request: Request):
    """Get list of patients assigned to this caregiver."""
    sb = get_supabase()
    caregiver_id = _get_user_id(request)

    # Get unique patient IDs from caregiver logs
    result = (
        sb.table("caregiver_logs")
        .select("patient_id")
        .eq("caregiver_id", caregiver_id)
        .execute()
    )

    patient_ids = list(set(log["patient_id"] for log in result.data))

    if not patient_ids:
        return {"patients": []}

    patients = (
        sb.table("users")
        .select("id, full_name, email, date_of_birth, avatar_url")
        .in_("id", patient_ids)
        .execute()
    )

    return {"patients": patients.data}
