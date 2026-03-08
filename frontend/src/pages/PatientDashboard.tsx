import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck,
    Activity,
    Pill,
    Phone,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    ArrowRight,
    Brain,
    Clock,
    Target,
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, Screening, Alert } from '../types';
import { CircularRiskGauge } from '../components/ui/CircularRiskGauge';

interface Props { user: User; }

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
};

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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Loading your health data...</p>
                </div>
            </div>
        );
    }

    const quickActions = [
        { label: 'Start Screening', desc: 'Begin your cognitive assessment', icon: ClipboardCheck, iconBg: 'bg-purple-100', iconColor: 'text-purple-600', href: '/screening' },
        { label: 'Activities', desc: 'Brain training & mental exercises', icon: Activity, iconBg: 'bg-teal-100', iconColor: 'text-teal-600', href: '/activities' },
        { label: 'Medications', desc: 'Track your daily schedule', icon: Pill, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', href: '/medications' },
        { label: 'Consultation', desc: 'Talk to your specialist', icon: Phone, iconBg: 'bg-rose-100', iconColor: 'text-rose-500', href: '/consult' },
    ];

    const stats = [
        { label: 'TOTAL SCREENINGS', value: screenings.length, icon: ClipboardCheck, iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
        { label: 'RISK LEVEL', value: latestAnalysis?.risk_level?.toUpperCase() || 'N/A', icon: Brain, iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
        { label: 'RISK SCORE', value: latestAnalysis ? `${latestAnalysis.risk_score}` : 'N/A', icon: TrendingUp, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
        { label: 'ACTIVE ALERTS', value: alerts.length, icon: AlertTriangle, iconBg: alerts.length > 0 ? 'bg-rose-50' : 'bg-slate-50', iconColor: alerts.length > 0 ? 'text-rose-500' : 'text-slate-400' },
    ];

    return (
        <div className="p-7 max-w-screen-xl mx-auto space-y-6 animate-fadeIn">

            {/* === WELCOME BANNER === */}
            <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ccfbf1 40%, #ede9fe 100%)', minHeight: '160px' }}>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 p-8">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-3">
                            Good {getGreeting()},{' '}
                            <span className="text-blue-600">{user.full_name?.split(' ')[0]}</span>
                        </h2>
                        <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                            Here's your cognitive health overview. Track your progress and stay on top of your personalized care plan.
                        </p>
                    </div>

                    {/* Quick stat badges */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/50 shadow-sm min-w-[72px]">
                            <span className="text-2xl font-extrabold text-slate-800">{screenings.length}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Screenings</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/50 shadow-sm min-w-[80px]">
                            {latestAnalysis ? (
                                <div className="mb-1">
                                    <CircularRiskGauge score={latestAnalysis.risk_score} size={48} strokeWidth={5} showLabel={false} />
                                </div>
                            ) : (
                                <span className="text-2xl font-extrabold text-teal-600">—</span>
                            )}
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Risk Level</span>
                        </div>
                        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/50 shadow-sm min-w-[72px]">
                            <span className="text-2xl font-extrabold text-slate-800">{alerts.length}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Alerts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === QUICK ACTIONS === */}
            <div>
                <h3 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <span className="text-slate-400">⚡</span> Quick Actions
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.href)}
                            className="group relative bg-white rounded-2xl border border-slate-100 p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                            </div>
                            <p className="font-bold text-slate-800 text-sm mb-1">{action.label}</p>
                            <p className="text-xs text-slate-400 font-medium leading-snug">{action.desc}</p>
                            <div className="absolute bottom-4 right-4">
                                <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* === STATS STRIP === */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-slate-800 leading-none mb-1">{stat.value}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* === BOTTOM SECTION === */}
            <div className="grid lg:grid-cols-3 gap-5">

                {/* Recent Screenings */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-slate-400" /> Recent Screenings
                        </h3>
                        <button onClick={() => navigate('/screening')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View History →
                        </button>
                    </div>
                    <div className="p-6">
                        {completedScreenings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <ClipboardCheck className="w-7 h-7 text-slate-400" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-slate-700 text-lg">No screenings yet</p>
                                    <p className="text-sm text-slate-400 mt-1">Complete your first screening to start tracking your cognitive health journey.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/screening')}
                                    className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-600/20 flex items-center gap-2"
                                >
                                    + Start First Screening
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {completedScreenings.slice(0, 5).map((screening) => {
                                    const analysis = screening.ai_analyses?.[0];
                                    return (
                                        <div key={screening.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">Level: {screening.level.toUpperCase()}</p>
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        {screening.completed_at ? new Date(screening.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'In progress'}
                                                    </p>
                                                </div>
                                            </div>
                                            {analysis && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                                                    ${analysis.risk_level === 'low' ? 'bg-teal-100 text-teal-700' :
                                                        analysis.risk_level === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-rose-100 text-rose-700'}`}>
                                                    {analysis.risk_level} Risk
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Notifications + Daily Challenge + Health Progress */}
                <div className="space-y-4">

                    {/* Notifications */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-slate-400" />
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                        </div>
                        <div className="p-4">
                            {alerts.length === 0 ? (
                                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-green-700 text-sm">All clear!</p>
                                        <p className="text-xs text-green-500">No new alerts at this time.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {alerts.slice(0, 3).map((alert) => (
                                        <div key={alert.id} className={`p-3 rounded-xl text-sm border-l-4 ${alert.severity === 'critical' ? 'border-rose-500 bg-rose-50' : alert.severity === 'warning' ? 'border-amber-500 bg-amber-50' : 'border-blue-400 bg-blue-50'}`}>
                                            <p className="font-semibold text-slate-700">{alert.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Challenge */}
                    <div className="rounded-2xl p-5 border border-purple-100" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest bg-purple-100 px-2 py-0.5 rounded-full">✦ Daily Challenge</span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-base mb-2">Brain Exercise</h4>
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                            Consistency is key to cognitive health. Spend 5 minutes on a brain activity today!
                        </p>
                        <button
                            onClick={() => navigate('/activities')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-purple-600/20"
                        >
                            Start Activity <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Health Progress */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <Target className="w-4 h-4 text-slate-400" />
                            <h3 className="font-bold text-slate-800 text-sm">Health Progress</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {[
                                { label: 'Activity Streak', value: '0 days' },
                                { label: 'Weekly Goal', value: '0 / 5' },
                                { label: 'Medication Adherence', value: '—' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-medium">{item.label}</span>
                                    <span className="font-bold text-slate-700">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
