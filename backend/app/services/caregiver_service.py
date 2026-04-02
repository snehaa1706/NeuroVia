"""Caregiver service layer.

All business logic for the caregiver module lives here.
Router delegates to these functions; direct DB writes for
log/incident go through PostgreSQL RPC for atomicity.
"""

import json
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.database import get_supabase
from app.models.caregiver import (
    CaregiverCheckin,
    CaregiverIncident,
    CaregiverLogResponse,
    CaregiverIncidentResponse,
    CaregiverGuidanceResponse,
    PatientOverview,
    MedicationAdherence,
    ActivitySummary,
)
from app.services.alert_service import insert_alert_and_notify
from app.utils.sanitizer import sanitize_ai_input, sanitize_text, sanitize_list


# ============================================
# 1. ASSIGNMENT VALIDATION
# ============================================


def validate_assignment(caregiver_id: str, patient_id: str) -> None:
    """Verify that the caregiver is assigned to the patient.

    Raises 403 if not assigned, 404 if patient doesn't exist.
    """
    sb = get_supabase()

    # Check patient exists
    patient = (
        sb.table("users")
        .select("id")
        .eq("id", patient_id)
        .single()
        .execute()
    )
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Check assignment exists and is not soft-deleted
    assignment = (
        sb.table("caregiver_assignments")
        .select("id")
        .eq("caregiver_id", caregiver_id)
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if not assignment.data:
        raise HTTPException(
            status_code=403, detail="Caregiver is not assigned to this patient"
        )


# ============================================
# 2. GET ASSIGNED PATIENTS
# ============================================


def get_assigned_patients(caregiver_id: str) -> list[dict]:
    """Get all patients assigned to this caregiver."""
    sb = get_supabase()

    # Get active assignments
    assignments = (
        sb.table("caregiver_assignments")
        .select("patient_id")
        .eq("caregiver_id", caregiver_id)
        .is_("deleted_at", "null")
        .execute()
    )

    if not assignments.data:
        return []

    patient_ids = [a["patient_id"] for a in assignments.data]

    patients = (
        sb.table("users")
        .select("id, full_name, email, date_of_birth, avatar_url")
        .in_("id", patient_ids)
        .execute()
    )

    return patients.data or []


# ============================================
# 3. LOG OBSERVATION (via RPC — atomic)
# ============================================


def log_observation(
    caregiver_id: str, data: CaregiverCheckin
) -> dict:
    """Log a caregiver observation atomically via PostgreSQL RPC.

    Inserts the log and evaluates alert rules in a single transaction.
    Falls back to manual insert + rollback if RPC fails.
    """
    validate_assignment(caregiver_id, data.patient_id)
    sb = get_supabase()

    try:
        # PRIMARY: Use PostgreSQL RPC for atomic operation
        result = sb.rpc(
            "log_and_evaluate_event",
            {
                "p_caregiver_id": caregiver_id,
                "p_patient_id": data.patient_id,
                "p_log_type": "daily_checkin",
                "p_mood": data.mood.value if data.mood else None,
                "p_confusion_level": data.confusion_level,
                "p_sleep_hours": data.sleep_hours,
                "p_appetite": data.appetite.value if data.appetite else None,
                "p_notes": data.notes,
            },
        ).execute()

        rpc_result = result.data
        return rpc_result

    except Exception as rpc_error:
        # FALLBACK: Manual insert with rollback on alert failure
        try:
            record = {
                "caregiver_id": caregiver_id,
                "patient_id": data.patient_id,
                "log_type": "daily_checkin",
                "mood": data.mood.value if data.mood else None,
                "confusion_level": data.confusion_level,
                "sleep_hours": data.sleep_hours,
                "appetite": data.appetite.value if data.appetite else None,
                "notes": data.notes,
            }
            log_result = sb.table("caregiver_logs").insert(record).execute()
            log_row = log_result.data[0]

            alerts = []
            # Evaluate confusion alert
            if data.confusion_level and data.confusion_level >= 8:
                severity = (
                    "critical" if data.confusion_level >= 9 else "warning"
                )
                alert_record = {
                    "patient_id": data.patient_id,
                    "caregiver_id": caregiver_id,
                    "alert_type": "confusion_spike",
                    "severity": severity,
                    "message": f"Patient confusion level is critically high ({data.confusion_level}/10).",
                }
                try:
                    alert_result_dict = insert_alert_and_notify(alert_record)
                    alerts.append(alert_result_dict)
                except Exception:
                    # Alert failed — rollback the log
                    sb.table("caregiver_logs").delete().eq(
                        "id", log_row["id"]
                    ).execute()
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to evaluate alerts. Log rolled back.",
                    )

            return {"log": log_row, "alerts": alerts}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to log observation: {str(e)}"
            )


# ============================================
# 4. REPORT INCIDENT (via RPC — atomic)
# ============================================


def report_incident(
    caregiver_id: str, data: CaregiverIncident
) -> dict:
    """Report an incident atomically via PostgreSQL RPC.

    Inserts the incident and creates an alert in a single transaction.
    Falls back to manual insert + rollback if RPC fails.
    """
    validate_assignment(caregiver_id, data.patient_id)
    sb = get_supabase()

    try:
        # PRIMARY: Use PostgreSQL RPC for atomic operation
        result = sb.rpc(
            "incident_and_evaluate_event",
            {
                "p_caregiver_id": caregiver_id,
                "p_patient_id": data.patient_id,
                "p_incident_type": data.incident_type.value,
                "p_severity": data.severity.value,
                "p_description": data.description,
            },
        ).execute()

        rpc_result = result.data
        return rpc_result

    except Exception as rpc_error:
        # FALLBACK: Manual insert with rollback on alert failure
        try:
            record = {
                "caregiver_id": caregiver_id,
                "patient_id": data.patient_id,
                "incident_type": data.incident_type.value,
                "severity": data.severity.value,
                "description": data.description,
            }
            incident_result = (
                sb.table("caregiver_incidents").insert(record).execute()
            )
            incident_row = incident_result.data[0]

            # Always alert for incidents
            severity_map = {
                "high": "critical",
                "medium": "warning",
                "low": "info",
            }
            alert_severity = severity_map.get(data.severity.value, "info")
            alert_record = {
                "patient_id": data.patient_id,
                "caregiver_id": caregiver_id,
                "alert_type": "incident",
                "severity": alert_severity,
                "message": f"Incident reported ({data.incident_type.value}): "
                + (data.description[:200] if data.description else "No description"),
            }
            try:
                alert_result_dict = insert_alert_and_notify(alert_record)
                alerts = [alert_result_dict]
            except Exception:
                # Rollback the incident
                sb.table("caregiver_incidents").delete().eq(
                    "id", incident_row["id"]
                ).execute()
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create alert. Incident rolled back.",
                )

            return {"incident": incident_row, "alerts": alerts}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to report incident: {str(e)}"
            )


# ============================================
# 5. GET PATIENT LOGS (paginated)
# ============================================


def get_patient_logs(
    caregiver_id: str,
    patient_id: str,
    limit: int = 10,
    offset: int = 0,
) -> list[dict]:
    """Get paginated caregiver logs for a patient."""
    validate_assignment(caregiver_id, patient_id)
    sb = get_supabase()

    limit = min(limit, 50)

    result = (
        sb.table("caregiver_logs")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return result.data or []


# ============================================
# 6. GET PATIENT INCIDENTS (paginated)
# ============================================


def get_patient_incidents(
    caregiver_id: str,
    patient_id: str,
    limit: int = 10,
    offset: int = 0,
) -> list[dict]:
    """Get paginated incidents for a patient."""
    validate_assignment(caregiver_id, patient_id)
    sb = get_supabase()

    limit = min(limit, 50)

    result = (
        sb.table("caregiver_incidents")
        .select("*")
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return result.data or []


# ============================================
# 7. GET PATIENT OVERVIEW (aggregated)
# ============================================


def get_patient_overview(
    caregiver_id: str, patient_id: str
) -> dict:
    """Get aggregated patient overview: logs, incidents, meds, activities."""
    validate_assignment(caregiver_id, patient_id)
    sb = get_supabase()

    # Patient info
    patient = (
        sb.table("users")
        .select("id, full_name, email, date_of_birth, avatar_url")
        .eq("id", patient_id)
        .single()
        .execute()
    )

    # Recent logs (last 10)
    logs = (
        sb.table("caregiver_logs")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    # Recent incidents (last 10)
    incidents = (
        sb.table("caregiver_incidents")
        .select("*")
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    # Medication adherence
    med_adherence = _get_medication_adherence(patient_id)

    # Activity summary
    activity_summary = _get_activity_summary(patient_id)
    
    from app.services.cognitive_service import compute_cognitive_summary
    cognitive_summary = compute_cognitive_summary(patient_id)

    overview = PatientOverview(
        patient=patient.data or {},
        recent_logs=logs.data or [],
        recent_incidents=incidents.data or [],
        medication_adherence=med_adherence,
        activity_summary=activity_summary,
    ).model_dump()
    
    # Append dynamically to avoid model schema bounds issues
    if cognitive_summary and cognitive_summary.get("recent_scores"):
        overview["cognitive"] = {
            "avg_score": cognitive_summary["avg_score"],
            "latest_score": cognitive_summary["latest_score"],
            "trend": cognitive_summary["trend"]
        }
    else:
        overview["cognitive"] = None
        
    return overview


def _get_medication_adherence(patient_id: str) -> MedicationAdherence:
    """Calculate medication adherence stats for a patient."""
    sb = get_supabase()

    meds = (
        sb.table("medications")
        .select("id")
        .eq("patient_id", patient_id)
        .eq("active", True)
        .execute()
    )

    if not meds.data:
        return MedicationAdherence()

    med_ids = [m["id"] for m in meds.data]
    total_taken = 0
    total_missed = 0

    for med_id in med_ids:
        logs = (
            sb.table("medication_logs")
            .select("status")
            .eq("medication_id", med_id)
            .execute()
        )
        for log in logs.data or []:
            if log["status"] == "taken":
                total_taken += 1
            elif log["status"] in ("missed", "skipped"):
                total_missed += 1

    total = total_taken + total_missed
    rate = round((total_taken / total) * 100, 1) if total > 0 else 0.0

    return MedicationAdherence(
        taken=total_taken, missed=total_missed, rate=rate
    )


def _get_activity_summary(patient_id: str) -> ActivitySummary:
    """Calculate activity completion and average score for a patient."""
    sb = get_supabase()

    activities = (
        sb.table("activities")
        .select("id")
        .eq("patient_id", patient_id)
        .execute()
    )

    if not activities.data:
        return ActivitySummary()

    activity_ids = [a["id"] for a in activities.data]
    scores = []

    for act_id in activity_ids:
        results = (
            sb.table("activity_results")
            .select("score")
            .eq("activity_id", act_id)
            .execute()
        )
        for r in results.data or []:
            if r.get("score") is not None:
                scores.append(r["score"])

    completed = len(scores)
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return ActivitySummary(completed=completed, avg_score=avg_score)


# ============================================
# 8. GENERATE AI GUIDANCE (cache-first)
# ============================================


async def generate_guidance(
    caregiver_id: str, patient_id: str
) -> dict:
    """Generate AI-assisted caregiving guidance.

    Cache-first: returns cached guidance if valid (not expired, not deleted).
    On cache miss: aggregates patient data, sanitizes, calls AI, stores result.
    """
    validate_assignment(caregiver_id, patient_id)
    sb = get_supabase()

    # 1. Check cache (ORDER BY created_at DESC LIMIT 1)
    cached = (
        sb.table("caregiver_guidance")
        .select("*")
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .gte("expires_at", datetime.now(timezone.utc).isoformat())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if cached.data:
        guidance_data = cached.data[0].get("guidance", {})
        if isinstance(guidance_data, str):
            try:
                guidance_data = json.loads(guidance_data)
            except json.JSONDecodeError:
                guidance_data = {}
        return CaregiverGuidanceResponse(**guidance_data).model_dump()

    # 2. Cache miss — aggregate patient data
    # Recent logs (last 10)
    logs = (
        sb.table("caregiver_logs")
        .select("mood, confusion_level, sleep_hours, appetite, notes, created_at")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    # Recent incidents (last 10)
    incidents = (
        sb.table("caregiver_incidents")
        .select("incident_type, severity, description, created_at")
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    # Medication adherence
    med_adherence = _get_medication_adherence(patient_id)

    # Activity summary
    activity_summary = _get_activity_summary(patient_id)

    # Confusion trend (last 10 confusion levels)
    confusion_trend = [
        log["confusion_level"]
        for log in (logs.data or [])
        if log.get("confusion_level") is not None
    ]

    # Most recent log for current state
    latest_log = logs.data[0] if logs.data else {}

    # 3. Sanitize before AI call
    from app.services.cognitive_service import compute_cognitive_summary
    cognitive_data = compute_cognitive_summary(patient_id)
    
    # Add logic here for triggering alert on cognitive score if needed behind the scenes dynamically
    from app.services.alert_service import evaluate_event
    if cognitive_data.get("recent_scores") and len(cognitive_data["recent_scores"]) >= 6:
        # evaluate cognitive alerts natively silently
        alerts = evaluate_event(patient_id, "cognitive", {"recent_scores": cognitive_data["recent_scores"]})
        if alerts:
            for alert in alerts:
                # Store silent alert to DB 
                try: sb.table("alerts").insert(alert).execute()
                except Exception: pass
            
    # Include sanitized cognitive summary
    ai_cognitive_ctx = None
    if cognitive_data and cognitive_data.get("recent_scores"):
        ai_cognitive_ctx = {
            "avg_score": cognitive_data["avg_score"],
            "trend": cognitive_data["trend"],
            "recent_scores": cognitive_data["recent_scores"][:5] # Max 5 explicitly
        }
        
    ai_input = sanitize_ai_input(
        {
            "mood": latest_log.get("mood"),
            "confusion_level": latest_log.get("confusion_level"),
            "sleep_hours": latest_log.get("sleep_hours"),
            "appetite": latest_log.get("appetite"),
            "notes": latest_log.get("notes"),
            "confusion_trend": confusion_trend,
            "recent_incidents": [
                f"{i.get('incident_type', 'unknown')} ({i.get('severity', 'unknown')}): "
                + sanitize_text(i.get("description", ""), 100)
                for i in (incidents.data or [])
            ],
            "medication_adherence": f"{med_adherence.rate}% ({med_adherence.taken} taken, {med_adherence.missed} missed)",
            "activity_scores": f"{activity_summary.completed} completed, avg score {activity_summary.avg_score}",
            "recent_logs": json.dumps(
                sanitize_list(logs.data or [], 10), default=str
            ),
            "cognitive_summary": ai_cognitive_ctx
        }
    )

    # 4. Call AI service
    from app.services.ai_service import generate_caregiver_guidance

    ai_result = await generate_caregiver_guidance(
        mood=ai_input.get("mood", "unknown"),
        confusion_level=ai_input.get("confusion_level", 0),
        sleep_hours=ai_input.get("sleep_hours", 0),
        appetite=ai_input.get("appetite", "unknown"),
        notes=ai_input.get("notes", ""),
        recent_logs=ai_input.get("recent_logs", ""),
        cognitive_summary=ai_input.get("cognitive_summary")
    )

    # 5. Build guidance response
    guidance_response = CaregiverGuidanceResponse(
        risk_level=ai_result.get("risk_level", "low"),
        guidance=ai_result.get("guidance", ai_result.get("assessment", "")),
        recommended_actions=ai_result.get("recommended_actions", []),
        assessment=ai_result.get("assessment", ""),
        care_strategies=ai_result.get("care_strategies", []),
        warning_signs=ai_result.get("warning_signs", []),
    ).model_dump()

    # 6. Store in cache with expiration
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Soft-delete any existing active guidance for this patient
    existing = (
        sb.table("caregiver_guidance")
        .select("id")
        .eq("patient_id", patient_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if existing.data:
        for row in existing.data:
            sb.table("caregiver_guidance").update(
                {"deleted_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", row["id"]).execute()

    # Insert new guidance
    sb.table("caregiver_guidance").insert(
        {
            "patient_id": patient_id,
            "guidance": json.dumps(guidance_response),
            "expires_at": expires_at.isoformat(),
        }
    ).execute()

    return guidance_response
