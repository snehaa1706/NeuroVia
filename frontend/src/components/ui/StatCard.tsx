import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendUp?: boolean;
    colorClasses?: string;
    iconClasses?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, colorClasses = "bg-white", iconClasses = "text-[#1A6FA8] bg-[#1A6FA8]/10" }: StatCardProps) {
    return (
        <div className={`rounded-3xl p-6 shadow-lg border border-[#DCE5ED] hover:shadow-xl transition-shadow flex flex-col ${colorClasses}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconClasses}`}>
                    <Icon className="w-7 h-7" />
                </div>
            </div>
            <div className="mt-auto">
                <p className="text-sm font-medium text-[#7AA3BE] uppercase tracking-wider mb-2">{title}</p>
                <h3 className="text-4xl font-bold text-[#0D2B45] font-serif">{value}</h3>
                {trend && (
                    <div className={`text-sm font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-[#28A98C]' : 'text-[#D32F2F]'}`}>
                        {trendUp ? '↑' : '↓'} {trend}
                    </div>
                )}
            </div>
        </div>
    );
}
