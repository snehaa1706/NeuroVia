-- NeuroVia Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FULL RESET (CLEARS PREVIOUS FAILED ATTEMPTS)
-- ============================================
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS activity_results CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS caregiver_logs CASCADE;
DROP TABLE IF EXISTS medication_logs CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS consult_requests CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS ai_analyses CASCADE;
DROP TABLE IF EXISTS assessment_results CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS assessment_level CASCADE;
DROP TYPE IF EXISTS assessment_status CASCADE;
DROP TYPE IF EXISTS test_type CASCADE;
DROP TYPE IF EXISTS risk_level CASCADE;
DROP TYPE IF EXISTS log_type CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS medication_status CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS consult_status CASCADE;
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'doctor', 'admin');
CREATE TYPE assessment_level AS ENUM ('scd', 'mci', 'dementia');
CREATE TYPE assessment_status AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE test_type AS ENUM ('ad8', 'orientation', 'verbal_fluency', 'trail_making', 'clock_drawing', 'moca');
CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high');
CREATE TYPE log_type AS ENUM ('daily_checkin', 'incident', 'observation');
CREATE TYPE activity_type AS ENUM ('photo_recognition', 'memory_recall', 'verbal_recall', 'object_matching');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE medication_status AS ENUM ('taken', 'missed', 'skipped');
CREATE TYPE alert_type AS ENUM ('medication_missed', 'confusion_spike', 'score_decline', 'incident');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE consult_status AS ENUM ('pending', 'accepted', 'completed');

-- ============================================
-- TABLES
-- ============================================

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    phone VARCHAR(20),
    date_of_birth DATE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level assessment_level NOT NULL DEFAULT 'scd',
    status assessment_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Assessment Results
CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    test_type test_type NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}',
    score FLOAT DEFAULT 0,
    max_score FLOAT DEFAULT 0
);

-- AI Analyses
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    risk_level risk_level NOT NULL DEFAULT 'low',
    risk_score FLOAT DEFAULT 0,
    interpretation TEXT,
    recommendations JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(255) NOT NULL,
    hospital VARCHAR(255),
    experience_years INT,
    available BOOLEAN DEFAULT TRUE
);

-- Consultation Requests
CREATE TABLE consult_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id),
    summary TEXT,
    status consult_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medications
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(255),
    frequency VARCHAR(255),
    time_slots JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE
);

-- Medication Logs
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    status medication_status NOT NULL,
    notes TEXT
);

-- Caregiver Logs
CREATE TABLE caregiver_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_type log_type NOT NULL DEFAULT 'daily_checkin',
    mood VARCHAR(50),
    confusion_level INT CHECK (confusion_level >= 1 AND confusion_level <= 10),
    sleep_hours FLOAT,
    appetite VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    difficulty difficulty_level DEFAULT 'easy',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Results
CREATE TABLE activity_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}',
    score FLOAT DEFAULT 0,
    ai_feedback TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Members
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    photo_url TEXT
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES users(id),
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    ai_interpretation TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessment_results_assessment ON assessment_results(assessment_id);
CREATE INDEX idx_ai_analyses_assessment ON ai_analyses(assessment_id);
CREATE INDEX idx_caregiver_logs_patient ON caregiver_logs(patient_id);
CREATE INDEX idx_caregiver_logs_caregiver ON caregiver_logs(caregiver_id);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_medication_logs_medication ON medication_logs(medication_id);
CREATE INDEX idx_activities_patient ON activities(patient_id);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_caregiver ON alerts(caregiver_id);
CREATE INDEX idx_alerts_read ON alerts(read);
CREATE INDEX idx_consult_requests_patient ON consult_requests(patient_id);
CREATE INDEX idx_consult_requests_doctor ON consult_requests(doctor_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consult_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow service role full access)
-- In production, add more granular policies per user role

CREATE POLICY "Service role full access" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON assessments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON assessment_results
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON ai_analyses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON doctors
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON consult_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON medications
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON medication_logs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON caregiver_logs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON activities
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON activity_results
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON family_members
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON alerts
    FOR ALL USING (true) WITH CHECK (true);
