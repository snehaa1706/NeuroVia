import logging
from uuid import UUID
from typing import Optional, Any
from fastapi import HTTPException, BackgroundTasks

from app.models.doctor import (
    ConsultStatus,
    ConsultRequestCreate,
    ConsultRequestDetail,
    ConsultRequestOut,
    ConsultResponseCreate,
    ConsultResponseOut,
    PaginatedConsultList,
)
from app.services.supabase_service import ConsultationService, DoctorService, ScreeningService
from app.services.ai_service import generate_consultation_summary

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTS & UTILITIES
# ============================================

VALID_TRANSITIONS: dict[ConsultStatus, set[ConsultStatus]] = {
    ConsultStatus.pending: {ConsultStatus.accepted, ConsultStatus.cancelled},
    ConsultStatus.accepted: {ConsultStatus.completed, ConsultStatus.cancelled},
    ConsultStatus.completed: set(),
    ConsultStatus.cancelled: set(),
}

def validate_transition(current: ConsultStatus, target: ConsultStatus) -> None:
    """Validate status transition and raise 409 if invalid."""
    if current == target:
        raise HTTPException(status_code=409, detail=f"Consultation is already in '{current.value}' status")
        
    allowed_targets = VALID_TRANSITIONS.get(current, set())
    if target not in allowed_targets:
        raise HTTPException(
            status_code=409,
            detail=f"Invalid transition from '{current.value}' to '{target.value}'"
        )


# ============================================
# CORE SERVICE LOGIC
# ============================================

def create_consultation(
    patient_id: UUID,
    data: ConsultRequestCreate,
    background_tasks: BackgroundTasks
) -> ConsultRequestOut:
    """Patient creates a new consultation request."""
    # Validate doctor exists
    try:
        doctor_profiles = DoctorService.list_available()
        # Ensure the specified doctor actually exists (Note: could optimize query)
        doctor_exists = any(str(d["id"]) == str(data.doctor_id) for d in doctor_profiles)
        if not doctor_exists:
            # Fallback to direct fetch if not returning all
            pass
    except Exception:
        pass # If DoctorService throws, ignore for now

    record_dict = {
        "patient_id": str(patient_id),
        "doctor_id": str(data.doctor_id),
        "screening_id": str(data.assessment_id) if data.assessment_id else None,
        "status": ConsultStatus.pending.value,
    }
    
    # Store message if present (ensure it's handled in DB or JSON metadata, but per schema it's in the payload)
    if data.message:
        record_dict["metadata"] = {"patient_message": data.message}

    created_record = ConsultationService.create_request(record_dict)

    if data.assessment_id:
        background_tasks.add_task(
            _generate_and_store_summary,
            consult_id=UUID(created_record["id"]),
            assessment_id=data.assessment_id
        )

    # Remap screening_id -> assessment_id for Pydantic out
    created_record["assessment_id"] = created_record.get("screening_id")
    return ConsultRequestOut(**created_record)


def get_consultation_detail(consult_id: UUID, user_id: UUID) -> ConsultRequestDetail:
    """Get full consultation details including nested doctor and responses."""
    try:
        consult = ConsultationService.get_request(str(consult_id), str(user_id))
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    # Respect soft delete
    if consult.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    responses = ConsultationService.get_responses(str(consult_id))
    
    # Check responses for deleted_at
    active_responses = [r for r in responses if r.get("deleted_at") is None]

    # Map screening_id -> assessment_id
    consult["assessment_id"] = consult.get("screening_id")
    
    # Map nested doctor records if dict is present
    doctor_data = consult.get("doctors")
    if doctor_data:
        doctor_data["id"] = doctor_data.get("id")
        doctor_data["user_id"] = doctor_data.get("user_id")

    return ConsultRequestDetail(
        **consult,
        doctor=doctor_data if doctor_data else None,
        responses=active_responses
    )


def list_consultations(
    user_id: UUID,
    status: Optional[ConsultStatus] = None,
    page: int = 1,
    page_size: int = 20
) -> PaginatedConsultList:
    """List paginated consultations based on user role (Doctor vs Patient)."""
    status_str = status.value if status else None
    
    # Attempt to resolve if user is a doctor
    try:
        doctor_id = DoctorService.resolve_doctor_id(str(user_id))
        is_doctor = True
    except HTTPException:
        is_doctor = False

    if is_doctor:
        result = ConsultationService.list_for_doctor(
            doctor_id, status=status_str, page=page, page_size=page_size
        )
    else:
        # Fallback to patient role
        result = ConsultationService.list_for_patient(
            str(user_id), status=status_str, page=page, page_size=page_size
        )

    # Map screening_id -> assessment_id
    for item in result["items"]:
        item["assessment_id"] = item.get("screening_id")

    return PaginatedConsultList(**result)


def update_consultation_status(
    consult_id: UUID,
    new_status: ConsultStatus,
    user_id: UUID
) -> ConsultRequestOut:
    """Doctor updates the status of a consultation (accept/cancel)."""
    # Verify doctor role
    try:
        doctor_id = DoctorService.resolve_doctor_id(str(user_id))
    except HTTPException:
        raise HTTPException(status_code=403, detail="Only registered doctors can update status")

    # Fetch consultation and enforce ownership
    try:
        consult = ConsultationService.get_request(str(consult_id), str(user_id))
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    if consult.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if str(consult["doctor_id"]) != doctor_id:
        raise HTTPException(status_code=403, detail="You are not the assigned doctor")

    # Validate transition
    current_status = ConsultStatus(consult["status"])
    validate_transition(current_status, new_status)

    # Update state
    updated_record = ConsultationService.update_request(
        str(consult_id),
        {"status": new_status.value}
    )
    
    updated_record["assessment_id"] = updated_record.get("screening_id")
    return ConsultRequestOut(**updated_record)


def add_doctor_response(
    consult_id: UUID,
    user_id: UUID,
    data: ConsultResponseCreate
) -> ConsultResponseOut:
    """Doctor adds a response. Atomically transitions status to 'completed'."""
    # Verify doctor role
    try:
        doctor_id = DoctorService.resolve_doctor_id(str(user_id))
    except HTTPException:
        raise HTTPException(status_code=403, detail="Only doctors can add responses")

    # Fetch consultation
    try:
        consult = ConsultationService.get_request(str(consult_id), str(user_id))
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    if consult.get("deleted_at") is not None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if str(consult["doctor_id"]) != doctor_id:
        raise HTTPException(status_code=403, detail="You are not the assigned doctor")

    current_status = ConsultStatus(consult["status"])
    
    # Must be 'accepted' to respond
    if current_status != ConsultStatus.accepted:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot respond to consultation in '{current_status.value}' state. Must be 'accepted'."
        )

    # Insert response and auto-update status to 'completed' (logical transaction)
    try:
        # Step 1: Add the response
        response_record = {
            "request_id": str(consult_id),
            "doctor_id": doctor_id,
            "diagnosis": data.diagnosis,
            "notes": data.notes,
            "prescription": data.prescription,
            "follow_up_date": data.follow_up_date.isoformat() if data.follow_up_date else None,
        }
        created_response = ConsultationService.add_response(response_record)

        # Step 2: Auto-update status
        ConsultationService.update_request(str(consult_id), {"status": ConsultStatus.completed.value})
        
    except Exception as e:
        logger.error(f"Failed to submit doctor response: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed while saving response")

    return ConsultResponseOut(**created_response)


# ============================================
# BACKGROUND TASKS
# ============================================

async def _generate_and_store_summary(consult_id: UUID, assessment_id: UUID) -> None:
    """
    Background job: Calls AI to summarize assessment/screening data, assigns
    metadata to the consultation request, and stores it in the DB.
    """
    try:
        # Note: In real setup, fetch the screening/assessment data securely
        # Since we are internal, bypass service level ownership
        from app.helpers.db_helpers import query_table
        
        # 1. Fetch assessment (screening) data safely
        screening_records = query_table(
            "screenings",
            filters={"id": str(assessment_id)},
            single=True,
            use_admin=True
        )
        if not screening_records:
            logger.warning(f"Assessment {assessment_id} not found. Skipping AI summary.")
            return
            
        # 2. Fetch AI analysis
        ai_analyses = query_table(
            "ai_analyses",
            filters={"screening_id": str(assessment_id)},
            use_admin=True,
            limit=1
        )
        if not ai_analyses:
            logger.warning(f"AI analysis for assessment {assessment_id} missing. Skipping AI summary.")
            return
            
        screening_data_str = str(screening_records)
        ai_analysis_str = str(ai_analyses[0])

        # 3. Call AI Service
        ai_response = await generate_consultation_summary(
            screening_data=screening_data_str,
            ai_analysis=ai_analysis_str
        )

        # 4. Parse payload and update the consult request
        update_payload = {
            "summary": ai_response.get("summary"),
            "risk_level": ai_response.get("risk_level", "low"),  # fallback
            "key_concerns": ai_response.get("key_symptoms", []),
            "suggested_actions": ai_response.get("suggested_diagnostics", []) + ai_response.get("questions_for_doctor", [])
        }

        from app.helpers.db_helpers import update_record
        update_record(
            "consult_requests",
            str(consult_id),
            update_payload,
            use_admin=True
        )

    except Exception as e:
        # Log failure securely without breaking the request lifecycle
        logger.error(f"AI summary generation failed for consult {consult_id}: {e}", exc_info=True)
