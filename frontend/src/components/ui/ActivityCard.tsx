
import { Play } from 'lucide-react';

interface ActivityCardProps {
    title: string;
    description: string;
    icon: string;
    difficulty: string;
    onStart: () => void;
}

export function ActivityCard({ title, description, icon, difficulty, onStart }: ActivityCardProps) {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-[#DCE5ED] hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col h-full group cursor-pointer" onClick={onStart}>
            <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 text-4xl bg-[#F7FBFF] rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${difficulty?.toLowerCase() === 'easy' ? 'bg-[#EAF7F4] text-[#28A98C]' :
                    difficulty?.toLowerCase() === 'medium' ? 'bg-[#FEF3C7] text-[#D97706]' :
                        'bg-[#FDECEA] text-[#D32F2F]'
                    }`}>
                    {difficulty}
                </span>
            </div>
            <h3 className="text-xl font-bold text-[#0D2B45] mb-2 font-serif">{title}</h3>
            <p className="text-[#7AA3BE] text-sm flex-grow mb-6 leading-relaxed bg-blend-normal">{description}</p>
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1A6FA8] to-[#28A98C] text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:brightness-110">
                <Play className="w-4 h-4 fill-current" /> Start Activity
            </button>
        </div>
    );
}
