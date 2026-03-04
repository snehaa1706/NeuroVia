import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck,
    Brain,
    Activity,
    AlertTriangle,
    TrendingUp,
    ArrowRight,
    Pill,
    Heart,
    Calendar,
    BarChart3,
    CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, Screening, Alert } from '../types';

interface Props {
    user: User;
}

export default function PatientDashboard({ user }: Props) {
    const navigate = useNavigate();
    const [screenings, setScreenings] = useState<Screening[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDashboardData(); }, []);

    const loadDashboardData = async () => {
        try {
            const [screeningRes, alertRes] = await Promise.all([
                api.getScreeningHistory().catch(() => ({ screenings: [] })),
                api.getAlerts(true).catch(() => ({ alerts: [] })),
            ]);
            setScreenings(screeningRes.screenings || []);
            setAlerts(alertRes.alerts || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const completedScreenings = screenings.filter((s) => s.status === 'completed');
    const latestAnalysis = completedScreenings[0]?.ai_analyses?.[0];

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Loading your health data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="relative rounded-[2rem] p-10 overflow-hidden bg-slate-900 shadow-2xl shadow-slate-900/20">
                {/* Background Details */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-slate-900 to-teal-900/40" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-violet-200 text-sm font-semibold mb-6">
                            <Calendar className="w-4 h-4" />
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-teal-300">
                                {user.full_name?.split(' ')[0]}
                            </span>
                        </h2>
                        <p className="text-lg text-slate-300 max-w-xl font-medium">
                            Here's your cognitive health overview. Track your progress and stay on top of your personalized care plan.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-5">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Start Screening', desc: 'Begin cognitive assessment', icon: ClipboardCheck, bg: 'bg-violet-600', hover: 'hover:bg-violet-700', shadow: 'shadow-violet-600/20', href: '/screening' },
                        { label: 'Activities', desc: 'Brain training exercises', icon: Activity, bg: 'bg-teal-500', hover: 'hover:bg-teal-600', shadow: 'shadow-teal-500/20', href: '/activities' },
                        { label: 'Medications', desc: 'Track your daily schedule', icon: Pill, bg: 'bg-blue-500', hover: 'hover:bg-blue-600', shadow: 'shadow-blue-500/20', href: '/medications' },
                        { label: 'Consultation', desc: 'Talk to your specialist', icon: Heart, bg: 'bg-rose-500', hover: 'hover:bg-rose-600', shadow: 'shadow-rose-500/20', href: '/consult' },
                    ].map((action) => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.href)}
                            className={`group flex flex-col relative p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden`}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${action.bg} flex items-center justify-center mb-5 text-white shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                <action.icon className="w-7 h-7" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-1">{action.label}</h4>
                            <p className="text-sm text-slate-500 font-medium">{action.desc}</p>
                            <div className={`absolute bottom-0 left-0 w-full h-1 ${action.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: 'Total Screenings', value: screenings.length, icon: ClipboardCheck, color: 'text-violet-600', iconBg: 'bg-violet-50' },
                    { label: 'Risk Level', value: latestAnalysis?.risk_level?.toUpperCase() || 'N/A', icon: Brain, color: 'text-teal-600', iconBg: 'bg-teal-50' },
                    { label: 'Risk Score', value: latestAnalysis ? `${latestAnalysis.risk_score}/100` : 'N/A', icon: TrendingUp, color: 'text-blue-600', iconBg: 'bg-blue-50' },
                    { label: 'Active Alerts', value: alerts.length, icon: AlertTriangle, color: alerts.length > 0 ? 'text-rose-600' : 'text-slate-400', iconBg: alerts.length > 0 ? 'bg-rose-50' : 'bg-slate-50' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-7 h-7 ${stat.color}`} />
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-1">{stat.value}</div>
                            <div className="text-sm font-semibold text-slate-500">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Section */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Recent Screenings */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-violet-500" /> Recent Screenings
                        </h3>
                        <button onClick={() => navigate('/screening')} className="text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors">
                            View History →
                        </button>
                    </div>

                    <div className="p-6 flex-1">
                        {completedScreenings.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-10">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                    <ClipboardCheck className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium text-lg">No screenings completed yet</p>
                                <button onClick={() => navigate('/screening')} className="mt-4 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-violet-600/20">
                                    Start First Screening
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {completedScreenings.slice(0, 5).map((screening) => {
                                    const analysis = screening.ai_analyses?.[0];
                                    return (
                                        <div key={screening.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                                                    <CheckCircle2 className="w-6 h-6 text-violet-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-lg">Level: {screening.level.toUpperCase()}</p>
                                                    <p className="text-sm font-medium text-slate-500">
                                                        {screening.completed_at ? new Date(screening.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'In progress'}
                                                    </p>
                                                </div>
                                            </div>
                                            {analysis && (
                                                <div className="text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                                        ${analysis.risk_level === 'low' ? 'bg-teal-100 text-teal-800' :
                                                            analysis.risk_level === 'moderate' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-rose-100 text-rose-800'}`
                                                    }>
                                                        {analysis.risk_level} Risk
                                                    </span>
                                                    <p className="text-sm font-bold text-slate-600 mt-1.5 flex justify-end items-center gap-1">
                                                        Score: <span className="text-slate-900">{analysis.risk_score}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerts / Activity Focus */}
                <div className="space-y-6">
                    {/* Alerts Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-500" /> Notifications
                            </h3>
                            {alerts.length > 0 && <span className="bg-rose-100 text-rose-700 font-bold text-xs px-2 py-0.5 rounded-full">{alerts.length}</span>}
                        </div>
                        <div className="p-5">
                            {alerts.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 className="w-6 h-6 text-teal-500" />
                                    </div>
                                    <p className="text-slate-500 font-medium">All clear! No new alerts.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.slice(0, 3).map((alert) => (
                                        <div key={alert.id} className={`p-4 rounded-xl border-l-[4px] 
                                            ${alert.severity === 'critical' ? 'border-l-rose-500 bg-rose-50' :
                                                alert.severity === 'warning' ? 'border-l-amber-500 bg-amber-50' :
                                                    'border-l-blue-500 bg-blue-50'}`
                                        }>
                                            <p className="text-sm font-semibold text-slate-800 leading-snug">{alert.message}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-2">
                                                {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ''}
                                            </p>
                                        </div>
                                    ))}
                                    <button onClick={() => navigate('/alerts')} className="w-full py-2.5 mt-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
                                        View all alerts
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Activity Promo */}
                    <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-violet-600 to-teal-500 text-white shadow-lg shadow-violet-500/20">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-6 h-6 text-teal-200" />
                                <h3 className="font-bold text-lg">Brain Exercise</h3>
                            </div>
                            <p className="text-violet-100 text-sm font-medium mb-6 leading-relaxed">
                                Consistency is key to cognitive health. Spend 5 minutes on a brain activity today!
                            </p>
                            <button onClick={() => navigate('/activities')} className="w-full flex items-center justify-center gap-2 py-3 bg-white text-violet-700 font-extrabold rounded-xl hover:bg-slate-50 transition-colors shadow-md">
                                Start Activity <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
                    </div>
                </div>
            </div>
        </div>
    );
}
