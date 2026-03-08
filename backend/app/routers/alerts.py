from fastapi import APIRouter, Depends
from typing import List, Dict, Any

from app.dependencies import get_current_user_profile
from app.models.alert_schemas import AlertResponse, AlertAcknowledgeRequest
from app.services.alert_service import alert_service

router = APIRouter()

@router.get("/{patient_id}", response_model=List[AlertResponse])
def get_all_alerts(patient_id: str, user: dict = Depends(get_current_user_profile)):
    """Fetch all historical alerts for a patient (paginated internally to 50)."""
    alerts = alert_service.get_patient_alerts(user["role"], user["id"], patient_id, unread_only=False)
    return [AlertResponse(**a) for a in alerts]

@router.get("/{patient_id}/unread", response_model=List[AlertResponse])
def get_unread_alerts(patient_id: str, user: dict = Depends(get_current_user_profile)):
    """Fetch only active, unread alerts to populate dashboard notification badges."""
    alerts = alert_service.get_patient_alerts(user["role"], user["id"], patient_id, unread_only=True)
    return [AlertResponse(**a) for a in alerts]

@router.put("/{alert_id}/read", response_model=AlertResponse)
def acknowledge_alert(alert_id: str, payload: AlertAcknowledgeRequest, user: dict = Depends(get_current_user_profile)):
     """Mark a specific alert as read. Prevents it from appearing in the /unread badge queue."""
     alert = alert_service.mark_alert_read(alert_id, user["role"], user["id"])
     return AlertResponse(**alert)
