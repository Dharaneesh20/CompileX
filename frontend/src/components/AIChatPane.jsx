import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaMagic, FaBug, FaLightbulb, FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';

const QUICK_ACTIONS = [
    { icon: <FaBug size={10} />, label: 'Find Bugs', prompt: 'Check my code for bugs and suggest fixes.' },
    { icon: <FaMagic size={10} />, label: 'Explain Error', prompt: 'Explain this error from my terminal output.' },
    { icon: <FaLightbulb size={10} />, label: 'Optimise', prompt: 'How can I optimise this code?' },
];

export default function AIChatPane({ project, currentCode, currentOutput, onInsertCode }) {
    const { api } = useAuth();
    const [messages, setMessages] = useState([
        { role: 'model', content: "Hi! I'm your **CompileX AI Agent**. I can see your current code and terminal output. Ask me to debug errors, write new functions, or explain concepts!" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            const res = await api.post('/ai/chat', {
                messages: newMessages,
                context: {
                    name: project?.name,
                    language: project?.language,
                    code: currentCode,
                    output: currentOutput
                }
            });
            setMessages([...newMessages, { role: 'model', content: res.data.reply }]);
        } catch {
            setMessages([...newMessages, {
                role: 'model',
                content: '**Connection error** — could not reach the AI backend. Make sure the Flask server is running.'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>

            {/* Chat messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {msg.role === 'model' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FaRobot size={9} style={{ color: '#fff' }} />
                                </div>
                                <span style={{ color: '#6366f1', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Agent</span>
                            </div>
                        )}
                        <div style={{
                            maxWidth: '92%',
                            padding: msg.role === 'user' ? '8px 12px' : '10px 12px',
                            borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '2px 14px 14px 14px',
                            background: msg.role === 'user'
                                ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                                : 'rgba(255,255,255,0.05)',
                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color: '#e2e8f0',
                            fontSize: 12.5,
                            lineHeight: 1.6
                        }}>
                            {msg.role === 'user' ? (
                                <span style={{ color: '#fff' }}>{msg.content}</span>
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{children}</p>,
                                        strong: ({ children }) => <strong style={{ color: '#c7d2fe', fontWeight: 700 }}>{children}</strong>,
                                        code({ node, inline, className, children }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const codeStr = String(children).replace(/\n$/, '');
                                            if (!inline && match) {
                                                return (
                                                    <div style={{ marginTop: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.25)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                                                            <span style={{ color: '#818cf8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{match[1]}</span>
                                                            <button
                                                                onClick={() => onInsertCode(codeStr)}
                                                                style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 4, padding: '2px 8px', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
                                                                ↗ Insert
                                                            </button>
                                                        </div>
                                                        <pre style={{ margin: 0, padding: '10px', background: 'rgba(0,0,0,0.4)', overflowX: 'auto', fontSize: 11, lineHeight: 1.6 }}>
                                                            <code style={{ fontFamily: "'Fira Code', monospace", color: '#e2e8f0' }}>{codeStr}</code>
                                                        </pre>
                                                    </div>
                                                );
                                            }
                                            return <code style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 3, padding: '1px 5px', color: '#c7d2fe', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>{children}</code>;
                                        }
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 4 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaRobot size={9} style={{ color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {[0, 0.15, 0.3].map((delay, i) => (
                                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `typingPulse 1s ${delay}s infinite` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick actions */}
            <div style={{ padding: '8px 10px 0', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {QUICK_ACTIONS.map(qa => (
                    <button
                        key={qa.label}
                        onClick={() => setInput(qa.prompt)}
                        style={{
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 20, padding: '3px 9px', color: '#818cf8', fontSize: 10, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}>
                        {qa.icon}{qa.label}
                    </button>
                ))}
            </div>

            {/* Input area */}
            <div style={{ padding: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                    onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask the agent… (Enter to send)"
                        rows={2}
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0',
                            fontSize: 12, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        style={{
                            background: input.trim() && !isTyping ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'transparent',
                            border: 'none', borderRadius: 8, padding: '6px 8px', cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                            color: input.trim() && !isTyping ? '#fff' : '#333', transition: 'all .2s', flexShrink: 0
                        }}>
                        <FaPaperPlane size={11} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes typingPulse {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
