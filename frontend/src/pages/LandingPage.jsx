import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaCode, FaRocket, FaRobot, FaGithub, FaTerminal, FaShieldAlt } from 'react-icons/fa';
import { SiPython, SiJavascript, SiCplusplus, SiRust, SiGo } from 'react-icons/si';

const features = [
    { icon: <FaTerminal size={20} />, title: 'Multi-Language Sandbox', desc: 'Execute Python, JS, C++, Rust, Go and more in Docker-isolated containers.' },
    { icon: <FaRobot size={20} />, title: 'AI Code Agent', desc: 'Gemini-powered agent reads your code and terminal output — explains, fixes, and writes code for you.' },
    { icon: <FaGithub size={20} />, title: 'One-Click Git Push', desc: 'Push directly to any GitHub repo from inside the editor with smart conflict resolution.' },
    { icon: <FaShieldAlt size={20} />, title: 'Secure Execution', desc: 'Every run is fully network-isolated with CPU and memory limits to keep workspaces safe.' },
];

const langs = [
    { icon: <SiPython size={28} color="#3776ab" />, label: 'Python' },
    { icon: <SiJavascript size={28} color="#f7df1e" />, label: 'JavaScript' },
    { icon: <SiCplusplus size={28} color="#659ad2" />, label: 'C++' },
    { icon: <SiRust size={28} color="#dea584" />, label: 'Rust' },
    { icon: <SiGo size={28} color="#00add8" />, label: 'Go' },
];

export default function LandingPage() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = Array.from({ length: 60 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.3,
            o: Math.random() * 0.4 + 0.1,
        }));

        let animId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99,102,241,${p.o})`;
                ctx.fill();
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#06060f 0%,#0a0a1a 50%,#06060f 100%)', color: '#e2e8f0', overflowX: 'hidden', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

            {/* Glow orbs */}
            <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Nav */}
            <nav style={{ position: 'relative', zIndex: 10, padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', background: 'rgba(6,6,15,0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCode size={14} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: -0.5 }}>
                        Compile<span style={{ color: '#818cf8' }}>X</span> Labs
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Link to="/auth" style={{ textDecoration: 'none' }}>
                        <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 20px', color: '#ccc', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            Sign In
                        </button>
                    </Link>
                    <Link to="/auth" style={{ textDecoration: 'none' }}>
                        <button style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}>
                            Get Started
                        </button>
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ position: 'relative', zIndex: 1, padding: '120px 5vw 80px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 32 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                    <span style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 600 }}>Now with Gemini 2.0 Flash AI Agent</span>
                </div>

                <h1 style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24, background: 'linear-gradient(135deg,#fff 30%,#818cf8 70%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Code Anywhere.<br />Deploy Instantly.
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem,2vw,1.25rem)', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.7 }}>
                    A cloud IDE with sandboxed multi-language execution, AI pair programming, and one-click GitHub integration. Right in your browser.
                </p>

                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/auth" style={{ textDecoration: 'none' }}>
                        <button
                            style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 12, padding: '14px 36px', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(99,102,241,0.5)', transition: 'transform .2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            <FaRocket size={14} /> Start Coding Free
                        </button>
                    </Link>
                    <button
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 36px', color: '#e2e8f0', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                        Watch Demo
                    </button>
                </div>

                {/* Lang icons */}
                <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', opacity: 0.7 }}>
                    {langs.map(l => (
                        <div key={l.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            {l.icon}
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{l.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features grid */}
            <section style={{ position: 'relative', zIndex: 1, padding: '40px 5vw 100px' }}>
                <p style={{ textAlign: 'center', color: '#6366f1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Capabilities</p>
                <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem,3.5vw,2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 56, letterSpacing: -0.5 }}>
                    Everything you need to ship.
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
                    {features.map(f => (
                        <div key={f.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28, transition: 'border-color .3s transform .3s', cursor: 'default' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: '#818cf8' }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
                            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ position: 'relative', zIndex: 1, padding: '60px 5vw', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>Ready to build something great?</h2>
                <p style={{ color: '#64748b', marginBottom: 32 }}>Free to use. No credit card required.</p>
                <Link to="/auth" style={{ textDecoration: 'none' }}>
                    <button style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 12, padding: '14px 40px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                        Create Free Account
                    </button>
                </Link>
            </section>

            <footer style={{ position: 'relative', zIndex: 1, padding: '24px 5vw', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>
                    Built by <a href="https://github.com/Dharaneesh20" target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Dharaneesh20</a>
                </p>
            </footer>

            <style>{`
                @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
            `}</style>
        </div>
    );
}
