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
    Zap,
} from 'lucide-react';
import type { User } from '../../types';

interface SidebarProps {
    user: User;
    isOpen: boolean;
    onToggle: () => void;
    alertCount?: number;
}

export default function Sidebar({ user, isOpen, onToggle, alertCount = 0 }: SidebarProps) {
    const patientLinks = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/screening', icon: ClipboardCheck, label: 'Screening' },
        { to: '/activities', icon: Gamepad2, label: 'Activities' },
        { to: '/consult', icon: Stethoscope, label: 'Doctors' },
        { to: '/medications', icon: Pill, label: 'Medications' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts', badge: alertCount },
    ];

    const caregiverLinks = [
        { to: '/caregiver', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/medications', icon: Pill, label: 'Medications' },
        { to: '/activities', icon: Gamepad2, label: 'Activities' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts', badge: alertCount },
    ];

    const doctorLinks = [
        { to: '/consult', icon: Stethoscope, label: 'Consultations' },
        { to: '/alerts', icon: AlertTriangle, label: 'Alerts', badge: alertCount },
    ];

    const links =
        user.role === 'caregiver' ? caregiverLinks :
            user.role === 'doctor' ? doctorLinks :
                patientLinks;

    return (
        <aside className={`${isOpen ? 'w-[220px]' : 'w-[72px]'} bg-white border-r border-slate-100 flex flex-col transition-all duration-300 shrink-0 shadow-sm`}>

            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden w-full">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    {isOpen && (
                        <div className="overflow-hidden flex flex-col justify-center">
                            <h1 className="text-base font-extrabold tracking-tight text-slate-800 leading-tight">
                                NeuroVia
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                                Cognitive Care
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                {isOpen && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
                        Main Menu
                    </p>
                )}
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${isActive
                                ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <link.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                {isOpen && <span className="tracking-wide flex-1">{link.label}</span>}
                                {isOpen && (link as any).badge > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {(link as any).badge}
                                    </span>
                                )}
                                {!isOpen && (link as any).badge > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Daily Insight Card */}
            {isOpen && (
                <div className="mx-3 mb-3 p-4 rounded-2xl border border-purple-100" style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #ede9fe 100%)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-purple-100">
                            <Zap className="w-3 h-3 text-purple-600" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Daily Insight</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Consistency in routines improves patient comfort. Stick to daily habits for best outcomes.
                    </p>
                </div>
            )}

            {/* Collapse Toggle */}
            <div className="p-3 border-t border-slate-100">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-700 group"
                    aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isOpen ? (
                        <>
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-xs font-semibold">Collapse</span>
                        </>
                    ) : (
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    )}
                </button>
            </div>
        </aside>
    );
}
