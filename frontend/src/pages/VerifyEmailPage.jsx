import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { sendEmailVerification, onAuthStateChanged, reload } from 'firebase/auth';

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || auth.currentUser?.email || 'your email';
    const [resent, setResent] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [dots, setDots] = useState('');

    // Animate waiting dots
    useEffect(() => {
        const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
        return () => clearInterval(id);
    }, []);

    // Poll every 4 s — if the Firebase user has verified, go to auth page to log in
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            const poll = setInterval(async () => {
                await reload(user);
                if (user.emailVerified) {
                    clearInterval(poll);
                    navigate('/auth', { state: { verified: true } });
                }
            }, 4000);
            return () => clearInterval(poll);
        });
        return () => unsub();
    }, [navigate]);

    const handleResend = async () => {
        setError('');
        const user = auth.currentUser;
        if (!user) { setError('Session expired. Please register again.'); return; }
        try {
            await sendEmailVerification(user);
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch (e) {
            setError(e.message);
        }
    };

    const handleCheckNow = async () => {
        setChecking(true);
        setError('');
        const user = auth.currentUser;
        if (!user) { setError('Session expired. Please register again.'); setChecking(false); return; }
        await reload(user);
        if (user.emailVerified) {
            navigate('/auth', { state: { verified: true } });
        } else {
            setError('Email not yet verified. Check your inbox and click the link.');
        }
        setChecking(false);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#06060f 0%,#0a0a1a 50%,#06060f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', overflow: 'hidden' }}>
            {/* Glow orbs */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', top: '10%', left: '20%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)', bottom: '10%', right: '15%', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 460, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 40, backdropFilter: 'blur(20px)', textAlign: 'center' }}>

                {/* Animated envelope */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                    </div>
                    {/* Pulsing ring */}
                    <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.3)', animation: 'ping 2s cubic-bezier(0,0,.2,1) infinite' }} />
                </div>

                {/* Logo */}
                <div style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: -0.5 }}>Compile<span style={{ color: '#818cf8' }}>X</span> Labs</span>
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: -0.5 }}>Check Your Inbox</h1>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '0 0 8px' }}>
                    We sent a verification link to
                </p>
                <p style={{ color: '#818cf8', fontSize: 14, fontWeight: 700, margin: '0 0 24px', wordBreak: 'break-all' }}>
                    {email}
                </p>

                {/* Steps */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
                    {[
                        ['1', 'Open the email from CompileX Labs'],
                        ['2', 'Click "Verify Email" in the message'],
                        ['3', 'Return here — you\'ll be signed in automatically'],
                    ].map(([n, txt]) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: n === '3' ? 0 : 12 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{n}</div>
                            <span style={{ color: '#94a3b8', fontSize: 13 }}>{txt}</span>
                        </div>
                    ))}
                </div>

                {/* Auto-checking indicator */}
                <p style={{ color: '#334155', fontSize: 12, marginBottom: 20 }}>
                    Waiting for verification{dots}
                </p>

                {/* Error */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
                        {error}
                    </div>
                )}

                {/* Resent success */}
                {resent && (
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#4ade80' }}>
                        ✓ Verification email resent!
                    </div>
                )}

                {/* Action buttons */}
                <button onClick={handleCheckNow} disabled={checking} style={{ width: '100%', padding: '12px 0', background: checking ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, color: checking ? '#475569' : '#fff', fontWeight: 700, fontSize: 14, cursor: checking ? 'not-allowed' : 'pointer', marginBottom: 10, boxShadow: checking ? 'none' : '0 4px 20px rgba(99,102,241,0.35)', transition: 'all .2s' }}>
                    {checking ? 'Checking…' : "I've Verified — Continue"}
                </button>

                <button onClick={handleResend} disabled={resent} style={{ width: '100%', padding: '11px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: resent ? '#334155' : '#64748b', fontWeight: 600, fontSize: 13, cursor: resent ? 'default' : 'pointer', transition: 'all .2s' }}>
                    {resent ? 'Email Sent ✓' : 'Resend Email'}
                </button>

                <button onClick={() => navigate('/auth')} style={{ marginTop: 16, background: 'transparent', border: 'none', color: '#334155', fontSize: 12, cursor: 'pointer' }}>
                    ← Back to Sign In
                </button>
            </div>

            <style>{`@keyframes ping { 75%,100% { transform: scale(1.4); opacity: 0; } }`}</style>
        </div>
    );
}
