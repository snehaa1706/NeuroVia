"""
Doctor & Consultation Models — Pydantic v2

Schemas for:
- Doctor profiles
- Consultation requests (create, view, detail)
- Doctor responses (create, view)
- Status updates
- Pagination

DESIGN RULES:
- UUID for all ID fields
- ConsultStatus enum mirrors DB consult_status
- RiskLevel reused from ai_analysis (no duplication)
- JSONB → list[str] or list[dict] with default []
- deleted_at is NEVER exposed in API models
- assessment_id maps to DB screening_id (alias handled at service layer)
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Optional
from enum import Enum
from datetime import date, datetime


# ============================================
# ENUMS
# ============================================

class ConsultStatus(str, Enum):
    """Consultation lifecycle status — mirrors DB consult_status enum."""
    pending = "pending"
    accepted = "accepted"
    completed = "completed"
    cancelled = "cancelled"


# ============================================
# DOCTOR PROFILE (unchanged)
# ============================================

class DoctorProfile(BaseModel):
    """Output model for doctor listing."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    full_name: Optional[str] = None
    specialization: str
    hospital: Optional[str] = None
    experience_years: Optional[int] = None
    available: bool = True


# ============================================
# CONSULTATION REQUEST — INPUT
# ============================================

class ConsultRequestCreate(BaseModel):
    """Input: Patient creates a consultation request."""
    doctor_id: str = Field(..., description="UUID of the target doctor")
    assessment_id: Optional[str] = Field(
        None,
        description="UUID of the screening/assessment. Triggers async AI summary if provided.",
    )
    message: Optional[str] = Field(
        None,
        max_length=2000,
        description="Optional message from the patient to the doctor",
    )


# ============================================
# CONSULTATION REQUEST — OUTPUT
# ============================================

class ConsultRequestOut(BaseModel):
    """Standard output for a consultation request."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: str
    assessment_id: Optional[str] = Field(
        None,
        validation_alias="screening_id",
        description="Maps to DB screening_id",
    )
    status: ConsultStatus
    summary: Optional[str] = None
    risk_level: Optional[str] = None
    key_concerns: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ConsultRequestDetail(ConsultRequestOut):
    """
    Rich output with nested relationships.
    Used by GET /consult/requests/{id}.
    """
    doctor: Optional[DoctorProfile] = None
    responses: list[ConsultResponseOut] = Field(default_factory=list)


# ============================================
# CONSULTATION STATUS UPDATE
# ============================================

class ConsultStatusUpdate(BaseModel):
    """Input: Doctor updates consultation status (accept / cancel)."""
    status: ConsultStatus = Field(
        ...,
        description="Target status. Transition rules enforced in service layer.",
    )


# ============================================
# DOCTOR RESPONSE — INPUT
# ============================================

class ConsultResponseCreate(BaseModel):
    """Input: Doctor submits a response (diagnosis, prescription, etc.)."""
    diagnosis: str = Field(
        ...,
        min_length=1,
        description="Doctor's medical opinion — required, must not be empty",
    )
    notes: Optional[str] = Field(None, description="Additional explanation")
    prescription: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Structured medication list",
    )
    follow_up_date: Optional[date] = Field(
        None,
        description="Optional future consultation date",
    )


# ============================================
# DOCTOR RESPONSE — OUTPUT
# ============================================

class ConsultResponseOut(BaseModel):
    """Output for a single doctor response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    request_id: str
    doctor_id: str
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    prescription: list[dict[str, Any]] = Field(default_factory=list)
    follow_up_date: Optional[date] = None
    created_at: Optional[datetime] = None


# ============================================
# PAGINATION WRAPPER
# ============================================

class PaginatedConsultList(BaseModel):
    """Paginated response for consultation list endpoints."""
    items: list[ConsultRequestOut] = Field(default_factory=list)
    total: int = 0
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)
    total_pages: int = 0


# ============================================
# FORWARD REFERENCE RESOLUTION
# ============================================

# ConsultRequestDetail references ConsultResponseOut which is
# defined after it. Rebuild model to resolve the forward ref.
ConsultRequestDetail.model_rebuild()
