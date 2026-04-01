import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, ShieldAlert, Award, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import CaregiverScoreChart from '../components/caregiver/CaregiverScoreChart';
import type { User } from '../types';

interface Props {
    user: User;
}

export default function CaregiverPatientDetailPage({ user: _user }: Props) {
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
                    api.getCaregiverPatientOverview(id!),
                    api.getCognitiveSummary(id),
                    api.getCognitiveHistory(id)
                ]);

                setData({
                    overview: overviewRes,
                    summary: summaryRes,
                    history: historyRes || []
                });
            } catch (err: any) {
                setError('Failed to load patient details. Please check your connection and try again.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPatientData();
    }, [id]);

    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case 'improving': return <TrendingUp size={24} className="text-green-600" />;
            case 'declining': return <TrendingDown size={24} className="text-red-600" />;
            default: return <Minus size={24} className="text-gray-400" />;
        }
    };

    const scoreColor = (score?: number) => {
        if (!score) return 'text-[#9CA3AF]';
        if (score >= 80) return 'text-[#0D9488]';
        if (score >= 50) return 'text-[#D97706]';
        return 'text-[#DC2626]';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-bold tracking-widest uppercase text-sm animate-pulse">Loading patient data...</p>
                </div>
            </div>
        );
    }

    const { overview, summary, history } = data;

    return (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 animate-fadeIn">
            <Link
                to="/caregiver/patients"
                className="inline-flex items-center text-sm font-bold text-[#7AA3BE] hover:text-[#1A6FA8] mb-6 bg-white px-4 py-2 rounded-xl border-2 border-[#DCE5ED] hover:border-[#1A6FA8] shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all"
            >
                <ArrowLeft size={16} className="mr-2" /> Back to Patients
            </Link>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-8 rounded-lg shadow-sm">
                    <p className="font-bold text-red-700">Error</p>
                    <p className="text-red-600 mt-1">{error}</p>
                </div>
            )}

            {overview && (
                <>
                    {/* Patient Header */}
                    <div className="bg-white rounded-lg p-7 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] mb-8 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A6FA8] to-[#0D9488]" />
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A6FA8]/10 to-[#0D9488]/10 flex items-center justify-center text-[#1A6FA8] font-extrabold text-2xl border-2 border-[#DCE5ED] shadow-sm">
                                {overview.user_profile?.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <h1 className="text-[26px] font-extrabold text-[#0D2B45] tracking-tight">{overview.user_profile?.full_name || 'Patient'}</h1>
                                <p className="text-[13px] text-[#7AA3BE] font-bold tracking-wide mt-0.5">
                                    Risk Level: <span className="uppercase text-[#1A6FA8]">{overview.screening_status?.risk_level || 'N/A'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Score Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg p-7 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#1A6FA8]" />
                            <h3 className="text-[12px] text-[#7AA3BE] font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Award size={16} className="text-[#1A6FA8]" /> Latest Score
                            </h3>
                            <div className={`text-[34px] font-extrabold ${scoreColor(summary?.latest_score)} tracking-tight`}>
                                {summary?.latest_score ? summary.latest_score.toFixed(1) : '—'}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-7 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0D9488]" />
                            <h3 className="text-[12px] text-[#7AA3BE] font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity size={16} className="text-[#0D9488]" /> Avg Score
                            </h3>
                            <div className="text-[34px] font-extrabold text-[#0D9488] tracking-tight">
                                {summary?.avg_score ? summary.avg_score.toFixed(1) : '—'}
                            </div>
                        </div>

                        <div className={`bg-white rounded-lg p-7 border shadow-[0_1px_8px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${summary?.trend === 'declining' ? 'border-red-200' : 'border-[#F3F4F6]'}`}>
                            <div className={`absolute top-0 left-0 right-0 h-1 ${summary?.trend === 'declining' ? 'bg-[#DC2626]' : summary?.trend === 'improving' ? 'bg-green-500' : 'bg-[#9CA3AF]'}`} />
                            <h3 className="text-[12px] text-[#7AA3BE] font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <TrendingUp size={16} className={summary?.trend === 'declining' ? 'text-[#DC2626]' : 'text-[#7AA3BE]'} /> Trend
                            </h3>
                            <div className="flex items-center gap-3">
                                {getTrendIcon(summary?.trend)}
                                <span className="text-[26px] font-extrabold capitalize text-[#0D2B45] tracking-tight">{summary?.trend || 'Stable'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cognitive Trend Chart */}
                    <div className="bg-white rounded-lg p-7 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] mb-8">
                        <h2 className="text-[17px] font-bold text-[#0D2B45] mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-[#1A6FA8]/10 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-[#1A6FA8]" />
                            </div>
                            Cognitive Trend
                        </h2>
                        <CaregiverScoreChart data={summary?.recent_scores || []} />
                    </div>

                    {/* Test History Table */}
                    <div className="bg-white rounded-lg p-7 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
                        <h2 className="text-[17px] font-bold text-[#0D2B45] mb-6 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
                                <ShieldAlert className="w-4 h-4 text-[#7C3AED]" />
                            </div>
                            Test History
                        </h2>
                        {history.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-[#F3F4F6]">
                                <table className="min-w-full divide-y divide-[#F3F4F6]">
                                    <thead className="bg-[#F7FBFF]">
                                        <tr>
                                            <th className="px-6 py-3.5 text-left text-[11px] font-black text-[#7AA3BE] uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3.5 text-left text-[11px] font-black text-[#7AA3BE] uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3.5 text-left text-[11px] font-black text-[#7AA3BE] uppercase tracking-wider">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-[#F3F4F6]">
                                        {history.map((test: any) => (
                                            <tr key={test.session_id} className="hover:bg-[#F7FBFF] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4B5563] font-semibold">
                                                    {new Date(test.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="bg-[#1A6FA8]/5 text-[#1A6FA8] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                                                        {test.test_type.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-extrabold ${scoreColor(test.score)}`}>
                                                        {test.score.toFixed(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-[#F9FAFB] rounded-lg border border-[#F3F4F6]">
                                <ShieldAlert className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
                                <p className="text-[#0D2B45] font-bold text-[15px] mb-1">No test history</p>
                                <p className="text-[#9CA3AF] font-medium text-[13px]">No cognitive history available for this patient.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
