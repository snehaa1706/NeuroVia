import { useState, useEffect } from 'react';
import { Bell, Filter } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import AlertCard from '../components/AlertCard';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await apiClient.get('/alerts');
        setAlerts(res.data?.alerts || []);
      } catch (err: any) {
        setError('Failed to load alerts.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.severity === 'critical';
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Bell className="text-red-500" size={32} /> Alerts Center</h1>
        
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[#1A6FA8] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Unread
          </button>
          <button 
            onClick={() => setFilter('critical')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'critical' ? 'bg-red-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Critical
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 text-red-700 font-medium">
          {error}
        </div>
      )}

      {filteredAlerts.length > 0 ? (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500">
          <div className="flex justify-center mb-4">
            <Filter size={48} className="text-gray-300" />
          </div>
          <p className="text-xl font-medium text-gray-800 mb-1">No alerts found</p>
          <p>You have no active alerts matching this filter.</p>
        </div>
      )}
    </div>
  );
}
