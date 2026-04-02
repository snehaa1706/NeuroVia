import { useNavigate } from 'react-router-dom';
import { Brain, Stethoscope, Heart, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    const modules = [
        {
            id: 'screening',
            title: 'Cognitive Screening',
            subtitle: 'No login required',
            description: 'AI-powered cognitive assessments across three clinical levels — SCD, MCI, and Dementia screening.',
            icon: Brain,
            gradient: 'from-violet-600 to-indigo-500',
            shadowColor: 'shadow-violet-500/30',
            bgAccent: 'bg-violet-50',
            textAccent: 'text-violet-600',
            borderAccent: 'hover:border-violet-300',
            route: '/screening',
            tag: 'Open Access',
            tagColor: 'bg-violet-100 text-violet-700',
        },
        {
            id: 'caregiver',
            title: 'Caregiver Platform',
            subtitle: 'Login required',
            description: 'Comprehensive patient monitoring, daily check-ins, incident logs, medication tracking, and AI-guided caregiving.',
            icon: Heart,
            gradient: 'from-teal-500 to-emerald-500',
            shadowColor: 'shadow-teal-500/30',
            bgAccent: 'bg-teal-50',
            textAccent: 'text-teal-600',
            borderAccent: 'hover:border-teal-300',
            route: '/login',
            tag: 'Authenticated',
            tagColor: 'bg-teal-100 text-teal-700',
        },
        {
            id: 'doctor',
            title: 'Doctor Consultation',
            subtitle: 'Login required',
            description: 'Manage consultation requests, review AI-generated insights, accept cases, and submit clinical responses.',
            icon: Stethoscope,
            gradient: 'from-blue-600 to-cyan-500',
            shadowColor: 'shadow-blue-500/30',
            bgAccent: 'bg-blue-50',
            textAccent: 'text-blue-600',
            borderAccent: 'hover:border-blue-300',
            route: '/login',
            tag: 'Authenticated',
            tagColor: 'bg-blue-100 text-blue-700',
        },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Hero Header */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(20, 184, 166, 0.3) 0%, transparent 50%)'
                }} />

                <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-xl shadow-blue-500/30">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4">
                        Neuro<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Via</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-200/80 font-medium max-w-2xl mx-auto mb-3">
                        AI-Powered Cognitive Care Platform
                    </p>
                    <p className="text-base text-slate-400 max-w-xl mx-auto">
                        Early detection, continuous monitoring, and expert consultation — all in one unified platform.
                    </p>

                    <div className="flex items-center justify-center gap-6 mt-10">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Shield className="w-4 h-4 text-teal-400" />
                            <span>HIPAA-Ready</span>
                        </div>
                        <div className="w-px h-4 bg-slate-600" />
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                            <span>AI-Powered</span>
                        </div>
                        <div className="w-px h-4 bg-slate-600" />
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Brain className="w-4 h-4 text-blue-400" />
                            <span>Clinical Grade</span>
                        </div>
                    </div>
                </div>

                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 40L48 36C96 32 192 24 288 28C384 32 480 48 576 52C672 56 768 48 864 40C960 32 1056 24 1152 28C1248 32 1344 48 1392 56L1440 64V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V40Z" fill="#F8FAFC" />
                    </svg>
                </div>
            </header>

            {/* Module Cards */}
            <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Choose Your Module</h2>
                    <p className="text-lg text-slate-500 font-medium">Select the platform that matches your role</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {modules.map((mod, i) => {
                        const Icon = mod.icon;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => navigate(mod.route)}
                                className={`group relative bg-white rounded-3xl p-8 border-2 border-slate-100 ${mod.borderAccent} text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl`}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                {/* Gradient hover overlay */}
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl bg-gradient-to-br ${mod.gradient}`} />

                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-6 shadow-lg ${mod.shadowColor} group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-8 h-8 text-white" />
                                </div>

                                {/* Tag */}
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${mod.tagColor}`}>
                                    {mod.tag}
                                </span>

                                {/* Text */}
                                <h3 className="text-2xl font-bold text-slate-900 mb-1">{mod.title}</h3>
                                <p className={`text-sm font-medium ${mod.textAccent} mb-3`}>{mod.subtitle}</p>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6">{mod.description}</p>

                                {/* CTA */}
                                <div className={`flex items-center gap-2 font-bold ${mod.textAccent} text-sm group-hover:gap-3 transition-all`}>
                                    Enter Module <ArrowRight className="w-4 h-4" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-6 text-center">
                <p className="text-sm text-slate-400 font-medium">
                    NeuroVia © {new Date().getFullYear()} — AI-Powered Cognitive Care Platform
                </p>
            </footer>
        </div>
    );
}
