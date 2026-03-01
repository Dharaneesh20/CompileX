import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCode, FaGoogle, FaGithub, FaEye, FaEyeSlash, FaLock, FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgot, setIsForgot] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [forgotEmail, setForgotEmail] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [forgotStatus, setForgotStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
    const [forgotMsg, setForgotMsg] = useState('');
    const navigate = useNavigate();
    const { login, register, googleLogin, githubLogin, oauthLogin, forgotPassword, loading } = useAuth();

    const handleInputChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        if (isLogin) {
            const result = await login(formData.email, formData.password);
            if (result.success) navigate('/dashboard');
            else setError(result.error || 'Something went wrong.');
        } else {
            const result = await register(formData.name, formData.email, formData.password);
            if (result.success && result.needsVerification) {
                navigate('/verify-email', { state: { email: result.email || formData.email } });
            } else if (result.success) {
                navigate('/dashboard');
            } else {
                setError(result.error || 'Registration failed.');
            }
        }
    };

    const handleOAuth = async provider => {
        setError('');
        const result = provider === 'Google'
            ? await googleLogin()
            : provider === 'GitHub'
                ? await githubLogin()
                : await oauthLogin(provider);
        if (result.success) navigate('/dashboard');
        else setError(result.error || `${provider} sign-in failed.`);
    };

    const handleForgotPassword = async e => {
        e.preventDefault();
        if (!forgotEmail.trim()) return;
        setForgotStatus('sending');
        setForgotMsg('');
        const result = await forgotPassword(forgotEmail.trim());
        if (result.success) {
            setForgotStatus('sent');
            setForgotMsg('Password reset email sent! Check your inbox.');
        } else {
            setForgotStatus('error');
            setForgotMsg(result.error || 'Failed to send reset email.');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#06060f 0%,#0a0a1a 50%,#06060f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', overflow: 'hidden' }}>
            {/* Glow orbs */}
            <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                        <FaCode size={22} color="#fff" />
                    </div>
                    <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                        Compile<span style={{ color: '#818cf8' }}>X</span> Labs
                    </h1>
                    <p style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>
                        {isForgot ? 'Reset your password' : isLogin ? 'Welcome back, developer ✨' : 'Create your free developer account'}
                    </p>
                </div>

                {/* Card */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)' }}>

                    {/* ── FORGOT PASSWORD VIEW ── */}
                    {isForgot ? (
                        <>
                            <button onClick={() => { setIsForgot(false); setForgotStatus(null); setForgotMsg(''); setForgotEmail(''); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}>
                                <FaArrowLeft size={11} /> Back to Sign In
                            </button>

                            {forgotStatus === 'sent' ? (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <FaCheckCircle size={26} color="#4ade80" />
                                    </div>
                                    <h3 style={{ color: '#fff', margin: '0 0 10px', fontWeight: 700 }}>Check Your Inbox</h3>
                                    <p style={{ color: '#475569', fontSize: 13, margin: '0 0 24px' }}>
                                        A password reset link has been sent to <span style={{ color: '#818cf8' }}>{forgotEmail}</span>
                                    </p>
                                    <button onClick={() => { setIsForgot(false); setForgotStatus(null); setForgotMsg(''); setForgotEmail(''); }}
                                        style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                                        → Back to Sign In
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <FaLock size={14} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                                            Enter your email address and we'll send you a password reset link.
                                        </p>
                                    </div>

                                    {forgotStatus === 'error' && (
                                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                                            {forgotMsg}
                                        </div>
                                    )}

                                    <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div>
                                            <label style={labelStyle}>Email Address</label>
                                            <div style={{ position: 'relative' }}>
                                                <FaEnvelope size={13} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                                <input type="email" placeholder="Enter your email address" value={forgotEmail}
                                                    onChange={e => setForgotEmail(e.target.value)} required
                                                    style={{ ...inputStyle, paddingLeft: 38 }}
                                                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={forgotStatus === 'sending' || !forgotEmail.trim()}
                                            style={{ marginTop: 6, background: forgotStatus === 'sending' || !forgotEmail.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, padding: '13px 0', color: '#fff', fontSize: 15, fontWeight: 700, cursor: forgotStatus === 'sending' || !forgotEmail.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.3)', transition: 'all .2s' }}>
                                            {forgotStatus === 'sending' ? 'Sending…' : '→ Send Reset Link'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Tab switcher */}
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
                                {['Sign In', 'Sign Up'].map((t, i) => {
                                    const active = isLogin ? i === 0 : i === 1;
                                    return (
                                        <button key={t} onClick={() => { setIsLogin(i === 0); setError(''); }}
                                            style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .2s', background: active ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'transparent', color: active ? '#fff' : '#555', boxShadow: active ? '0 2px 10px rgba(99,102,241,0.3)' : 'none' }}>
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 20 }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {!isLogin && (
                                    <div>
                                        <label style={labelStyle}>Full Name</label>
                                        <input name="name" type="text" placeholder="Enter your full name" required={!isLogin} value={formData.name} onChange={handleInputChange} style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                    </div>
                                )}
                                <div>
                                    <label style={labelStyle}>Email Address</label>
                                    <input name="email" type="email" placeholder="Enter your email address" required value={formData.email} onChange={handleInputChange} style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                                        {isLogin && (
                                            <button type="button" onClick={() => { setIsForgot(true); setError(''); setForgotEmail(formData.email); }}
                                                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0, letterSpacing: 0.3 }}>
                                                Forgot Password?
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input name="password" type={showPass ? 'text' : 'password'} placeholder="Enter your password" required value={formData.password} onChange={handleInputChange}
                                            style={{ ...inputStyle, paddingRight: 42 }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        <button type="button" onClick={() => setShowPass(!showPass)}
                                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                                            {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} style={{
                                    marginTop: 6, background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10,
                                    padding: '13px 0', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)', transition: 'all .2s'
                                }}>
                                    {loading ? 'Processing…' : isLogin ? '→ Sign In' : '→ Create Account'}
                                </button>
                            </form>

                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                                <span style={{ color: '#334155', fontSize: 12, fontWeight: 600 }}>OR</span>
                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Google', icon: <FaGoogle size={13} />, key: 'Google' },
                                    { label: 'GitHub', icon: <FaGithub size={13} />, key: 'GitHub' },
                                ].map(p => (
                                    <button key={p.key} onClick={() => handleOAuth(p.key)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 0', color: '#aaa', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#aaa'; }}>
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

const labelStyle = { display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box', fontFamily: 'inherit' };
