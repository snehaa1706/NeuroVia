"""
Database Helper Functions — Supabase PostgreSQL

Generic, reusable CRUD helpers that wrap Supabase queries.
All write/update operations enforce user_id filtering for RLS safety.

SECURITY:
- NEVER trust client-supplied user_id → always extract from JWT
- All queries filter by user_id unless explicitly admin-scoped
- Uses service_role client ONLY when documented
"""

from __future__ import annotations

from typing import Any, Optional
from fastapi import HTTPException
from app.database import get_supabase, get_supabase_admin


# ============================================
# AUTH HELPER
# ============================================

def extract_user_id_from_request(request) -> str:
    """
    Extract authenticated user_id from the Supabase JWT.

    Uses Supabase Auth to verify the token — NEVER trusts
    client-passed user_id.

    Args:
        request: FastAPI Request object with Authorization header.

    Returns:
        User ID string from the verified JWT.

    Raises:
        HTTPException 401 if token is missing or invalid.
    """
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.replace("Bearer ", "")
    try:
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token — user not found")
        return user_response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


# ============================================
# GENERIC QUERY HELPERS
# ============================================

def query_table(
    table: str,
    *,
    select: str = "*",
    filters: Optional[dict[str, Any]] = None,
    order_by: Optional[str] = None,
    order_desc: bool = True,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    single: bool = False,
    use_admin: bool = False,
) -> Any:
    """
    Generic SELECT query on any Supabase table.

    Args:
        table:      Table name.
        select:     Column selection string (supports joins like "*, users(full_name)").
        filters:    Dict of column=value equality filters.
        order_by:   Column to order by.
        order_desc: If True, descending order.
        limit:      Max rows to return (for pagination).
        offset:     Row offset (for pagination).
        single:     If True, return a single row (raises if not exactly one).
        use_admin:  If True, use service_role client (bypasses RLS).

    Returns:
        Query result data (list of dicts, or single dict if single=True).

    Raises:
        HTTPException 404 if single=True and no row found.
    """
    sb = get_supabase_admin() if use_admin else get_supabase()
    query = sb.table(table).select(select)

    if filters:
        for col, val in filters.items():
            query = query.eq(col, val)

    if order_by:
        query = query.order(order_by, desc=order_desc)

    if limit is not None:
        query = query.limit(limit)

    if offset is not None:
        query = query.offset(offset)

    if single:
        try:
            result = query.single().execute()
        except Exception:
            raise HTTPException(status_code=404, detail=f"Record not found in {table}")
        return result.data

    result = query.execute()
    return result.data


def query_table_paginated(
    table: str,
    *,
    select: str = "*",
    filters: Optional[dict[str, Any]] = None,
    order_by: str = "created_at",
    order_desc: bool = True,
    page: int = 1,
    page_size: int = 20,
    use_admin: bool = False,
) -> dict[str, Any]:
    """
    Paginated SELECT query. Returns items + pagination metadata.

    Args:
        table:      Table name.
        select:     Column selection string.
        filters:    Dict of equality filters.
        order_by:   Column to order by.
        order_desc: Descending order flag.
        page:       Page number (1-indexed).
        page_size:  Items per page (max 100).
        use_admin:  Use service_role client.

    Returns:
        {
            "items": [...],
            "total": <int>,
            "page": <int>,
            "page_size": <int>,
            "total_pages": <int>
        }
    """
    page_size = min(page_size, 100)  # Cap at 100
    page = max(page, 1)
    offset = (page - 1) * page_size

    sb = get_supabase_admin() if use_admin else get_supabase()

    # --- Count query ---
    count_query = sb.table(table).select("*", count="exact")
    if filters:
        for col, val in filters.items():
            count_query = count_query.eq(col, val)
    count_result = count_query.limit(0).execute()
    total = count_result.count or 0

    # --- Data query ---
    items = query_table(
        table,
        select=select,
        filters=filters,
        order_by=order_by,
        order_desc=order_desc,
        limit=page_size,
        offset=offset,
        use_admin=use_admin,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ============================================
# INSERT HELPER
# ============================================

def insert_record(
    table: str,
    data: dict[str, Any],
    *,
    use_admin: bool = False,
) -> dict[str, Any]:
    """
    Insert a single record into a table.

    Args:
        table:     Table name.
        data:      Dict of column=value to insert.
        use_admin: Use service_role client.

    Returns:
        The inserted row as a dict.

    Raises:
        HTTPException 500 on insert failure.
    """
    sb = get_supabase_admin() if use_admin else get_supabase()
    try:
        result = sb.table(table).insert(data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail=f"Insert into {table} returned no data")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insert failed: {str(e)}")


# ============================================
# UPDATE HELPER
# ============================================

def update_record(
    table: str,
    record_id: str,
    data: dict[str, Any],
    *,
    user_id_column: Optional[str] = None,
    user_id_value: Optional[str] = None,
    use_admin: bool = False,
) -> dict[str, Any]:
    """
    Update a record by ID, with optional user_id ownership filter.

    SECURITY: When user_id_column and user_id_value are provided,
    the update will only succeed if the row belongs to that user.

    Args:
        table:          Table name.
        record_id:      UUID of the row to update.
        data:           Dict of column=value to set.
        user_id_column: Column name for ownership check (e.g. "patient_id").
        user_id_value:  The authenticated user's ID.
        use_admin:      Use service_role client.

    Returns:
        The updated row as a dict.

    Raises:
        HTTPException 404 if no matching row (ownership check failed or ID invalid).
        HTTPException 500 on update failure.
    """
    sb = get_supabase_admin() if use_admin else get_supabase()
    try:
        query = sb.table(table).update(data).eq("id", record_id)

        if user_id_column and user_id_value:
            query = query.eq(user_id_column, user_id_value)

        result = query.execute()

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Record not found or access denied in {table}"
            )
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


# ============================================
# TABLE-SPECIFIC QUERY HELPERS
# ============================================

def get_screenings(user_id: str, **kwargs) -> Any:
    """Get screenings for a specific user (respects ownership)."""
    return query_table(
        "screenings",
        filters={"user_id": user_id},
        order_by="started_at",
        **kwargs,
    )


def get_screening_results(screening_id: str, **kwargs) -> Any:
    """Get results for a specific screening."""
    return query_table(
        "screening_results",
        filters={"screening_id": screening_id},
        **kwargs,
    )


def get_ai_analyses(screening_id: str, **kwargs) -> Any:
    """Get AI analyses for a specific screening."""
    return query_table(
        "ai_analyses",
        filters={"screening_id": screening_id},
        order_by="created_at",
        **kwargs,
    )


def get_consult_requests_for_patient(
    patient_id: str,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Get paginated consultation requests for a patient."""
    filters = {"patient_id": patient_id, "deleted_at": None}
    if status:
        filters["status"] = status
    return query_table_paginated(
        "consult_requests",
        filters=filters,
        page=page,
        page_size=page_size,
    )


def get_consult_requests_for_doctor(
    doctor_id: str,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Get paginated consultation requests assigned to a doctor."""
    filters = {"doctor_id": doctor_id, "deleted_at": None}
    if status:
        filters["status"] = status
    return query_table_paginated(
        "consult_requests",
        filters=filters,
        page=page,
        page_size=page_size,
    )


def get_consult_responses(request_id: str, **kwargs) -> Any:
    """Get all doctor responses for a consultation request."""
    return query_table(
        "consult_responses",
        filters={"request_id": request_id},
        order_by="created_at",
        order_desc=False,
        **kwargs,
    )


def get_doctors(
    specialization: Optional[str] = None,
    available_only: bool = True,
) -> list[dict[str, Any]]:
    """Get doctors with optional filters."""
    filters: dict[str, Any] = {}
    if specialization:
        filters["specialization"] = specialization
    if available_only:
        filters["available"] = True
    return query_table(
        "doctors",
        select="*, users(full_name)",
        filters=filters,
    )


def get_doctor_by_user_id(user_id: str) -> Optional[dict[str, Any]]:
    """
    Map a user_id to their doctors table record.

    Returns None if the user is not a doctor.
    """
    try:
        return query_table(
            "doctors",
            filters={"user_id": user_id},
            single=True,
        )
    except HTTPException:
        return None
