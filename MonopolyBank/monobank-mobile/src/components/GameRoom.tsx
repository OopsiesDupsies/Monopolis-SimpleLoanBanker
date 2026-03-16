import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import LobbyView from './LobbyView';
import BankView from './BankView';

// ===== LOCAL WIFI SERVER =====
const SERVER_PORT = 3000;

function getServerIp(): string {
    return localStorage.getItem('mono_server_ip') || window.location.hostname;
}

function getWsApi(): string {
    return `ws://${getServerIp()}:${SERVER_PORT}/api`;
}

function getHttpApi(): string {
    return `http://${getServerIp()}:${SERVER_PORT}/api`;
}

const MAX_RECONNECT_DELAY = 10000;
const BASE_RECONNECT_DELAY = 1000;

export default function GameRoom() {
    const { code } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [state, setState] = useState<any>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string>('');
    const [roomNotFound, setRoomNotFound] = useState(false);
    const [kicked, setKicked] = useState(false);
    const [leftRoom, setLeftRoom] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const [insufficientFunds, setInsufficientFunds] = useState<any>(null);
    const [insolvencyWarning, setInsolvencyWarning] = useState<any>(null);
    const [myName, setMyName] = useState(localStorage.getItem('mono_name') || '');
    const ws = useRef<WebSocket | null>(null);
    const intentionalLeave = useRef(false);
    const wasInGame = useRef(false);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldReconnect = useRef(true);

    const connectWebSocket = useCallback(() => {
        if (!code || !shouldReconnect.current) return;

        const wsUrl = `${getWsApi()}/rooms/${code}/websocket`;
        console.log(`Connecting to WebSocket (attempt ${reconnectAttempt.current}):`, wsUrl);

        try {
            ws.current = new WebSocket(wsUrl);
        } catch (e) {
            console.error('WebSocket constructor error:', e);
            scheduleReconnect();
            return;
        }

        const socket = ws.current;

        socket.onopen = () => {
            console.log('Connected');
            setConnected(true);
            setReconnecting(false);
            setError('');
            reconnectAttempt.current = 0;
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'state') {
                const newState = msg.payload;
                const currentName = localStorage.getItem('mono_name');
                const stillInGame = newState.players?.some((p: any) => p.name === currentName);

                if (stillInGame) {
                    wasInGame.current = true;
                }

                if (wasInGame.current && !stillInGame && currentName) {
                    if (intentionalLeave.current) {
                        setLeftRoom(true);
                    } else {
                        setKicked(true);
                    }
                    shouldReconnect.current = false;
                    socket.close();
                    return;
                }

                setState(newState);
                setError('');
            } else if (msg.type === 'error') {
                setError(msg.message);
                setTimeout(() => setError(prev => prev === msg.message ? '' : prev), 5000);
            } else if (msg.type === 'kicked') {
                setKicked(true);
                shouldReconnect.current = false;
                socket.close();
            } else if (msg.type === 'insufficient_funds') {
                setInsufficientFunds(msg.payload);
            } else if (msg.type === 'insolvency_warning') {
                setInsolvencyWarning(msg.payload);
            }
        };

        socket.onclose = () => {
            console.log('Disconnected');
            setConnected(false);
            if (shouldReconnect.current && !intentionalLeave.current && !kicked) {
                scheduleReconnect();
            }
        };

        socket.onerror = () => {
            console.error('WebSocket error');
        };
    }, [code]);

    const scheduleReconnect = useCallback(() => {
        if (!shouldReconnect.current) return;
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt.current), MAX_RECONNECT_DELAY);
        reconnectAttempt.current++;
        setReconnecting(true);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempt.current})...`);
        reconnectTimer.current = setTimeout(() => {
            connectWebSocket();
        }, delay);
    }, [connectWebSocket]);

    useEffect(() => {
        if (!code) return;

        const checkAndConnect = async () => {
            try {
                const res = await fetch(`${getHttpApi()}/rooms/${code}`);
                if (!res.ok) {
                    setRoomNotFound(true);
                    return;
                }
            } catch (e) {
                setRoomNotFound(true);
                return;
            }
            connectWebSocket();
        };

        shouldReconnect.current = true;
        reconnectAttempt.current = 0;
        checkAndConnect();

        return () => {
            shouldReconnect.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (ws.current) ws.current.close();
        };
    }, [code, connectWebSocket]);

    const send = (type: string, payload: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            if (type === 'leave_room') {
                intentionalLeave.current = true;
                shouldReconnect.current = false;
            }
            ws.current.send(JSON.stringify({ type, payload }));
        }
    };

    const joinGame = () => {
        if (!myName) return;
        localStorage.setItem('mono_name', myName);
        send('join', { name: myName });
    };

    // Player left room intentionally
    if (leftRoom) {
        return (
            <div className="app-container" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                    <h2 style={{ marginBottom: 16 }}>Left Room</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                        You have left the room.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Player was kicked
    if (kicked) {
        return (
            <div className="app-container" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>Kicked from Room</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                        You have been removed from this room by the host.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Room not found
    if (roomNotFound) {
        return (
            <div className="app-container" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>Room Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                        The room "{code}" does not exist or has been deleted.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Only show blocking "connecting" screen if we have NO game state yet
    if (!connected && !state) return (
        <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {reconnecting ? (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--mono-gold)', marginBottom: 8 }}>Reconnecting...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Attempt {reconnectAttempt.current}</p>
                </div>
            ) : (
                <p>Connecting...</p>
            )}
        </div>
    );

    // Login Screen (if not in state players)
    const me = state?.players?.find((p: any) => p.name === myName);

    if (!state) return <div className="app-container">Loading State...</div>;

    if (!me) {
        return (
            <div className="app-container" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 className="text-center mb-4">Join Game</h1>
                {error && (
                    <div style={{
                        padding: 16,
                        background: 'var(--danger)',
                        color: 'white',
                        borderRadius: 8,
                        marginBottom: 16,
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}
                <div className="card">
                    <div className="input-group">
                        <label>Your Name</label>
                        <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Enter name..." />
                    </div>
                    <button className="btn btn-primary" onClick={joinGame}>Join Game</button>
                </div>
            </div>
        );
    }

    // Route based on status
    if (state.status === 'lobby') {
        return (
            <>
                {/* Non-blocking reconnection banner */}
                {!connected && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(234, 88, 12, 0.95))',
                        color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                        backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
                    }}>
                        ⚡ Reconnecting... (attempt {reconnectAttempt.current})
                    </div>
                )}
                {/* Non-blocking error toast */}
                {error && connected && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
                        color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                        backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer'
                    }} onClick={() => setError('')}>
                        ⚠ {error} <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>(tap to dismiss)</span>
                    </div>
                )}
                <LobbyView state={state} me={me} send={send} roomCode={code || ''} />
            </>
        );
    }

    return (
        <>
            {/* Non-blocking reconnection banner */}
            {!connected && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(234, 88, 12, 0.95))',
                    color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
                }}>
                    ⚡ Reconnecting... (attempt {reconnectAttempt.current})
                </div>
            )}
            {/* Non-blocking error toast */}
            {error && connected && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
                    color: '#fff', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600,
                    backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                }} onClick={() => setError('')}>
                    ⚠ {error} <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 8 }}>(tap to dismiss)</span>
                </div>
            )}
            <BankView state={state} me={me} send={send}
                insufficientFunds={insufficientFunds}
                onDismissInsufficientFunds={() => setInsufficientFunds(null)}
                insolvencyWarning={insolvencyWarning}
                onDismissInsolvencyWarning={() => setInsolvencyWarning(null)}
            />
        </>
    );
}
