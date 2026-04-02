import { useNavigate } from 'react-router-dom';
import { Clock, User, MessageSquare } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import type { ConsultRequest } from '../../types';

interface ConsultationCardProps {
    consultation: ConsultRequest;
}

export function ConsultationCard({ consultation }: ConsultationCardProps) {
    const navigate = useNavigate();

    const statusConfig: Record<string, { bg: string; text: string }> = {
        pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
        accepted: { bg: 'bg-[#F7FBFF]', text: 'text-[#1A6FA8]' },
        completed: { bg: 'bg-[#EAF7F4]', text: 'text-[#28A98C]' },
        cancelled: { bg: 'bg-[#FDECEA]', text: 'text-[#D32F2F]' },
    };

    const { bg, text } = statusConfig[consultation.status] || statusConfig.pending;

    return (
        <div
            onClick={() => navigate(`/doctor/consultations/${consultation.id}`)}
            className="bg-white rounded-3xl p-6 shadow-md border border-[#DCE5ED] hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group"
        >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold text-[#0D2B45] text-base leading-tight">
                            Patient {consultation.patient_id?.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-[#7AA3BE] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {consultation.created_at
                                ? new Date(consultation.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                                : 'Unknown date'}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bg} ${text}`}>
                    {consultation.status}
                </span>
            </div>

            {/* Summary */}
            {consultation.summary && (
                <p className="text-sm text-[#0D2B45] mb-3 line-clamp-2 leading-relaxed">
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-[#7AA3BE]" />
                    {consultation.summary}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#DCE5ED]/50">
                <RiskBadge level={consultation.risk_level} />
                <span className="text-xs font-medium text-[#1A6FA8] opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details →
                </span>
            </div>
        </div>
    );
}
