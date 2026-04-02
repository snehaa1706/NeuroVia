import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { User } from './types';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// ─── Public Pages (no auth) ───
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StandaloneScreeningPage from './pages/screening/StandaloneScreeningPage';

// ─── Authenticated Pages (inside MainLayout) ───
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import ScreeningPage from './pages/ScreeningPage';
import ActivitiesPage from './pages/ActivitiesPage';
import DoctorConsultPage from './pages/DoctorConsultPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ConsultationList from './pages/doctor/ConsultationList';
import ConsultationDetail from './pages/doctor/ConsultationDetail';
import AlertsPage from './pages/AlertsPage';
import MedicationsPage from './pages/MedicationsPage';
import './index.css';

// ─── MainLayout: Sidebar + Navbar wrapper ───
function MainLayout({
    user,
    children,
    onLogout,
}: {
    user: User;
    children: React.ReactNode;
    onLogout: () => void;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            <Sidebar
                user={user}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar user={user} onLogout={onLogout} />
                <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                    {children}
                </main>
            </div>
        </div>
    );
}

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = api.getToken();
        if (token) {
            api.getProfile()
                .then((profile) => setUser(profile))
                .catch(() => {
                    api.clearToken();
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogin = (authResponse: any) => {
        api.setToken(authResponse.access_token);
        setUser(authResponse.user);
    };

    const handleLogout = () => {
        api.clearToken();
        setUser(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-lg text-slate-500 font-medium">Loading NeuroVia...</p>
                </div>
            </div>
        );
    }

    const getDashboardPath = () => {
        if (!user) return '/';
        switch (user.role) {
            case 'caregiver': return '/caregiver';
            case 'doctor': return '/doctor';
            default: return '/dashboard';
        }
    };

    return (
        <Router>
            <Routes>
                {/* ═══════════════════════════════════════════
                    MODULE 1: PUBLIC ROUTES (no auth, no layout)
                    ═══════════════════════════════════════════ */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/screening" element={<StandaloneScreeningPage />} />
                <Route
                    path="/login"
                    element={
                        user ? <Navigate to={getDashboardPath()} /> : <LoginPage onLogin={handleLogin} />
                    }
                />
                <Route
                    path="/register"
                    element={
                        user ? <Navigate to={getDashboardPath()} /> : <RegisterPage onLogin={handleLogin} />
                    }
                />

                {/* ═══════════════════════════════════════════
                    MODULE 2: CAREGIVER / PATIENT (auth + MainLayout)
                    ═══════════════════════════════════════════ */}
                <Route
                    path="/dashboard"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <PatientDashboard user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/caregiver"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <CaregiverDashboard user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/caregiver/screening"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <ScreeningPage user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/activities"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <ActivitiesPage user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/consult"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <DoctorConsultPage user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/medications"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <MedicationsPage user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/alerts"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <AlertsPage user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />

                {/* ═══════════════════════════════════════════
                    MODULE 3: DOCTOR CONSULTATION (auth + MainLayout)
                    ═══════════════════════════════════════════ */}
                <Route
                    path="/doctor"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <DoctorDashboard user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/doctor/consultations"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <ConsultationList user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />
                <Route
                    path="/doctor/consultations/:id"
                    element={
                        user ? (
                            <MainLayout user={user} onLogout={handleLogout}>
                                <ConsultationDetail user={user} />
                            </MainLayout>
                        ) : <Navigate to="/login" />
                    }
                />

                {/* ═══════════════════════════════════════════
                    CATCH-ALL
                    ═══════════════════════════════════════════ */}
                <Route path="*" element={<Navigate to={user ? getDashboardPath() : '/'} />} />
            </Routes>
        </Router>
    );
}

export default App;
