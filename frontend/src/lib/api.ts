// ============================================
// NeuroVia API Client
// ============================================

const API_BASE = '/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
        localStorage.setItem('neurovia_token', token);
    }

    getToken(): string | null {
        if (!this.token) {
            this.token = localStorage.getItem('neurovia_token');
        }
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('neurovia_token');
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API Error: ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async register(data: { email: string; password: string; full_name: string; role: string }) {
        return this.request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    }

    async login(email: string, password: string) {
        return this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    }

    async getProfile() {
        return this.request<any>('/auth/me');
    }

    // Screening
    async startScreening(level: string = 'scd') {
        return this.request<any>('/screening/start', { method: 'POST', body: JSON.stringify({ level }) });
    }

    async submitTest(screeningId: string, testType: string, responses: Record<string, any>) {
        return this.request<any>(`/screening/${screeningId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ test_type: testType, responses }),
        });
    }

    async getScreeningHistory() {
        return this.request<any>('/screening/history/list');
    }

    async completeScreening(screeningId: string) {
        return this.request<any>(`/screening/${screeningId}/complete`, { method: 'POST' });
    }

    // AI
    async analyzeScreening(screeningId: string) {
        return this.request<any>('/ai/analyze-screening', {
            method: 'POST',
            body: JSON.stringify({ screening_id: screeningId }),
        });
    }

    async generateActivity(patientId: string, activityType?: string, difficulty?: string) {
        return this.request<any>('/ai/generate-activity', {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId, activity_type: activityType, difficulty }),
        });
    }

    async getCaregiverGuidance(logId: string, patientId: string) {
        return this.request<any>('/ai/caregiver-guidance', {
            method: 'POST',
            body: JSON.stringify({ caregiver_log_id: logId, patient_id: patientId }),
        });
    }

    async getConsultationSummary(patientId: string, screeningId: string) {
        return this.request<any>('/ai/consultation-summary', {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId, screening_id: screeningId }),
        });
    }

    // Caregiver
    async submitCheckin(data: any) {
        return this.request<any>('/caregiver/checkin', { method: 'POST', body: JSON.stringify(data) });
    }

    async logIncident(data: any) {
        return this.request<any>('/caregiver/incident', { method: 'POST', body: JSON.stringify(data) });
    }

    async getPatientLogs(patientId: string) {
        return this.request<any>(`/caregiver/logs/${patientId}`);
    }

    async getAssignedPatients() {
        return this.request<any>('/caregiver/patients');
    }

    // Doctors
    async getDoctors(specialization?: string) {
        const query = specialization ? `?specialization=${specialization}` : '';
        return this.request<any>(`/doctors/${query}`);
    }

    async requestConsultation(doctorId: string, screeningId?: string) {
        return this.request<any>('/doctors/consult/request', {
            method: 'POST',
            body: JSON.stringify({ doctor_id: doctorId, screening_id: screeningId }),
        });
    }

    async getConsultRequests(status?: string, page: number = 1, pageSize: number = 20) {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('page', String(page));
        params.append('page_size', String(pageSize));
        return this.request<any>(`/doctors/consult/requests?${params}`);
    }

    async getConsultDetail(consultId: string) {
        return this.request<any>(`/doctors/consult/requests/${consultId}`);
    }

    async updateConsultStatus(consultId: string, status: string) {
        return this.request<any>(`/doctors/consult/requests/${consultId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async submitConsultResponse(consultId: string, data: {
        diagnosis: string;
        notes?: string;
        prescription?: any[];
        follow_up_date?: string;
    }) {
        return this.request<any>(`/doctors/consult/requests/${consultId}/respond`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getPatientOverview(patientId: string) {
        return this.request<any>(`/doctors/patients/${patientId}/overview`);
    }

    // Medications
    async getMedications(patientId: string) {
        return this.request<any>(`/medications/${patientId}`);
    }

    async addMedication(data: any) {
        return this.request<any>('/medications/', { method: 'POST', body: JSON.stringify(data) });
    }

    async logMedication(medicationId: string, status: string, notes?: string) {
        return this.request<any>(`/medications/${medicationId}/log`, {
            method: 'POST',
            body: JSON.stringify({ status, notes }),
        });
    }

    async getMedicationAdherence(patientId: string) {
        return this.request<any>(`/medications/${patientId}/adherence`);
    }

    // Activities
    async getActivities(patientId: string) {
        return this.request<any>(`/activities/${patientId}`);
    }

    async submitActivityResult(activityId: string, responses: Record<string, any>) {
        return this.request<any>(`/activities/${activityId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ responses }),
        });
    }

    async getActivityProgress(patientId: string) {
        return this.request<any>(`/activities/${patientId}/progress`);
    }

    // Alerts
    async getAlerts(unreadOnly: boolean = false) {
        return this.request<any>(`/alerts/?unread_only=${unreadOnly}`);
    }

    async markAlertRead(alertId: string) {
        return this.request<any>(`/alerts/${alertId}/read`, { method: 'PUT' });
    }
}

export const api = new ApiClient();
