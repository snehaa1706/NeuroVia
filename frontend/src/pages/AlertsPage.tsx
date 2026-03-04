import { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { User, Alert } from '../types';
import { AlertItem } from '../components/ui/AlertItem';

interface Props {
    user: User;
}

export default function AlertsPage({ user: _user }: Props) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => { loadAlerts(); }, [filter]);

    const loadAlerts = async () => {
        setLoading(true);
        try { const res = await api.getAlerts(filter === 'unread'); setAlerts(res.alerts || []); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const markRead = async (alertId: string) => {
        try { await api.markAlertRead(alertId); setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a)); }
        catch (err) { console.error(err); }
    };

    const unreadCount = alerts.filter(a => !a.read).length;

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">Alerts & Notifications</h2>
                    <p className="text-lg text-[#7AA3BE] mt-2">
                        {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up!'}
                    </p>
                </div>
                <div className="flex gap-2 bg-[#F7FBFF] p-1.5 rounded-xl border border-[#DCE5ED]">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-5 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-white shadow-sm text-[#0D2B45]' : 'text-[#7AA3BE] hover:text-[#0D2B45]'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'unread' ? 'bg-white shadow-sm text-[#0D2B45]' : 'text-[#7AA3BE] hover:text-[#0D2B45]'}`}
                    >
                        Unread
                        {unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-[#1A6FA8] text-white flex items-center justify-center text-xs font-bold leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#DCE5ED] p-16 text-center shadow-lg hover:border-[#1A6FA8] transition-colors">
                    <div className="w-24 h-24 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-12 h-12 text-[#9BB8CD]" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-2">No Alerts</h3>
                    <p className="text-[#7AA3BE] text-lg max-w-sm mx-auto">
                        {filter === 'unread' ? "You have no unread alerts at the moment." : "There are no notifications to display."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <AlertItem
                            key={alert.id}
                            severity={alert.severity}
                            type={alert.alert_type}
                            message={alert.message}
                            interpretation={alert.ai_interpretation}
                            timestamp={alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
                            read={alert.read}
                            onMarkRead={() => markRead(alert.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
