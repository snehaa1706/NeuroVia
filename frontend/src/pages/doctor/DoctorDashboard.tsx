import { useNavigate } from 'react-router-dom';
import { Stethoscope, Clock, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useConsultations } from '../../hooks/useConsultations';
import { ConsultationCard } from '../../components/doctor/ConsultationCard';
import { StatCard } from '../../components/ui/StatCard';
import type { User } from '../../types';

interface Props {
    user: User;
}

export default function DoctorDashboard({ user }: Props) {
    const navigate = useNavigate();
    const { consultations, total, loading, error } = useConsultations();

    const pending = consultations.filter(c => c.status === 'pending').length;
    const accepted = consultations.filter(c => c.status === 'accepted').length;
    const completed = consultations.filter(c => c.status === 'completed').length;

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

    return (
        <div className="page-container animate-fadeIn">
            {/* Header */}
            <div className="mb-10">
                <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">
                    Welcome, Dr. {user.full_name?.split(' ').pop() || 'Doctor'}
                </h2>
                <p className="text-lg text-[#7AA3BE] mt-2">
                    Your consultation management dashboard
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Total Consultations"
                    value={total}
                    icon={Stethoscope}
                    iconClasses="text-[#1A6FA8] bg-[#1A6FA8]/10"
                />
                <StatCard
                    title="Pending Review"
                    value={pending}
                    icon={Clock}
                    iconClasses="text-[#D97706] bg-[#D97706]/10"
                />
                <StatCard
                    title="In Progress"
                    value={accepted}
                    icon={ArrowRight}
                    iconClasses="text-[#1A6FA8] bg-[#1A6FA8]/10"
                />
                <StatCard
                    title="Completed"
                    value={completed}
                    icon={CheckCircle}
                    iconClasses="text-[#28A98C] bg-[#28A98C]/10"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <button
                    onClick={() => navigate('/doctor/consultations?status=pending')}
                    className="btn btn-secondary"
                >
                    <Clock className="w-5 h-5 text-[#D97706]" />
                    View Pending ({pending})
                </button>
                <button
                    onClick={() => navigate('/doctor/consultations?status=accepted')}
                    className="btn btn-secondary"
                >
                    <ArrowRight className="w-5 h-5 text-[#1A6FA8]" />
                    View In Progress ({accepted})
                </button>
                <button
                    onClick={() => navigate('/doctor/consultations')}
                    className="btn btn-primary"
                >
                    <Stethoscope className="w-5 h-5" />
                    All Consultations
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 bg-[#FDECEA] border border-[#D32F2F]/20 rounded-2xl text-[#D32F2F] font-medium mb-6">
                    {error}
                </div>
            )}

            {/* Recent Consultations */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0D2B45] flex items-center justify-center shadow-sm text-white">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        Recent Consultations
                    </h3>
                    <button
                        onClick={() => navigate('/doctor/consultations')}
                        className="text-sm font-medium text-[#1A6FA8] hover:underline flex items-center gap-1"
                    >
                        View All <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {consultations.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#DCE5ED] p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Stethoscope className="w-10 h-10 text-[#7AA3BE]" />
                        </div>
                        <h4 className="text-xl font-bold text-[#0D2B45] mb-2 font-serif">No consultations yet</h4>
                        <p className="text-[#7AA3BE]">Consultation requests from patients will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                        {consultations.slice(0, 6).map((c) => (
                            <ConsultationCard key={c.id} consultation={c} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
