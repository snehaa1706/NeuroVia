
import { AlertTriangle, ShieldAlert, Info, Check } from 'lucide-react';

interface AlertItemProps {
    severity: string;
    type: string;
    message: string;
    interpretation?: string;
    timestamp: string;
    read: boolean;
    onMarkRead: () => void;
}

export function AlertItem({ severity, type, message, interpretation, timestamp, read, onMarkRead }: AlertItemProps) {
    const config = {
        info: { icon: Info, bg: 'bg-[#F7FBFF]', text: 'text-[#1A6FA8]', border: 'border-[#1A6FA8]/20' },
        warning: { icon: AlertTriangle, bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', border: 'border-[#D97706]/20' },
        critical: { icon: ShieldAlert, bg: 'bg-[#FDECEA]', text: 'text-[#D32F2F]', border: 'border-[#D32F2F]/20' },
    }[severity?.toLowerCase()] || { icon: Info, bg: 'bg-[#F7FBFF]', text: 'text-[#1A6FA8]', border: 'border-[#1A6FA8]/20' };

    const Icon = config.icon;

    return (
        <div className={`bg-white rounded-3xl p-6 shadow-md border ${config.border} hover:shadow-lg transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${read ? 'opacity-60' : 'opacity-100'}`}>
            <div className="flex items-start gap-5 flex-1 w-full">
                <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center shrink-0 mt-1 md:mt-0`}>
                    <Icon className={`w-6 h-6 ${config.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
                            {severity}
                        </span>
                        <span className="text-sm font-medium text-[#7AA3BE] capitalize">{type?.replace('_', ' ')}</span>
                        <span className="text-xs text-[#9BB8CD] ml-auto">{timestamp}</span>
                    </div>
                    <p className="text-[#0D2B45] font-semibold text-lg mb-1 leading-snug">{message}</p>
                    {interpretation && (
                        <p className="text-[#7AA3BE] text-sm leading-relaxed mt-1">{interpretation}</p>
                    )}
                </div>
            </div>
            {!read && (
                <button onClick={onMarkRead} className="md:shrink-0 w-full md:w-auto px-5 py-2.5 border-2 border-[#DCE5ED] text-[#0D2B45] hover:border-[#1A6FA8] hover:text-[#1A6FA8] bg-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Mark Read
                </button>
            )}
        </div>
    );
}
