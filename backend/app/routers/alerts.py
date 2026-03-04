from fastapi import APIRouter, HTTPException, Request
from app.database import get_supabase
from app.models.alert import AlertResponse

router = APIRouter()


def _get_user_id(request: Request) -> str:
    sb = get_supabase()
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    user_response = sb.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_response.user.id


@router.get("/")
async def get_alerts(request: Request, unread_only: bool = False):
    """Get alerts for the current user."""
    sb = get_supabase()
    user_id = _get_user_id(request)

    # Check alerts where user is either the patient or the caregiver
    query_patient = (
        sb.table("alerts")
        .select("*")
        .eq("patient_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    if unread_only:
        query_patient = query_patient.eq("read", False)
    result_patient = query_patient.execute()

    query_caregiver = (
        sb.table("alerts")
        .select("*")
        .eq("caregiver_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
    )
    if unread_only:
        query_caregiver = query_caregiver.eq("read", False)
    result_caregiver = query_caregiver.execute()

    # Merge and deduplicate
    all_alerts = {a["id"]: a for a in (result_patient.data or [])}
    for a in (result_caregiver.data or []):
        all_alerts[a["id"]] = a

    sorted_alerts = sorted(
        all_alerts.values(),
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )

    return {"alerts": sorted_alerts}


@router.put("/{alert_id}/read")
async def mark_alert_read(request: Request, alert_id: str):
    """Mark an alert as read."""
    sb = get_supabase()
    _get_user_id(request)

    result = (
        sb.table("alerts")
        .update({"read": True})
        .eq("id", alert_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"message": "Alert marked as read"}
