import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheck, FaTimes, FaShieldAlt, FaUndo, FaFlask } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const PROVIDER_META = {
    gemini: { label: 'Google Gemini', color: '#4285F4', keyLabel: 'Gemini API Key', keyPlaceholder: 'AIzaSy...', keyHint: 'Get free key at https://ai.google.dev', bedrockNote: false },
    openai: { label: 'OpenAI ChatGPT', color: '#10a37f', keyLabel: 'OpenAI API Key', keyPlaceholder: 'sk-...', keyHint: 'Get key at https://platform.openai.com', bedrockNote: false },
    anthropic: { label: 'Anthropic Claude', color: '#D4A25A', keyLabel: 'Anthropic API Key', keyPlaceholder: 'sk-ant-...', keyHint: 'Get key at https://console.anthropic.com', bedrockNote: false },
    deepseek: { label: 'DeepSeek', color: '#1E7FA8', keyLabel: 'DeepSeek API Key', keyPlaceholder: 'sk-...', keyHint: 'Get key at https://platform.deepseek.com', bedrockNote: false },
    ollama: { label: 'Ollama (Local)', color: '#5C6BC0', keyLabel: null, keyPlaceholder: null, keyHint: 'No key needed — Ollama must be running locally on port 11434', bedrockNote: false },
    bedrock: { label: 'Amazon Bedrock', color: '#FF9900', keyLabel: 'access_key_id|secret_key|region', keyPlaceholder: 'AKIA...|secret...|us-east-1', keyHint: 'Combine with pipe: ACCESS_KEY_ID|SECRET_ACCESS_KEY|REGION', bedrockNote: true },
};

export default function AISettings() {
    const { api } = useAuth();
    const [catalogue, setCatalogue] = useState({});
    const [current, setCurrent] = useState({ provider: 'gemini', model: 'gemini-2.0-flash', hasKey: false });
    const [provider, setProvider] = useState('gemini');
    const [model, setModel] = useState('gemini-2.0-flash');
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(null); // { type: 'success'|'error'|'testing', msg }
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadCatalogue();
        loadConfig();
    }, []);

    const loadCatalogue = async () => {
        try {
            const res = await api.get('/ai/providers');
            setCatalogue(res.data);
        } catch { }
    };

    const loadConfig = async () => {
        try {
            const res = await api.get('/user/ai-config');
            setCurrent(res.data);
            setProvider(res.data.provider);
            setModel(res.data.model);
        } catch { }
    };

    const handleProviderChange = (p) => {
        setProvider(p);
        setApiKey('');
        setStatus(null);
        const defaultModel = catalogue[p]?.defaultModel || '';
        setModel(defaultModel);
    };

    const handleTest = async () => {
        setTesting(true);
        setStatus({ type: 'testing', msg: 'Connecting…' });
        try {
            const res = await api.post('/user/ai-config/test', { provider, model, apiKey: apiKey || undefined });
            if (res.data.success) {
                setStatus({ type: 'success', msg: `Connected! Response: "${res.data.reply?.slice(0, 80)}"` });
            } else {
                setStatus({ type: 'error', msg: res.data.error || 'Test failed.' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.error || 'Connection failed.' });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        try {
            await api.post('/user/ai-config', { provider, model, apiKey: apiKey || undefined });
            setCurrent({ provider, model, hasKey: !!apiKey || current.hasKey });
            setApiKey('');
            setStatus({ type: 'success', msg: 'Saved! Your new AI configuration is now active.' });
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.error || 'Save failed.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            await api.delete('/user/ai-config');
            setProvider('gemini'); setModel('gemini-2.0-flash'); setApiKey('');
            setCurrent({ provider: 'gemini', model: 'gemini-2.0-flash', hasKey: false });
            setStatus({ type: 'success', msg: 'Reset to system default Gemini key.' });
        } catch { }
    };

    const meta = PROVIDER_META[provider] || {};
    const models = catalogue[provider]?.models || [];
    const needsKey = catalogue[provider]?.requiresKey !== false;
    const isDefault = provider === 'gemini' && !current.hasKey;

    return (
        <div>
            {/* Current config badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
                <FaRobot size={13} style={{ color: '#818cf8' }} />
                <span style={{ color: '#94a3b8', fontSize: 12 }}>Active:</span>
                <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>
                    {PROVIDER_META[current.provider]?.label} / {current.model}
                </span>
                {isDefault && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>System Key</span>}
                {current.hasKey && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Your Key ✓</span>}
            </div>

            {/* Provider selector */}
            <label style={labelSt}>Provider</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {Object.entries(PROVIDER_META).map(([p, m]) => {
                    const active = provider === p;
                    return (
                        <button key={p} onClick={() => handleProviderChange(p)} style={{
                            background: active ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${active ? m.color + '55' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 10, padding: '8px 6px', cursor: 'pointer', transition: 'all .2s',
                            color: active ? '#fff' : '#64748b', fontSize: 11, fontWeight: 700, textAlign: 'center',
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, margin: '0 auto 4px', opacity: active ? 1 : 0.4 }} />
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {/* Model picker */}
            {models.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                    <label style={labelSt}>Model</label>
                    <select value={model} onChange={e => setModel(e.target.value)} style={{ ...inputSt, appearance: 'auto' }}>
                        {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </div>
            )}

            {/* API Key input */}
            {needsKey && (
                <div style={{ marginBottom: 14 }}>
                    <label style={labelSt}>
                        {meta.keyLabel || 'API Key'}
                        {current.hasKey && current.provider === provider && (
                            <span style={{ marginLeft: 8, color: '#4ade80', fontSize: 10 }}>● key saved</span>
                        )}
                    </label>
                    <input
                        type="password"
                        placeholder={current.hasKey && current.provider === provider ? '••••••••• (leave blank to keep current)' : (meta.keyPlaceholder || '')}
                        value={apiKey}
                        onChange={e => { setApiKey(e.target.value); setStatus(null); }}
                        style={inputSt}
                        onFocus={e => e.target.style.borderColor = `${meta.color}66`}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    {meta.keyHint && <p style={{ color: '#334155', fontSize: 11, margin: '4px 0 0' }}>{meta.keyHint}</p>}
                    {meta.bedrockNote && <p style={{ color: '#f59e0b', fontSize: 11, margin: '4px 0 0' }}>⚠ Combine 3 values with a pipe character: <code>ACCESS_KEY_ID|SECRET_KEY|REGION</code></p>}
                </div>
            )}

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, marginBottom: 16 }}>
                <FaShieldAlt size={12} style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, color: '#10b981', fontSize: 11, lineHeight: 1.5 }}>
                    Your API key is <strong>encrypted with AES-256</strong> before storage. It is never logged, exposed in API responses, or shared.
                </p>
            </div>

            {/* Status message */}
            {status && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: status.type === 'success' ? 'rgba(34,197,94,0.08)' : status.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)', border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.2)' : status.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 8, marginBottom: 14 }}>
                    {status.type === 'success' ? <FaCheck size={11} style={{ color: '#4ade80', marginTop: 2 }} /> : status.type === 'error' ? <FaTimes size={11} style={{ color: '#f87171', marginTop: 2 }} /> : null}
                    <p style={{ margin: 0, fontSize: 12, color: status.type === 'success' ? '#4ade80' : status.type === 'error' ? '#f87171' : '#818cf8', lineHeight: 1.5 }}>{status.msg}</p>
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleTest} disabled={testing || saving} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: testing ? '#64748b' : '#e2e8f0', fontWeight: 600, fontSize: 13, cursor: testing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FaFlask size={11} />{testing ? 'Testing…' : 'Test Connection'}
                </button>
                <button onClick={handleSave} disabled={saving || testing} style={{ flex: 1.5, padding: '9px 0', background: saving ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: 8, color: saving ? '#334155' : '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 15px rgba(99,102,241,0.4)' }}>
                    {saving ? 'Saving…' : 'Save Configuration'}
                </button>
            </div>

            {/* Reset to default */}
            {(current.hasKey || current.provider !== 'gemini') && (
                <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'transparent', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    <FaUndo size={10} /> Reset to system default (Gemini)
                </button>
            )}
        </div>
    );
}

const labelSt = { display: 'block', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
const inputSt = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box', fontFamily: 'inherit' };
