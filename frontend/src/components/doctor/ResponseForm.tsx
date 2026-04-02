import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ResponseFormProps {
    onSubmit: (data: {
        diagnosis: string;
        notes?: string;
        prescription?: any[];
        follow_up_date?: string;
    }) => Promise<void>;
    loading?: boolean;
}

export function ResponseForm({ onSubmit, loading }: ResponseFormProps) {
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [prescription, setPrescription] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!diagnosis.trim()) {
            setError('Diagnosis is required');
            return;
        }

        let parsedPrescription: any[] = [];
        if (prescription.trim()) {
            try {
                parsedPrescription = JSON.parse(prescription);
                if (!Array.isArray(parsedPrescription)) {
                    parsedPrescription = [{ medication: prescription.trim() }];
                }
            } catch {
                // If not valid JSON, wrap as simple medication entry
                parsedPrescription = [{ medication: prescription.trim() }];
            }
        }

        try {
            await onSubmit({
                diagnosis: diagnosis.trim(),
                notes: notes.trim() || undefined,
                prescription: parsedPrescription,
                follow_up_date: followUpDate || undefined,
            });
            setSuccess(true);
            setDiagnosis('');
            setNotes('');
            setPrescription('');
            setFollowUpDate('');
        } catch (err: any) {
            setError(err.message || 'Failed to submit response');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-[#DCE5ED] shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#EAF7F4] to-white border-b border-[#DCE5ED]">
                <h3 className="text-lg font-bold text-[#0D2B45] flex items-center gap-2">
                    <Send className="w-5 h-5 text-[#28A98C]" />
                    Submit Doctor Response
                </h3>
                <p className="text-sm text-[#7AA3BE] mt-1">Submitting a response will automatically mark this consultation as completed.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Diagnosis */}
                <div>
                    <label className="label">Diagnosis <span className="text-[#D32F2F]">*</span></label>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="Enter your medical diagnosis..."
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="label">Clinical Notes</label>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="Additional recommendations, lifestyle advice..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Prescription */}
                <div>
                    <label className="label">Prescription</label>
                    <textarea
                        className="input"
                        rows={2}
                        placeholder='e.g. Donepezil 5mg daily or [{"medication":"Aspirin","dosage":"100mg"}]'
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                    />
                    <p className="text-xs text-[#9BB8CD] mt-1">Plain text or JSON array format accepted</p>
                </div>

                {/* Follow-up Date */}
                <div>
                    <label className="label">Follow-up Date (Optional)</label>
                    <input
                        type="date"
                        className="input"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-[#FDECEA] border border-[#D32F2F]/20 rounded-xl text-sm text-[#D32F2F] font-medium">
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="p-3 bg-[#EAF7F4] border border-[#28A98C]/20 rounded-xl text-sm text-[#28A98C] font-medium">
                        ✓ Response submitted successfully. Consultation marked as completed.
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full"
                >
                    {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                    ) : (
                        <><Send className="w-5 h-5" /> Submit Response</>
                    )}
                </button>
            </form>
        </div>
    );
}
