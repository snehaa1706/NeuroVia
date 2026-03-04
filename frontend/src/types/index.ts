// ============================================
// NeuroVia TypeScript Types
// ============================================

export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    phone?: string;
    date_of_birth?: string;
    avatar_url?: string;
    created_at?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

// Screening
export type ScreeningLevel = 'scd' | 'mci' | 'dementia';
export type ScreeningStatus = 'in_progress' | 'completed' | 'abandoned';
export type TestType = 'ad8' | 'orientation' | 'verbal_fluency' | 'trail_making' | 'clock_drawing' | 'moca';

export interface Screening {
    id: string;
    user_id: string;
    level: ScreeningLevel;
    status: ScreeningStatus;
    started_at?: string;
    completed_at?: string;
    ai_analyses?: AIAnalysis[];
}

export interface ScreeningResult {
    id: string;
    screening_id: string;
    test_type: TestType;
    responses: Record<string, any>;
    score: number;
    max_score: number;
}

// AI Analysis
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface AIAnalysis {
    id: string;
    screening_id: string;
    risk_level: RiskLevel;
    risk_score: number;
    interpretation: string;
    recommendations: string[];
    created_at?: string;
}

// Doctor
export interface Doctor {
    id: string;
    user_id: string;
    full_name?: string;
    specialization: string;
    hospital?: string;
    experience_years?: number;
    available: boolean;
}

export interface ConsultRequest {
    id: string;
    patient_id: string;
    doctor_id: string;
    screening_id?: string;
    summary?: string;
    status: string;
    created_at?: string;
}

// Caregiver
export interface CaregiverLog {
    id: string;
    caregiver_id: string;
    patient_id: string;
    log_type: string;
    mood?: string;
    confusion_level?: number;
    sleep_hours?: number;
    appetite?: string;
    notes?: string;
    created_at?: string;
}

// Medication
export interface Medication {
    id: string;
    patient_id: string;
    name: string;
    dosage: string;
    frequency: string;
    time_slots: string[];
    active: boolean;
}

export interface MedicationLog {
    id: string;
    medication_id: string;
    taken_at?: string;
    status: 'taken' | 'missed' | 'skipped';
    notes?: string;
}

// Activity
export type ActivityType = 'photo_recognition' | 'memory_recall' | 'verbal_recall' | 'object_matching';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Activity {
    id: string;
    patient_id: string;
    activity_type: ActivityType;
    content: Record<string, any>;
    difficulty: Difficulty;
    created_at?: string;
    activity_results?: ActivityResult[];
}

export interface ActivityResult {
    id: string;
    activity_id: string;
    responses: Record<string, any>;
    score: number;
    ai_feedback?: string;
    completed_at?: string;
}

// Alert
export type AlertType = 'medication_missed' | 'confusion_spike' | 'score_decline' | 'incident';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
    id: string;
    patient_id: string;
    caregiver_id?: string;
    alert_type: AlertType;
    severity: AlertSeverity;
    message: string;
    ai_interpretation?: string;
    read: boolean;
    created_at?: string;
}

// Family Member
export interface FamilyMember {
    id: string;
    patient_id: string;
    name: string;
    relationship: string;
    photo_url?: string;
}
