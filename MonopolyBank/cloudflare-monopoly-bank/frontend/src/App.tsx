import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import GameRoom from './components/GameRoom';
import { LegalModal } from './components/LegalModal';
import { InfoModal } from './components/InfoModal';

const API_BASE = import.meta.env.VITE_API_URL || 'https://monopoly-bank-worker.oopsoops-ty.workers.dev';

interface RoomInfo {
    code: string;
    name: string;
    playerCount: number;
    status: 'lobby' | 'active';
    createdAt: number;
    isPrivate?: boolean;
}

function Home() {
    const navigate = useNavigate();

    const [roomCode, setRoomCode] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Create Room State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [newRoomPassword, setNewRoomPassword] = useState('');

    // Join Private Room State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [targetRoomCode, setTargetRoomCode] = useState('');
    const [joinPassword, setJoinPassword] = useState('');

    // Legal & Info State
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Check Terms on Mount
    useEffect(() => {
        const accepted = localStorage.getItem('mono_terms_accepted');
        if (accepted === 'true') {
            setHasAcceptedTerms(true);
        }
    }, []);

    const handleAcceptTerms = () => {
        localStorage.setItem('mono_terms_accepted', 'true');
        setHasAcceptedTerms(true);
    };

    // Fetch rooms on mount and periodically
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/rooms`);
                const data = await res.json();
                setRooms(data.rooms || []);
            } catch (e) {
                console.error('Failed to fetch rooms:', e);
            }
            setLoadingRooms(false);
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const createRoom = async () => {
        if (isPrivate && !newRoomPassword) {
            setError('Password is required for private rooms');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomName: newRoomName || undefined,
                    isPrivate,
                    password: isPrivate ? newRoomPassword : undefined
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Failed to create room');
                setLoading(false);
                return;
            }
            // Navigate with password if private so we don't have to re-enter it
            navigate(`/room/${data.code}`, { state: { password: newRoomPassword } });
        } catch (e) {
            setError('Failed to create room');
        }
        setLoading(false);
        setShowCreateModal(false);
    };

    const joinRoom = async (code?: string) => {
        const targetCode = code || roomCode;
        if (!targetCode) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/rooms/${targetCode.toUpperCase()}`);
            if (!res.ok) {
                setError('Room not found');
                setLoading(false);
                return;
            }
            if (res.ok) {
                // Check if private from the room list info we already have
                const roomInfo = rooms.find(r => r.code === targetCode.toUpperCase());

                // If we don't have info (direct code entry), or if it's private
                // We'll just try to navigate. The GameRoom component will handle the password prompt
                // BUT, to be nicer, let's identify if it's private from our list
                if (roomInfo?.isPrivate) {
                    setTargetRoomCode(targetCode.toUpperCase());
                    setShowPasswordModal(true);
                    setLoading(false);
                    return;
                }

                navigate(`/room/${targetCode.toUpperCase()}`);
            } else {
                setError('Room not found');
            }
        } catch (e) {
            setError('Failed to check room');
        }
        setLoading(false);
    };

    // Filter rooms based on search query
    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="app-container" style={{ padding: 20, maxWidth: 600, margin: '0 auto', position: 'relative' }}>

            {/* Info Button */}
            <button
                onClick={() => setShowInfo(true)}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            </button>

            {/* Modals */}
            {!hasAcceptedTerms && <LegalModal onAccept={handleAcceptTerms} />}
            {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '40px 0 20px 0' }}>
                <img src="/Logo.png" alt="MonoBank" style={{ maxHeight: 110, maxWidth: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }} />
            </div>
            <p style={{ textAlign: 'center', marginBottom: 40, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>Bank for Monopolists</p>

            {error && (
                <div style={{
                    padding: 12,
                    background: 'rgba(220, 53, 69, 0.15)',
                    border: '1px solid rgba(220, 53, 69, 0.3)',
                    borderRadius: 12,
                    color: '#ff6b7a',
                    marginBottom: 24,
                    textAlign: 'center',
                    fontSize: 14,
                    backdropFilter: 'blur(4px)'
                }}>
                    {error}
                </div>
            )}

            {/* Create Room */}
            <div className="card" style={{ marginBottom: 20, padding: 20, background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ marginBottom: 16, color: 'white', fontSize: 16 }}>Start Game</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => { setShowCreateModal(true); setNewRoomName(''); setIsPrivate(false); setNewRoomPassword(''); }}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: 16,
                        background: 'linear-gradient(135deg, var(--mono-blue) 0%, #3a7bc8 100%)',
                        boxShadow: '0 4px 15px rgba(74, 144, 217, 0.3)',
                        borderRadius: 12
                    }}
                >
                    {loading ? 'Processing...' : '+ Create New Room'}
                </button>
            </div>

            {/* Join by Code */}
            <div className="card" style={{ marginBottom: 24, padding: 20, background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Join Existing Room
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <input
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: 18,
                            letterSpacing: 4,
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            textAlign: 'center'
                        }}
                        placeholder="CODE"
                        value={roomCode}
                        onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && joinRoom()}
                        maxLength={6}
                    />
                    <button
                        className="btn btn-success"
                        onClick={() => joinRoom()}
                        disabled={loading || !roomCode}
                        style={{
                            width: 'auto',
                            flexShrink: 0,
                            padding: '0 28px',
                            borderRadius: 12,
                            fontSize: 15,
                            background: 'linear-gradient(135deg, var(--mono-green) 0%, #059669 100%)',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        JOIN
                    </button>
                </div>
            </div>

            {/* MODALS */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: 400, maxWidth: '90%', background: '#1e293b', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginBottom: 20, fontSize: 22 }}>Create Room</h2>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Room Name (Optional)</label>
                            <input
                                style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={newRoomName}
                                onChange={e => setNewRoomName(e.target.value)}
                                placeholder="My Monopoly Game"
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={e => setIsPrivate(e.target.checked)}
                                    style={{ width: 20, height: 20, accentColor: 'var(--mono-blue)' }}
                                />
                                <span style={{ fontSize: 14 }}>Private Room (Password)</span>
                            </label>
                        </div>

                        {isPrivate && (
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Set Password</label>
                                <input
                                    type="password"
                                    style={{ width: '100%', padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    value={newRoomPassword}
                                    onChange={e => setNewRoomPassword(e.target.value)}
                                    placeholder="Secret Password"
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ borderRadius: 10 }}>Cancel</button>
                            <button className="btn btn-primary" onClick={createRoom} disabled={loading || (isPrivate && !newRoomPassword)} style={{ borderRadius: 10, padding: '12px 24px' }}>Create Room</button>
                        </div>
                    </div>
                </div>
            )}

            {showPasswordModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: 400, maxWidth: '90%', background: '#1e293b', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ background: 'rgba(244, 199, 82, 0.1)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--mono-gold)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <h2 style={{ marginBottom: 8, fontSize: 20 }}>Locked Room</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Enter password to join room {targetRoomCode}</p>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <input
                                type="password"
                                style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', letterSpacing: 2 }}
                                value={joinPassword}
                                onChange={e => setJoinPassword(e.target.value)}
                                placeholder="PASSWORD"
                                onKeyDown={e => { if (e.key === 'Enter') navigate(`/room/${targetRoomCode}`, { state: { password: joinPassword } }) }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-ghost" onClick={() => { setShowPasswordModal(false); setJoinPassword(''); }} style={{ flex: 1, borderRadius: 10 }}>Cancel</button>
                            <button className="btn btn-success" onClick={() => navigate(`/room/${targetRoomCode}`, { state: { password: joinPassword } })} style={{ flex: 1, borderRadius: 10 }}>Unlock & Join</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Room List */}
            <div className="card" style={{
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: 0,
                overflow: 'hidden'
            }}>
                <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-secondary)' }}>Public Rooms</h2>
                    <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 10, color: 'var(--text-muted)' }}>
                        {filteredRooms.length}
                    </span>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '0 20px 16px', position: 'relative' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(calc(-50% - 8px))', pointerEvents: 'none', opacity: 0.7 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        placeholder="Search rooms..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px 10px 36px',
                            borderRadius: 10,
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'var(--text-primary)',
                            fontSize: 14
                        }}
                    />
                </div>

                {/* Room List */}
                <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0 20px 20px' }}>
                    {loadingRooms ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>
                            Looking for active games...
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>
                            {searchQuery ? 'No rooms match your search' : 'No public rooms available right now.'}
                        </div>
                    ) : (
                        filteredRooms.map(room => (
                            <div
                                key={room.code}
                                onClick={() => joinRoom(room.code)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    marginBottom: 8,
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid transparent'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 600,
                                        marginBottom: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 15
                                    }}>
                                        {room.name}
                                        {room.isPrivate && <span title="Private Room"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--mono-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>}
                                        <span style={{
                                            fontSize: 11,
                                            color: 'rgba(255,255,255,0.5)',
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            letterSpacing: 1
                                        }}>
                                            {room.code}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: 13,
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12
                                    }}>
                                        <span>{room.playerCount} player{room.playerCount !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: 0.5,
                                    background: room.status === 'lobby'
                                        ? 'rgba(0, 200, 150, 0.1)'
                                        : 'rgba(244, 199, 82, 0.1)',
                                    color: room.status === 'lobby'
                                        ? 'var(--success)'
                                        : 'var(--warning)',
                                    border: room.status === 'lobby'
                                        ? '1px solid rgba(0, 200, 150, 0.2)'
                                        : '1px solid rgba(244, 199, 82, 0.2)'
                                }}>
                                    {room.status === 'lobby' ? 'JOINABLE' : 'IN PROGRESS'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
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
