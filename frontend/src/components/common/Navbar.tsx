import { Bell, LogOut, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';

interface NavbarProps {
    user: User;
    onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
    const navigate = useNavigate();

    return (
        <header className="h-[88px] bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-10 shrink-0 sticky top-0 z-40">
            {/* Search */}
            <div className="flex-1 max-w-2xl">
                <div className="relative group">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-violet-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search patients, recent screenings, activities..."
                        className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-base text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">

                {/* Alerts/Notifications */}
                <button
                    onClick={() => navigate('/alerts')}
                    className="relative w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md flex items-center justify-center transition-all group"
                    aria-label="View notifications"
                >
                    <Bell className="w-[22px] h-[22px] text-slate-500 group-hover:text-violet-600 transition-colors" />
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                </button>

                {/* Settings Placeholder */}
                <button
                    className="relative w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md flex items-center justify-center transition-all group hidden sm:flex"
                    aria-label="Settings"
                >
                    <Settings className="w-[22px] h-[22px] text-slate-500 group-hover:text-violet-600 transition-colors" />
                </button>

                <div className="w-px h-10 bg-slate-200 mx-2 hidden sm:block" />

                {/* User Profile */}
                <div className="flex items-center gap-4 pl-2 cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-teal-500 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden md:flex flex-col">
                        <p className="text-base font-bold text-slate-800 leading-tight group-hover:text-violet-700 transition-colors">
                            {user.full_name}
                        </p>
                        <p className="text-sm font-medium text-slate-500 capitalize leading-tight mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 block"></span>
                            {user.role}
                        </p>
                    </div>
                </div>

                <div className="w-px h-10 bg-slate-200 mx-2" />

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all group"
                    title="Sign out"
                    aria-label="Sign out"
                >
                    <LogOut className="w-[22px] h-[22px] text-slate-400 group-hover:text-red-500 transition-colors" />
                </button>
            </div>
        </header>
    );
}
