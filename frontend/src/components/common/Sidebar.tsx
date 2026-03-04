import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardCheck,
    Gamepad2,
    Stethoscope,
    Pill,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Brain,
    Heart,
} from 'lucide-react';
import type { User } from '../../types';

interface SidebarProps {
    user: User;
    isOpen: boolean;
    onToggle: () => void;
}

export default function Sidebar({ user, isOpen, onToggle }: SidebarProps) {
    const patientLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/screening', icon: ClipboardCheck, label: 'Screening' },
        { to: '/activities', icon: Gamepad2, label: 'Activities' },
        { to: '/consult', icon: Stethoscope, label: 'Doctors' },
        { to: '/medications', icon: Pill, label: 'Medications' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    ];

    const caregiverLinks = [
        { to: '/caregiver', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/medications', icon: Pill, label: 'Medications' },
        { to: '/activities', icon: Gamepad2, label: 'Activities' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    ];

    const doctorLinks = [
        { to: '/consult', icon: Stethoscope, label: 'Consultations' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    ];

    const links =
        user.role === 'caregiver'
            ? caregiverLinks
            : user.role === 'doctor'
                ? doctorLinks
                : patientLinks;

    return (
        <aside
            className={`${isOpen ? 'w-[280px]' : 'w-[88px]'
                } bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 shrink-0 text-slate-300 relative rounded-r-2xl shadow-xl`}
        >
            {/* Logo Section */}
            <div className="h-[88px] flex items-center px-6 border-b border-slate-800">
                <div className="flex items-center gap-4 overflow-hidden w-full">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    {isOpen && (
                        <div className="overflow-hidden flex flex-col justify-center">
                            <h1 className="text-xl font-bold tracking-tight text-white mb-0.5">
                                NeuroVia
                            </h1>
                            <p className="text-xs font-medium text-teal-300/80 tracking-wide uppercase">
                                Cognitive Care
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {isOpen && (
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-4">
                        Main Menu
                    </p>
                )}
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 min-h-[56px] group ${isActive
                                ? 'bg-gradient-to-r from-violet-600/20 to-teal-500/10 text-white border border-violet-500/20 shadow-inner'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <link.icon
                                    className={`w-[22px] h-[22px] shrink-0 transition-transform duration-200 ${isActive
                                            ? 'text-teal-400 scale-110'
                                            : 'text-slate-500 group-hover:text-violet-400 group-hover:scale-110'
                                        }`}
                                />
                                {isOpen && <span className="tracking-wide">{link.label}</span>}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Health Tip Callout */}
            {isOpen && (
                <div className="mx-4 mb-6 p-5 rounded-2xl bg-gradient-to-br from-violet-900/40 to-slate-800/80 border border-violet-500/20 shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-violet-500/20">
                            <Heart className="w-4 h-4 text-violet-300" />
                        </div>
                        <span className="text-sm font-bold text-violet-200">Daily Insight</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        Consistency in routines improves patient comfort. Stick to daily habits.
                    </p>
                </div>
            )}

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white group"
                    aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isOpen ? (
                        <>
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-semibold tracking-wide">Collapse</span>
                        </>
                    ) : (
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </div>
        </aside>
    );
}
