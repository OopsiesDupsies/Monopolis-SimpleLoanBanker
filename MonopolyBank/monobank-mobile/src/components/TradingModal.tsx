import { useState, useEffect } from 'react';
import Modal from './Modal';

interface TradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    me: any;
    state: any;
    send: (type: string, payload: any) => void;
    targetPlayerId?: string;
    // Counter-trade mode: pre-fill with original trade's values (swapped)
    counterTrade?: {
        id: string;
        from_player_id: string;  // Original sender (becomes our target)
        offer_properties: string[];
        offer_cash: number;
        offer_shares: Record<string, number>;
        offer_loans: string[];
        request_properties: string[];
        request_cash: number;
        request_shares: Record<string, number>;
        request_loans: string[];
    } | null;
}

export default function TradingModal({ isOpen, onClose, me, state, send, targetPlayerId, counterTrade }: TradingModalProps) {
    // Determine target: counterTrade sender or manual selection
    const initialTarget = counterTrade?.from_player_id || targetPlayerId || '';
    const [selectedTarget, setSelectedTarget] = useState(initialTarget);

    // What I'm offering (for counter: what they originally requested from me)
    const [offerProperties, setOfferProperties] = useState<string[]>([]);
    const [offerCash, setOfferCash] = useState(0);
    const [offerShares, setOfferShares] = useState<Record<string, number>>({});
    const [offerLoans, setOfferLoans] = useState<string[]>([]);

    // What I'm requesting (for counter: what they originally offered to me)
    const [requestProperties, setRequestProperties] = useState<string[]>([]);
    const [requestCash, setRequestCash] = useState(0);
    const [requestShares, setRequestShares] = useState<Record<string, number>>({});
    const [requestLoans, setRequestLoans] = useState<string[]>([]);

    // Pre-fill values when counterTrade changes or modal opens
    useEffect(() => {
        if (counterTrade && isOpen) {
            // For counter: I offer what they wanted, I request what they offered
            setSelectedTarget(counterTrade.from_player_id);
            setOfferProperties(counterTrade.request_properties || []);
            setOfferCash(counterTrade.request_cash || 0);
            setOfferShares(counterTrade.request_shares || {});
            setOfferLoans(counterTrade.request_loans || []);
            setRequestProperties(counterTrade.offer_properties || []);
            setRequestCash(counterTrade.offer_cash || 0);
            setRequestShares(counterTrade.offer_shares || {});
            setRequestLoans(counterTrade.offer_loans || []);
        } else if (isOpen && !counterTrade) {
            // Reset when opening fresh trade
            setSelectedTarget(targetPlayerId || '');
            setOfferProperties([]);
            setOfferCash(0);
            setOfferShares({});
            setOfferLoans([]);
            setRequestProperties([]);
            setRequestCash(0);
            setRequestShares({});
            setRequestLoans([]);
        }
    }, [counterTrade, isOpen, targetPlayerId]);

    const targetPlayer = state.players?.find((p: any) => p.id === selectedTarget);
    const myProperties = (state.properties || []).filter((p: any) => p.ownerId === me.id);
    const theirProperties = targetPlayer ? (state.properties || []).filter((p: any) => p.ownerId === targetPlayer.id) : [];
    const companies = state.companies || [];

    // Check if property can be traded (no improvements in color group)
    const canTrade = (prop: any) => {
        const groupProps = (state.properties || []).filter((p: any) => p.colorGroup === prop.colorGroup);
        return !groupProps.some((p: any) => (p.improvements || 0) > 0);
    };

    const toggleProperty = (propId: string, isOffer: boolean) => {
        if (isOffer) {
            setOfferProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
        } else {
            setRequestProperties(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
        }
    };

    const toggleLoan = (loanId: string, isOffer: boolean) => {
        if (isOffer) {
            setOfferLoans(prev => prev.includes(loanId) ? prev.filter(id => id !== loanId) : [...prev, loanId]);
        } else {
            setRequestLoans(prev => prev.includes(loanId) ? prev.filter(id => id !== loanId) : [...prev, loanId]);
        }
    };

    const setShareQty = (companyId: string, qty: number, isOffer: boolean) => {
        if (isOffer) {
            setOfferShares(prev => {
                const next = { ...prev };
                if (qty <= 0) delete next[companyId];
                else next[companyId] = qty;
                return next;
            });
        } else {
            setRequestShares(prev => {
                const next = { ...prev };
                if (qty <= 0) delete next[companyId];
                else next[companyId] = qty;
                return next;
            });
        }
    };

    const sendTrade = () => {
        if (!selectedTarget) return;

        if (counterTrade) {
            // Send as counter-trade
            send('counter_trade', {
                trade_id: counterTrade.id,
                player_id: me.id,
                offer_properties: offerProperties,
                offer_cash: offerCash,
                offer_shares: offerShares,
                offer_loans: offerLoans,
                request_properties: requestProperties,
                request_cash: requestCash,
                request_shares: requestShares,
                request_loans: requestLoans
            });
        } else {
            // Send as new trade
            send('create_trade_offer', {
                from_player_id: me.id,
                to_player_id: selectedTarget,
                offer_properties: offerProperties,
                offer_cash: offerCash,
                offer_shares: offerShares,
                offer_loans: offerLoans,
                request_properties: requestProperties,
                request_cash: requestCash,
                request_shares: requestShares,
                request_loans: requestLoans
            });
        }
        onClose();
    };

    const hasOfferShares = Object.values(offerShares).some(v => v > 0);
    const hasRequestShares = Object.values(requestShares).some(v => v > 0);
    const hasOffer = offerProperties.length > 0 || offerCash > 0 || hasOfferShares || offerLoans.length > 0;
    const hasRequest = requestProperties.length > 0 || requestCash > 0 || hasRequestShares || requestLoans.length > 0;
    const canSend = selectedTarget && (hasOffer || hasRequest);

    const isCounter = !!counterTrade;

    // Helper to render stock picker for a player
    const renderStockPicker = (playerShares: Record<string, number>, selected: Record<string, number>, isOffer: boolean, label: string) => {
        if (!companies.length) return null;
        // Get companies where this player has shares
        const relevantCompanies = companies.filter((c: any) => (playerShares[c.propertySetId] || 0) > 0);
        if (relevantCompanies.length === 0) return null;

        return (
            <>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, marginTop: 8 }}>{label}</p>
                <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {relevantCompanies.map((c: any) => {
                        const maxShares = playerShares[c.propertySetId] || 0;
                        const current = selected[c.propertySetId] || 0;
                        return (
                            <div key={c.propertySetId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 6px', background: current > 0 ? 'rgba(0,200,150,0.15)' : 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                                <span style={{ fontSize: 11, flex: 1 }}>{c.propertySetId} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>(has {maxShares})</span></span>
                                <input
                                    type="number"
                                    min={0}
                                    max={maxShares}
                                    value={current || ''}
                                    placeholder="0"
                                    onChange={e => setShareQty(c.propertySetId, Math.min(maxShares, Math.max(0, Number(e.target.value) || 0)), isOffer)}
                                    style={{ width: 60, padding: '2px 4px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4, color: '#fff', textAlign: 'center' }}
                                />
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    // Summary helper for shares
    const sharesSum = (shares: Record<string, number>) => {
        const entries = Object.entries(shares).filter(([, v]) => v > 0);
        return entries.map(([id, qty]) => `${qty} ${id}`).join(', ');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isCounter ? "Counter Offer" : "Create Trade"}
            actions={
                <button className="btn btn-success" onClick={sendTrade} disabled={!canSend}>
                    {isCounter ? '↩ Send Counter Offer' : 'Send Trade Offer'}
                </button>
            }
        >
            {/* Counter info banner */}
            {isCounter && (
                <div style={{
                    padding: 10,
                    background: 'rgba(255,193,7,0.15)',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: '1px solid rgba(255,193,7,0.3)'
                }}>
                    <p style={{ fontSize: 11, color: 'var(--mono-gold)', margin: 0 }}>
                        ↩ Countering trade from <strong>{state.players?.find((p: any) => p.id === counterTrade.from_player_id)?.name}</strong>.
                        Edit the values below and send your counter-offer.
                    </p>
                </div>
            )}

            {/* Player Selection (locked in counter mode) */}
            <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Trade With</label>
                <select
                    value={selectedTarget}
                    onChange={e => setSelectedTarget(e.target.value)}
                    disabled={isCounter}
                >
                    <option value="">Select player...</option>
                    {state.players?.filter((p: any) => p.id !== me.id).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {selectedTarget && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* MY OFFER */}
                    <div style={{ padding: 12, background: 'rgba(0,200,150,0.1)', borderRadius: 10, border: '1px solid rgba(0,200,150,0.3)' }}>
                        <h4 style={{ color: 'var(--mono-green)', marginBottom: 10, fontSize: 13 }}>I'm Offering</h4>

                        {/* My Properties */}
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Properties</p>
                        <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
                            {myProperties.length === 0 ? (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No properties</p>
                            ) : myProperties.map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={() => canTrade(p) && toggleProperty(p.id, true)}
                                    disabled={!canTrade(p)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '4px 8px',
                                        marginBottom: 2,
                                        background: offerProperties.includes(p.id) ? 'var(--mono-green)' : 'rgba(0,0,0,0.2)',
                                        border: 'none',
                                        borderRadius: 4,
                                        color: offerProperties.includes(p.id) ? '#fff' : 'var(--text-primary)',
                                        textAlign: 'left',
                                        fontSize: 11,
                                        cursor: canTrade(p) ? 'pointer' : 'not-allowed',
                                        opacity: canTrade(p) ? 1 : 0.5
                                    }}
                                >
                                    <span style={{ display: 'inline-block', width: 10, height: 10, background: p.colorHex, borderRadius: 2, marginRight: 6 }} />
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        {/* My Cash */}
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Cash (max: ${me.balance})</p>
                        <input
                            type="range"
                            min={0}
                            max={me.balance}
                            value={offerCash}
                            onChange={e => setOfferCash(Number(e.target.value))}
                            style={{ width: '100%', marginBottom: 4 }}
                        />
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--mono-green)' }}>${offerCash}</p>

                        {/* My Stocks (per-company) */}
                        {state.settings.stocks !== false && renderStockPicker(
                            me.shares || {},
                            offerShares,
                            true,
                            'Stocks to Offer'
                        )}

                        {/* My Loans */}
                        {(me.activeLoans?.length > 0) && (
                            <>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, marginTop: 8 }}>Transfer Loans</p>
                                {me.activeLoans.map((loan: any) => (
                                    <button
                                        key={loan.id}
                                        onClick={() => toggleLoan(loan.id, true)}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '4px 8px',
                                            marginBottom: 2,
                                            background: offerLoans.includes(loan.id) ? 'var(--mono-red)' : 'rgba(0,0,0,0.2)',
                                            border: 'none',
                                            borderRadius: 4,
                                            color: 'var(--text-primary)',
                                            textAlign: 'left',
                                            fontSize: 10,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {loan.type}: ${loan.principalRemaining}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    {/* THEIR OFFER */}
                    <div style={{ padding: 12, background: 'rgba(151,117,250,0.1)', borderRadius: 10, border: '1px solid rgba(151,117,250,0.3)' }}>
                        <h4 style={{ color: 'var(--mono-purple)', marginBottom: 10, fontSize: 13 }}>I Want</h4>

                        {/* Their Properties */}
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Properties</p>
                        <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
                            {theirProperties.length === 0 ? (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No properties</p>
                            ) : theirProperties.map((p: any) => (
                                <button
                                    key={p.id}
                                    onClick={() => canTrade(p) && toggleProperty(p.id, false)}
                                    disabled={!canTrade(p)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '4px 8px',
                                        marginBottom: 2,
                                        background: requestProperties.includes(p.id) ? 'var(--mono-purple)' : 'rgba(0,0,0,0.2)',
                                        border: 'none',
                                        borderRadius: 4,
                                        color: requestProperties.includes(p.id) ? '#fff' : 'var(--text-primary)',
                                        textAlign: 'left',
                                        fontSize: 11,
                                        cursor: canTrade(p) ? 'pointer' : 'not-allowed',
                                        opacity: canTrade(p) ? 1 : 0.5
                                    }}
                                >
                                    <span style={{ display: 'inline-block', width: 10, height: 10, background: p.colorHex, borderRadius: 2, marginRight: 6 }} />
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        {/* Their Cash */}
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Cash (max: ${targetPlayer?.balance || 0})</p>
                        <input
                            type="range"
                            min={0}
                            max={targetPlayer?.balance || 0}
                            value={requestCash}
                            onChange={e => setRequestCash(Number(e.target.value))}
                            style={{ width: '100%', marginBottom: 4 }}
                        />
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--mono-purple)' }}>${requestCash}</p>

                        {/* Their Stocks (per-company) */}
                        {state.settings.stocks !== false && renderStockPicker(
                            targetPlayer?.shares || {},
                            requestShares,
                            false,
                            'Stocks I Want'
                        )}

                        {/* Their Loans */}
                        {(targetPlayer?.activeLoans?.length > 0) && (
                            <>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, marginTop: 8 }}>Take Their Loans</p>
                                {targetPlayer.activeLoans.map((loan: any) => (
                                    <button
                                        key={loan.id}
                                        onClick={() => toggleLoan(loan.id, false)}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '4px 8px',
                                            marginBottom: 2,
                                            background: requestLoans.includes(loan.id) ? 'var(--mono-gold)' : 'rgba(0,0,0,0.2)',
                                            border: 'none',
                                            borderRadius: 4,
                                            color: 'var(--text-primary)',
                                            textAlign: 'left',
                                            fontSize: 10,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {loan.type}: ${loan.principalRemaining}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Trade Summary */}
            {(hasOffer || hasRequest) && (
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Trade Summary</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 11 }}>
                            {offerProperties.length > 0 && <p>{offerProperties.length} properties</p>}
                            {offerCash > 0 && <p>${offerCash}</p>}
                            {hasOfferShares && <p>{sharesSum(offerShares)}</p>}
                            {offerLoans.length > 0 && <p style={{ color: 'var(--mono-red)' }}>{offerLoans.length} loans</p>}
                        </div>
                        <span style={{ fontSize: 20 }}>⇄</span>
                        <div style={{ fontSize: 11, textAlign: 'right' }}>
                            {requestProperties.length > 0 && <p>{requestProperties.length} properties</p>}
                            {requestCash > 0 && <p>${requestCash}</p>}
                            {hasRequestShares && <p>{sharesSum(requestShares)}</p>}
                            {requestLoans.length > 0 && <p style={{ color: 'var(--mono-gold)' }}>{requestLoans.length} loans</p>}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
