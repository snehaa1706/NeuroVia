import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PatientCardProps {
  patient: {
    id: string;
    full_name: string;
    latest_score?: number;
    trend?: string;
  };
}

export default function PatientCard({ patient }: PatientCardProps) {
  const getTrendIcon = (trend?: string) => {
    switch(trend) {
      case 'improving': return <TrendingUp size={16} className="text-green-600" />;
      case 'declining': return <TrendingDown size={16} className="text-red-600" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const scoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Link to={`/patients/${patient.id}`} className="block">
      <div className="card p-5 hover:-translate-y-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F1F7] flex items-center justify-center text-[#1A6FA8] font-bold text-lg">
              {patient.full_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{patient.full_name}</h3>
              <p className="text-sm text-gray-500">ID: {patient.id.substring(0,8)}...</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Latest Score</p>
            <div className={`text-2xl font-bold ${scoreColor(patient.latest_score)}`}>
              {patient.latest_score ? patient.latest_score.toFixed(1) : '—'}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Trend</p>
            <div className="flex items-center gap-1 justify-end font-medium">
              {getTrendIcon(patient.trend)}
              <span className="capitalize text-gray-700">{patient.trend || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
