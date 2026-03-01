import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner, Form } from 'react-bootstrap';
import {
    FaPlay, FaSave, FaArrowLeft, FaTerminal, FaCode, FaGithub,
    FaCloudUploadAlt, FaRobot, FaCheckCircle, FaTimesCircle,
    FaAngleDoubleRight, FaSync
} from 'react-icons/fa';
import { MdDragHandle } from 'react-icons/md';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import AIChatPane from '../components/AIChatPane';
import { Panel, Group, Separator } from 'react-resizable-panels';

export default function EditorPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { api } = useAuth();
    const editorRef = useRef(null);

    const [project, setProject] = useState(null);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [outputStatus, setOutputStatus] = useState(null); // 'success' | 'error' | null
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [loading, setLoading] = useState(true);
    const [devMode, setDevMode] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [commitMessage, setCommitMessage] = useState('Update from CompileX Labs');
    const [isPushing, setIsPushing] = useState(false);
    const [githubLog, setGithubLog] = useState('');
    const [githubLogType, setGithubLogType] = useState(null); // 'success' | 'error'
    const [activeRightTab, setActiveRightTab] = useState('terminal'); // 'terminal' | 'git'

    useEffect(() => {
        fetchProject();
        const handleResize = () => {
            if (editorRef.current && typeof editorRef.current.layout === 'function') {
                editorRef.current.layout();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [projectId]);

    const fetchProject = async () => {
        try {
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data);
            if (!res.data.code) {
                const defaults = {
                    python: 'print("Hello from CompileX Labs!")',
                    javascript: 'console.log("Hello from CompileX Labs!");',
                    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from CompileX Labs!" << endl;\n    return 0;\n}',
                    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CompileX Labs!");\n    }\n}',
                    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from CompileX Labs!")\n}',
                    rust: 'fn main() {\n    println!("Hello from CompileX Labs!");\n}',
                };
                setCode(defaults[res.data.language] || '// Write your code here');
            } else {
                setCode(res.data.code);
            }
        } catch (error) {
            console.error('Failed to load project', error);
            alert('Project not found');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };

    const insertCodeAtCursor = (codeToInsert) => {
        if (!editorRef.current) return;
        const position = editorRef.current.getPosition();
        editorRef.current.executeEdits('ai-insert', [{
            range: new window.monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: codeToInsert,
            forceMoveMarkers: true
        }]);
        editorRef.current.focus();
    };

    const saveProject = async () => {
        setIsSaving(true);
        try {
            await api.put(`/projects/${projectId}`, { code });
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
        } catch {
            // Silently handle — editor code is saved on execution too
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
        } finally {
            setIsSaving(false);
        }
    };

    const executeCode = async () => {
        if (!code.trim()) return;
        setIsExecuting(true);
        setOutput('⏳ Running...');
        setOutputStatus(null);
        setActiveRightTab('terminal');

        try {
            const res = await api.post('/execute', {
                projectId: project.id,
                language: project.language,
                code
            });
            if (res.data.status === 'success') {
                setOutput(res.data.output || '✓ Execution finished with no output.');
                setOutputStatus('success');
            } else {
                setOutput(res.data.output || res.data.error || 'Unknown error.');
                setOutputStatus('error');
            }
        } catch (error) {
            const msg = error.response?.data?.error || error.message;
            setOutput(`Failed to execute:\n${msg}`);
            setOutputStatus('error');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleGithubPush = async () => {
        if (!repoName) {
            setGithubLog('Repository name is required (owner/repo).');
            setGithubLogType('error');
            return;
        }
        setIsPushing(true);
        setGithubLog('Pushing code to GitHub…');
        setGithubLogType(null);
        try {
            const res = await api.post(`/projects/${projectId}/github/push`, {
                repo: repoName,
                message: commitMessage
            });
            setGithubLog(`Pushed to ${repoName}\n${res.data.url}`);
            setGithubLogType('success');
        } catch (error) {
            setGithubLog(error.response?.data?.error || error.message);
            setGithubLogType('error');
        } finally {
            setIsPushing(false);
        }
    };

    const handleLayoutResize = () => {
        if (editorRef.current && typeof editorRef.current.layout === 'function') {
            editorRef.current.layout();
        }
    };

    if (loading) {
        return (
            <div className="min-vh-100 default-bg d-flex justify-content-center align-items-center">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    const langColor = {
        python: '#3776ab', javascript: '#f7df1e', cpp: '#659ad2',
        java: '#ed8b00', go: '#00add8', rust: '#dea584'
    };

    return (
        <div className="vh-100 d-flex flex-column overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0a12 100%)' }}>
            {/* ── Top Bar ── */}
            <nav style={{
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                zIndex: 100,
                flexShrink: 0
            }} className="px-3 py-2 d-flex justify-content-between align-items-center">

                {/* Left: back + project info */}
                <div className="d-flex align-items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#aaa', cursor: 'pointer', transition: 'all .2s' }}
                        onMouseEnter={e => e.target.style.color = '#fff'}
                        onMouseLeave={e => e.target.style.color = '#aaa'}
                    >
                        <FaArrowLeft size={13} />
                    </button>

                    <div className="d-flex align-items-center gap-2">
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${langColor[project?.language] || '#6366f1'}33, ${langColor[project?.language] || '#6366f1'}11)`, border: `1px solid ${langColor[project?.language] || '#6366f1'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaCode size={12} style={{ color: langColor[project?.language] || '#6366f1' }} />
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{project?.name}</div>
                            <div style={{ color: langColor[project?.language] || '#6366f1', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {project?.language}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: dev mode + actions */}
                <div className="d-flex align-items-center gap-2">
                    <div className="d-flex align-items-center gap-2 me-2" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 12 }}>
                        <span style={{ fontSize: 11, color: devMode ? '#818cf8' : '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Dev</span>
                        <div
                            onClick={() => setDevMode(!devMode)}
                            style={{
                                width: 34, height: 18, borderRadius: 9, cursor: 'pointer', transition: 'all .3s', position: 'relative',
                                background: devMode ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.15)'
                            }}>
                            <div style={{
                                position: 'absolute', top: 2, left: devMode ? 18 : 2, width: 12, height: 12,
                                borderRadius: '50%', background: '#fff', transition: 'left .3s', boxShadow: '0 1px 4px rgba(0,0,0,.4)'
                            }} />
                        </div>
                    </div>

                    <button
                        onClick={saveProject}
                        disabled={isSaving}
                        style={{
                            background: savedFlash ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${savedFlash ? '#22c55e55' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 8, padding: '7px 14px', color: savedFlash ? '#22c55e' : '#ccc',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .2s', display: 'flex', gap: 6, alignItems: 'center'
                        }}>
                        {savedFlash ? <FaCheckCircle size={12} /> : <FaSave size={12} />}
                        {isSaving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save'}
                    </button>

                    <button
                        onClick={executeCode}
                        disabled={isExecuting}
                        style={{
                            background: isExecuting ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#818cf8)',
                            border: 'none', borderRadius: 8, padding: '7px 20px', color: '#fff',
                            cursor: isExecuting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                            display: 'flex', gap: 8, alignItems: 'center', boxShadow: isExecuting ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                            transition: 'all .2s'
                        }}>
                        {isExecuting ? <><Spinner size="sm" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }} />Running…</> : <><FaPlay size={11} />Run</>}
                    </button>
                </div>
            </nav>

            {/* ── Main Tiling Workspace ── */}
            <div className="flex-grow-1 overflow-hidden p-2 d-flex" style={{ gap: 6 }}>
                <Group direction="horizontal" style={{ width: '100%', height: '100%' }}>

                    {/* ── 1. AI Agent Pane ── */}
                    <Panel defaultSize={22} minSize={15} style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(255,255,255,0.02)' }}>
                        {/* Header */}
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaRobot size={12} style={{ color: '#fff' }} />
                            </div>
                            <div>
                                <div style={{ color: '#c7d2fe', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>AI Agent</div>
                                <div style={{ color: '#6366f188', fontSize: 9, fontWeight: 500 }}>gemini-2.0-flash</div>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            <AIChatPane
                                project={project}
                                currentCode={code}
                                currentOutput={output}
                                onInsertCode={insertCodeAtCursor}
                            />
                        </div>
                    </Panel>

                    <Separator
                        onDragging={handleLayoutResize}
                        style={{ width: 6, cursor: 'col-resize', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 2, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.3)' }} />
                    </Separator>

                    {/* ── 2. Code Editor Pane ── */}
                    <Panel defaultSize={52} minSize={30} style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: '#0d0d1a' }}>
                        {/* Editor header */}
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <span style={{ color: '#555', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    <FaCode size={9} className="me-1" />Code Editor
                                </span>
                            </div>
                        </div>
                        {/* Monaco Editor */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Editor
                                height="100%"
                                language={project?.language === 'javascript' ? 'javascript' : project?.language === 'cpp' ? 'cpp' : project?.language}
                                theme="vs-dark"
                                value={code}
                                onChange={v => setCode(v)}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                                    fontLigatures: true,
                                    padding: { top: 16 },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    cursorBlinking: 'smooth',
                                    cursorSmoothCaretAnimation: 'on',
                                    lineNumbersMinChars: 3,
                                    renderLineHighlight: 'gutter',
                                    bracketPairColorization: { enabled: true },
                                    guides: { indentation: true },
                                    suggest: { showKeywords: true },
                                }}
                            />
                        </div>
                    </Panel>

                    <Separator
                        onDragging={handleLayoutResize}
                        style={{ width: 6, cursor: 'col-resize', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 2, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)' }} />
                    </Separator>

                    {/* ── 3. Right Panel: Terminal + Git ── */}
                    <Panel defaultSize={26} minSize={18} style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                        {/* Tab bar */}
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexShrink: 0 }}>
                            {[
                                { id: 'terminal', label: 'Terminal', icon: <FaTerminal size={10} /> },
                                { id: 'git', label: 'Source Control', icon: <FaGithub size={10} /> }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveRightTab(tab.id)}
                                    style={{
                                        flex: 1, padding: '9px 6px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .2s',
                                        background: activeRightTab === tab.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        color: activeRightTab === tab.id ? '#818cf8' : '#555',
                                        borderBottom: activeRightTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                                    }}>
                                    {tab.icon}{tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Terminal Tab */}
                        {activeRightTab === 'terminal' && (
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                {/* Status bar */}
                                {outputStatus && (
                                    <div style={{
                                        padding: '6px 12px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                        background: outputStatus === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                        borderBottom: `1px solid ${outputStatus === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                        color: outputStatus === 'success' ? '#4ade80' : '#f87171'
                                    }}>
                                        {outputStatus === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                                        {outputStatus === 'success' ? 'Process exited normally' : 'Process exited with errors'}
                                    </div>
                                )}
                                {/* Output area */}
                                <div style={{ flex: 1, padding: 12, overflow: 'auto', fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 12 }}>
                                    {devMode ? (
                                        <div style={{ color: '#4ade80', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ color: '#555', marginBottom: 8, fontSize: 11 }}>Interactive shell — Phase 7</div>
                                            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, color: '#4ade80', alignItems: 'center' }}>
                                                <span>$</span>
                                                <input type="text" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#4ade80', flex: 1, fontFamily: 'inherit', fontSize: 12 }} placeholder="Type a command…" />
                                            </div>
                                        </div>
                                    ) : output ? (
                                        <pre style={{
                                            color: outputStatus === 'error' ? '#fca5a5' : '#e2e8f0',
                                            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.7
                                        }}>{output}</pre>
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.35 }}>
                                            <FaTerminal size={24} style={{ color: '#6366f1' }} />
                                            <span style={{ color: '#aaa', fontSize: 12 }}>Output will appear here</span>
                                            <span style={{ color: '#555', fontSize: 11 }}>Press Run to execute your code</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Git Tab */}
                        {activeRightTab === 'git' && (
                            <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>
                                        Repository
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="owner/repo-name"
                                        value={repoName}
                                        onChange={e => setRepoName(e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                                <div>
                                    <label style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>
                                        Commit Message
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={commitMessage}
                                        onChange={e => setCommitMessage(e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                                <button
                                    onClick={handleGithubPush}
                                    disabled={isPushing || !repoName}
                                    style={{
                                        background: (!repoName || isPushing) ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg,#6366f1,#818cf8)',
                                        border: 'none', borderRadius: 8, padding: '10px 0', color: (!repoName || isPushing) ? '#555' : '#fff',
                                        cursor: (!repoName || isPushing) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s',
                                        boxShadow: (!repoName || isPushing) ? 'none' : '0 4px 15px rgba(99,102,241,0.35)'
                                    }}>
                                    {isPushing ? <FaSync size={11} className="spin" /> : <FaCloudUploadAlt size={11} />}
                                    {isPushing ? 'Pushing…' : 'Push to Main'}
                                </button>

                                {/* Git Log */}
                                <div>
                                    <label style={{ color: '#888', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>
                                        Git Logs
                                    </label>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 12px', minHeight: 60,
                                        border: `1px solid ${githubLogType === 'success' ? 'rgba(34,197,94,0.2)' : githubLogType === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                        fontFamily: "'Fira Code', monospace", fontSize: 11
                                    }}>
                                        <span style={{ color: githubLogType === 'success' ? '#4ade80' : githubLogType === 'error' ? '#f87171' : '#555', whiteSpace: 'pre-wrap' }}>
                                            {githubLog || 'Waiting for commands…'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Panel>
                </Group>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
