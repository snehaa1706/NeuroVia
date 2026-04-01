import { AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';

interface AlertCardProps {
  alert: {
    id: string;
    alert_type: string;
    message: string;
    severity: string;
    created_at: string;
    read: boolean;
  };
}

export default function AlertCard({ alert }: AlertCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch(severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <AlertTriangle className="text-red-500" />;
      case 'warning': return <Clock className="text-yellow-500" />;
      case 'info': return <CheckCircle className="text-blue-500" />;
      default: return <AlertTriangle className="text-gray-500" />;
    }
  };

  const formattedDate = new Date(alert.created_at).toLocaleString();

  return (
    <div className={`p-4 rounded-lg border-l-4 mb-3 shadow-sm ${getSeverityStyles(alert.severity)} ${alert.read ? 'opacity-60' : ''}`}>
      <div className="flex gap-3 items-start">
        <div className="mt-0.5">
          {getSeverityIcon(alert.severity)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold capitalize">{alert.alert_type.replace(/_/g, ' ')}</h4>
            {!alert.read && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">New</span>}
          </div>
          <p className="text-sm mt-1 opacity-90">{alert.message}</p>
          <div className="flex items-center gap-1 mt-3 text-xs opacity-75 font-medium">
            <Calendar size={12} />
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
}
