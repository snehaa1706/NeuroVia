from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.doctor import (
    DoctorProfile,
    ConsultRequest,
    ConsultRequestResponse,
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


@router.get("/", response_model=list[DoctorProfile])
async def list_doctors(request: Request, specialization: str = None):
    """List available doctors with optional specialization filter."""
    sb = get_supabase()
    _get_user_id(request)

    query = sb.table("doctors").select("*, users(full_name)")
    if specialization:
        query = query.eq("specialization", specialization)
    query = query.eq("available", True)

    result = query.execute()

    doctors = []
    for doc in result.data:
        doctors.append(
            DoctorProfile(
                id=doc["id"],
                user_id=doc["user_id"],
                full_name=doc.get("users", {}).get("full_name") if doc.get("users") else None,
                specialization=doc["specialization"],
                hospital=doc.get("hospital"),
                experience_years=doc.get("experience_years"),
                available=doc.get("available", True),
            )
        )

    return doctors


@router.post("/consult/request", response_model=ConsultRequestResponse)
async def create_consult_request(request: Request, data: ConsultRequest):
    """Create a consultation request."""
    sb = get_supabase()
    patient_id = _get_user_id(request)

    record = {
        "patient_id": patient_id,
        "doctor_id": data.doctor_id,
        "screening_id": data.screening_id,
        "status": "pending",
    }
    result = sb.table("consult_requests").insert(record).execute()
    consult = result.data[0]

    return ConsultRequestResponse(
        id=consult["id"],
        patient_id=consult["patient_id"],
        doctor_id=consult["doctor_id"],
        screening_id=consult.get("screening_id"),
        summary=consult.get("summary"),
        status=consult["status"],
        created_at=consult.get("created_at"),
    )


@router.get("/consult/requests")
async def get_consult_requests(request: Request):
    """Get consultation requests for the current user (patient or doctor)."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    # Check if user is a doctor
    doctor_result = (
        sb.table("doctors").select("id").eq("user_id", user_id).execute()
    )

    if doctor_result.data:
        # Doctor: get requests directed to them
        doctor_id = doctor_result.data[0]["id"]
        result = (
            sb.table("consult_requests")
            .select("*, users!consult_requests_patient_id_fkey(full_name, email)")
            .eq("doctor_id", doctor_id)
            .order("created_at", desc=True)
            .execute()
        )
    else:
        # Patient: get their requests
        result = (
            sb.table("consult_requests")
            .select("*, doctors(specialization, hospital, users(full_name))")
            .eq("patient_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

    return {"requests": result.data}


@router.get("/patients/{patient_id}/overview")
async def get_patient_overview(request: Request, patient_id: str):
    """Get patient overview: screening history, medication adherence, cognitive trends."""
    sb = get_supabase()
    _get_user_id(request)

    # Patient info
    patient = (
        sb.table("users")
        .select("id, full_name, email, date_of_birth")
        .eq("id", patient_id)
        .single()
        .execute()
    )

    # Screening history with AI analysis
    screenings = (
        sb.table("screenings")
        .select("*, screening_results(*), ai_analyses(*)")
        .eq("user_id", patient_id)
        .order("started_at", desc=True)
        .limit(10)
        .execute()
    )

    # Medication adherence
    med_logs = (
        sb.table("medication_logs")
        .select("status")
        .eq("medication_id", patient_id)
        .execute()
    )
    total_logs = len(med_logs.data) if med_logs.data else 0
    taken_count = sum(1 for l in (med_logs.data or []) if l["status"] == "taken")
    adherence_rate = (taken_count / total_logs * 100) if total_logs > 0 else 0

    # Recent caregiver logs for cognitive trends
    caregiver_logs = (
        sb.table("caregiver_logs")
        .select("confusion_level, mood, sleep_hours, created_at")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )

    return {
        "patient": patient.data,
        "screenings": screenings.data,
        "medication_adherence": {
            "rate": adherence_rate,
            "total_logs": total_logs,
            "taken": taken_count,
        },
        "cognitive_trends": caregiver_logs.data,
    }
