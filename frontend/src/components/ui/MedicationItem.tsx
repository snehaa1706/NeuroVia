
import { Pill, Check, X, Clock, Loader2 } from 'lucide-react';

interface MedicationItemProps {
    name: string;
    dosage: string;
    frequency: string;
    timeSlots: string[];
    onLog: (status: 'taken' | 'missed' | 'skipped') => void;
    logging: boolean;
}

export function MedicationItem({ name, dosage, frequency, timeSlots, onLog, logging }: MedicationItemProps) {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-[#DCE5ED] hover:shadow-xl transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center shadow-md shrink-0">
                    <Pill className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-[#0D2B45] font-serif">{name}</h4>
                    <p className="text-[#7AA3BE] text-sm mt-1">{dosage} &bull; {frequency}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 text-[#1A6FA8] bg-[#F7FBFF] px-4 py-2 rounded-xl shrink-0">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{timeSlots?.join(', ')}</span>
            </div>

            <div className="flex gap-2 w-full md:w-auto shrink-0">
                <button onClick={() => onLog('taken')} disabled={logging} className="flex-1 md:flex-none px-4 py-2.5 bg-[#28A98C] hover:bg-[#1D7A65] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[100px]">
                    {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Taken</>}
                </button>
                <button onClick={() => onLog('missed')} disabled={logging} className="flex-1 md:flex-none px-4 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[100px]">
                    <X className="w-4 h-4" /> Missed
                </button>
            </div>
        </div>
    );
}
