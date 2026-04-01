import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { User } from './types';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientDashboard from './pages/PatientDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import ScreeningPage from './pages/ScreeningPage';
import ActivitiesPage from './pages/ActivitiesPage';
import DoctorConsultPage from './pages/DoctorConsultPage';
import AlertsPage from './pages/AlertsPage';
import MedicationsPage from './pages/MedicationsPage';
import LandingPage from './pages/LandingPage';
import './index.css';

function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function DashboardLayout({ user, onLogout, children }: { user: User; onLogout: () => void; children: React.ReactNode }) {
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

  return (
    <Router>
      <Routes>
        {/* Public Standalone Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/screening" element={<ScreeningPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <RegisterPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />

        {/* Dashboard Layout Routes (Protected) */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <PatientDashboard user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/caregiver" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <CaregiverDashboard user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/doctor" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <DoctorConsultPage user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        {/* Deprecated/Alias mapped strictly correctly above, maintaining generic consult map */}
        <Route path="/consult" element={<Navigate to="/doctor" />} />

        <Route path="/activities" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <ActivitiesPage user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/medications" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <MedicationsPage user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute user={user}>
            <DashboardLayout user={user!} onLogout={handleLogout}>
              <AlertsPage user={user!} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
