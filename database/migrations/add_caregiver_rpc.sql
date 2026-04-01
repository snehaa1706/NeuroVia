-- ============================================
-- MIGRATION: Caregiver RPC Functions
-- Atomic transaction functions for log + alert evaluation
-- Run manually in Supabase SQL Editor AFTER add_caregiver_tables.sql
-- ============================================


-- ============================================
-- 1. RPC: log_and_evaluate_event
-- Atomically inserts a caregiver log and evaluates alert rules
-- ============================================

CREATE OR REPLACE FUNCTION log_and_evaluate_event(
    p_caregiver_id UUID,
    p_patient_id UUID,
    p_log_type TEXT,
    p_mood TEXT DEFAULT NULL,
    p_confusion_level INT DEFAULT NULL,
    p_sleep_hours FLOAT DEFAULT NULL,
    p_appetite TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
    v_alert_id UUID;
    v_alerts JSONB := '[]'::JSONB;
    v_log JSONB;
BEGIN
    -- 1. Insert caregiver log
    INSERT INTO caregiver_logs (
        caregiver_id, patient_id, log_type,
        mood, confusion_level, sleep_hours, appetite, notes
    )
    VALUES (
        p_caregiver_id, p_patient_id, p_log_type::log_type,
        p_mood, p_confusion_level, p_sleep_hours, p_appetite, p_notes
    )
    RETURNING id INTO v_log_id;

    -- Get the full log row as JSONB
    SELECT to_jsonb(cl.*) INTO v_log
    FROM caregiver_logs cl
    WHERE cl.id = v_log_id;

    -- 2. Evaluate confusion alert (confusion_level >= 8)
    IF p_confusion_level IS NOT NULL AND p_confusion_level >= 8 THEN
        INSERT INTO alerts (
            patient_id, caregiver_id, alert_type, severity, message
        )
        VALUES (
            p_patient_id,
            p_caregiver_id,
            'confusion_spike'::alert_type,
            CASE WHEN p_confusion_level >= 9 THEN 'critical'::alert_severity
                 ELSE 'warning'::alert_severity END,
            'Patient confusion level is critically high (' || p_confusion_level || '/10).'
        )
        RETURNING id INTO v_alert_id;

        v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
            'id', v_alert_id,
            'alert_type', 'confusion_spike',
            'severity', CASE WHEN p_confusion_level >= 9 THEN 'critical' ELSE 'warning' END
        ));
    END IF;

    -- 3. Return result
    RETURN jsonb_build_object(
        'log', v_log,
        'alerts', v_alerts
    );
END;
$$;


-- ============================================
-- 2. RPC: incident_and_evaluate_event
-- Atomically inserts an incident and creates an alert
-- ============================================

CREATE OR REPLACE FUNCTION incident_and_evaluate_event(
    p_caregiver_id UUID,
    p_patient_id UUID,
    p_incident_type TEXT,
    p_severity TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_incident_id UUID;
    v_alert_id UUID;
    v_alerts JSONB := '[]'::JSONB;
    v_incident JSONB;
    v_alert_severity TEXT;
BEGIN
    -- 1. Insert incident
    INSERT INTO caregiver_incidents (
        caregiver_id, patient_id, incident_type, severity, description
    )
    VALUES (
        p_caregiver_id, p_patient_id, p_incident_type, p_severity, p_description
    )
    RETURNING id INTO v_incident_id;

    -- Get full incident as JSONB
    SELECT to_jsonb(ci.*) INTO v_incident
    FROM caregiver_incidents ci
    WHERE ci.id = v_incident_id;

    -- 2. Always create an alert for incidents
    -- Map incident severity to alert severity
    v_alert_severity := CASE
        WHEN p_severity = 'high' THEN 'critical'
        WHEN p_severity = 'medium' THEN 'warning'
        ELSE 'info'
    END;

    INSERT INTO alerts (
        patient_id, caregiver_id, alert_type, severity, message
    )
    VALUES (
        p_patient_id,
        p_caregiver_id,
        'incident'::alert_type,
        v_alert_severity::alert_severity,
        'Incident reported (' || p_incident_type || '): ' ||
            COALESCE(LEFT(p_description, 200), 'No description')
    )
    RETURNING id INTO v_alert_id;

    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
        'id', v_alert_id,
        'alert_type', 'incident',
        'severity', v_alert_severity
    ));

    -- 3. Return result
    RETURN jsonb_build_object(
        'incident', v_incident,
        'alerts', v_alerts
    );
END;
$$;
