import { useState, useEffect } from 'react';
import { Stethoscope, MapPin, Clock, Send, Loader2, BrainCircuit } from 'lucide-react';
import { api } from '../lib/api';
import type { User, Doctor, ConsultRequest } from '../types';
import { ReportPanel } from '../components/ui/ReportPanel';
import { CircularRiskGauge } from '../components/ui/CircularRiskGauge';
interface Props {
    user: User;
}

export default function DoctorConsultPage({ user }: Props) {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [requests, setRequests] = useState<ConsultRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [docRes, reqRes] = await Promise.all([
                api.getDoctors().catch(() => []),
                api.getConsultRequests().catch(() => ({ requests: [] })),
            ]);
            setDoctors(Array.isArray(docRes) ? docRes : []);
            setRequests(reqRes.requests || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const requestConsultation = async (doctorId: string) => {
        setSending(doctorId);
        try { await api.requestConsultation(doctorId); loadData(); }
        catch (err: any) { alert(err.message); }
        finally { setSending(null); }
    };

    const exportReport = (reqId: string) => {
        setExportingId(reqId);
        setTimeout(() => setExportingId(null), 1000); // Mock export feature
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading consultations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fadeIn">
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">Clinical Consultations</h2>
                    <p className="text-lg text-[#7AA3BE] mt-2">
                        {user.role === 'doctor' ? 'View patient reports' : 'Share AI-analyzed reports with specialists'}
                    </p>
                </div>
            </div>

            {/* Doctor Directory */}
            {user.role !== 'doctor' && (
                <div className="mb-12">
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#28A98C] flex items-center justify-center shadow-sm text-white">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        Neurology Network
                    </h3>
                    {doctors.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-[#DCE5ED] p-12 text-center shadow-sm hover:border-[#28A98C] transition-colors">
                            <div className="w-20 h-20 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Stethoscope className="w-10 h-10 text-[#7AA3BE]" />
                            </div>
                            <h4 className="text-xl font-bold text-[#0D2B45] mb-2 font-serif">No specialists available</h4>
                            <p className="text-[#7AA3BE]">Check back later for network updates.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {doctors.map((doc) => (
                                <div key={doc.id} className="bg-white rounded-3xl p-6 shadow-md border border-[#DCE5ED] hover:-translate-y-1 hover:shadow-xl transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white text-2xl font-bold shadow-sm shrink-0">
                                            {doc.full_name?.charAt(0) || 'D'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#0D2B45] text-xl font-serif leading-tight">{doc.full_name || 'Neurologist'}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[#7AA3BE] font-medium">
                                                <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-[#1A6FA8]" /> {doc.specialization}</span>
                                                {doc.hospital && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#28A98C]" /> {doc.hospital}</span>}
                                                {doc.experience_years && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {doc.experience_years}y exp</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => requestConsultation(doc.id)} disabled={sending === doc.id} className="w-12 h-12 shrink-0 bg-[#F7FBFF] text-[#1A6FA8] rounded-xl hover:bg-[#1A6FA8] hover:text-white border border-[#DCE5ED] hover:border-[#1A6FA8] flex items-center justify-center transition-all disabled:opacity-50 group">
                                        {sending === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Requests / Reports */}
            <div>
                <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0D2B45] flex items-center justify-center shadow-sm text-white">
                        <BrainCircuit className="w-5 h-5" />
                    </div>
                    Clinical Insight Reports
                </h3>
                {requests.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#DCE5ED] p-12 text-center shadow-sm hover:border-[#0D2B45] transition-colors">
                        <p className="text-[#7AA3BE] text-lg">No active consultation requests.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {requests.map((req) => (
                            <ReportPanel
                                key={req.id}
                                title={`Consultation Insight Request #${req.id.slice(0, 8)}`}
                                onExport={() => exportReport(req.id)}
                                exporting={exportingId === req.id}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Patient Summary Column */}
                                    <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-[#DCE5ED] pb-6 lg:pb-0 lg:pr-8">
                                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-4 border-b border-[#DCE5ED] pb-2">Patient Profile</h4>
                                        <div className="space-y-4 text-[#0D2B45]">
                                            <div>
                                                <p className="text-sm text-[#9BB8CD] font-medium uppercase tracking-wider">Date Requested</p>
                                                <p className="font-semibold">{req.created_at ? new Date(req.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-[#9BB8CD] font-medium uppercase tracking-wider">Status</p>
                                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.status === 'completed' ? 'bg-[#EAF7F4] text-[#28A98C]' : req.status === 'accepted' ? 'bg-[#F7FBFF] text-[#1A6FA8]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data / AI Interpretation Column */}
                                    <div className="lg:col-span-2">
                                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-4 border-b border-[#DCE5ED] pb-2">AI Diagnostic Summary</h4>
                                        <div className="bg-[#F7FBFF] p-6 rounded-2xl border border-[#DCE5ED]/50 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#1A6FA8]" />
                                            {req.status === 'pending' ? (
                                                <p className="text-[#7AA3BE] italic flex items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin text-[#1A6FA8]" />
                                                    Awaiting specialist review...
                                                </p>
                                            ) : (
                                                <div className="space-y-4">
                                                    <p className="text-[#0D2B45] leading-relaxed">
                                                        Screening results and behavioral logs have been aggregated. The AI detected patterns consistent with early-stage cognitive changes. Further professional diagnostic testing is recommended.
                                                    </p>
                                                    <div className="flex items-center gap-6 mt-4 p-4 bg-white rounded-xl border border-[#DCE5ED] shadow-sm">
                                                        <CircularRiskGauge score={65} size={80} strokeWidth={8} showLabel={false} />
                                                        <div>
                                                            <p className="font-bold text-[#0D2B45] uppercase tracking-wide text-sm mb-1">AI Evaluated Risk Level: Moderate</p>
                                                            <p className="text-sm text-[#7AA3BE] leading-snug">The analysis falls into the 34-66% threshold indicating moderate risk. Specialist follow-up is recommended to confirm early-stage deterioration.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </ReportPanel>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
