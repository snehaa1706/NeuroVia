import { Stethoscope, Calendar, FileText, Pill } from 'lucide-react';
import type { ConsultResponse } from '../../types';

interface ResponseCardProps {
    response: ConsultResponse;
}

export function ResponseCard({ response }: ResponseCardProps) {
    return (
        <div className="bg-[#F7FBFF] rounded-2xl border border-[#DCE5ED] p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1A6FA8]/10 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-[#1A6FA8]" />
                    </div>
                    <span className="text-sm font-bold text-[#0D2B45]">Doctor Response</span>
                </div>
                {response.created_at && (
                    <span className="text-xs text-[#9BB8CD] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(response.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>

            {/* Diagnosis */}
            {response.diagnosis && (
                <div>
                    <h5 className="text-xs font-bold text-[#7AA3BE] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Diagnosis
                    </h5>
                    <p className="text-sm text-[#0D2B45] leading-relaxed">{response.diagnosis}</p>
                </div>
            )}

            {/* Notes */}
            {response.notes && (
                <div>
                    <h5 className="text-xs font-bold text-[#7AA3BE] uppercase tracking-wider mb-1">Notes</h5>
                    <p className="text-sm text-[#0D2B45] leading-relaxed">{response.notes}</p>
                </div>
            )}

            {/* Prescription */}
            {response.prescription && response.prescription.length > 0 && (
                <div>
                    <h5 className="text-xs font-bold text-[#7AA3BE] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Pill className="w-3 h-3" /> Prescription
                    </h5>
                    <div className="space-y-1.5">
                        {response.prescription.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-[#0D2B45] bg-white px-3 py-2 rounded-lg border border-[#DCE5ED]">
                                <span className="w-1.5 h-1.5 bg-[#28A98C] rounded-full shrink-0" />
                                {item.medication || JSON.stringify(item)}
                                {item.dosage && <span className="text-[#7AA3BE] ml-1">— {item.dosage}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Follow-up */}
            {response.follow_up_date && (
                <div className="pt-3 border-t border-[#DCE5ED]">
                    <p className="text-sm text-[#1A6FA8] font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Follow-up: {new Date(response.follow_up_date).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            )}
        </div>
    );
}
