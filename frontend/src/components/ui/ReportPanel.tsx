
import { FileText, Download, Loader2 } from 'lucide-react';

interface ReportPanelProps {
    children: React.ReactNode;
    title: string;
    onExport?: () => void;
    exporting?: boolean;
}

export function ReportPanel({ children, title, onExport, exporting }: ReportPanelProps) {
    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-[#DCE5ED] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#DCE5ED] bg-gradient-to-r from-[#F7FBFF] to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white shadow-md">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif">{title}</h3>
                </div>
                {onExport && (
                    <button onClick={onExport} disabled={exporting} className="px-5 py-2.5 bg-white border border-[#DCE5ED] shadow-sm text-[#0D2B45] hover:border-[#1A6FA8] hover:text-[#1A6FA8] disabled:opacity-50 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export Report
                    </button>
                )}
            </div>
            <div className="p-8">
                {children}
            </div>
        </div>
    );
}
