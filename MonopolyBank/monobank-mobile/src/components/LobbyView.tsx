import { useState } from 'react';

interface LobbyViewProps {
    state: any;
    me: any;
    send: any;
    roomCode: string;
}

export default function LobbyView({ state, me, send, roomCode }: LobbyViewProps) {
    const isHost = me?.isHost;
    const [settings, setSettings] = useState(state.settings);
    const [editingName, setEditingName] = useState(false);
    const [roomName, setRoomName] = useState(state.roomName);



    const updateSetting = (key: string, val: number | boolean | string) => {
        const newSettings = { ...settings, [key]: val };
        setSettings(newSettings);
        send('update_settings', newSettings);
    };

    const updateRoomName = () => {
        if (roomName.trim()) {
            send('update_room_name', { playerId: me?.id, roomName: roomName.trim() });
        }
        setEditingName(false);
    };

    const allReady = state.players.every((p: any) => p.ready);
    const readyCount = state.players.filter((p: any) => p.ready).length;

    return (
        <div className="app-container" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
            <header className="mb-6" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src="/smallhatlogo.png" style={{ width: 48, height: 48, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} alt="Logo" />
                    </div>
                </div>

                {/* Room Name (editable by host) */}
                {editingName && isHost ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, justifyContent: 'center' }}>
                        <input
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && updateRoomName()}
                            maxLength={30}
                            autoFocus
                            style={{
                                fontSize: 24,
                                fontWeight: 700,
                                textAlign: 'center',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 12,
                                padding: '8px 16px',
                                color: 'white',
                                width: '100%',
                                maxWidth: 300
                            }}
                        />
                        <button className="btn btn-success" onClick={updateRoomName} style={{ padding: '8px 16px', borderRadius: 10 }}>
                            Save
                        </button>
                    </div>
                ) : (
                    <h1
                        onClick={() => isHost && setEditingName(true)}
                        style={{
                            cursor: isHost ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            fontSize: 28,
                            fontWeight: 800,
                            letterSpacing: -0.5,
                            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            marginBottom: 8
                        }}
                        title={isHost ? 'Click to edit room name' : undefined}
                    >
                        {state.roomName || `Room ${roomCode}`}
                        {isHost && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        )}
                    </h1>
                )}
            </header>

            <div className="card" style={{
                background: 'rgba(30, 41, 59, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: 24,
                marginBottom: 24,
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
            }}>
                <div className="flex-between mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: 18 }}>Players <span style={{ opacity: 0.5, fontSize: 14 }}>{state.players.length}</span></h2>
                    <div style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: allReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 199, 82, 0.1)',
                        border: allReady ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(244, 199, 82, 0.2)'
                    }}>
                        <span style={{ color: allReady ? 'var(--success)' : 'var(--warning)', fontSize: 13, fontWeight: 600 }}>
                            {readyCount}/{state.players.length} Ready
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.players.map((p: any) => (
                        <div key={p.id} className="flex-between" style={{
                            padding: '12px 16px',
                            background: p.id === me?.id ? 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' : 'transparent',
                            borderRadius: 12,
                            border: p.id === me?.id ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                            opacity: p.ready ? 1 : 0.7
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {/* Ready indicator */}
                                <div style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 12,
                                    background: p.ready ? 'linear-gradient(135deg, var(--mono-green), #059669)' : 'rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: p.ready ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                                    color: 'white'
                                }}>
                                    {p.ready && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                                <div>
                                    <div style={{ fontWeight: p.id === me?.id ? 700 : 500, fontSize: 16 }}>
                                        {p.name}
                                        {p.id === me?.id && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8, fontWeight: 400 }}>(You)</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                        {p.isHost && (
                                            <span style={{ fontSize: 10, background: 'var(--mono-blue)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.5 }}>HOST</span>
                                        )}
                                        {p.isOriginalHost && !p.isHost && (
                                            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>CREATOR</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Kick button (host only, can't kick self) */}
                            {isHost && p.id !== me?.id && (
                                <button
                                    onClick={() => send('kick_player', { playerId: me?.id, targetPlayerId: p.id })}
                                    style={{
                                        background: 'rgba(220, 53, 69, 0.1)',
                                        border: '1px solid rgba(220, 53, 69, 0.2)',
                                        color: '#ff6b7a',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: 8,
                                        transition: 'all 0.2s',
                                        display: 'flex'
                                    }}
                                    title="Kick player"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Ready toggle button */}
                <div style={{ marginTop: 24 }}>
                    <button
                        onClick={() => send('toggle_ready', { playerId: me?.id })}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: me?.ready
                                ? 'rgba(255,255,255,0.05)'
                                : 'linear-gradient(135deg, var(--mono-green) 0%, #059669 100%)',
                            border: me?.ready ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            color: me?.ready ? 'var(--text-muted)' : 'white',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            boxShadow: me?.ready ? 'none' : '0 8px 20px -4px rgba(16, 185, 129, 0.4)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            transition: 'all 0.2s'
                        }}
                    >
                        {me?.ready ? (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                Cancel Ready
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                I'M READY
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isHost ? (
                <div className="card" style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: 24
                }}>
                    <h2 style={{ fontSize: 18, marginBottom: 20 }}>Game Settings</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>GO Payout</label>
                            <input
                                type="number"
                                value={settings.goPayout}
                                onChange={e => updateSetting('goPayout', Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: 20,
                                    fontWeight: 700,
                                    padding: 0
                                }}
                            />
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Starting Cash</label>
                            <input
                                type="number"
                                value={settings.playerStartingCash || 1500}
                                onChange={e => updateSetting('playerStartingCash', Number(e.target.value))}
                                min="100"
                                step="100"
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: 20,
                                    fontWeight: 700,
                                    padding: 0
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Inflation Mode</label>
                            <select
                                value={settings.inflationMode || 'OFF'}
                                onChange={e => updateSetting('inflationMode', e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none'
                                }}
                            >
                                <option value="OFF">OFF - Stable Economy</option>
                                <option value="STANDARD">STANDARD - Wages & Prices rise with Money Supply</option>
                                <option value="CAPITALISTIC">CAPITALISTIC - Prices rise with Money Supply, Wages compound 10% on GO</option>
                            </select>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                                {(settings.inflationMode || 'OFF') === 'OFF' && "Prices, rents, and wages remain completely fixed throughout the game."}
                                {settings.inflationMode === 'STANDARD' && "As the Bank prints money into the economy, property values, rents, and GO wages naturally inflate."}
                                {settings.inflationMode === 'CAPITALISTIC' && "Property values and rents inflate with the money supply. GO wages individually compound by 10% each time a player passes GO."}
                            </p>
                        </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                            <input
                                type="checkbox"
                                checked={settings.noDoubleRentOnFullSet || false}
                                onChange={e => updateSetting('noDoubleRentOnFullSet', e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: 'var(--mono-blue)' }}
                            />
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>No Double Rent on Full Set</span>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Base rent won't double when owning color group
                                </p>
                            </div>
                        </label>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                            <input
                                type="checkbox"
                                checked={settings.freeParking || false}
                                onChange={e => updateSetting('freeParking', e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: 'var(--mono-gold)' }}
                            />
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: settings.freeParking ? 'var(--mono-gold)' : 'inherit' }}>Free Parking Jackpot</span>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Payments to bank gather in a pot clamable by anyone
                                </p>
                            </div>
                        </label>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                            <input
                                type="checkbox"
                                checked={settings.stocks ?? true}
                                onChange={e => updateSetting('stocks', e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: 'var(--mono-green)' }}
                            />
                            <div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: (settings.stocks ?? true) ? 'var(--mono-green)' : 'inherit' }}>Enable Stock Market</span>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Allow trading of MonoBank stock.
                                </p>
                            </div>
                        </label>
                    </div>

                    <button
                        onClick={() => send('start_game', { playerId: me?.id })}
                        disabled={!allReady || state.players.length < 2}
                        style={{
                            marginTop: 24,
                            width: '100%',
                            padding: '16px',
                            background: (!allReady || state.players.length < 2)
                                ? 'rgba(255,255,255,0.05)'
                                : 'linear-gradient(135deg, var(--mono-blue) 0%, #3a7bc8 100%)',
                            color: (!allReady || state.players.length < 2) ? 'var(--text-muted)' : 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            boxShadow: (!allReady || state.players.length < 2) ? 'none' : '0 8px 25px -5px rgba(59, 130, 246, 0.5)',
                            cursor: (!allReady || state.players.length < 2) ? 'not-allowed' : 'pointer',
                            opacity: (!allReady || state.players.length < 2) ? 0.7 : 1,
                            transition: 'all 0.3s'
                        }}
                    >
                        {state.players.length < 2
                            ? 'Need at least 2 players'
                            : !allReady
                                ? `Waiting for players... (${readyCount}/${state.players.length})`
                                : 'START GAME'
                        }
                    </button>
                </div>
            ) : (
                <div className="card text-center" style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: 30
                }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                        {me?.ready
                            ? 'Waiting for host to start the game...'
                            : 'Click "I\'M READY" when you are set!'
                        }
                    </p>
                </div>
            )}

            {/* Leave room button */}
            <div style={{ marginTop: 30, textAlign: 'center' }}>
                <button
                    onClick={() => send('leave_room', { playerId: me?.id })}
                    style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        fontSize: 13,
                        cursor: 'pointer',
                        padding: '8px 16px',
                        textDecoration: 'underline',
                        opacity: 0.7
                    }}
                >
                    Leave Room
                </button>
            </div>
        </div>
    );
}
