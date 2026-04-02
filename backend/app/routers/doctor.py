from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Query
from typing import Optional
from uuid import UUID
import uuid

from app.database import get_supabase
from app.models.doctor import (
    ConsultStatus,
    DoctorProfile,
    ConsultRequestCreate,
    ConsultRequestOut,
    ConsultRequestDetail,
    ConsultStatusUpdate,
    ConsultResponseCreate,
    ConsultResponseOut,
    PaginatedConsultList,
)
from app.services.supabase_service import DoctorService
from app.services.consultation_service import (
    create_consultation,
    list_consultations,
    get_consultation_detail,
    update_consultation_status,
    add_doctor_response,
)

router = APIRouter()


# ============================================
# UTILITIES / AUTH
# ============================================

def _get_user_id(request: Request) -> str:
    """Extract and validate the authenticated user from the request token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.replace("Bearer ", "")
    
    # We use get_supabase() internally here solely for the JWT validation call
    sb = get_supabase()
    try:
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token - user not found")
        return user_response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


def _safe_uuid(val: str) -> UUID:
    """Safely cast string to UUID, raising 400 if invalid."""
    try:
        return UUID(val)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid UUID string formatting: '{val}'")


# ============================================
# DOCTOR PROFILES & SEARCH
# ============================================

@router.get("/", response_model=list[DoctorProfile])
async def list_doctors(
    request: Request,
    specialization: Optional[str] = None
):
    """List available doctors, optionally filtered by specialization."""
    _get_user_id(request)
    return DoctorService.list_available(specialization=specialization)


# ============================================
# CONSULTATION LIFECYCLE
# ============================================

@router.post("/consult/request", response_model=ConsultRequestOut, status_code=201)
async def create_consult_request(
    request: Request,
    data: ConsultRequestCreate,
    background_tasks: BackgroundTasks
):
    """Create a new consultation request."""
    user_id_str = _get_user_id(request)
    patient_id = _safe_uuid(user_id_str)
    
    return create_consultation(
        patient_id=patient_id,
        data=data,
        background_tasks=background_tasks
    )


@router.get("/consult/requests", response_model=PaginatedConsultList)
async def get_consult_requests(
    request: Request,
    status: Optional[ConsultStatus] = None,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=50, description="Items per page (max 50)"),
):
    """List paginated consultations based on user role (Doctor vs Patient)."""
    user_id_str = _get_user_id(request)
    user_uuid = _safe_uuid(user_id_str)
    
    return list_consultations(
        user_id=user_uuid,
        status=status,
        page=page,
        page_size=page_size
    )


@router.get("/consult/requests/{consult_id}", response_model=ConsultRequestDetail)
async def get_consultation(
    request: Request,
    consult_id: str
):
    """Get full consultation details including nested doctor and responses."""
    user_id_str = _get_user_id(request)
    user_uuid = _safe_uuid(user_id_str)
    consult_uuid = _safe_uuid(consult_id)
    
    return get_consultation_detail(
        consult_id=consult_uuid,
        user_id=user_uuid
    )


@router.patch("/consult/requests/{consult_id}/status", response_model=ConsultRequestOut)
async def update_consult_status(
    request: Request,
    consult_id: str,
    data: ConsultStatusUpdate
):
    """Doctor updates the status of a consultation (accept/cancel)."""
    user_id_str = _get_user_id(request)
    user_uuid = _safe_uuid(user_id_str)
    consult_uuid = _safe_uuid(consult_id)
    
    return update_consultation_status(
        consult_id=consult_uuid,
        new_status=data.status,
        user_id=user_uuid
    )


@router.post("/consult/requests/{consult_id}/respond", response_model=ConsultResponseOut)
async def add_consult_response(
    request: Request,
    consult_id: str,
    data: ConsultResponseCreate
):
    """Doctor adds a response. Atomically transitions status to 'completed'."""
    user_id_str = _get_user_id(request)
    user_uuid = _safe_uuid(user_id_str)
    consult_uuid = _safe_uuid(consult_id)
    
    return add_doctor_response(
        consult_id=consult_uuid,
        user_id=user_uuid,
        data=data
    )


# ============================================
# LEGACY / OVERVIEW ENDPOINTS (UNCHANGED)
# ============================================

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
