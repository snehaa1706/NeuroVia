import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CaregiverPatientCardProps {
    patient: {
        id: string;
        full_name: string;
        latest_score?: number;
        trend?: string;
    };
}

export default function CaregiverPatientCard({ patient }: CaregiverPatientCardProps) {
    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case 'improving': return <TrendingUp size={16} className="text-[#0D9488]" />;
            case 'declining': return <TrendingDown size={16} className="text-[#DC2626]" />;
            default: return <Minus size={16} className="text-[#9CA3AF]" />;
        }
    };

    const scoreColor = (score?: number) => {
        if (!score) return 'text-[#9CA3AF]';
        if (score >= 80) return 'text-[#0D9488]';
        if (score >= 50) return 'text-[#D97706]';
        return 'text-[#DC2626]';
    };

    return (
        <Link to={`/caregiver/patients/${patient.id}`} className="block group">
            <div className="bg-white rounded-lg p-6 border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(26,111,168,0.1)] hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#1A6FA8] to-[#0D9488] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1A6FA8]/10 to-[#0D9488]/10 flex items-center justify-center text-[#1A6FA8] font-extrabold text-lg border border-[#DCE5ED] group-hover:shadow-md transition-shadow">
                            {patient.full_name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-[16px] text-[#0D2B45] group-hover:text-[#1A6FA8] transition-colors">{patient.full_name}</h3>
                            <p className="text-[11px] text-[#9CA3AF] font-semibold tracking-wide">ID: {patient.id.substring(0, 8)}...</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#F3F4F6] pt-4 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-bold mb-1">Latest Score</p>
                        <div className={`text-[22px] font-extrabold ${scoreColor(patient.latest_score)}`}>
                            {patient.latest_score ? patient.latest_score.toFixed(1) : '—'}
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-bold mb-1">Trend</p>
                        <div className="flex items-center gap-1.5 justify-end font-semibold">
                            {getTrendIcon(patient.trend)}
                            <span className="capitalize text-[#4B5563] text-[14px]">{patient.trend || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
