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
import './index.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  const getDashboardPath = () => {
    switch (user.role) {
      case 'caregiver': return '/caregiver';
      case 'doctor': return '/consult';
      default: return '/dashboard';
    }
  };

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar user={user} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Routes>
              <Route path="/dashboard" element={<PatientDashboard user={user} />} />
              <Route path="/caregiver" element={<CaregiverDashboard user={user} />} />
              <Route path="/screening" element={<ScreeningPage user={user} />} />
              <Route path="/activities" element={<ActivitiesPage user={user} />} />
              <Route path="/consult" element={<DoctorConsultPage user={user} />} />
              <Route path="/medications" element={<MedicationsPage user={user} />} />
              <Route path="/alerts" element={<AlertsPage user={user} />} />
              <Route path="*" element={<Navigate to={getDashboardPath()} />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
