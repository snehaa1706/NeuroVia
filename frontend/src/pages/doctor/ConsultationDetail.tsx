import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, CheckCircle, XCircle, Loader2, MessageSquare } from 'lucide-react';
import { useConsultationDetail } from '../../hooks/useConsultationDetail';
import { AIInsightsPanel } from '../../components/doctor/AIInsightsPanel';
import { ResponseForm } from '../../components/doctor/ResponseForm';
import { ResponseCard } from '../../components/doctor/ResponseCard';
import type { User as UserType } from '../../types';

interface Props {
    user: UserType;
}

export default function ConsultationDetail(_props: Props) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        consultation,
        loading,
        error,
        actionLoading,
        acceptConsult,
        cancelConsult,
        submitResponse,
    } = useConsultationDetail(id);

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading consultation...</p>
                </div>
            </div>
        );
    }

    if (error || !consultation) {
        return (
            <div className="page-container">
                <button onClick={() => navigate('/doctor/consultations')} className="btn btn-ghost mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Consultations
                </button>
                <div className="bg-[#FDECEA] border border-[#D32F2F]/20 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-bold text-[#D32F2F] mb-2">Error Loading Consultation</h3>
                    <p className="text-[#D32F2F]/80">{error || 'Consultation not found'}</p>
                </div>
            </div>
        );
    }

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', label: 'Pending Review' },
        accepted: { bg: 'bg-[#F7FBFF]', text: 'text-[#1A6FA8]', label: 'Accepted — In Progress' },
        completed: { bg: 'bg-[#EAF7F4]', text: 'text-[#28A98C]', label: 'Completed' },
        cancelled: { bg: 'bg-[#FDECEA]', text: 'text-[#D32F2F]', label: 'Cancelled' },
    };

    const { bg, text, label } = statusConfig[consultation.status] || statusConfig.pending;

    return (
        <div className="page-container animate-fadeIn">
            {/* Back Button */}
            <button onClick={() => navigate('/doctor/consultations')} className="btn btn-ghost mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Consultations
            </button>

            {/* ─── Section 1: Header ─── */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#DCE5ED] p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white text-2xl font-bold shadow-md">
                            <User className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#0D2B45] font-serif">
                                Consultation #{consultation.id.slice(0, 8)}
                            </h2>
                            <p className="text-sm text-[#7AA3BE] flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    Patient: {consultation.patient_id?.slice(0, 12)}...
                                </span>
                                <span className="text-[#DCE5ED]">|</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {consultation.created_at
                                        ? new Date(consultation.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
                                        : 'Unknown'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${bg} ${text}`}>
                            {label}
                        </span>
                    </div>
                </div>

                {/* Doctor Info */}
                {consultation.doctor && (
                    <div className="mt-6 pt-6 border-t border-[#DCE5ED]">
                        <p className="text-sm text-[#7AA3BE]">
                            <span className="font-bold">Attending:</span>{' '}
                            {consultation.doctor.full_name || 'Doctor'} — {consultation.doctor.specialization}
                            {consultation.doctor.hospital && ` at ${consultation.doctor.hospital}`}
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ─── Left Column (2/3) ─── */}
                <div className="lg:col-span-2 space-y-8">
                    {/* ─── Section 2: AI Insights ─── */}
                    <AIInsightsPanel
                        summary={consultation.summary}
                        riskLevel={consultation.risk_level}
                        keyConcerns={consultation.key_concerns}
                        suggestedActions={consultation.suggested_actions}
                    />

                    {/* ─── Section 5: Previous Responses ─── */}
                    {consultation.responses && consultation.responses.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-[#0D2B45] mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[#1A6FA8]" />
                                Doctor Responses ({consultation.responses.length})
                            </h3>
                            <div className="space-y-4">
                                {consultation.responses.map((resp) => (
                                    <ResponseCard key={resp.id} response={resp} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Section 6: Response Form (only when accepted) ─── */}
                    {consultation.status === 'accepted' && (
                        <ResponseForm onSubmit={submitResponse} loading={actionLoading} />
                    )}
                </div>

                {/* ─── Right Column (1/3) ─── */}
                <div className="space-y-6">
                    {/* ─── Section 4: Actions ─── */}
                    {(consultation.status === 'pending' || consultation.status === 'accepted') && (
                        <div className="bg-white rounded-2xl border border-[#DCE5ED] shadow-sm p-6">
                            <h3 className="text-lg font-bold text-[#0D2B45] mb-4">Actions</h3>
                            <div className="space-y-3">
                                {consultation.status === 'pending' && (
                                    <button
                                        onClick={acceptConsult}
                                        disabled={actionLoading}
                                        className="btn btn-success w-full"
                                    >
                                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Accept Consultation
                                    </button>
                                )}
                                <button
                                    onClick={cancelConsult}
                                    disabled={actionLoading}
                                    className="btn btn-danger w-full"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                    Cancel Consultation
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Section 3: Patient Message (optional) ─── */}
                    {consultation.summary && (
                        <div className="bg-white rounded-2xl border border-[#DCE5ED] shadow-sm p-6">
                            <h3 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-3">Patient Summary</h3>
                            <p className="text-sm text-[#0D2B45] leading-relaxed italic">
                                "{consultation.summary}"
                            </p>
                        </div>
                    )}

                    {/* Consultation Details Sidebar */}
                    <div className="bg-white rounded-2xl border border-[#DCE5ED] shadow-sm p-6 space-y-4">
                        <h3 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-1">Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#7AA3BE]">Consult ID</span>
                                <span className="text-[#0D2B45] font-mono text-xs">{consultation.id.slice(0, 12)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#7AA3BE]">Patient ID</span>
                                <span className="text-[#0D2B45] font-mono text-xs">{consultation.patient_id?.slice(0, 12)}...</span>
                            </div>
                            {consultation.assessment_id && (
                                <div className="flex justify-between">
                                    <span className="text-[#7AA3BE]">Assessment</span>
                                    <span className="text-[#0D2B45] font-mono text-xs">{consultation.assessment_id.slice(0, 12)}...</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-[#7AA3BE]">Created</span>
                                <span className="text-[#0D2B45]">
                                    {consultation.created_at ? new Date(consultation.created_at).toLocaleDateString() : '—'}
                                </span>
                            </div>
                            {consultation.updated_at && (
                                <div className="flex justify-between">
                                    <span className="text-[#7AA3BE]">Updated</span>
                                    <span className="text-[#0D2B45]">
                                        {new Date(consultation.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
