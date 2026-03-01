import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
    FaCode, FaArrowLeft, FaPlus, FaTimes, FaFolder, FaFolderOpen,
    FaTerminal, FaRobot, FaPlay, FaSave, FaSync, FaCheckCircle,
    FaFile, FaJs, FaPython, FaHtml5, FaCss3Alt, FaMarkdown,
    FaChevronRight, FaChevronDown, FaSpinner, FaTrash
} from 'react-icons/fa';
import { SiJson, SiTypescript } from 'react-icons/si';
import { useAuth } from '../context/AuthContext';

// ─── File icon helper ────────────────────────────────────────────────────────
function FileIcon({ name, size = 13 }) {
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap = {
        js: <FaJs size={size} color="#F7DF1E" />,
        jsx: <FaJs size={size} color="#61DAFB" />,
        ts: <SiTypescript size={size} color="#3178C6" />,
        tsx: <SiTypescript size={size} color="#3178C6" />,
        py: <FaPython size={size} color="#3776AB" />,
        html: <FaHtml5 size={size} color="#E34F26" />,
        css: <FaCss3Alt size={size} color="#1572B6" />,
        json: <SiJson size={size} color="#4ade80" />,
        md: <FaMarkdown size={size} color="#64748b" />,
    };
    return iconMap[ext] || <FaFile size={size} color="#64748b" />;
}

// ─── Language for Monaco ──────────────────────────────────────────────────────
function getLang(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    return {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', css: 'css', html: 'html', json: 'json', md: 'markdown',
        txt: 'plaintext'
    }[ext] || 'plaintext';
}

// ─── FileTree component ───────────────────────────────────────────────────────
function FileTree({ nodes, expanded, onToggle, onOpen, activeFile, depth = 0 }) {
    return (
        <div>
            {nodes.map(node => (
                <div key={node.path}>
                    <div
                        onClick={() => node.type === 'directory' ? onToggle(node.path) : onOpen(node)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: `3px 8px 3px ${12 + depth * 14}px`,
                            cursor: 'pointer', fontSize: 12, color: activeFile === node.path ? '#c7d2fe' : '#94a3b8',
                            background: activeFile === node.path ? 'rgba(99,102,241,0.15)' : 'transparent',
                            borderLeft: activeFile === node.path ? '2px solid #6366f1' : '2px solid transparent',
                            transition: 'all .15s', userSelect: 'none',
                        }}
                        onMouseEnter={e => { if (activeFile !== node.path) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (activeFile !== node.path) e.currentTarget.style.background = 'transparent'; }}
                    >
                        {node.type === 'directory' ? (
                            <>
                                <span style={{ color: '#475569', width: 10 }}>
                                    {expanded.has(node.path) ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                                </span>
                                {expanded.has(node.path)
                                    ? <FaFolderOpen size={13} color="#f59e0b" />
                                    : <FaFolder size={13} color="#f59e0b" />}
                            </>
                        ) : (
                            <>
                                <span style={{ width: 10 }} />
                                <FileIcon name={node.name} />
                            </>
                        )}
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.name}
                        </span>
                    </div>
                    {node.type === 'directory' && expanded.has(node.path) && (
                        <FileTree nodes={node.children || []} expanded={expanded}
                            onToggle={onToggle} onOpen={onOpen} activeFile={activeFile} depth={depth + 1} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main IDE ─────────────────────────────────────────────────────────────────
export default function FrameworkIDE() {
    const { type } = useParams();          // 'react' | 'flask'
    const navigate = useNavigate();
    const { api } = useAuth();
    const editorRef = useRef(null);
    const termScrollRef = useRef(null);
    const agentScrollRef = useRef(null);

    // Workspace
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // File explorer
    const [fileTree, setFileTree] = useState([]);
    const [expanded, setExpanded] = useState(new Set(['src', 'templates', 'static']));

    // Editor tabs: [{path, content, language, dirty}]
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    // Terminals: [{id, name, history:[{cmd,out,status}], input, running}]
    const [terminals, setTerminals] = useState([
        { id: 1, name: 'Terminal 1', history: [], input: '', running: false, cwd: '' }
    ]);
    const [activeTerm, setActiveTerm] = useState(0);
    const termInputRef = useRef(null);

    // AI Agent
    const [agentMessages, setAgentMessages] = useState([]);
    const [agentInput, setAgentInput] = useState('');
    const [agentRunning, setAgentRunning] = useState(false);

    // ── Bootstrap workspace ────────────────────────────────────────────────
    useEffect(() => {
        const storedKey = `compilex_ws_${type}`;
        const cached = sessionStorage.getItem(storedKey);
        if (cached) {
            const ws = JSON.parse(cached);
            setWorkspace(ws);
            refreshTree(ws.id);
            setLoading(false);
        } else {
            createWorkspace();
        }
    }, [type]);

    const createWorkspace = async () => {
        try {
            const res = await api.post('/workspace', { framework: type });
            const ws = res.data;
            sessionStorage.setItem(`compilex_ws_${type}`, JSON.stringify(ws));
            setWorkspace(ws);
            await refreshTree(ws.id);
            // Auto-open the main entry file
            const main = type === 'react' ? 'src/App.jsx' : 'app.py';
            await openFile(ws.id, { path: main, name: main.split('/').pop(), type: 'file' });
        } catch (e) {
            setError(e.message || 'Failed to create workspace');
        } finally {
            setLoading(false);
        }
    };

    const refreshTree = async (wsId) => {
        try {
            const res = await api.get(`/workspace/${wsId}/files`);
            setFileTree(res.data.tree || []);
        } catch { }
    };

    // ── File open/edit/save ────────────────────────────────────────────────
    const openFile = async (wsId, node) => {
        const existing = tabs.find(t => t.path === node.path);
        if (existing) { setActiveTab(node.path); return; }
        try {
            const res = await api.get(`/workspace/${wsId}/file?path=${encodeURIComponent(node.path)}`);
            const newTab = { path: node.path, name: node.name, content: res.data.content, language: getLang(node.name), dirty: false };
            setTabs(prev => [...prev, newTab]);
            setActiveTab(node.path);
        } catch { }
    };

    const handleFileOpen = (node) => {
        if (!workspace) return;
        openFile(workspace.id, node);
    };

    const updateTabContent = (path, content) => {
        setTabs(prev => prev.map(t => t.path === path ? { ...t, content, dirty: true } : t));
    };

    const saveCurrentFile = async () => {
        const tab = tabs.find(t => t.path === activeTab);
        if (!tab || !workspace) return;
        setSaving(true);
        try {
            await api.put(`/workspace/${workspace.id}/file`, { path: tab.path, content: tab.content });
            setTabs(prev => prev.map(t => t.path === tab.path ? { ...t, dirty: false } : t));
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
        } catch { }
        finally { setSaving(false); }
    };

    const closeTab = (path, e) => {
        e.stopPropagation();
        setTabs(prev => {
            const next = prev.filter(t => t.path !== path);
            if (activeTab === path) setActiveTab(next.length ? next[next.length - 1].path : null);
            return next;
        });
    };

    // Ctrl+S global shortcut
    useEffect(() => {
        const handler = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrentFile(); } };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeTab, tabs, workspace]);

    // ── Terminal ────────────────────────────────────────────────────────────
    const runTermCommand = async (termIdx) => {
        const term = terminals[termIdx];
        if (!term || !term.input.trim() || term.running || !workspace) return;
        const cmd = term.input.trim();

        setTerminals(prev => prev.map((t, i) => i === termIdx
            ? { ...t, input: '', running: true, history: [...t.history, { cmd, out: '', status: 'running' }] }
            : t));

        try {
            const res = await api.post(`/workspace/${workspace.id}/exec`, { command: cmd, cwd: term.cwd });
            const combined = (res.data.stdout + res.data.stderr).trimEnd();
            setTerminals(prev => prev.map((t, i) => {
                if (i !== termIdx) return t;
                const hist = [...t.history];
                hist[hist.length - 1] = { cmd, out: combined || '(no output)', status: res.data.status };
                return { ...t, running: false, history: hist };
            }));
        } catch (e) {
            setTerminals(prev => prev.map((t, i) => {
                if (i !== termIdx) return i;
                const hist = [...t.history];
                hist[hist.length - 1] = { cmd, out: e.message, status: 'error' };
                return { ...t, running: false, history: hist };
            }));
        }
        setTimeout(() => termScrollRef.current?.scrollTo(0, 999999), 100);
    };

    const addTerminal = () => {
        const id = terminals.length + 1;
        setTerminals(prev => [...prev, { id, name: `Terminal ${id}`, history: [], input: '', running: false, cwd: '' }]);
        setActiveTerm(terminals.length);
    };

    const removeTerminal = (idx, e) => {
        e.stopPropagation();
        setTerminals(prev => prev.filter((_, i) => i !== idx));
        setActiveTerm(Math.max(0, idx - 1));
    };

    const updateTermInput = (idx, val) => {
        setTerminals(prev => prev.map((t, i) => i === idx ? { ...t, input: val } : t));
    };

    // ── AI Agent ────────────────────────────────────────────────────────────
    const sendAgentMessage = async () => {
        if (!agentInput.trim() || agentRunning || !workspace) return;
        const userMsg = { role: 'user', content: agentInput };
        setAgentMessages(prev => [...prev, userMsg]);
        setAgentInput('');
        setAgentRunning(true);

        try {
            const res = await api.post(`/workspace/${workspace.id}/agent`, {
                message: agentInput,
                history: agentMessages
            });
            const { reply, executed } = res.data;
            setAgentMessages(prev => [...prev, {
                role: 'assistant',
                content: reply || '(no reply)',
                executed: executed || []
            }]);
            // Refresh file tree after agent actions
            await refreshTree(workspace.id);
            // Re-load any open tab that was modified by the agent
            const writtenPaths = (executed || [])
                .filter(a => a.type === 'writeFile')
                .map(a => a.path);
            for (const p of writtenPaths) {
                const openTab = tabs.find(t => t.path === p);
                if (openTab) {
                    const r = await api.get(`/workspace/${workspace.id}/file?path=${encodeURIComponent(p)}`);
                    setTabs(prev => prev.map(t => t.path === p ? { ...t, content: r.data.content, dirty: false } : t));
                }
            }
        } catch (e) {
            setAgentMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${e.message}` }]);
        } finally {
            setAgentRunning(false);
            setTimeout(() => agentScrollRef.current?.scrollTo(0, 999999), 100);
        }
    };

    const handleLayoutResize = () => {
        editorRef.current?.layout?.();
    };

    // ── Framework accent color ─────────────────────────────────────────────
    const accent = type === 'react' ? '#61DAFB' : '#f59e0b';
    const accentGrad = type === 'react'
        ? 'linear-gradient(135deg,#1d4ed8,#61DAFB)'
        : 'linear-gradient(135deg,#f59e0b,#fbbf24)';

    const currentTab = tabs.find(t => t.path === activeTab);

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <FaSpinner size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#475569', fontSize: 14 }}>Scaffolding your {type} workspace…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <p style={{ color: '#f87171' }}>⚠️ {error}</p>
            <button onClick={() => navigate('/dashboard')} style={{ ...btnBase, background: 'rgba(255,255,255,0.08)' }}>← Dashboard</button>
        </div>
    );

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#0d0d1a', overflow: 'hidden', color: '#e2e8f0' }}>

            {/* ── Title bar ─────────────────────────────────────────────── */}
            <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, gap: 12 }}>
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => navigate('/dashboard')} style={{ ...btnBase, padding: '5px 8px', color: '#64748b' }}>
                        <FaArrowLeft size={12} />
                    </button>
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaCode size={11} color="#fff" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                        Compile<span style={{ color: '#818cf8' }}>X</span> Labs — <span style={{ color: accent }}>{type === 'react' ? 'React' : 'Flask'}</span> IDE
                    </span>
                    <span style={{ fontSize: 10, color: '#334155', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 6px' }}>
                        ws/{workspace?.id}
                    </span>
                </div>
                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={saveCurrentFile} disabled={saving || !activeTab}
                        style={{ ...btnBase, gap: 6, fontSize: 12, color: savedFlash ? '#4ade80' : '#94a3b8' }}>
                        {savedFlash ? <FaCheckCircle size={12} /> : <FaSave size={12} />}
                        {saving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save  Ctrl+S'}
                    </button>
                    <button onClick={() => workspace && refreshTree(workspace.id)}
                        style={{ ...btnBase, padding: '5px 8px', color: '#64748b' }} title="Refresh file tree">
                        <FaSync size={11} />
                    </button>
                </div>
            </div>

            {/* ── Main 3-column layout ─────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 4, gap: 4 }}>
                <Group direction="horizontal" style={{ width: '100%', height: '100%' }}>

                    {/* ① File Explorer ───────────────────────────────────── */}
                    <Panel defaultSize={16} minSize={12} style={{ display: 'flex', flexDirection: 'column', background: '#111827', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.2, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                            Explorer
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
                            <FileTree
                                nodes={fileTree}
                                expanded={expanded}
                                onToggle={path => setExpanded(prev => { const s = new Set(prev); s.has(path) ? s.delete(path) : s.add(path); return s; })}
                                onOpen={handleFileOpen}
                                activeFile={activeTab}
                            />
                        </div>
                    </Panel>

                    <Separator onDragging={handleLayoutResize} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }} />

                    {/* ② Editor + Terminal vertical split ────────────────── */}
                    <Panel defaultSize={57} minSize={30} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 4 }}>
                        <Group direction="vertical" style={{ height: '100%' }}>

                            {/* Editor area */}
                            <Panel defaultSize={65} minSize={30} style={{ display: 'flex', flexDirection: 'column', background: '#0d0d1a', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {/* macOS traffic lights + tab bar */}
                                <div style={{ display: 'flex', alignItems: 'center', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, minHeight: 36, overflowX: 'auto' }}>
                                    <div style={{ display: 'flex', gap: 5, padding: '0 10px', flexShrink: 0 }}>
                                        {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                                            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                                        ))}
                                    </div>
                                    {tabs.length === 0 && (
                                        <span style={{ color: '#334155', fontSize: 11, padding: '0 12px' }}>Open a file from the explorer →</span>
                                    )}
                                    {tabs.map(tab => (
                                        <div key={tab.path}
                                            onClick={() => setActiveTab(tab.path)}
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
                                            <span onClick={e => closeTab(tab.path, e)} style={{ color: '#475569', marginLeft: 2, lineHeight: 0 }}>
                                                <FaTimes size={9} />
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Monaco */}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    {currentTab ? (
                                        <Editor
                                            height="100%"
                                            language={currentTab.language}
                                            theme="vs-dark"
                                            value={currentTab.content}
                                            onChange={v => updateTabContent(activeTab, v)}
                                            onMount={e => { editorRef.current = e; }}
                                            options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'Fira Code','JetBrains Mono',monospace", fontLigatures: true, padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: 'smooth', bracketPairColorization: { enabled: true }, lineNumbersMinChars: 3 }}
                                        />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.3 }}>
                                            <FaCode size={36} color="#6366f1" />
                                            <p style={{ fontSize: 13, color: '#64748b' }}>Select a file from the explorer</p>
                                        </div>
                                    )}
                                </div>
                            </Panel>

                            <Separator onDragging={handleLayoutResize} style={{ height: 4, cursor: 'row-resize', flexShrink: 0 }} />

                            {/* Terminal area */}
                            <Panel defaultSize={35} minSize={15} style={{ display: 'flex', flexDirection: 'column', background: '#0a0a14', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                {/* Terminal tab bar */}
                                <div style={{ display: 'flex', alignItems: 'center', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, height: 32, overflowX: 'auto' }}>
                                    <FaTerminal size={10} color="#6366f1" style={{ margin: '0 8px', flexShrink: 0 }} />
                                    {terminals.map((t, i) => (
                                        <div key={t.id} onClick={() => setActiveTerm(i)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 32, cursor: 'pointer', flexShrink: 0, fontSize: 11, whiteSpace: 'nowrap',
                                                background: activeTerm === i ? '#0a0a14' : 'transparent',
                                                borderRight: '1px solid rgba(255,255,255,0.05)',
                                                color: activeTerm === i ? '#4ade80' : '#475569'
                                            }}>
                                            {t.name}
                                            {terminals.length > 1 && (
                                                <span onClick={e => removeTerminal(i, e)} style={{ color: '#475569' }}>
                                                    <FaTimes size={8} />
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addTerminal} style={{ ...btnBase, padding: '0 10px', height: 32, color: '#475569', flexShrink: 0 }} title="New terminal">
                                        <FaPlus size={9} />
                                    </button>
                                </div>

                                {/* Terminal body */}
                                {terminals[activeTerm] && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div ref={termScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: "'Fira Code','Courier New',monospace", fontSize: 12 }}>
                                            <div style={{ color: '#4ade80', marginBottom: 8, fontSize: 11 }}>
                                                CompileX Labs Terminal — {type} workspace
                                            </div>
                                            {terminals[activeTerm].history.map((h, i) => (
                                                <div key={i} style={{ marginBottom: 8 }}>
                                                    <div style={{ color: '#818cf8' }}>$ {h.cmd}</div>
                                                    {h.status === 'running'
                                                        ? <div style={{ color: '#475569' }}>Running…</div>
                                                        : <pre style={{ margin: 0, color: h.status === 'error' ? '#fca5a5' : '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, fontSize: 11 }}>{h.out}</pre>
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                        {/* Input row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                            <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 13, flexShrink: 0 }}>$</span>
                                            <input
                                                ref={termInputRef}
                                                value={terminals[activeTerm].input}
                                                onChange={e => updateTermInput(activeTerm, e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') runTermCommand(activeTerm); }}
                                                disabled={terminals[activeTerm].running}
                                                placeholder={terminals[activeTerm].running ? 'Running…' : 'Type a command and press Enter'}
                                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontFamily: "'Fira Code',monospace", fontSize: 12 }}
                                            />
                                            {terminals[activeTerm].running && <FaSpinner size={11} color="#475569" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                                        </div>
                                    </div>
                                )}
                            </Panel>
                        </Group>
                    </Panel>

                    <Separator onDragging={handleLayoutResize} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }} />

                    {/* ③ AI Agent Panel ───────────────────────────────────── */}
                    <Panel defaultSize={27} minSize={20} style={{ display: 'flex', flexDirection: 'column', background: '#111827', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaRobot size={12} color="#fff" />
                            </div>
                            <div>
                                <div style={{ color: '#c7d2fe', fontSize: 12, fontWeight: 700 }}>AI Agent</div>
                                <div style={{ color: '#6366f188', fontSize: 10 }}>Agentic · Ollama</div>
                            </div>
                            {agentRunning && <FaSpinner size={12} color="#818cf8" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />}
                        </div>

                        {/* Messages */}
                        <div ref={agentScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {agentMessages.length === 0 && (
                                <div style={{ textAlign: 'center', paddingTop: 40, opacity: 0.5 }}>
                                    <FaRobot size={28} color="#6366f1" style={{ marginBottom: 12 }} />
                                    <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6 }}>
                                        Ask the AI to build features for your {type} app.<br />
                                        <br />
                                        <span style={{ color: '#6366f1' }}>Try:</span><br />
                                        "Add a Navbar component"<br />
                                        "Create a login page with form"<br />
                                        "Install axios and fetch data"<br />
                                        "Run npm install"
                                    </p>
                                </div>
                            )}
                            {agentMessages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        maxWidth: '90%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(255,255,255,0.04)',
                                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0', fontSize: 12, lineHeight: 1.6
                                    }}>
                                        {msg.content}
                                    </div>
                                    {/* Action cards */}
                                    {msg.executed?.map((ex, j) => (
                                        <ActionCard key={j} action={ex} />
                                    ))}
                                </div>
                            ))}
                            {agentRunning && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, fontSize: 12, color: '#818cf8' }}>
                                    <FaSpinner size={11} style={{ animation: 'spin 1s linear infinite' }} /> Agent thinking…
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
                                <textarea
                                    value={agentInput}
                                    onChange={e => setAgentInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } }}
                                    placeholder="Ask AI to build something… (Enter to send)"
                                    disabled={agentRunning}
                                    rows={2}
                                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                                />
                                <button onClick={sendAgentMessage} disabled={agentRunning || !agentInput.trim()}
                                    style={{ ...btnBase, background: agentRunning || !agentInput.trim() ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', padding: '6px 10px', borderRadius: 8, alignSelf: 'flex-end' }}>
                                    <FaPlay size={10} />
                                </button>
                            </div>
                            <p style={{ fontSize: 9, color: '#334155', marginTop: 6, textAlign: 'center' }}>Shift+Enter for newline · Powered by Ollama</p>
                        </div>
                    </Panel>
                </Group>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 9px; }
            `}</style>
        </div>
    );
}

// ─── Action card shown below AI messages ─────────────────────────────────────
function ActionCard({ action }) {
    const [expanded, setExpanded] = useState(false);
    const isFile = action.type === 'writeFile';
    const isCmd = action.type === 'runCommand';
    const isRead = action.type === 'readFile';
    const ok = action.status === 'ok' || action.status === 'success';

    return (
        <div style={{ width: '90%', background: 'rgba(0,0,0,0.3)', border: `1px solid ${ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 8, overflow: 'hidden', fontSize: 11 }}>
            <div onClick={() => (action.output || action.content) && setExpanded(!expanded)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', cursor: (action.output || action.content) ? 'pointer' : 'default', background: ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)' }}>
                <span style={{ fontSize: 13 }}>{isFile ? '📝' : isCmd ? '▶' : '📖'}</span>
                <span style={{ color: ok ? '#4ade80' : '#f87171', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.8 }}>
                    {isFile ? 'Write' : isCmd ? 'Run' : 'Read'}
                </span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {action.path || action.command}
                </span>
                {(action.output || action.content) && (
                    <FaChevronDown size={8} color="#475569" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
                )}
            </div>
            {expanded && (action.output || action.content) && (
                <pre style={{ margin: 0, padding: '8px 10px', color: '#94a3b8', fontSize: 10, maxHeight: 140, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {action.output || action.content}
                </pre>
            )}
        </div>
    );
}

const btnBase = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 7, padding: '5px 12px', color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
    transition: 'all .15s',
};
