import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, ShieldAlert, Award } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import ScoreChart from '../components/ScoreChart';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>({
    overview: null,
    summary: null,
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const [overviewRes, summaryRes, historyRes] = await Promise.all([
          apiClient.get(`/caregiver/patient/${id}/overview`),
          apiClient.get(`/cognitive/summary?patient_id=${id}`),
          apiClient.get(`/cognitive/history?patient_id=${id}`)
        ]);
        
        setData({
          overview: overviewRes.data,
          summary: summaryRes.data,
          history: historyRes.data || []
        });
      } catch (err: any) {
        setError('Failed to load patient details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchPatientData();
  }, [id]);

  const getTrendIcon = (trend?: string) => {
    switch(trend) {
      case 'improving': return <TrendingUp size={24} className="text-green-600" />;
      case 'declining': return <TrendingDown size={24} className="text-red-600" />;
      default: return <Minus size={24} className="text-gray-400" />;
    }
  };

  const scoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const { overview, summary, history } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/patients" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 bg-white px-3 py-1.5 rounded-md border shadow-sm">
        <ArrowLeft size={16} className="mr-1" /> Back to Patients
      </Link>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 text-red-700 font-medium shadow-sm">
          {error}
        </div>
      )}

      {overview && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[#1A6FA8] font-bold text-2xl border-2 border-blue-100 shadow-sm">
                {overview.user_profile?.full_name?.charAt(0) || '?'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{overview.user_profile?.full_name || 'Patient'}</h1>
                <p className="text-sm text-gray-500 tracking-wide font-medium">Risk Level: <span className="uppercase">{overview.screening_status?.risk_level || 'N/A'}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 border-blue-100 bg-gradient-to-br from-white to-blue-50">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Award size={16} className="text-[#1A6FA8]" /> Latest Score
              </h3>
              <div className={`text-4xl font-extrabold ${scoreColor(summary?.latest_score)} mt-1`}>
                {summary?.latest_score ? summary.latest_score.toFixed(1) : '—'}
              </div>
            </div>
            
            <div className="card p-6 border-teal-100 bg-gradient-to-br from-white to-teal-50">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity size={16} className="text-[#28A98C]" /> Avg Score
              </h3>
              <div className="text-4xl font-extrabold text-[#28A98C] mt-1">
                {summary?.avg_score ? summary.avg_score.toFixed(1) : '—'}
              </div>
            </div>
            
            <div className={`card p-6 ${summary?.trend === 'declining' ? 'border-red-100 bg-red-50' : 'border-gray-200'}`}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp size={16} className={summary?.trend === 'declining' ? 'text-red-500' : 'text-gray-400'} /> Trend
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {getTrendIcon(summary?.trend)}
                <span className="text-2xl font-bold capitalize text-gray-800">{summary?.trend || 'Stable'}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 mb-8">
            <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
              <Activity className="text-[#1A6FA8]" size={20} /> Cognitive Trend
            </h2>
            <ScoreChart data={summary?.recent_scores || []} />
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
              <ShieldAlert className="text-[#1A6FA8]" size={20} /> Test History
            </h2>
            {history.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#F7FBFF]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#7AA3BE] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#7AA3BE] uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#7AA3BE] uppercase tracking-wider">Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {history.map((test: any) => (
                      <tr key={test.session_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {new Date(test.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                          <span className="bg-blue-50 text-[#1A6FA8] px-2.5 py-1 rounded-full text-xs">
                             {test.test_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-bold ${scoreColor(test.score)}`}>
                            {test.score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 py-6 text-center italic bg-gray-50 rounded-lg">No cognitive history available for this patient.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
