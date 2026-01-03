import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, Facebook, Chrome, ArrowRight, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import '../styles/AuthModal.css';
import { API_ENDPOINTS } from '../config/api';

interface AuthModalProps {
    isOpen: boolean;
    onClose?: () => void;
}

const SERVER_URL = API_ENDPOINTS.AUTH_REGISTER.replace('/register', '');

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [isTokenValid, setIsTokenValid] = useState(false);

    const login = useAuthStore((state) => state.login);

    // Check for reset token in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            setResetToken(token);
            setView('reset-password');
            verifyResetToken(token);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const verifyResetToken = async (token: string) => {
        try {
            const res = await fetch(`${SERVER_URL}/verify-reset-token?token=${token}`);
            const data = await res.json();
            setIsTokenValid(data.valid);
            if (!data.valid) {
                setError('This password reset link is invalid or has expired.');
            }
        } catch (err) {
            setIsTokenValid(false);
            setError('Failed to verify reset token.');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            const endpoint = view === 'login' ? '/login' : '/register';
            const body = view === 'login' ? { email, password } : { email, password, name };

            const res = await fetch(`${SERVER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            login(data.user, data.token);
            if (onClose) onClose();

            // Force reload to ensure fresh store state is fetched from server
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        const mockUser = {
            email: `demo.${provider}@example.com`,
            name: `Demo ${provider} User`,
            picture: `https://ui-avatars.com/api/?name=${provider}&background=random`,
            sub: `mock-${provider}-id-${Math.random()}`
        };

        try {
            setIsLoading(true);
            const res = await fetch(`${SERVER_URL}/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: 'mock-client-token',
                    user: mockUser,
                    accessToken: 'mock-access-token',
                    userID: mockUser.sub,
                    userInfo: mockUser
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            login(data.user, data.token);
            if (onClose) onClose();

            // Force reload
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            const res = await fetch(`${SERVER_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset email');
            }

            setSuccessMessage('Password reset link has been sent to your email!');
            setEmail('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${SERVER_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setSuccessMessage('Password has been reset successfully! You can now sign in.');
            setPassword('');
            setConfirmPassword('');
            setResetToken(null);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                setView('login');
                setSuccessMessage(null);
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay">
            {/* Background Decoration */}
            <div className="auth-bg-decoration">
                <div className="bg-orb blue" />
                <div className="bg-orb purple" />
            </div>

            <div className="auth-card">

                {/* Visual Side */}
                <div className="auth-visual-side">
                    <div className="visual-content">
                        <div className="brand-header">
                            <div className="brand-icon">
                                <CheckCircle2 color="white" size={24} />
                            </div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Task Manager App</h1>
                        </div>
                        <h2 className="visual-heading">
                            Manage your tasks <br /> with <span className="highlight-text">Artificial Intelligence</span>
                        </h2>
                        <p className="visual-description">
                            Organize, automate, and accelerate your productivity with our next-gen platform.
                        </p>
                    </div>

                    <div className="visual-footer">
                        <div style={{ display: 'flex', gap: '-10px', marginBottom: '1rem' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid #6366f1', marginLeft: i > 1 ? -15 : 0, zIndex: 10 - i, background: 'white' }}>
                                    <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="User" style={{ width: '100%', height: '100%' }} />
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#dbeafe' }}>Trusted by over 2,000 teams relying on Autopilot.</p>
                    </div>

                    {/* Abstract Shapes */}
                    <div className="spin-shape large" />
                    <div className="spin-shape medium" />
                </div>

                {/* Form Side */}
                <div className="auth-form-side">
                    <div className="form-container">
                        <div className="auth-header">
                            <h2 className="auth-title">
                                {view === 'login' && 'Welcome Back'}
                                {view === 'register' && 'Create Account'}
                                {view === 'forgot-password' && 'Reset Password'}
                                {view === 'reset-password' && 'Set New Password'}
                            </h2>
                            <p className="auth-subtitle">
                                {view === 'login' && 'Enter your credentials to access your account'}
                                {view === 'register' && 'Start your journey with us today'}
                                {view === 'forgot-password' && 'Enter your email to receive a password reset link'}
                                {view === 'reset-password' && 'Create a new password for your account'}
                            </p>
                        </div>

                        {(view === 'login' || view === 'register') && (
                            <>
                                {/* Social Auth */}
                                {/* <div className="social-buttons">
                                    <button onClick={() => handleSocialLogin('google')} className="btn-social">
                                        <Chrome size={20} color="white" />
                                        Google
                                    </button>
                                    <button onClick={() => handleSocialLogin('facebook')} className="btn-social">
                                        <Facebook size={20} color="#3b82f6" />
                                        Facebook
                                    </button>
                                </div> 

                                <div className="auth-divider">
                                    <span className="divider-text">Or continue with</span>
                                </div>*/}
                            </>
                        )}

                        {/* Reset Password Form */}
                        {view === 'reset-password' ? (
                            <form onSubmit={handleResetPassword}>
                                {error && (
                                    <div className="error-box">
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}></span>
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="success-box">
                                        <CheckCircle2 size={16} />
                                        {successMessage}
                                    </div>
                                )}

                                {isTokenValid && !successMessage && (
                                    <>
                                        <div className="form-group">
                                            <label className="input-label">New Password</label>
                                            <div className="input-wrapper">
                                                <Lock className="input-icon" size={20} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="form-input has-toggle"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter new password"
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="input-label">Confirm Password</label>
                                            <div className="input-wrapper">
                                                <Lock className="input-icon" size={20} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="form-input has-toggle"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm new password"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" disabled={isLoading} className="btn-submit">
                                            {isLoading ? (
                                                <span style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                            ) : (
                                                <>
                                                    Reset Password
                                                    <ArrowRight size={20} />
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
                                    className="btn-back"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Sign In
                                </button>
                            </form>
                        ) : view === 'forgot-password' ? (
                            <form onSubmit={handleForgotPassword}>
                                {error && (
                                    <div className="error-box">
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}></span>
                                        {error}
                                    </div>
                                )}

                                {successMessage && (
                                    <div className="success-box">
                                        <CheckCircle2 size={16} />
                                        {successMessage}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="input-label">Email</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={20} />
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="btn-submit">
                                    {isLoading ? (
                                        <span style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setView('login'); setError(null); setSuccessMessage(null); }}
                                    className="btn-back"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Sign In
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {error && (
                                    <div className="error-box">
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}></span>
                                        {error}
                                    </div>
                                )}

                                {view === 'register' && (
                                    <div className="form-group">
                                        <label className="input-label">Full Name</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={20} />
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="input-label">Email</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={20} />
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="input-label">Password</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" size={20} />
                                        <input
                                            type="password"
                                            className="form-input"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    {view === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => { setView('forgot-password'); setError(null); }}
                                            className="forgot-password-link"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>

                                <button type="submit" disabled={isLoading} className="btn-submit">
                                    {isLoading ? (
                                        <span style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    ) : (
                                        <>
                                            {view === 'login' ? 'Sign In' : 'Create Account'}
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {view !== 'forgot-password' && (
                            <div className="auth-footer">
                                <p>
                                    {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                                    <button
                                        onClick={() => setView(view === 'login' ? 'register' : 'login')}
                                        className="link-toggle"
                                    >
                                        {view === 'login' ? 'Sign Up Now' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
