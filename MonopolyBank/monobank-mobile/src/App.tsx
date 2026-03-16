import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import GameRoom from './components/GameRoom';
import { LegalModal } from './components/LegalModal';
import { InfoModal } from './components/InfoModal';

// ===== LOCAL WIFI MODE =====
const SERVER_PORT = 3000;
const ROOM_CODE = 'GAME'; // Fixed single room code

function getApiBase(): string {
    const savedIp = localStorage.getItem('mono_server_ip');
    if (savedIp) {
        return `http://${savedIp}:${SERVER_PORT}`;
    }
    return `http://${window.location.hostname}:${SERVER_PORT}`;
}

function Home() {
    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Legal & Info
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Connection
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [hostIp, setHostIp] = useState('');
    const [serverConnected, setServerConnected] = useState(false);
    const [serverIp, setServerIp] = useState(localStorage.getItem('mono_server_ip') || '');
    const [hostIPs, setHostIPs] = useState<string[]>([]);
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('mono_terms_accepted');
        if (accepted === 'true') setHasAcceptedTerms(true);
    }, []);

    const handleAcceptTerms = () => {
        localStorage.setItem('mono_terms_accepted', 'true');
        setHasAcceptedTerms(true);
    };

    // Check server connection
    const checkServerConnection = async (ip?: string): Promise<{ ok: boolean; ips?: string[] }> => {
        const apiBase = ip ? `http://${ip}:${SERVER_PORT}` : getApiBase();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${apiBase}/api/health`, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                const data = await res.json();
                setServerConnected(true);
                if (ip) {
                    localStorage.setItem('mono_server_ip', ip);
                    setServerIp(ip);
                }
                return { ok: true, ips: data.ips || [] };
            }
        } catch (e) {
            // Not reachable
        }
        setServerConnected(false);
        return { ok: false };
    };

    // Check on mount (if previously connected)
    useEffect(() => {
        if (serverIp) {
            checkServerConnection(serverIp);
        }
    }, []);

    // ===== CREATE GAME =====
    // Host taps this → server must already be running on this device (or we start it)
    // For now, we assume the server is started separately. Auto-connect to localhost.
    const createGame = async () => {
        setLoading(true);
        setError('');

        // Try connecting to local server
        const result = await checkServerConnection('127.0.0.1');
        if (!result.ok) {
            // Try localhost hostname
            const result2 = await checkServerConnection(window.location.hostname);
            if (!result2.ok) {
                setError('Server not running. Start the server first with: npm run start:server');
                setLoading(false);
                return;
            }
            setHostIPs(result2.ips || []);
        } else {
            setHostIPs(result.ips || []);
        }

        setIsHost(true);
        localStorage.setItem('mono_is_host', 'true');
        setLoading(false);
        navigate(`/room/${ROOM_CODE}`, { state: { isHost: true } });
    };

    // ===== JOIN GAME =====
    const joinGame = async () => {
        if (!hostIp) {
            setError('Please enter the host\'s IP address');
            return;
        }

        setLoading(true);
        setError('');

        const result = await checkServerConnection(hostIp);
        if (!result.ok) {
            setError(`Cannot connect to ${hostIp}:${SERVER_PORT}. Make sure the host is running.`);
            setLoading(false);
            return;
        }

        localStorage.setItem('mono_is_host', 'false');
        setLoading(false);
        setShowJoinModal(false);
        navigate(`/room/${ROOM_CODE}`, { state: { isHost: false } });
    };

    return (
        <div className="app-container" style={{ padding: 20, maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Info Button */}
            <button
                onClick={() => setShowInfo(true)}
                style={{
                    position: 'absolute', top: 20, right: 20,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%', width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            </button>

            {/* Modals */}
            {!hasAcceptedTerms && <LegalModal onAccept={handleAcceptTerms} />}
            {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

            {/* Logo & Branding */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ marginBottom: 12 }}>
                    <img src="/Logo.png" alt="MonoBank" style={{ maxHeight: 130, maxWidth: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.5))' }} />
                </div>
                <p style={{ textAlign: 'center', marginBottom: 40, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7, fontWeight: 500 }}>Bank for Monopolists</p>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 20px', width: '100%',
                        background: 'rgba(220, 53, 69, 0.12)', border: '1px solid rgba(220, 53, 69, 0.25)',
                        borderRadius: 14, color: '#ff6b7a', marginBottom: 24,
                        textAlign: 'center', fontSize: 14, backdropFilter: 'blur(4px)'
                    }}>
                        {error}
                    </div>
                )}

                {/* ===== CREATE GAME ===== */}
                <button
                    onClick={createGame}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '18px 24px', marginBottom: 14,
                        fontSize: 17, fontWeight: 700, letterSpacing: 0.5,
                        background: 'linear-gradient(135deg, #4a90d9 0%, #3a7bc8 50%, #2d6cb5 100%)',
                        color: 'white', border: 'none', borderRadius: 16,
                        cursor: loading ? 'wait' : 'pointer',
                        boxShadow: '0 8px 32px rgba(74, 144, 217, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                        transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                    {loading ? 'Connecting...' : 'Create Game'}
                </button>

                {/* ===== JOIN GAME ===== */}
                <button
                    onClick={() => { setShowJoinModal(true); setError(''); setHostIp(''); }}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '18px 24px', marginBottom: 14,
                        fontSize: 17, fontWeight: 700, letterSpacing: 0.5,
                        background: 'linear-gradient(135deg, #00c896 0%, #059669 100%)',
                        color: 'white', border: 'none', borderRadius: 16,
                        cursor: loading ? 'wait' : 'pointer',
                        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                        transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                    Join Game
                </button>

                {/* Version */}
                <p style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>
                    MonoBank v1.0 — Local WiFi
                </p>
            </div>

            {/* ===== JOIN GAME MODAL ===== */}
            {showJoinModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 20
                }}>
                    <div style={{
                        width: 400, maxWidth: '100%',
                        background: 'linear-gradient(180deg, #1e293b 0%, #172033 100%)',
                        padding: 28, borderRadius: 24,
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{
                                background: 'rgba(0, 200, 150, 0.1)', width: 64, height: 64,
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', color: 'var(--mono-green)',
                                boxShadow: '0 0 24px rgba(0, 200, 150, 0.15)'
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
                            </div>
                            <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Join Game</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                                Enter the IP address shown on<br />the host's device
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                padding: '10px 14px', marginBottom: 16,
                                background: 'rgba(220, 53, 69, 0.12)', border: '1px solid rgba(220, 53, 69, 0.25)',
                                borderRadius: 12, color: '#ff6b7a', textAlign: 'center', fontSize: 13
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Host IP Address</label>
                            <input
                                style={{
                                    width: '100%', padding: '16px 18px', borderRadius: 14,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', textAlign: 'center', letterSpacing: 2,
                                    fontSize: 20, fontWeight: 600,
                                    transition: 'border-color 0.2s'
                                }}
                                value={hostIp}
                                onChange={e => setHostIp(e.target.value)}
                                placeholder="192.168.1.XX"
                                onKeyDown={e => { if (e.key === 'Enter') joinGame(); }}
                                inputMode="decimal"
                                autoFocus
                                onFocus={e => e.currentTarget.style.borderColor = 'rgba(0, 200, 150, 0.4)'}
                                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => { setShowJoinModal(false); setError(''); }}
                                style={{ flex: 1, borderRadius: 12, padding: '14px 16px', fontSize: 15 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={joinGame}
                                disabled={loading || !hostIp}
                                style={{
                                    flex: 1, borderRadius: 12, padding: '14px 16px', fontSize: 15,
                                    fontWeight: 700
                                }}
                            >
                                {loading ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:code" element={<GameRoom />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
