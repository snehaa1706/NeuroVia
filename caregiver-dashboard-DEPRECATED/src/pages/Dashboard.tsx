import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Bell, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import AlertCard from '../components/AlertCard';

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, alerts: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestAlerts, setLatestAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [patientsRes, alertsRes] = await Promise.all([
          apiClient.get('/caregiver/patients'),
          apiClient.get('/alerts')
        ]);
        
        const patients = patientsRes.data || [];
        const alerts = alertsRes.data?.alerts || [];
        
        // Calculate average score
        let totalScore = 0;
        let patientsWithScore = 0;
        
        patients.forEach((p: any) => {
          if (p.latest_score) {
            totalScore += p.latest_score;
            patientsWithScore++;
          }
        });
        
        const avgScore = patientsWithScore > 0 ? (totalScore / patientsWithScore) : 0;
        
        setStats({
          patients: patients.length,
          alerts: alerts.filter((a: any) => !a.read).length,
          avgScore
        });
        
        setLatestAlerts(alerts.slice(0, 3));
      } catch (err: any) {
        setError('Failed to load dashboard data. Ensure backend is running and token is valid.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A6FA8]"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Caregiver Dashboard</h1>
        <p className="mt-2 text-lg text-gray-500">Monitor your patients' cognitive health and daily alerts.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded shadow-sm text-red-700">
          <p className="font-bold">Connection Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="card p-6 bg-gradient-to-br from-white to-[#F7FBFF] border-[#DCE5ED]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-[#7AA3BE] uppercase tracking-wider">Assigned Patients</p>
              <h2 className="text-4xl font-extrabold text-[#0D2B45] mt-2">{stats.patients}</h2>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Users size={28} />
            </div>
          </div>
          <Link to="/patients" className="inline-flex items-center text-sm font-medium text-[#1A6FA8] hover:text-[#5FA5D9] mt-6 gap-1 group">
            View Patient List <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="card p-6 bg-gradient-to-br from-white to-red-50 border-red-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-red-400 uppercase tracking-wider">Active Alerts</p>
              <h2 className="text-4xl font-extrabold text-red-700 mt-2">{stats.alerts}</h2>
            </div>
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <Bell size={28} />
            </div>
          </div>
          <Link to="/alerts" className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500 mt-6 gap-1 group">
            Review Alerts <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="card p-6 bg-gradient-to-br from-white to-teal-50 border-teal-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-teal-600 opacity-80 uppercase tracking-wider">Global Avg Score</p>
              <h2 className="text-4xl font-extrabold text-[#28A98C] mt-2">{stats.avgScore.toFixed(1)}</h2>
            </div>
            <div className="p-3 bg-teal-100 text-[#28A98C] rounded-xl flex items-center justify-center">
              <TrendingUp size={28} />
            </div>
          </div>
          <div className="mt-6 text-sm text-[#28A98C] font-medium flex items-center gap-1.5 opacity-90">
            <Activity size={16} /> Based on latest assessments
          </div>
        </div>
      </div>

      {/* Recent Alerts Preview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2"><Bell className="text-red-500" size={24} /> Recent Alerts</h2>
          <Link to="/alerts" className="text-sm font-medium text-[#1A6FA8] bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">View All</Link>
        </div>
        
        {latestAlerts.length > 0 ? (
          <div className="space-y-0">
            {latestAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="bg-white border text-center border-gray-200 py-12 rounded-xl text-gray-500 shadow-sm">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium text-lg text-gray-800">No recent alerts</p>
            <p className="mt-1">All patients are currently stable.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline CheckCircle component for empty state
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
