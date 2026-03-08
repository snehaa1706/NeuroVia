-- ==============================================================================
-- NEUROVIA V3 PRODUCTION SCHEMA
-- Run this in the Supabase SQL Editor
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'patient', -- 'patient', 'caregiver', 'doctor', 'admin'
    phone TEXT,
    date_of_birth DATE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- 2. SCREENINGS TABLE (Test sessions)
CREATE TABLE IF NOT EXISTS public.screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- 3. SCREENING RESULTS TABLE (Specific test scores per session)
CREATE TABLE IF NOT EXISTS public.screening_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL, -- e.g., 'AD8', 'Verbal Fluency', 'Clock Drawing'
    responses JSONB NOT NULL DEFAULT '{}'::jsonb, -- Raw patient answers
    score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Time-series Index
CREATE INDEX IF NOT EXISTS idx_screening_user_time ON public.screening_results(user_id, created_at);

-- 4. AI ANALYSES TABLE (LLM generated interpretations)
CREATE TABLE IF NOT EXISTS public.ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screening_id UUID NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL, -- 'Low', 'Moderate', 'High'
    risk_score INTEGER NOT NULL, -- 0 to 100
    interpretation TEXT NOT NULL,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings
    provider TEXT NOT NULL, -- 'ollama' or 'openai'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_time ON public.ai_analyses(user_id, created_at);

-- 5. ACTIVITIES TABLE (Prescribed exercises)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'memory_recall', 'pattern_recognition'
    difficulty TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'started', 'completed'
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- 6. ACTIVITY RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.activity_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    performance_score INTEGER, -- 0 to 100
    time_taken_seconds INTEGER,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Time-series Index
CREATE INDEX IF NOT EXISTS idx_activity_results_time ON public.activity_results(user_id, created_at);

-- 7. CAREGIVER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.caregiver_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- the patient
    caregiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- the logger
    mood TEXT,
    confusion_level INTEGER CHECK (confusion_level >= 1 AND confusion_level <= 10),
    sleep_hours DECIMAL(4,1),
    appetite TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Time-series Index
CREATE INDEX IF NOT EXISTS idx_caregiver_logs_time ON public.caregiver_logs(user_id, created_at);

-- 8. MEDICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    interval_hours INTEGER,
    time_of_day TEXT[], -- e.g., ['morning', 'evening']
    days_of_week TEXT[], -- e.g., ['monday', 'wednesday']
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

-- 9. MEDICATION LOGS TABLE (Tracking adherence)
CREATE TABLE IF NOT EXISTS public.medication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'taken', 'missed', 'skipped'
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    logged_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
-- Time-series Index
CREATE INDEX IF NOT EXISTS idx_medication_logs_time ON public.medication_logs(user_id, scheduled_time);

-- 10. ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'cognitive_decline', 'missed_meds', 'high_confusion', 'poor_sleep'
    severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    source_module TEXT NOT NULL, -- Which module triggered this alert
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Raw context payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Time-series Index
CREATE INDEX IF NOT EXISTS idx_alerts_user_time ON public.alerts(user_id, created_at);

-- 11. CONSULT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.consult_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ai_summary JSONB, -- Pre-generated summary attached to the request
    appointment_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ANALYTICS CACHE TABLE (For fast dashboard queries)
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL, -- 'cognitive_trend', 'medication_adherence', etc.
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_metric ON public.analytics_cache(user_id, metric_type);

-- 7.5 CAREGIVER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.caregiver_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(caregiver_id, patient_id)
);

-- Note: Caregiver Logs Table exists above (7.), but Phase 8 requires a unique constraint
ALTER TABLE public.caregiver_logs ADD COLUMN IF NOT EXISTS log_date DATE DEFAULT CURRENT_DATE;
DO $$ BEGIN
    ALTER TABLE public.caregiver_logs ADD CONSTRAINT unique_user_date UNIQUE (user_id, log_date);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7.6 CAREGIVER INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS public.caregiver_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- STORAGE BUCKETS
-- Run this directly via Supabase Dashboard -> Storage if the SQL function fails
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('neurovia-files', 'neurovia-files', false)
ON CONFLICT (id) DO NOTHING;
