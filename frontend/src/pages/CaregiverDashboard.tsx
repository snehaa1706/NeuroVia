import { useState, useEffect } from 'react';
import {
    Heart,
    Moon,
    Brain,
    Plus,
    X,
    Loader2,
    Activity
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, CaregiverLog } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { GlassCard } from '../components/ui/GlassCard';

interface Props {
    user: User;
}

export default function CaregiverDashboard({ user: _user }: Props) {
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [logs, setLogs] = useState<CaregiverLog[]>([]);
    const [showCheckin, setShowCheckin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [checkinData, setCheckinData] = useState({
        mood: 'normal',
        confusion_level: 5,
        sleep_hours: 7,
        appetite: 'normal',
        notes: '',
    });

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (selectedPatient) loadPatientLogs(selectedPatient); }, [selectedPatient]);

    const loadData = async () => {
        try {
            const patientRes = await api.getAssignedPatients().catch(() => ({ patients: [] }));
            setPatients(patientRes.patients || []);
            if (patientRes.patients?.length > 0) setSelectedPatient(patientRes.patients[0].id);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadPatientLogs = async (patientId: string) => {
        try { const res = await api.getPatientLogs(patientId); setLogs(res.logs || []); }
        catch (err) { console.error(err); }
    };

    const handleCheckin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        try {
            await api.submitCheckin({ patient_id: selectedPatient, ...checkinData });
            setShowCheckin(false);
            loadPatientLogs(selectedPatient);
            setCheckinData({ mood: 'normal', confusion_level: 5, sleep_hours: 7, appetite: 'normal', notes: '' });
        } catch (err: any) { alert(err.message); }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const latestLog = logs[0];
    const avgSleep = logs.length ? (logs.reduce((acc, l) => acc + (l.sleep_hours || 0), 0) / Math.min(logs.length, 7)).toFixed(1) : '0';
    const avgConfusion = logs.length ? (logs.reduce((acc, l) => acc + (l.confusion_level || 0), 0) / Math.min(logs.length, 7)).toFixed(1) : '0';

    return (
        <div className="page-container animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">Caregiver Dashboard</h2>
                    <p className="text-lg text-[#7AA3BE] mt-2">Monitor patient vitals and health trends</p>
                </div>
                <div className="flex items-center gap-4">
                    {patients.length > 0 && (
                        <select
                            className="h-12 px-6 rounded-xl bg-white border border-[#DCE5ED] text-[#0D2B45] font-semibold outline-none focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all shadow-sm max-w-[200px]"
                            value={selectedPatient || ''}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                        >
                            {patients.map((p) => (<option key={p.id} value={p.id}>{p.full_name}</option>))}
                        </select>
                    )}
                    <button
                        onClick={() => setShowCheckin(true)}
                        disabled={!selectedPatient}
                        className="h-12 px-6 bg-gradient-to-r from-[#1A6FA8] to-[#28A98C] text-white rounded-xl font-bold shadow-lg shadow-[#1A6FA8]/20 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Caregiver Log
                    </button>
                </div>
            </div>

            {/* Statistics Grid (12 cols) */}
            <div className="grid grid-cols-12 gap-6 mb-10">
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                    <StatCard
                        title="Latest Mood"
                        value={latestLog?.mood ? String(latestLog.mood).charAt(0).toUpperCase() + String(latestLog.mood).slice(1) : 'N/A'}
                        icon={Heart}
                        colorClasses="bg-white border-[#DCE5ED]"
                        iconClasses="bg-[#FDECEA] text-[#D32F2F]"
                    />
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                    <StatCard
                        title="Avg Confusion Level"
                        value={`${avgConfusion}/10`}
                        icon={Brain}
                        trend={parseFloat(avgConfusion) < 4 ? "Normal range" : "Elevated"}
                        trendUp={parseFloat(avgConfusion) < 4}
                        colorClasses="bg-white border-[#DCE5ED]"
                        iconClasses="bg-[#FEF3C7] text-[#D97706]"
                    />
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                    <StatCard
                        title="Avg Sleep Hours"
                        value={`${avgSleep}h`}
                        icon={Moon}
                        trend={parseFloat(avgSleep) > 6 ? "Healthy" : "Insufficient"}
                        trendUp={parseFloat(avgSleep) > 6}
                        colorClasses="bg-white border-[#DCE5ED]"
                        iconClasses="bg-indigo-50 text-indigo-500"
                    />
                </div>
                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                    <StatCard
                        title="Appetite Status"
                        value={latestLog?.appetite ? String(latestLog.appetite).charAt(0).toUpperCase() + String(latestLog.appetite).slice(1) : 'N/A'}
                        icon={Activity}
                        colorClasses="bg-white border-[#DCE5ED]"
                        iconClasses="bg-[#EAF7F4] text-[#28A98C]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Trend Charts */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <GlassCard className="p-8">
                        <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center gap-2">
                            <Moon className="w-5 h-5 text-[#1A6FA8]" /> Sleep Trend (Past 7 Logs)
                        </h3>
                        <div className="h-48 flex items-end gap-2">
                            {logs.slice(0, 7).reverse().map((log, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-[#1A6FA8]/20 group-hover:bg-[#1A6FA8] transition-colors rounded-t-xl relative flex justify-center"
                                        style={{ height: `${((log.sleep_hours || 0) / 12) * 100}%`, minHeight: '4px' }}
                                    >
                                        <span className="absolute -top-6 text-xs font-bold text-[#0D2B45] opacity-0 group-hover:opacity-100 transition-opacity">
                                            {log.sleep_hours}h
                                        </span>
                                    </div>
                                    <span className="text-xs text-[#7AA3BE] font-medium">{log.created_at ? new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Day ${i + 1}`}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8">
                        <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-[#28A98C]" /> Confusion Trend (Past 7 Logs)
                        </h3>
                        <div className="h-48 flex items-end gap-2">
                            {logs.slice(0, 7).reverse().map((log, i) => {
                                const level = log.confusion_level || 0;
                                const colorClass = level > 6 ? 'bg-[#D32F2F]/60 group-hover:bg-[#D32F2F]' : level > 3 ? 'bg-[#D97706]/60 group-hover:bg-[#D97706]' : 'bg-[#28A98C]/60 group-hover:bg-[#28A98C]';
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div
                                            className={`w-full ${colorClass} transition-colors rounded-t-xl relative flex justify-center`}
                                            style={{ height: `${(level / 10) * 100}%`, minHeight: '4px' }}
                                        >
                                            <span className="absolute -top-6 text-xs font-bold text-[#0D2B45] opacity-0 group-hover:opacity-100 transition-opacity">
                                                Lvl {level}
                                            </span>
                                        </div>
                                        <span className="text-xs text-[#7AA3BE] font-medium">{log.created_at ? new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Day ${i + 1}`}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </GlassCard>
                </div>

                {/* Recent Logs Feed */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-white rounded-3xl p-8 border border-[#DCE5ED] shadow-xl h-full">
                        <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center justify-between">
                            Recent Logs
                            <span className="w-8 h-8 rounded-full bg-[#EBF4FA] text-[#1A6FA8] text-sm flex items-center justify-center font-bold">
                                {logs.length}
                            </span>
                        </h3>
                        {logs.length === 0 ? (
                            <p className="text-[#7AA3BE] text-center mt-10">No logs yet. Submit your first daily check-in to start tracking.</p>
                        ) : (
                            <div className="space-y-4">
                                {logs.slice(0, 5).map((log) => (
                                    <div key={log.id} className="p-5 rounded-2xl border border-[#DCE5ED]/60 bg-[#F7FBFF] hover:bg-white hover:border-[#1A6FA8] hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${log.log_type === 'incident' ? 'bg-[#FDECEA] text-[#D32F2F]' : 'bg-[#EAF7F4] text-[#28A98C]'}`}>
                                                {log.log_type?.replace('_', ' ')}
                                            </span>
                                            <p className="text-xs text-[#9BB8CD] font-medium">{log.created_at ? new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-[#0D2B45] font-medium text-sm">
                                            {log.mood && <div className="flex flex-col items-center"><span className="text-lg">
                                                {log.mood === 'happy' ? '😊' : log.mood === 'normal' ? '😐' : log.mood === 'anxious' ? '😟' : log.mood === 'confused' ? '😵' : '😤'}
                                            </span></div>}
                                            {log.confusion_level != null && <span>Conf: <span className={log.confusion_level > 6 ? 'text-[#D32F2F]' : ''}>{log.confusion_level}/10</span></span>}
                                            {log.sleep_hours != null && <span>Sleep: {log.sleep_hours}h</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0D2B45]/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn" style={{ animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', animationDuration: '400ms' }}>
                        <div className="px-8 py-6 border-b border-[#DCE5ED] flex items-center justify-between bg-[#F7FBFF]">
                            <h3 className="text-2xl font-bold text-[#0D2B45] font-serif">Daily Check-in</h3>
                            <button onClick={() => setShowCheckin(false)} className="w-10 h-10 rounded-full bg-white border border-[#DCE5ED] flex items-center justify-center text-[#7AA3BE] hover:text-[#0D2B45] hover:border-[#0D2B45] transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCheckin} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Mood</label>
                                <select className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45]" value={checkinData.mood} onChange={(e) => setCheckinData({ ...checkinData, mood: e.target.value })}>
                                    <option value="happy">😊 Happy</option>
                                    <option value="normal">😐 Normal</option>
                                    <option value="anxious">😟 Anxious</option>
                                    <option value="confused">😵 Confused</option>
                                    <option value="agitated">😤 Agitated</option>
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider">Confusion Level</label>
                                    <span className="text-xl font-bold text-[#1A6FA8] font-serif">{checkinData.confusion_level}/10</span>
                                </div>
                                <input type="range" min="1" max="10" className="w-full h-2 bg-[#DCE5ED] rounded-lg appearance-none cursor-pointer accent-[#1A6FA8]" value={checkinData.confusion_level} onChange={(e) => setCheckinData({ ...checkinData, confusion_level: parseInt(e.target.value) })} />
                                <div className="flex justify-between text-xs text-[#7AA3BE] font-medium mt-2 uppercase tracking-wider"><span>Clear</span><span>Highly Confused</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Sleep (hrs)</label>
                                    <input type="number" min="0" max="24" step="0.5" className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45]" value={checkinData.sleep_hours} onChange={(e) => setCheckinData({ ...checkinData, sleep_hours: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Appetite</label>
                                    <select className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45]" value={checkinData.appetite} onChange={(e) => setCheckinData({ ...checkinData, appetite: e.target.value })}>
                                        <option value="poor">Poor</option>
                                        <option value="normal">Normal</option>
                                        <option value="good">Good</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Clinical Notes</label>
                                <textarea className="w-full px-4 py-3 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45] placeholder:text-[#9BB8CD] min-h-[100px] resize-none" placeholder="Observations, changes in behavior..." value={checkinData.notes} onChange={(e) => setCheckinData({ ...checkinData, notes: e.target.value })} />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-[#DCE5ED]">
                                <button type="submit" className="flex-1 py-3.5 bg-[#1A6FA8] hover:bg-[#124A70] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-center">Save Log</button>
                                <button type="button" onClick={() => setShowCheckin(false)} className="flex-1 py-3.5 bg-white border border-[#DCE5ED] text-[#0D2B45] hover:border-[#0D2B45] rounded-xl font-bold transition-all text-center">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
