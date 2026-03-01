import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
    FaCode, FaArrowLeft, FaPlus, FaTimes, FaFolder, FaFolderOpen,
    FaTerminal, FaRobot, FaSave, FaSync, FaCheckCircle,
    FaFile, FaJs, FaPython, FaHtml5, FaCss3Alt, FaMarkdown,
    FaChevronRight, FaChevronDown, FaSpinner, FaStop,
    FaGitAlt, FaBrain, FaListUl, FaCog, FaServer,
    FaMemory, FaMicrochip, FaDocker, FaPlay, FaKey
} from 'react-icons/fa';
import { SiJson, SiTypescript, SiFlask, SiReact } from 'react-icons/si';
import { useAuth } from '../context/AuthContext';

// ─── Provider catalogue (mirrors backend PROVIDER_CATALOGUE) ─────────────────
const PROVIDERS = {
    ollama: { label: 'Ollama (Local)', requiresKey: false, models: ['llama3.2', 'llama3.1', 'codellama', 'mistral', 'gemma2', 'deepseek-r1', 'phi4', 'qwen2.5-coder'] },
    gemini: { label: 'Google Gemini', requiresKey: true, models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash-preview-04-17', 'gemini-2.5-pro-preview-03-25'] },
    openai: { label: 'OpenAI', requiresKey: true, models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o3-mini'] },
    anthropic: { label: 'Anthropic Claude', requiresKey: true, models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-opus-4-5'] },
    deepseek: { label: 'DeepSeek', requiresKey: true, models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
};

// ─── File icon helper ────────────────────────────────────────────────────────
function FileIcon({ name, size = 13 }) {
    const ext = name.split('.').pop()?.toLowerCase();
    const m = {
        js: <FaJs size={size} color="#F7DF1E" />, jsx: <FaJs size={size} color="#61DAFB" />,
        ts: <SiTypescript size={size} color="#3178C6" />, tsx: <SiTypescript size={size} color="#3178C6" />,
        py: <FaPython size={size} color="#3776AB" />, html: <FaHtml5 size={size} color="#E34F26" />,
        css: <FaCss3Alt size={size} color="#1572B6" />, json: <SiJson size={size} color="#4ade80" />,
        md: <FaMarkdown size={size} color="#64748b" />
    };
    return m[ext] || <FaFile size={size} color="#64748b" />;
}

function getLang(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', css: 'css', html: 'html', json: 'json', md: 'markdown'
    }[ext] || 'plaintext';
}

// ─── Recursive FileTree ───────────────────────────────────────────────────────
function FileTree({ nodes, expanded, onToggle, onOpen, activeFile, depth = 0 }) {
    return (
        <div>
            {nodes.map(node => (
                <div key={node.path}>
                    <div onClick={() => node.type === 'directory' ? onToggle(node.path) : onOpen(node)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: `3px 8px 3px ${12 + depth * 14}px`,
                            cursor: 'pointer', fontSize: 12, userSelect: 'none',
                            color: activeFile === node.path ? '#c7d2fe' : '#94a3b8',
                            background: activeFile === node.path ? 'rgba(99,102,241,0.15)' : 'transparent',
                            borderLeft: activeFile === node.path ? '2px solid #6366f1' : '2px solid transparent',
                            transition: 'all .12s'
                        }}
                        onMouseEnter={e => { if (activeFile !== node.path) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (activeFile !== node.path) e.currentTarget.style.background = 'transparent'; }}>
                        {node.type === 'directory' ? (
                            <>
                                <span style={{ color: '#475569', width: 10 }}>{expanded.has(node.path) ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}</span>
                                {expanded.has(node.path) ? <FaFolderOpen size={13} color="#f59e0b" /> : <FaFolder size={13} color="#f59e0b" />}
                            </>
                        ) : (<><span style={{ width: 10 }} /><FileIcon name={node.name} /></>)}
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
                    </div>
                    {node.type === 'directory' && expanded.has(node.path) && (
                        <FileTree nodes={node.children || []} expanded={expanded} onToggle={onToggle} onOpen={onOpen} activeFile={activeFile} depth={depth + 1} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Action card ─────────────────────────────────────────────────────────────
function ActionCard({ action }) {
    const [open, setOpen] = useState(false);
    const ok = action.status === 'ok' || action.status === 'success';
    const label = { writeFile: '📝 Write', runCommand: '▶ Run', readFile: '📖 Read' }[action.type] || action.type;
    const detail = action.path || action.command;
    const body = action.output || action.content;
    return (
        <div style={{ width: '92%', background: 'rgba(0,0,0,0.3)', border: `1px solid ${ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 8, overflow: 'hidden', fontSize: 11 }}>
            <div onClick={() => body && setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', cursor: body ? 'pointer' : 'default', background: ok ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)' }}>
                <span style={{ fontWeight: 700, color: ok ? '#4ade80' : '#f87171', fontSize: 9, letterSpacing: .8, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</span>
                {body && <FaChevronDown size={8} color="#475569" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }} />}
            </div>
            {open && body && (
                <pre style={{ margin: 0, padding: '8px 10px', color: '#94a3b8', fontSize: 10, maxHeight: 130, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{body}</pre>
            )}
        </div>
    );
}

// ─── Main IDE ─────────────────────────────────────────────────────────────────
export default function FrameworkIDE() {
    const { wsId } = useParams();   // workspace ID from URL
    const navigate = useNavigate();
    const { api } = useAuth();
    const editorRef = useRef(null);
    const termScrollRef = useRef(null);
    const agentScrollRef = useRef(null);
    const abortRef = useRef(null);   // AbortController for agent fetch

    // Workspace meta
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Config panel
    const [showConfig, setShowConfig] = useState(false);
    const [cfgName, setCfgName] = useState('');
    const [cfgOS, setCfgOS] = useState('alpine');
    const [cfgMem, setCfgMem] = useState(512);
    const [cfgCPU, setCfgCPU] = useState(1);
    const [cfgSaving, setCfgSaving] = useState(false);

    // File explorer
    const [fileTree, setFileTree] = useState([]);
    const [expanded, setExpanded] = useState(new Set(['src', 'templates', 'static']));

    // Editor tabs
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    // Terminals
    const [terminals, setTerminals] = useState([{ id: 1, name: 'Terminal 1', history: [], input: '', running: false }]);
    const [activeTerm, setActiveTerm] = useState(0);

    // Agent
    const [agentMessages, setAgentMessages] = useState([]);
    const [agentInput, setAgentInput] = useState('');
    const [agentRunning, setAgentRunning] = useState(false);
    const [agentMode, setAgentMode] = useState('code');   // think | plan | code
    const [agentProvider, setAgentProvider] = useState('ollama');
    const [agentModel, setAgentModel] = useState('llama3.2');
    const [showKeyPrompt, setShowKeyPrompt] = useState(false);
    const [inlineKey, setInlineKey] = useState('');

    // ── Load workspace from MongoDB ──────────────────────────────────────────
    useEffect(() => {
        if (!wsId) return;
        api.get(`/workspace/${wsId}`).then(res => {
            const ws = res.data;
            setWorkspace(ws);
            setCfgName(ws.name); setCfgOS(ws.docker_os || 'alpine');
            setCfgMem(ws.memory_mb || 512); setCfgCPU(ws.cpu_cores || 1);
            refreshTree(ws.id);
            // Open default entry file
            const main = ws.framework === 'react' ? 'src/App.jsx' : 'app.py';
            openFile(ws.id, { path: main, name: main.split('/').pop(), type: 'file' });
        }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, [wsId]);

    const refreshTree = async (id) => {
        try { const r = await api.get(`/workspace/${id}/files`); setFileTree(r.data.tree || []); } catch { }
    };

    // ── File ops ─────────────────────────────────────────────────────────────
    const openFile = async (wsIdParam, node) => {
        const existingTab = tabs.find(t => t.path === node.path);
        if (existingTab) { setActiveTab(node.path); return; }
        try {
            const r = await api.get(`/workspace/${wsIdParam}/file?path=${encodeURIComponent(node.path)}`);
            setTabs(prev => [...prev, { path: node.path, name: node.name, content: r.data.content, language: getLang(node.name), dirty: false }]);
            setActiveTab(node.path);
        } catch { }
    };

    const handleFileOpen = node => { if (workspace) openFile(workspace.id, node); };

    const updateTabContent = (path, content) => setTabs(prev => prev.map(t => t.path === path ? { ...t, content, dirty: true } : t));

    const saveCurrentFile = async () => {
        const tab = tabs.find(t => t.path === activeTab);
        if (!tab || !workspace) return;
        setSaving(true);
        try {
            await api.put(`/workspace/${workspace.id}/file`, { path: tab.path, content: tab.content });
            setTabs(prev => prev.map(t => t.path === tab.path ? { ...t, dirty: false } : t));
            setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500);
        } catch { } finally { setSaving(false); }
    };

    const closeTab = (path, e) => {
        e.stopPropagation();
        setTabs(prev => { const next = prev.filter(t => t.path !== path); if (activeTab === path) setActiveTab(next.length ? next[next.length - 1].path : null); return next; });
    };

    useEffect(() => {
        const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrentFile(); } };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [activeTab, tabs, workspace]);

    // ── Config save ──────────────────────────────────────────────────────────
    const saveConfig = async () => {
        if (!workspace) return;
        setCfgSaving(true);
        try {
            const r = await api.patch(`/workspace/${workspace.id}`, { name: cfgName, docker_os: cfgOS, memory_mb: cfgMem, cpu_cores: cfgCPU });
            setWorkspace(r.data);
        } catch { } finally { setCfgSaving(false); setShowConfig(false); }
    };

    // ── Terminal ─────────────────────────────────────────────────────────────
    const runTermCommand = async (idx) => {
        const term = terminals[idx];
        if (!term || !term.input.trim() || term.running || !workspace) return;
        const cmd = term.input.trim();
        setTerminals(prev => prev.map((t, i) => i === idx ? { ...t, input: '', running: true, history: [...t.history, { cmd, out: '', status: 'running' }] } : t));
        try {
            const r = await api.post(`/workspace/${workspace.id}/exec`, { command: cmd });
            const combined = (r.data.stdout + r.data.stderr).trimEnd();
            setTerminals(prev => prev.map((t, i) => { if (i !== idx) return t; const h = [...t.history]; h[h.length - 1] = { cmd, out: combined || '(no output)', status: r.data.status }; return { ...t, running: false, history: h }; }));
        } catch (e) {
            setTerminals(prev => prev.map((t, i) => { if (i !== idx) return t; const h = [...t.history]; h[h.length - 1] = { cmd, out: e.message, status: 'error' }; return { ...t, running: false, history: h }; }));
        }
        setTimeout(() => termScrollRef.current?.scrollTo(0, 999999), 100);
    };

    const addTerminal = () => { const id = terminals.length + 1; setTerminals(prev => [...prev, { id, name: `Terminal ${id}`, history: [], input: '', running: false }]); setActiveTerm(terminals.length); };
    const removeTerminal = (idx, e) => { e.stopPropagation(); setTerminals(prev => prev.filter((_, i) => i !== idx)); setActiveTerm(Math.max(0, idx - 1)); };
    const updateTermInput = (idx, val) => setTerminals(prev => prev.map((t, i) => i === idx ? { ...t, input: val } : t));

    // ── Agent ─────────────────────────────────────────────────────────────────
    const sendAgentMessage = async () => {
        if (!agentInput.trim() || agentRunning || !workspace) return;
        const needsKey = PROVIDERS[agentProvider]?.requiresKey;
        if (needsKey && !inlineKey && showKeyPrompt) return;  // waiting for key

        const msg = agentInput.trim();
        setAgentMessages(prev => [...prev, { role: 'user', content: msg }]);
        setAgentInput('');
        setAgentRunning(true);

        abortRef.current = new AbortController();

        try {
            const body = { message: msg, history: agentMessages, mode: agentMode, provider: agentProvider, model: agentModel };
            if (inlineKey) body.api_key = inlineKey;

            const r = await api.post(`/workspace/${workspace.id}/agent`, body, { signal: abortRef.current.signal });
            const { reply, executed } = r.data;
            setAgentMessages(prev => [...prev, { role: 'assistant', content: reply || '(done)', executed: executed || [] }]);
            setShowKeyPrompt(false);
            await refreshTree(workspace.id);
            // Reload open tabs that were written by agent
            for (const ex of (executed || [])) {
                if (ex.type === 'writeFile' && tabs.find(t => t.path === ex.path)) {
                    try {
                        const fr = await api.get(`/workspace/${workspace.id}/file?path=${encodeURIComponent(ex.path)}`);
                        setTabs(prev => prev.map(t => t.path === ex.path ? { ...t, content: fr.data.content, dirty: false } : t));
                    } catch { }
                }
            }
        } catch (e) {
            if (e.name === 'CanceledError' || e.name === 'AbortError') {
                setAgentMessages(prev => [...prev, { role: 'assistant', content: '⏹ Stopped.' }]);
            } else if (e.response?.data?.reply?.includes('No API key')) {
                setShowKeyPrompt(true);
                setAgentMessages(prev => [...prev, { role: 'assistant', content: `🔑 This provider (${agentProvider}) requires an API key. Enter it below.` }]);
            } else {
                setAgentMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message}` }]);
            }
        } finally { setAgentRunning(false); setTimeout(() => agentScrollRef.current?.scrollTo(0, 999999), 100); }
    };

    const stopAgent = () => { abortRef.current?.abort(); };

    // Colors
    const fw = workspace?.framework || 'react';
    const accent = fw === 'react' ? '#61DAFB' : '#f59e0b';
    const accentGrad = fw === 'react' ? 'linear-gradient(135deg,#1d4ed8,#61DAFB)' : 'linear-gradient(135deg,#f59e0b,#fbbf24)';
    const currentTab = tabs.find(t => t.path === activeTab);

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <FaSpinner size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>Loading workspace…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (error) return (
        <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ color: '#f87171' }}>⚠️ {error}</p>
            <button onClick={() => navigate('/dashboard')} style={btn}>← Dashboard</button>
        </div>
    );

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0d0d1a', overflow: 'hidden', color: '#e2e8f0' }}>

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => navigate('/dashboard')} style={{ ...btn, padding: '5px 8px', color: '#64748b' }}><FaArrowLeft size={12} /></button>
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaCode size={11} color="#fff" /></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Compile<span style={{ color: '#818cf8' }}>X</span> — <span style={{ color: accent }}>{workspace?.name}</span></span>
                    {/* Version + Resource badges */}
                    {workspace?.framework_version && <span style={badge}>{fw === 'react' ? 'React' : 'Flask'} {workspace.framework_version}</span>}
                    <span style={{ ...badge, color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.07)' }}>
                        <FaDocker size={9} /> {workspace?.docker_os || 'alpine'}
                    </span>
                    <span style={{ ...badge, color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.07)' }}>
                        <FaMemory size={9} /> {workspace?.memory_mb || 512} MB
                    </span>
                    <span style={{ ...badge, color: '#34d399', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.07)' }}>
                        <FaMicrochip size={9} /> {workspace?.cpu_cores || 1} Core{workspace?.cpu_cores > 1 ? 's' : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setShowConfig(!showConfig)} style={{ ...btn, gap: 5, fontSize: 11, color: showConfig ? '#818cf8' : '#64748b' }}><FaCog size={11} /> Config</button>
                    <button onClick={saveCurrentFile} disabled={!activeTab || saving} style={{ ...btn, gap: 5, fontSize: 11, color: savedFlash ? '#4ade80' : '#94a3b8' }}>
                        {savedFlash ? <FaCheckCircle size={11} /> : <FaSave size={11} />} {saving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save'}
                    </button>
                    <button onClick={() => workspace && refreshTree(workspace.id)} style={{ ...btn, padding: '5px 8px', color: '#64748b' }}><FaSync size={11} /></button>
                </div>
            </div>

            {/* ── Config dropdown ──────────────────────────────────────────── */}
            {showConfig && (
                <div style={{ position: 'absolute', top: 46, right: 12, zIndex: 100, background: '#1e2130', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: 20, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><FaCog size={13} color="#818cf8" /> Workspace Settings</p>
                    <label style={lbl}>Project Name</label>
                    <input value={cfgName} onChange={e => setCfgName(e.target.value)} style={inp} />
                    <label style={lbl}>Docker OS</label>
                    <select value={cfgOS} onChange={e => setCfgOS(e.target.value)} style={inp}>
                        {['alpine', 'ubuntu', 'debian'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <label style={lbl}>Memory — {cfgMem} MB</label>
                    <input type="range" min={256} max={8192} step={256} value={cfgMem} onChange={e => setCfgMem(Number(e.target.value))} style={{ width: '100%', accentColor: '#6366f1', marginBottom: 12 }} />
                    <label style={lbl}>CPU Cores — {cfgCPU}</label>
                    <input type="range" min={1} max={8} step={1} value={cfgCPU} onChange={e => setCfgCPU(Number(e.target.value))} style={{ width: '100%', accentColor: '#6366f1', marginBottom: 16 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveConfig} disabled={cfgSaving} style={{ ...btn, flex: 1, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', justifyContent: 'center' }}>
                            {cfgSaving ? 'Saving…' : 'Save Config'}
                        </button>
                        <button onClick={() => setShowConfig(false)} style={{ ...btn, padding: '6px 12px', color: '#64748b' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* ── 3-column main layout ─────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 4, gap: 4 }}>
                <Group direction="horizontal" style={{ width: '100%', height: '100%' }}>

                    {/* ① File Explorer */}
                    <Panel defaultSize={16} minSize={12} style={{ display: 'flex', flexDirection: 'column', background: '#111827', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>Explorer</div>
                        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
                            <FileTree nodes={fileTree} expanded={expanded}
                                onToggle={p => setExpanded(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; })}
                                onOpen={handleFileOpen} activeFile={activeTab} />
                        </div>
                    </Panel>

                    <Separator onDragging={() => editorRef.current?.layout?.()} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }} />

                    {/* ② Editor + Terminal */}
                    <Panel defaultSize={57} minSize={30} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 4 }}>
                        <Group direction="vertical" style={{ height: '100%' }}>
                            {/* Editor */}
                            <Panel defaultSize={65} minSize={25} style={{ display: 'flex', flexDirection: 'column', background: '#0d0d1a', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {/* Tab bar */}
                                <div style={{ display: 'flex', alignItems: 'center', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, minHeight: 36, overflowX: 'auto' }}>
                                    <div style={{ display: 'flex', gap: 5, padding: '0 10px', flexShrink: 0 }}>
                                        {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                                    </div>
                                    {tabs.length === 0 && <span style={{ color: '#334155', fontSize: 11, padding: '0 12px' }}>Click a file to open →</span>}
                                    {tabs.map(tab => (
                                        <div key={tab.path} onClick={() => setActiveTab(tab.path)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 36, cursor: 'pointer', flexShrink: 0, fontSize: 12, whiteSpace: 'nowrap',
                                                background: activeTab === tab.path ? '#0d0d1a' : 'transparent',
                                                borderRight: '1px solid rgba(255,255,255,0.06)',
                                                borderBottom: activeTab === tab.path ? '2px solid #6366f1' : '2px solid transparent',
                                                color: activeTab === tab.path ? '#e2e8f0' : '#475569'
                                            }}>
                                            <FileIcon name={tab.name} size={11} />
                                            {tab.dirty && <span style={{ color: '#f59e0b', fontSize: 8 }}>●</span>}
                                            {tab.name}
                                            <span onClick={e => closeTab(tab.path, e)} style={{ color: '#475569', marginLeft: 2, lineHeight: 0 }}><FaTimes size={9} /></span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    {currentTab ? (
                                        <Editor height="100%" language={currentTab.language} theme="vs-dark" value={currentTab.content}
                                            onChange={v => updateTabContent(activeTab, v)} onMount={e => { editorRef.current = e; }}
                                            options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'Fira Code','JetBrains Mono',monospace", fontLigatures: true, padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: 'smooth', bracketPairColorization: { enabled: true }, lineNumbersMinChars: 3 }} />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: .25 }}>
                                            <FaCode size={36} color="#6366f1" />
                                            <p style={{ fontSize: 12, color: '#64748b' }}>Select a file from the explorer</p>
                                        </div>
                                    )}
                                </div>
                            </Panel>

                            <Separator onDragging={() => editorRef.current?.layout?.()} style={{ height: 4, cursor: 'row-resize', flexShrink: 0 }} />

                            {/* Terminal */}
                            <Panel defaultSize={35} minSize={15} style={{ display: 'flex', flexDirection: 'column', background: '#0a0a14', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, height: 32, overflowX: 'auto' }}>
                                    <FaTerminal size={10} color="#6366f1" style={{ margin: '0 8px', flexShrink: 0 }} />
                                    {terminals.map((t, i) => (
                                        <div key={t.id} onClick={() => setActiveTerm(i)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 32, cursor: 'pointer', flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap', background: activeTerm === i ? '#0a0a14' : 'transparent', borderRight: '1px solid rgba(255,255,255,0.05)', color: activeTerm === i ? '#4ade80' : '#475569' }}>
                                            {t.name}
                                            {terminals.length > 1 && <span onClick={e => removeTerminal(i, e)}><FaTimes size={8} /></span>}
                                        </div>
                                    ))}
                                    <button onClick={addTerminal} style={{ ...btn, padding: '0 10px', height: 32, color: '#475569', flexShrink: 0 }}><FaPlus size={9} /></button>
                                </div>
                                {terminals[activeTerm] && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div ref={termScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: "'Fira Code','Courier New',monospace", fontSize: 12 }}>
                                            <div style={{ color: '#4ade80', marginBottom: 8, fontSize: 10 }}>CompileX Terminal — {workspace?.name}</div>
                                            {terminals[activeTerm].history.map((h, i) => (
                                                <div key={i} style={{ marginBottom: 8 }}>
                                                    <div style={{ color: '#818cf8' }}>$ {h.cmd}</div>
                                                    {h.status === 'running'
                                                        ? <div style={{ color: '#475569' }}>Running…</div>
                                                        : <pre style={{ margin: 0, color: h.status === 'error' ? '#fca5a5' : '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, fontSize: 11 }}>{h.out}</pre>}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                            <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 13, flexShrink: 0 }}>$</span>
                                            <input value={terminals[activeTerm].input} onChange={e => updateTermInput(activeTerm, e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') runTermCommand(activeTerm); }}
                                                disabled={terminals[activeTerm].running}
                                                placeholder={terminals[activeTerm].running ? 'Running…' : 'Type a command and press Enter'}
                                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontFamily: "'Fira Code',monospace", fontSize: 12 }} />
                                            {terminals[activeTerm].running && <FaSpinner size={11} color="#475569" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        </Group>
                    </Panel>

                    <Separator onDragging={() => editorRef.current?.layout?.()} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }} />

                    {/* ③ AI Agent Panel */}
                    <Panel defaultSize={27} minSize={20} style={{ display: 'flex', flexDirection: 'column', background: '#111827', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', overflow: 'hidden' }}>
                        {/* Header + model selector */}
                        <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(99,102,241,0.15)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaRobot size={12} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#c7d2fe', fontSize: 12, fontWeight: 700 }}>AI Agent</div>
                                    <div style={{ color: '#6366f180', fontSize: 9 }}>Agentic · Multi-model</div>
                                </div>
                                {agentRunning && (
                                    <button onClick={stopAgent} style={{ ...btn, padding: '3px 8px', fontSize: 10, color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', gap: 4 }}>
                                        <FaStop size={8} /> Stop
                                    </button>
                                )}
                            </div>
                            {/* Provider + Model selectors */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                <select value={agentProvider} onChange={e => { setAgentProvider(e.target.value); setAgentModel(PROVIDERS[e.target.value]?.models[0] || ''); }}
                                    style={{ ...inp, flex: 1, fontSize: 10, padding: '4px 6px', height: 28 }}>
                                    {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <select value={agentModel} onChange={e => setAgentModel(e.target.value)}
                                    style={{ ...inp, flex: 1.2, fontSize: 10, padding: '4px 6px', height: 28 }}>
                                    {(PROVIDERS[agentProvider]?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {/* Mode pills */}
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[['think', '🧠 Think', FaBrain], ['plan', '📋 Plan', FaListUl], ['code', '⚡ Code', FaCode]].map(([m, label]) => (
                                    <button key={m} onClick={() => setAgentMode(m)} style={{
                                        ...btn, flex: 1, padding: '3px 0', fontSize: 9, justifyContent: 'center',
                                        background: agentMode === m ? 'rgba(99,102,241,0.3)' : 'transparent',
                                        color: agentMode === m ? '#c7d2fe' : '#64748b',
                                        borderColor: agentMode === m ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'
                                    }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={agentScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {agentMessages.length === 0 && (
                                <div style={{ textAlign: 'center', paddingTop: 32, opacity: .45 }}>
                                    <FaRobot size={26} color="#6366f1" style={{ marginBottom: 10 }} />
                                    <p style={{ color: '#475569', fontSize: 11, lineHeight: 1.7 }}>
                                        Ask the AI to build features.<br />
                                        <span style={{ color: '#6366f1' }}>Try:</span><br />
                                        "Add a login page"<br />
                                        "Install axios and fetch data"<br />
                                        "Run npm install"
                                    </p>
                                </div>
                            )}
                            {agentMessages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        maxWidth: '92%', padding: '8px 12px', fontSize: 12, lineHeight: 1.6,
                                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(255,255,255,0.04)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0'
                                    }}>
                                        {msg.content}
                                    </div>
                                    {msg.executed?.map((ex, j) => <ActionCard key={j} action={ex} />)}
                                </div>
                            ))}
                            {agentRunning && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, fontSize: 12, color: '#818cf8' }}>
                                    <FaSpinner size={11} style={{ animation: 'spin 1s linear infinite' }} /> Agent running…
                                </div>
                            )}
                            {/* Inline API key prompt */}
                            {showKeyPrompt && (
                                <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 10, padding: '10px 12px' }}>
                                    <p style={{ fontSize: 11, color: '#fbbf24', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><FaKey size={10} /> API Key required for {PROVIDERS[agentProvider]?.label}</p>
                                    <input type="password" value={inlineKey} onChange={e => setInlineKey(e.target.value)} placeholder="Paste your API key…"
                                        style={{ ...inp, fontSize: 11, marginBottom: 6 }} />
                                    <p style={{ fontSize: 9, color: '#64748b' }}>Saved server-side (encrypted). Never stored in browser.</p>
                                    <button onClick={sendAgentMessage} disabled={!inlineKey.trim()}
                                        style={{ ...btn, marginTop: 4, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', width: '100%', justifyContent: 'center', fontSize: 11 }}>
                                        Save Key &amp; Send
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
                                <textarea value={agentInput} onChange={e => setAgentInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } }}
                                    placeholder="Ask AI to build something… (Enter to send)" disabled={agentRunning} rows={2}
                                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                                <button onClick={sendAgentMessage} disabled={agentRunning || !agentInput.trim()}
                                    style={{ ...btn, background: agentRunning || !agentInput.trim() ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', padding: '6px 10px', borderRadius: 8, alignSelf: 'flex-end' }}>
                                    <FaPlay size={10} />
                                </button>
                            </div>
                            <p style={{ fontSize: 9, color: '#334155', marginTop: 6, textAlign: 'center' }}>Shift+Enter for newline · {PROVIDERS[agentProvider]?.label}</p>
                        </div>
                    </Panel>
                </Group>
            </div>

            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                ::-webkit-scrollbar{width:5px;height:5px}
                ::-webkit-scrollbar-track{background:transparent}
                ::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:9px}
            `}</style>
        </div>
    );
}

const btn = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 12px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, transition: 'all .15s', fontFamily: 'inherit' };
const badge = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99, padding: '2px 8px' };
const lbl = { display: 'block', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 };
const inp = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontFamily: 'inherit', outline: 'none', padding: '7px 10px', fontSize: 12, marginBottom: 12, boxSizing: 'border-box', appearance: 'none' };
