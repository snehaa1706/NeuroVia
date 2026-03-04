import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';

interface RegisterPageProps {
    onLogin: (authResponse: any) => void;
}

export default function RegisterPage({ onLogin }: RegisterPageProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'patient',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.register(formData);
            onLogin(response);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 50%, #F8FAFC 100%)' }}>
            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-16">
                <div className="max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
                        <Brain className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
                        Join the future of<br />
                        <span className="text-gradient-blue">cognitive care</span>
                    </h1>
                    <p className="text-lg text-gray-500 leading-relaxed">
                        Create your account to access dementia screening, cognitive activities, medication tracking, and AI-powered insights.
                    </p>
                    <div className="mt-10 space-y-4">
                        <div className="flex items-center gap-3 text-gray-600">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">✓</div>
                            <span>3-level adaptive cognitive screening</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">✓</div>
                            <span>AI-powered risk analysis</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">✓</div>
                            <span>Caregiver monitoring & alerts</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right — Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="card w-full max-w-md p-10 animate-fadeIn">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-800">NeuroVia</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                        <p className="text-gray-500 mt-2">Get started with NeuroVia in minutes</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="label" htmlFor="register-name">Full Name</label>
                            <input
                                id="register-name"
                                type="text"
                                className="input"
                                placeholder="John Doe"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                                autoComplete="name"
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="register-email">Email address</label>
                            <input
                                id="register-email"
                                type="email"
                                className="input"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="label" htmlFor="register-password">Password</label>
                            <div className="relative">
                                <input
                                    id="register-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input pr-12"
                                    placeholder="Min. 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="label" htmlFor="register-role">I am a</label>
                            <select
                                id="register-role"
                                className="select"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="patient">Patient</option>
                                <option value="caregiver">Caregiver</option>
                                <option value="doctor">Doctor</option>
                            </select>
                        </div>

                        <button
                            id="register-submit"
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full btn-lg"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 text-sm mt-8">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
