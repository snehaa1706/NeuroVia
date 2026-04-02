import { Stethoscope, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useConsultations } from '../../hooks/useConsultations';
import { ConsultationCard } from '../../components/doctor/ConsultationCard';
import type { User } from '../../types';

interface Props {
    user: User;
}

const STATUS_TABS = [
    { value: undefined, label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function ConsultationList(_props: Props) {
    const {
        consultations,
        total,
        totalPages,
        loading,
        error,
        page,
        statusFilter,
        setStatusFilter,
        setPage,
    } = useConsultations();

    return (
        <div className="page-container animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white shadow-md">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    Consultations
                </h2>
                <p className="text-lg text-[#7AA3BE] mt-2">
                    {total} total consultation{total !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.label}
                        onClick={() => {
                            setStatusFilter(tab.value);
                            setPage(1);
                        }}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                            statusFilter === tab.value
                                ? 'bg-[#1A6FA8] text-white shadow-md'
                                : 'bg-white text-[#7AA3BE] border border-[#DCE5ED] hover:border-[#1A6FA8] hover:text-[#1A6FA8]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-[#FDECEA] border border-[#D32F2F]/20 rounded-2xl text-[#D32F2F] font-medium mb-6">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                        <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                        <p className="font-medium animate-pulse">Loading consultations...</p>
                    </div>
                </div>
            ) : consultations.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-3xl border border-[#DCE5ED] p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="w-10 h-10 text-[#7AA3BE]" />
                    </div>
                    <h4 className="text-xl font-bold text-[#0D2B45] mb-2 font-serif">No consultations found</h4>
                    <p className="text-[#7AA3BE]">
                        {statusFilter
                            ? `No consultations with status "${statusFilter}".`
                            : 'No consultation requests have been assigned to you yet.'}
                    </p>
                </div>
            ) : (
                /* Results */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
                        {consultations.map((c) => (
                            <ConsultationCard key={c.id} consultation={c} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-10">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                className="btn btn-secondary btn-sm"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>
                            <span className="text-sm font-medium text-[#0D2B45]">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className="btn btn-secondary btn-sm"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
