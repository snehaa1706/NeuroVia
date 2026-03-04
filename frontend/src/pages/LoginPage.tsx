import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import './LoginPage.css';

interface LoginPageProps {
    onLogin: (authResponse: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // UI Validation states
    const [emailError, setEmailError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const validateEmail = () => {
        const trimmedEmail = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            setEmailError('Please enter a valid email address.');
            return false;
        } else {
            setEmailError('');
            return true;
        }
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail()) {
            return;
        }

        if (!email || !password) {
            return;
        }

        setLoading(true);
        setEmailError('');

        try {
            // Using existing API logic
            const response = await api.login(email, password);
            setSuccess(true);

            // Give the user a moment to see the success state
            setTimeout(() => {
                onLogin(response);
            }, 1000);

        } catch (err: any) {
            setEmailError(err.message || 'Login failed. Please check your credentials.');
            setLoading(false);
            setSuccess(false);
        }
    };

    return (
        <div className="page-wrapper">

            {/* LEFT PANEL: HERO */}
            <div className="hero-panel">
                <img src="/caregiver.jpg" alt="Caregiver with elderly patient" className="hero-bg-image" />
                <div className="hero-overlay"></div>

                <header className="hero-header">
                    <div className="logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="logo-text">NeuroVia</div>
                </header>

                <main className="hero-main hero-content">
                    <div className="eyebrow">AI-POWERED CARE INTELLIGENCE</div>
                    <h1 className="hero-title">Empowering<br /><span className="emphasis">Better Care</span></h1>
                    <p className="hero-subtitle">
                        AI-powered dementia screening and caregiver monitoring — helping families and clinicians detect early, act faster, and care smarter.
                    </p>

                    <div className="feature-pills">
                        <div className="pill">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            Early Detection
                        </div>
                        <div className="pill">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Real-Time Monitoring
                        </div>
                        <div className="pill">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            Caregiver Support
                        </div>
                    </div>
                </main>

                <footer className="hero-footer">
                    &copy; 2026 NeuroVia Health Technologies. All rights reserved.
                </footer>
            </div>

            {/* RIGHT PANEL: LOGIN */}
            <div className="login-panel">
                <div className="login-card">

                    <h2 className="login-title">Welcome back</h2>
                    <p className="login-subtitle">Sign in to continue to your dashboard</p>

                    <form id="loginForm" onSubmit={handleSubmit}>

                        <div className="form-group">
                            <div className="form-header">
                                <label className="form-label" htmlFor="email">Email</label>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    id="email"
                                    className={`form-input ${emailError ? 'is-invalid' : ''}`}
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={validateEmail}
                                />
                                {emailError && (
                                    <div className="error-message" id="emailError">{emailError}</div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="form-header">
                                <label className="form-label" htmlFor="password">Password</label>
                                <a href="#" className="forgot-link">Forgot password?</a>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button type="button" className="password-toggle" id="togglePasswordBtn" onClick={togglePassword}>
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" id="eyeOffIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" id="eyeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`submit-btn ${success ? 'is-success' : ''} ${loading ? 'is-loading' : ''}`}
                            id="submitBtn"
                            disabled={loading || success}
                        >
                            {success ? '✓ Signed In' : (loading ? 'Signing in…' : 'Sign In')}
                        </button>
                    </form>

                    <div className="divider">or continue with</div>

                    <div className="social-buttons">
                        <button type="button" className="social-btn">
                            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                        <button type="button" className="social-btn">
                            <svg viewBox="0 0 21 21" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                            </svg>
                            Microsoft
                        </button>
                    </div>

                    <p className="register-text">
                        Don't have an account? <Link to="/register">Create one</Link>
                    </p>

                    <div className="trust-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        256-bit AES encryption &middot; Secure access
                    </div>

                </div>
            </div>
        </div>
    )
}
