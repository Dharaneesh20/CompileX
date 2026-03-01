import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaCode, FaPlus, FaCog, FaRocket, FaHdd, FaCheckCircle, FaTimesCircle,
    FaServer, FaSignOutAlt, FaFolder, FaTrash, FaLock, FaKey, FaEye, FaEyeSlash,
    FaGlobe, FaMobile, FaDesktop, FaReact, FaVuejs, FaAngular, FaNodeJs,
    FaSearch, FaGitAlt, FaTimes, FaMemory, FaMicrochip, FaDocker, FaSpinner, FaExternalLinkAlt
} from 'react-icons/fa';
import { FaPython, FaJava, FaJsSquare } from 'react-icons/fa';
import { SiCplusplus, SiGo, SiRust, SiTypescript, SiDjango, SiFlask, SiNextdotjs, SiFlutter, SiIonic, SiElectron, SiDotnet, SiQt } from 'react-icons/si';
import { useAuth } from '../context/AuthContext';
import AISettings from '../components/AISettings';

const LANGUAGES = [
    { id: 'python', name: 'Python 3', icon: <FaPython size={24} color="#3776AB" /> },
    { id: 'javascript', name: 'Node.js', icon: <FaJsSquare size={24} color="#F7DF1E" /> },
    { id: 'typescript', name: 'TypeScript', icon: <SiTypescript size={24} color="#3178C6" /> },
    { id: 'java', name: 'Java', icon: <FaJava size={24} color="#007396" /> },
    { id: 'cpp', name: 'C++', icon: <SiCplusplus size={24} color="#659ad2" /> },
    { id: 'go', name: 'Go', icon: <SiGo size={24} color="#00ADD8" /> },
    { id: 'rust', name: 'Rust', icon: <SiRust size={24} color="#DEA584" /> },
];

const LANG_COLORS = { python: '#3776AB', javascript: '#F7DF1E', typescript: '#3178C6', java: '#007396', cpp: '#659ad2', go: '#00ADD8', rust: '#DEA584' };

// ── Framework definitions ──────────────────────────────────────────────────
const WEB_FRAMEWORKS = [
    { name: 'React', icon: <FaReact size={28} color="#61DAFB" />, color: '#61DAFB' },
    { name: 'Vue.js', icon: <FaVuejs size={28} color="#42B883" />, color: '#42B883' },
    { name: 'Angular', icon: <FaAngular size={28} color="#DD0031" />, color: '#DD0031' },
    { name: 'Next.js', icon: <SiNextdotjs size={28} color="#ffffff" />, color: '#ffffff' },
    { name: 'Django', icon: <SiDjango size={28} color="#0C4B33" />, color: '#0C4B33' },
    { name: 'Flask', icon: <SiFlask size={28} color="#aaaaaa" />, color: '#aaaaaa' },
    { name: 'Node.js', icon: <FaNodeJs size={28} color="#3C873A" />, color: '#3C873A' },
];

const SYSTEM_FRAMEWORKS = [
    { name: 'Electron', icon: <SiElectron size={28} color="#47848F" />, color: '#47848F' },
    { name: '.NET', icon: <SiDotnet size={28} color="#512BD4" />, color: '#512BD4' },
    { name: 'Qt', icon: <SiQt size={28} color="#41CD52" />, color: '#41CD52' },
    { name: 'C++/Win32', icon: <SiCplusplus size={28} color="#659ad2" />, color: '#659ad2' },
];

const MOBILE_FRAMEWORKS = [
    { name: 'React Native', icon: <FaReact size={28} color="#61DAFB" />, color: '#61DAFB' },
    { name: 'Flutter', icon: <SiFlutter size={28} color="#54C5F8" />, color: '#54C5F8' },
    { name: 'Ionic', icon: <SiIonic size={28} color="#3880FF" />, color: '#3880FF' },
    { name: 'Xamarin', icon: <FaMobile size={28} color="#3498DB" />, color: '#3498DB' },
];

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function Dashboard() {
    const { user, logout, api, changePassword, deleteProject } = useAuth();
    const navigate = useNavigate();
    const [showNewProject, setShowNewProject] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('profile'); // 'profile' | 'github' | 'ai' | 'security'
    const [selectedLang, setSelectedLang] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [ghToken, setGhToken] = useState('');
    const [ghLinked, setGhLinked] = useState(false);
    const [ghLoading, setGhLoading] = useState(false);
    const [ghMsg, setGhMsg] = useState(null);
    const [metrics, setMetrics] = useState({ executions: 0, storageBytes: 0 });
    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState(null); // projectId or null
    const [deleting, setDeleting] = useState(false);
    // Coming soon modal
    const [comingSoon, setComingSoon] = useState(null); // framework name
    // Change password
    const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
    const [pwShowOld, setPwShowOld] = useState(false);
    const [pwShowNew, setPwShowNew] = useState(false);
    const [pwStatus, setPwStatus] = useState(null); // null | 'submitting' | 'success' | 'error'
    const [pwMsg, setPwMsg] = useState('');

    // Workspace state
    const [workspaces, setWorkspaces] = useState([]);
    const [wsSearch, setWsSearch] = useState('');
    const [wsCreating, setWsCreating] = useState(null); // framework being created
    const [wsDeleteConfirm, setWsDeleteConfirm] = useState(null);
    const [wsDeleting, setWsDeleting] = useState(false);
    // Git clone modal
    const [showClone, setShowClone] = useState(false);
    const [cloneUrl, setCloneUrl] = useState('');
    const [cloneName, setCloneName] = useState('');
    const [cloning, setCloning] = useState(false);
    const [cloneError, setCloneError] = useState('');

    useEffect(() => {
        fetchProjects();
        fetchWorkspaces();
        checkGithub();
    }, []);

    const checkGithub = async () => {
        try { const r = await api.get('/user/github'); setGhLinked(r.data.linked); } catch { }
    };

    const fetchWorkspaces = async () => {
        try { const r = await api.get('/workspaces'); setWorkspaces(r.data.workspaces || []); } catch { }
    };

    // Create workspace and navigate immediately
    const createAndOpenFramework = async (framework) => {
        setWsCreating(framework);
        try {
            const r = await api.post('/workspace', { framework });
            await fetchWorkspaces();
            navigate(`/framework/${r.data.id}`);
        } catch (e) { console.error(e); }
        finally { setWsCreating(null); }
    };

    const handleDeleteWorkspace = async (ws) => {
        setWsDeleting(true);
        try { await api.delete(`/workspace/${ws.id}`); await fetchWorkspaces(); } catch { }
        finally { setWsDeleting(false); setWsDeleteConfirm(null); }
    };

    const handleClone = async (e) => {
        e.preventDefault(); setCloneError('');
        if (!cloneUrl.trim()) return;
        setCloning(true);
        try {
            const r = await api.post('/workspace/clone', { url: cloneUrl.trim(), name: cloneName.trim() });
            await fetchWorkspaces();
            setShowClone(false); setCloneUrl(''); setCloneName('');
            navigate(`/framework/${r.data.id}`);
        } catch (e) { setCloneError(e.response?.data?.error || e.message); }
        finally { setCloning(false); }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            const data = Array.isArray(res.data) ? res.data : [];
            setProjects(data);
            let bytes = 0;
            data.forEach(p => { bytes += (p.code?.length || 500); });
            setMetrics({ executions: data.length * 14, storageBytes: bytes });
        } catch { setProjects([]); }
        finally { setLoading(false); }
    };

    const handleCreateProject = async e => {
        e.preventDefault();
        if (!selectedLang) return;
        setCreating(true);
        try {
            const name = projectName.trim() || `${selectedLang.name} Sandbox - ${new Date().toLocaleTimeString()}`;
            const res = await api.post('/projects', { name, language: selectedLang.id });
            setProjects([res.data, ...projects]);
            setShowNewProject(false);
            setSelectedLang(null); setProjectName('');
            navigate(`/editor/${res.data.id}`);
        } catch { alert('Failed to create project'); }
        finally { setCreating(false); }
    };

    const handleDeleteProject = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        const result = await deleteProject(deleteConfirm);
        if (result.success) {
            setProjects(prev => prev.filter(p => p.id !== deleteConfirm));
        }
        setDeleteConfirm(null);
        setDeleting(false);
    };

    const linkGithub = async () => {
        if (!ghToken) return;
        setGhLoading(true); setGhMsg(null);
        try {
            await api.post('/user/github', { token: ghToken });
            setGhLinked(true); setGhToken('');
            setGhMsg({ type: 'success', text: 'GitHub connected!' });
        } catch (err) { setGhMsg({ type: 'error', text: err.response?.data?.error || 'Failed to link GitHub' }); }
        finally { setGhLoading(false); }
    };

    const unlinkGithub = async () => {
        setGhLoading(true);
        try { await api.delete('/user/github'); setGhLinked(false); }
        catch { } finally { setGhLoading(false); }
    };

    const handleChangePassword = async e => {
        e.preventDefault();
        if (pwForm.new !== pwForm.confirm) { setPwStatus('error'); setPwMsg('New passwords do not match.'); return; }
        if (pwForm.new.length < 6) { setPwStatus('error'); setPwMsg('New password must be at least 6 characters.'); return; }
        setPwStatus('submitting'); setPwMsg('');
        const result = await changePassword(pwForm.old, pwForm.new);
        if (result.success) {
            setPwStatus('success'); setPwMsg('Password changed successfully!');
            setPwForm({ old: '', new: '', confirm: '' });
        } else {
            setPwStatus('error'); setPwMsg(result.error || 'Failed to change password.');
        }
    };

    const storagePercent = Math.min((metrics.storageBytes / 5242880) * 100, 100);
    const isOAuthUser = user?.photoURL != null || (user?.provider && user?.provider !== 'email');

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#06060f 0%,#0a0a1a 50%,#06060f 100%)', color: '#e2e8f0' }}>
            {/* Fixed glow */}
            <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.09) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Nav */}
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 5vw', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,6,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCode size={13} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: -0.5 }}>
                        Compile<span style={{ color: '#818cf8' }}>X</span> Labs
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', border: '1.5px solid rgba(99,102,241,0.4)' }} />
                        ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                                {(user?.name || user?.email || 'D')[0].toUpperCase()}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{user?.name || user?.email?.split('@')[0]}</span>
                            {user?.photoURL && <span style={{ color: '#475569', fontSize: 10 }}>Google Account</span>}
                        </div>
                    </div>

                    <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#64748b', cursor: 'pointer' }}>
                        <FaCog size={14} />
                    </button>
                    <button onClick={logout} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 10px', color: '#64748b', cursor: 'pointer' }}>
                        <FaSignOutAlt size={14} />
                    </button>
                </div>
            </nav>

            <main style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 5vw 80px' }}>
                {/* KPI Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 40 }}>
                    {[
                        { label: 'Total Projects', value: projects.length, icon: <FaFolder size={18} />, color: '#6366f1' },
                        { label: 'Code Executions', value: `${metrics.executions}`, badge: '↑12%', icon: <FaServer size={18} />, color: '#10b981' },
                        { label: 'Storage Used', value: formatBytes(metrics.storageBytes), sub: '5 MB quota', icon: <FaHdd size={18} />, color: '#f59e0b', progress: storagePercent },
                    ].map(k => (
                        <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}18`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                                {k.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                    <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{k.value}</span>
                                    {k.badge && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>{k.badge}</span>}
                                </div>
                                {k.progress !== undefined && (
                                    <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9 }}>
                                        <div style={{ height: '100%', width: `${k.progress}%`, background: `linear-gradient(90deg,${k.color},${k.color}99)`, borderRadius: 9 }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── MY FRAMEWORK WORKSPACES ─────────────────────────── */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FaCode size={16} color="#6366f1" /> My Workspaces
                        </h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Search */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', width: 200 }}>
                                <FaSearch size={11} color="#475569" />
                                <input value={wsSearch} onChange={e => setWsSearch(e.target.value)} placeholder="Search workspaces…"
                                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, width: '100%' }} />
                            </div>
                            {/* Git Clone */}
                            <button onClick={() => setShowClone(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                <FaGitAlt size={12} color="#f59e0b" /> Clone Repo
                            </button>
                        </div>
                    </div>

                    {workspaces.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
                            No workspaces yet — click <strong style={{ color: '#6366f1' }}>React</strong> or <strong style={{ color: '#f59e0b' }}>Flask</strong> below to create one, or clone a repo above.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                            {workspaces
                                .filter(w => !wsSearch || w.name.toLowerCase().includes(wsSearch.toLowerCase()))
                                .map(ws => {
                                    const isReact = ws.framework === 'react';
                                    const wsAccent = isReact ? '#61DAFB' : '#f59e0b';
                                    const wsGrad = isReact ? 'linear-gradient(135deg,#1d4ed8,#61DAFB)' : 'linear-gradient(135deg,#f59e0b,#fbbf24)';
                                    return (
                                        <div key={ws.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
                                            {/* Accent bar */}
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: wsGrad }} />
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 9, background: wsGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <FaCode size={13} color="#fff" />
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff' }}>{ws.name}</p>
                                                        <p style={{ margin: 0, fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>ws/{ws.id}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setWsDeleteConfirm(ws)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#334155', padding: 4 }}>
                                                    <FaTrash size={11} />
                                                </button>
                                            </div>
                                            {/* Meta badges */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                                                <span style={{ ...wsBadge, color: wsAccent, borderColor: `${wsAccent}30`, background: `${wsAccent}10` }}>
                                                    {isReact ? 'React' : 'Flask'} {ws.framework_version && `${ws.framework_version}`}
                                                </span>
                                                <span style={{ ...wsBadge, color: '#60a5fa' }}><FaDocker size={9} /> {ws.docker_os || 'alpine'}</span>
                                                <span style={{ ...wsBadge, color: '#a78bfa' }}><FaMemory size={9} /> {ws.memory_mb || 512} MB</span>
                                                <span style={{ ...wsBadge, color: '#34d399' }}><FaMicrochip size={9} /> {ws.cpu_cores || 1} Core{ws.cpu_cores > 1 ? 's' : ''}</span>
                                                {ws.git_url && <span style={{ ...wsBadge, color: '#f59e0b' }}><FaGitAlt size={9} /> Cloned</span>}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, color: '#334155' }}>
                                                    {new Date(ws.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <button onClick={() => navigate(`/framework/${ws.id}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: wsGrad, border: 'none', borderRadius: 7, padding: '5px 12px', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                                    <FaExternalLinkAlt size={9} /> Open IDE
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* ── FRAMEWORKS SECTION ── */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FaRocket size={16} color="#818cf8" /> Frameworks
                        </h2>
                        <span style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '3px 12px', fontSize: 11, color: '#818cf8', fontWeight: 700 }}>Preview</span>
                    </div>

                    {/* Web Frameworks */}
                    <FrameworkRow
                        label="Web Frameworks"
                        icon={<FaGlobe size={13} color="#6366f1" />}
                        frameworks={WEB_FRAMEWORKS}
                        onSelect={name => {
                            if (name === 'React') createAndOpenFramework('react');
                            else if (name === 'Flask') createAndOpenFramework('flask');
                            else setComingSoon(name);
                        }}
                        creating={wsCreating}
                    />

                    {/* System Frameworks */}
                    <FrameworkRow
                        label="System Application Frameworks"
                        icon={<FaDesktop size={13} color="#10b981" />}
                        frameworks={SYSTEM_FRAMEWORKS}
                        onSelect={setComingSoon}
                    />

                    {/* Mobile Frameworks */}
                    <FrameworkRow
                        label="Mobile Application Frameworks"
                        icon={<FaMobile size={13} color="#f59e0b" />}
                        frameworks={MOBILE_FRAMEWORKS}
                        onSelect={setComingSoon}
                    />
                </div>

                {/* Projects header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Recent Workspaces</h2>
                    <button onClick={() => setShowNewProject(true)} style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                        <FaPlus size={11} /> New Project
                    </button>
                </div>

                {/* Projects grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                        <p>Loading workspaces…</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 80, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20 }}>
                        <FaCode size={36} style={{ color: '#1e293b', marginBottom: 16 }} />
                        <h3 style={{ color: '#fff', marginBottom: 8 }}>No projects yet</h3>
                        <p style={{ color: '#475569', marginBottom: 24 }}>Create your first sandbox to get started.</p>
                        <button onClick={() => setShowNewProject(true)} style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, padding: '12px 32px', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                            Initialize Sandbox
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
                        {projects.map((p, i) => {
                            const lang = LANGUAGES.find(l => l.id === p.language) || LANGUAGES[0];
                            const accent = LANG_COLORS[p.language] || '#6366f1';
                            return (
                                <div key={p.id || i}
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', position: 'relative' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}44`; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${accent}15`; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    {/* Top strip */}
                                    <div style={{ height: 3, background: `linear-gradient(90deg,${accent}88,${accent}22)` }} />
                                    <div style={{ padding: 18 }} onClick={() => navigate(`/editor/${p.id}`)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {lang.icon}
                                            </div>
                                            <span style={{ fontSize: 10, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: `${accent}15`, border: `1px solid ${accent}25`, borderRadius: 6, padding: '2px 8px' }}>{lang.name}</span>
                                        </div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
                                        <p style={{ margin: 0, fontSize: 11, color: '#334155' }}>
                                            Edited {new Date(p.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {/* Delete button */}
                                    <button
                                        onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                                        title="Delete project"
                                        style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171', transition: 'all .2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}>
                                        <FaTrash size={11} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ─── New Project Modal ─── */}
            {showNewProject && (
                <ModalWrapper onClose={() => { setShowNewProject(false); setSelectedLang(null); setProjectName(''); }} title="New Sandbox">
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Project Name (optional)</label>
                        <input type="text" placeholder="My Awesome Project" value={projectName} onChange={e => setProjectName(e.target.value)}
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <label style={{ ...labelStyle, marginBottom: 12 }}>Select Runtime</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
                        {LANGUAGES.map(l => {
                            const active = selectedLang?.id === l.id;
                            const accent = LANG_COLORS[l.id] || '#6366f1';
                            return (
                                <div key={l.id} onClick={() => setSelectedLang(l)}
                                    style={{ padding: '14px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', border: `1px solid ${active ? accent + '66' : 'rgba(255,255,255,0.08)'}`, background: active ? `${accent}15` : 'rgba(255,255,255,0.03)', transition: 'all .2s', boxShadow: active ? `0 4px 20px ${accent}20` : 'none' }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                                    {l.icon}
                                    <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: active ? '#fff' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{l.name}</div>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={handleCreateProject} disabled={!selectedLang || creating}
                        style={{ width: '100%', padding: '12px 0', background: selectedLang && !creating ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.2)', border: 'none', borderRadius: 10, color: selectedLang && !creating ? '#fff' : '#334155', fontWeight: 700, fontSize: 14, cursor: selectedLang ? 'pointer' : 'not-allowed', boxShadow: selectedLang && !creating ? '0 4px 20px rgba(99,102,241,0.4)' : 'none' }}>
                        {creating ? 'Creating…' : '⚡ Initialize Sandbox'}
                    </button>
                </ModalWrapper>
            )}

            {/* ─── Delete Confirmation Modal ─── */}
            {deleteConfirm && (
                <ModalWrapper onClose={() => setDeleteConfirm(null)} title="Delete Project">
                    <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <FaTrash size={22} color="#f87171" />
                        </div>
                        <h3 style={{ color: '#fff', margin: '0 0 10px', fontWeight: 700 }}>Are you sure?</h3>
                        <p style={{ color: '#475569', fontSize: 14, margin: '0 0 28px' }}>
                            This project will be <span style={{ color: '#f87171', fontWeight: 700 }}>permanently deleted</span> and cannot be recovered.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1, padding: '12px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteProject} disabled={deleting}
                                style={{ flex: 1, padding: '12px 0', background: deleting ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#ef4444,#f87171)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                {deleting ? 'Deleting…' : '🗑 Delete'}
                            </button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {/* ─── Coming Soon Modal ─── */}
            {comingSoon && (
                <ModalWrapper onClose={() => setComingSoon(null)} title="">
                    <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
                        <h2 style={{ color: '#fff', margin: '0 0 10px', fontWeight: 800, fontSize: 22 }}>Coming Soon!</h2>
                        <p style={{ color: '#475569', margin: '0 0 8px', fontSize: 14 }}>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{comingSoon}</span> support is currently under development.
                        </p>
                        <p style={{ color: '#334155', fontSize: 12, margin: '0 0 28px' }}>
                            We're working hard to bring framework scaffolding, templates, and intelligent project generation to CompileX Labs. Stay tuned! ✨
                        </p>
                        <button onClick={() => setComingSoon(null)}
                            style={{ padding: '12px 32px', background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                            Got it!
                        </button>
                    </div>
                </ModalWrapper>
            )}

            {/* ─── Git Clone Modal ─── */}
            {showClone && (
                <ModalWrapper onClose={() => { setShowClone(false); setCloneUrl(''); setCloneError(''); }} title="🔗 Clone a Repository">
                    <form onSubmit={handleClone} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={labelStyle}>Repository URL *</label>
                            <input type="url" value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} required
                                placeholder="https://github.com/user/repo.git" style={inputStyle} autoFocus />
                        </div>
                        <div>
                            <label style={labelStyle}>Project Name (optional)</label>
                            <input value={cloneName} onChange={e => setCloneName(e.target.value)}
                                placeholder="Auto-detected from repo name" style={inputStyle} />
                        </div>
                        {cloneError && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>⚠️ {cloneError}</p>}
                        <button type="submit" disabled={cloning || !cloneUrl.trim()}
                            style={{ padding: '12px 24px', background: cloning ? 'rgba(246,173,85,0.2)' : 'linear-gradient(135deg,#f59e0b,#fbbf24)', border: 'none', borderRadius: 10, color: cloning ? '#f59e0b' : '#0d0d1a', fontWeight: 700, cursor: cloning ? 'default' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {cloning ? <><FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={14} /> Cloning…</> : <><FaGitAlt size={14} /> Clone & Open IDE</>}
                        </button>
                    </form>
                </ModalWrapper>
            )}

            {/* ─── Delete Workspace Confirmation ─── */}
            {wsDeleteConfirm && (
                <ModalWrapper onClose={() => setWsDeleteConfirm(null)} title="Delete Workspace?">
                    <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                        This will permanently delete <strong style={{ color: '#fff' }}>{wsDeleteConfirm.name}</strong> and all its files from disk. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleDeleteWorkspace(wsDeleteConfirm)} disabled={wsDeleting}
                            style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#dc2626,#ef4444)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {wsDeleting ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} size={14} /> : <FaTrash size={14} />}
                            {wsDeleting ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                        <button onClick={() => setWsDeleteConfirm(null)}
                            style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                            Cancel
                        </button>
                    </div>
                </ModalWrapper>
            )}



            {/* ─── Settings Modal ─── */}
            {showSettings && (
                <ModalWrapper onClose={() => setShowSettings(false)} title="Account Settings">
                    {/* Settings tab bar */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, marginBottom: 24, flexWrap: 'wrap', gap: 3 }}>
                        {[
                            { id: 'profile', label: 'Profile' },
                            { id: 'ai', label: '🤖 AI Model' },
                            { id: 'github', label: 'GitHub' },
                            { id: 'security', label: '🔒 Security' },
                        ].map(t => (
                            <button key={t.id} onClick={() => { setSettingsTab(t.id); setPwStatus(null); setPwMsg(''); }} style={{ flex: 1, minWidth: 'fit-content', padding: '7px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all .2s', background: settingsTab === t.id ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'transparent', color: settingsTab === t.id ? '#fff' : '#475569', boxShadow: settingsTab === t.id ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {settingsTab === 'profile' && (
                        <>
                            <Section label="Profile">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 0 20px rgba(99,102,241,0.25)' }} />
                                    ) : (
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                                            {(user?.name || user?.email || 'D')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{user?.name || 'Developer'}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>{user?.email}</p>
                                        {user?.photoURL && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', borderRadius: 99, padding: '2px 8px', fontSize: 11, color: '#4285f4', fontWeight: 600 }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                                Google Account
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {[['Account ID', user?.id]].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                        <span style={{ color: '#475569', fontSize: 13 }}>{k}</span>
                                        <span style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace' }}>{v}</span>
                                    </div>
                                ))}
                            </Section>
                            <Section label="Storage Quota">
                                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#fff', fontWeight: 700 }}>{formatBytes(metrics.storageBytes)}</span>
                                    <span style={{ color: '#475569', fontSize: 12 }}>5 MB total</span>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9 }}>
                                    <div style={{ height: '100%', width: `${storagePercent}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 9 }} />
                                </div>
                            </Section>
                        </>
                    )}

                    {settingsTab === 'ai' && (
                        <Section label="AI Provider & Model">
                            <AISettings />
                        </Section>
                    )}

                    {settingsTab === 'github' && (
                        <Section label="GitHub Integration">
                            {ghLinked ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                                        <FaCheckCircle /> GitHub Connected
                                    </div>
                                    <button onClick={unlinkGithub} disabled={ghLoading} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 20px', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                                        {ghLoading ? 'Unlinking…' : 'Unlink Account'}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ color: '#475569', fontSize: 12, marginBottom: 10 }}>Paste a Personal Access Token with <code style={{ color: '#818cf8' }}>repo</code> scope.</p>
                                    {ghMsg && (
                                        <div style={{ background: ghMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${ghMsg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '8px 12px', color: ghMsg.type === 'success' ? '#4ade80' : '#f87171', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {ghMsg.type === 'success' ? <FaCheckCircle size={11} /> : <FaTimesCircle size={11} />} {ghMsg.text}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="password" placeholder="ghp_xxxxxxxxxxxx" value={ghToken} onChange={e => setGhToken(e.target.value)}
                                            style={{ ...inputStyle, flex: 1 }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        <button onClick={linkGithub} disabled={!ghToken || ghLoading}
                                            style={{ background: ghToken && !ghLoading ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(99,102,241,0.15)', border: 'none', borderRadius: 8, padding: '0 16px', color: ghToken && !ghLoading ? '#fff' : '#334155', fontWeight: 700, cursor: ghToken ? 'pointer' : 'not-allowed', fontSize: 13 }}>
                                            {ghLoading ? '…' : 'Connect'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Section>
                    )}

                    {settingsTab === 'security' && (
                        <Section label="Change Password">
                            {isOAuthUser ? (
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <FaKey size={18} color="#818cf8" />
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                                        Password management is not available for Google/GitHub accounts.
                                        Your account is secured by your OAuth provider.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {pwStatus === 'success' && (
                                        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '10px 14px', color: '#4ade80', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <FaCheckCircle size={13} /> {pwMsg}
                                        </div>
                                    )}
                                    {pwStatus === 'error' && (
                                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                                            {pwMsg}
                                        </div>
                                    )}
                                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {/* Current password */}
                                        <div>
                                            <label style={labelStyle}>Current Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type={pwShowOld ? 'text' : 'password'} placeholder="Enter current password" value={pwForm.old}
                                                    onChange={e => setPwForm({ ...pwForm, old: e.target.value })} required
                                                    style={{ ...inputStyle, paddingRight: 42 }}
                                                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                                <button type="button" onClick={() => setPwShowOld(!pwShowOld)}
                                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                                                    {pwShowOld ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                        {/* New password */}
                                        <div>
                                            <label style={labelStyle}>New Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type={pwShowNew ? 'text' : 'password'} placeholder="Min. 6 characters" value={pwForm.new}
                                                    onChange={e => setPwForm({ ...pwForm, new: e.target.value })} required
                                                    style={{ ...inputStyle, paddingRight: 42 }}
                                                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                                <button type="button" onClick={() => setPwShowNew(!pwShowNew)}
                                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                                                    {pwShowNew ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                                </button>
                                            </div>
                                        </div>
                                        {/* Confirm password */}
                                        <div>
                                            <label style={labelStyle}>Confirm New Password</label>
                                            <input type="password" placeholder="Repeat new password" value={pwForm.confirm}
                                                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required
                                                style={inputStyle}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        </div>
                                        <button type="submit" disabled={pwStatus === 'submitting'}
                                            style={{ padding: '12px 0', background: pwStatus === 'submitting' ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: pwStatus === 'submitting' ? 'not-allowed' : 'pointer', fontSize: 14, boxShadow: '0 4px 20px rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <FaLock size={12} /> {pwStatus === 'submitting' ? 'Updating…' : 'Update Password'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </Section>
                    )}

                    <button onClick={() => setShowSettings(false)} style={{ width: '100%', marginTop: 8, padding: '11px 0', background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                        Done
                    </button>
                </ModalWrapper>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Framework Row Component ───────────────────────────────────────────────
function FrameworkRow({ label, icon, frameworks, onSelect }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {icon}
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.3) transparent' }}>
                {frameworks.map(fw => (
                    <div
                        key={fw.name}
                        onClick={() => onSelect(fw.name)}
                        title={fw.name}
                        style={{ flexShrink: 0, width: 90, padding: '14px 10px', borderRadius: 14, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all .25s', position: 'relative', overflow: 'hidden' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${fw.color}55`; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 30px ${fw.color}20`; e.currentTarget.style.background = `${fw.color}0A`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{fw.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 0.5 }}>{fw.name}</div>
                        {/* Badge: 'Open' for live frameworks, 'SOON' for others */}
                        {(fw.name === 'React' || fw.name === 'Flask')
                            ? <div style={{ marginTop: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 99, padding: '1px 6px', fontSize: 8, color: '#4ade80', fontWeight: 700, letterSpacing: 0.5 }}>OPEN</div>
                            : <div style={{ marginTop: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99, padding: '1px 6px', fontSize: 8, color: '#818cf8', fontWeight: 700, letterSpacing: 0.5 }}>SOON</div>
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}

function ModalWrapper({ children, title, onClose }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(6px)', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(15,15,25,0.98),rgba(10,10,20,0.98))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: title ? 24 : 0 }}>
                    {title && <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>{title}</h2>}
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#64748b', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', color: '#6366f1', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
                {children}
            </div>
        </div>
    );
}

const labelStyle = { display: 'block', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box', fontFamily: 'inherit' };
const wsBadge = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '2px 7px' };
