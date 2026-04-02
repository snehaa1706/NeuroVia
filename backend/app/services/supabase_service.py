"""
Supabase Service Layer — Wraps DB + Storage Helpers

Service classes that provide a clean, table-specific interface
for all Supabase operations. NO business logic here — just
structured data access with security enforcement.

SECURITY:
- All queries filter by authenticated user_id
- Doctor identity is explicitly mapped (user_id → doctors.id)
- Ownership verified before every read/write
"""

from __future__ import annotations

from typing import Any, Optional
from fastapi import HTTPException

from app.helpers.db_helpers import (
    query_table,
    query_table_paginated,
    insert_record,
    update_record,
    get_doctor_by_user_id,
    get_consult_requests_for_patient,
    get_consult_requests_for_doctor,
    get_consult_responses,
    get_screenings,
    get_screening_results,
    get_ai_analyses,
    get_doctors,
)
from app.helpers.storage_helpers import (
    upload_file,
    download_file,
    create_signed_url,
    delete_file,
)


# ============================================
# SCREENING SERVICE
# ============================================

class ScreeningService:
    """Wraps screening-related DB operations."""

    @staticmethod
    def get_user_screenings(user_id: str, **kwargs) -> Any:
        """Get all screenings for a user (ownership enforced)."""
        return get_screenings(user_id, **kwargs)

    @staticmethod
    def get_results(screening_id: str, user_id: str) -> Any:
        """
        Get results for a screening.
        Verifies the screening belongs to the user first.
        """
        # Ownership check: screening must belong to user
        screening = query_table(
            "screenings",
            filters={"id": screening_id, "user_id": user_id},
            single=True,
        )
        if not screening:
            raise HTTPException(status_code=404, detail="Screening not found")
        return get_screening_results(screening_id)

    @staticmethod
    def get_analysis(screening_id: str, user_id: str) -> Any:
        """Get AI analyses for a screening (ownership enforced)."""
        # Ownership check
        query_table(
            "screenings",
            filters={"id": screening_id, "user_id": user_id},
            single=True,
        )
        return get_ai_analyses(screening_id)


# ============================================
# DOCTOR SERVICE
# ============================================

class DoctorService:
    """Wraps doctor-related DB operations."""

    @staticmethod
    def list_available(specialization: Optional[str] = None) -> list[dict]:
        """List all available doctors, optionally filtered by specialization."""
        return get_doctors(specialization=specialization, available_only=True)

    @staticmethod
    def resolve_doctor_id(user_id: str) -> str:
        """
        Map a user_id to their doctors.id.

        SECURITY: This is the canonical way to verify someone
        is a doctor and get their doctor record ID.

        Raises:
            HTTPException 403 if the user is not a registered doctor.
        """
        doctor = get_doctor_by_user_id(user_id)
        if not doctor:
            raise HTTPException(
                status_code=403,
                detail="Access denied — user is not a registered doctor"
            )
        return doctor["id"]

    @staticmethod
    def get_profile(user_id: str) -> dict:
        """Get a doctor's own profile (ownership enforced)."""
        doctor = get_doctor_by_user_id(user_id)
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        return doctor


# ============================================
# CONSULTATION SERVICE (DATA ACCESS ONLY)
# ============================================

class ConsultationService:
    """
    Wraps consultation-related DB operations.

    NO business logic (status transitions, AI triggers, etc.)
    — that belongs in the application service layer.
    """

    @staticmethod
    def create_request(data: dict[str, Any]) -> dict:
        """Insert a new consultation request."""
        return insert_record("consult_requests", data)

    @staticmethod
    def get_request(consult_id: str, user_id: str) -> dict:
        """
        Get a single consultation request with ownership check.

        The user must be either the patient or the assigned doctor.
        """
        # Fetch the consultation
        consult = query_table(
            "consult_requests",
            select="*, doctors(id, user_id, specialization, hospital, users(full_name))",
            filters={"id": consult_id},
            single=True,
        )

        # Ownership check: patient or assigned doctor
        is_patient = consult.get("patient_id") == user_id
        doctor_record = consult.get("doctors", {})
        is_doctor = doctor_record.get("user_id") == user_id if doctor_record else False

        if not is_patient and not is_doctor:
            raise HTTPException(status_code=403, detail="Access denied")

        return consult

    @staticmethod
    def list_for_patient(
        patient_id: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """Get paginated consultations for a patient."""
        return get_consult_requests_for_patient(
            patient_id, status=status, page=page, page_size=page_size
        )

    @staticmethod
    def list_for_doctor(
        doctor_id: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """Get paginated consultations for a doctor."""
        return get_consult_requests_for_doctor(
            doctor_id, status=status, page=page, page_size=page_size
        )

    @staticmethod
    def update_request(
        consult_id: str,
        data: dict[str, Any],
    ) -> dict:
        """Update a consultation request record."""
        return update_record("consult_requests", consult_id, data)

    @staticmethod
    def get_responses(request_id: str) -> list[dict]:
        """Get all doctor responses for a consultation."""
        return get_consult_responses(request_id)

    @staticmethod
    def add_response(data: dict[str, Any]) -> dict:
        """Insert a new doctor response."""
        return insert_record("consult_responses", data)


# ============================================
# STORAGE SERVICE
# ============================================

class StorageService:
    """Wraps Supabase Storage operations for medical assets."""

    @staticmethod
    async def upload_clock_drawing(file, user_id: str) -> dict[str, str]:
        """
        Upload a clock drawing image for AI processing.

        Files stored in: clock-drawings/{user_id}/{unique_name}
        """
        return await upload_file(
            file,
            user_id=user_id,
            folder="clock-drawings",
        )

    @staticmethod
    def download_for_processing(storage_path: str) -> bytes:
        """Download a file for backend AI analysis."""
        return download_file(storage_path)

    @staticmethod
    def get_temporary_url(storage_path: str, expires_in: int = 3600) -> Optional[str]:
        """Generate a short-lived signed URL for secure viewing."""
        return create_signed_url(storage_path, expires_in=expires_in)

    @staticmethod
    def remove_file(storage_path: str) -> bool:
        """Delete a file from storage."""
        return delete_file(storage_path)
