

interface IncomingTradesProps {
    state: any;
    me: any;
    send: (type: string, payload: any) => void;
    onCounter?: (trade: any) => void;  // Callback to open TradingModal with counter data
}

export function IncomingTrades({ state, me, send, onCounter }: IncomingTradesProps) {
    // Get pending trades for me
    const incomingTrades = (state.tradeOffers || []).filter(
        (t: any) => t.to_player_id === me.id && t.status === 'pending'
    );

    const getPlayerName = (id: string) => state.players?.find((p: any) => p.id === id)?.name || 'Unknown';
    const getProperty = (id: string) => (state.properties || []).find((p: any) => p.id === id);

    if (incomingTrades.length === 0) return null;

    return (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(151,117,250,0.15), rgba(100,80,200,0.1))', border: '1px solid rgba(151,117,250,0.3)' }}>
            <h4 style={{ color: 'var(--mono-purple)', marginBottom: 12, fontSize: 14 }}>
                Incoming Trades ({incomingTrades.length})
            </h4>

            {incomingTrades.map((trade: any) => (
                <div key={trade.id} style={{
                    padding: 12,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    marginBottom: 8
                }}>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                        From: {getPlayerName(trade.from_player_id)}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 10 }}>
                        {/* They offer */}
                        <div style={{ fontSize: 10 }}>
                            <p style={{ color: 'var(--mono-green)', fontWeight: 600, marginBottom: 4 }}>They Offer:</p>
                            {(trade.offer_properties || []).map((propId: string) => {
                                const prop = getProperty(propId);
                                return prop ? <p key={propId}>{prop.name}</p> : null;
                            })}
                            {trade.offer_cash > 0 && <p>${trade.offer_cash}</p>}
                            {state.settings.stocks !== false && trade.offer_shares > 0 && <p>{trade.offer_shares} shares</p>}
                            {(trade.offer_loans || []).length > 0 && (
                                <p style={{ color: 'var(--mono-red)' }}>{trade.offer_loans.length} loans</p>
                            )}
                            {!trade.offer_properties?.length && !trade.offer_cash && !trade.offer_shares && !trade.offer_loans?.length && (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing</p>
                            )}
                        </div>

                        <span style={{ alignSelf: 'center', fontSize: 16 }}>⇄</span>

                        {/* They want */}
                        <div style={{ fontSize: 10, textAlign: 'right' }}>
                            <p style={{ color: 'var(--mono-red)', fontWeight: 600, marginBottom: 4 }}>They Want:</p>
                            {(trade.request_properties || []).map((propId: string) => {
                                const prop = getProperty(propId);
                                return prop ? <p key={propId}>{prop.name}</p> : null;
                            })}
                            {trade.request_cash > 0 && <p>${trade.request_cash}</p>}
                            {state.settings.stocks !== false && trade.request_shares > 0 && <p>{trade.request_shares} shares</p>}
                            {(trade.request_loans || []).length > 0 && (
                                <p style={{ color: 'var(--mono-gold)' }}>{trade.request_loans.length} loans</p>
                            )}
                            {!trade.request_properties?.length && !trade.request_cash && !trade.request_shares && !trade.request_loans?.length && (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing</p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-success"
                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                            onClick={() => send('accept_trade', { trade_id: trade.id, player_id: me.id })}
                        >
                            Accept
                        </button>
                        <button
                            className="btn btn-warning"
                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                            onClick={() => onCounter?.(trade)}
                        >
                            ↩ Counter
                        </button>
                        <button
                            className="btn btn-danger"
                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                            onClick={() => send('reject_trade', { trade_id: trade.id, player_id: me.id })}
                        >
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
