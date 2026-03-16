import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { PropertyTradingModals } from './PropertyTradingModals';
import TradingModal from './TradingModal';
import { IncomingTrades } from './IncomingTrades';
import { PropertyScanner } from './PropertyScanner';
import { PropertyQRGenerator } from './PropertyQRGenerator';

// GLASSMORPHISM STYLES
const GLASS_CARD = {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    borderRadius: '16px'
};

const GLASS_PILL = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(4px)',
    borderRadius: '12px'
};

// SVG Icon Components
const Icons = {
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
    bank: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>,
    vault: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    download: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
    creditCard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
    trendUp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    trendDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>,
    home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    building: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></svg>,
    chart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    list: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    dollar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    play: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>,
    stop: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
    alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    zap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    jail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>,
    gavel: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 13V9a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4M6 10h12M4 16h16M3 3l18 18" /><path d="M10 21h4v-8h-4v8z" /></svg>,
    trade: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>,
    car: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M14 17h-2" /></svg>,
};



// Helper function to calculate active debt
function activeDebt(player: any): number {
    return (player.activeLoans || []).reduce((sum: number, loan: any) => sum + loan.principalRemaining, 0);
}

// Helper function to calculate total debt
function totalDebt(player: any): number {
    // Only active debt (instant loans)
    return activeDebt(player);
}

// Helper function to calculate net worth (now uses global properties and companies if passed)
function calcNetWorth(player: any, allProperties?: any[], companies?: any[]): number {
    let assets = 0;
    if (allProperties) {
        assets = allProperties.filter(p => p.ownerId === player.id).reduce((sum, p) => sum + p.price, 0);
    } else {
        assets = player.properties?.reduce((sum: number, p: any) => sum + p.price, 0) || 0;
    }

    let stockWorth = 0;
    if (player.shares && companies) {
        if (typeof player.shares === 'object') {
            for (const [propertySetId, qty] of Object.entries(player.shares)) {
                const company = companies.find((c: any) => c.propertySetId === propertySetId);
                if (company && company.marketPrice > 0) {
                    stockWorth += (qty as number) * company.marketPrice;
                }
            }
        } else if (typeof player.shares === 'number') {
            // legacy fallback
            stockWorth = player.shares * 10;
        }
    }

    return assets + player.balance + stockWorth - activeDebt(player);
}

// Loan type colors
const LOAN_COLORS: Record<string, string> = {
    EMERGENCY: 'var(--mono-red)',
    STANDARD: 'var(--mono-green)',
    DEVELOPMENT: 'var(--mono-purple)'
};

export default function BankView({ state, me, send, insufficientFunds, onDismissInsufficientFunds, insolvencyWarning, onDismissInsolvencyWarning }: any) {
    const [tab, setTab] = useState('home');
    const [modal, setModal] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [targetId, setTargetId] = useState('');
    const [reason, setReason] = useState('Fine');
    const [confirmAction, setConfirmAction] = useState<{ type: string, data: any } | null>(null);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);

    // Corporate Stock States
    const [tradeStockCompany, setTradeStockCompany] = useState<any | null>(null);
    const [tradeStockType, setTradeStockType] = useState<'buy' | 'sell' | null>(null);
    const [tradeStockQuantity, setTradeStockQuantity] = useState('');
    const [tradeStockPrice, setTradeStockPrice] = useState('');
    const [tradeStockSeller, setTradeStockSeller] = useState('');
    const [manageCompanyGroup, setManageCompanyGroup] = useState<string | null>(null);
    const [manageCompanyAction, setManageCompanyAction] = useState<'dividend' | 'issue' | 'buyback' | 'sell_set' | null>(null);
    const [manageCompanyValue, setManageCompanyValue] = useState('');
    const [manageCompanyPrice, setManageCompanyPrice] = useState('');

    const [tradeTargetId, setTradeTargetId] = useState('');
    const [tradeCash, setTradeCash] = useState('');
    const [listingPrice, setListingPrice] = useState('');
    const [auctionDuration, setAuctionDuration] = useState('5');
    const [showTradingModal, setShowTradingModal] = useState(false);
    const [counterTrade, setCounterTrade] = useState<any>(null);

    // Pending payment state — persists even when insufficient funds modal is closed
    const [pendingPayment, setPendingPayment] = useState<any>(null);
    const [showInsuffModal, setShowInsuffModal] = useState(false);

    // In-app dialog state (replaces browser prompt/confirm)
    const [inAppDialog, setInAppDialog] = useState<{
        type: 'input' | 'confirm';
        title: string;
        message: string;
        defaultValue?: string;
        onConfirm: (value?: string) => void;
    } | null>(null);
    const [inAppDialogValue, setInAppDialogValue] = useState('');

    // When backend sends a new insufficient_funds event, capture it and show modal
    useEffect(() => {
        if (insufficientFunds) {
            setPendingPayment(insufficientFunds);
            setShowInsuffModal(true);
            onDismissInsufficientFunds(); // clear the prop so it doesn't re-trigger
        }
    }, [insufficientFunds]);

    // Update shortfall when balance changes (for dynamic banner text)
    // NOTE: We do NOT auto-complete — user must confirm with 'Pay Now'
    const pendingCanPay = pendingPayment && me
        ? me.balance >= (pendingPayment.amount || pendingPayment.rent || 0)
        : false;

    // Execute the pending payment (user must tap to confirm)
    const executePendingPayment = () => {
        if (!pendingPayment) return;
        if (pendingPayment.action === 'pay_bank') {
            send('pay_bank', { player_id: me.id, amount: pendingPayment.amount, reason: pendingPayment.reason });
        } else if (pendingPayment.action === 'transfer') {
            send('transfer', { from_id: me.id, to_id: pendingPayment.toId, amount: pendingPayment.amount, description: pendingPayment.description });
        } else {
            send('pay_rent', { player_id: me.id, property_id: pendingPayment.propertyId, dice_roll: pendingPayment.diceRoll });
        }
        setPendingPayment(null);
        setShowInsuffModal(false);
    };

    // How-To Guide state
    const [showGuide, setShowGuide] = useState(false);
    const handleCounter = (trade: any) => {
        setCounterTrade(trade);
        setShowTradingModal(true);
    };

    // Close trading modal and reset counter state
    const closeTradingModal = () => {
        setShowTradingModal(false);
        setCounterTrade(null);
    };

    // Loan modal state
    const [loanInstallments, setLoanInstallments] = useState<number>(1);

    // Dice roll for utility rent
    const [diceRoll, setDiceRoll] = useState('');

    // Auction state (pop-up modal)
    const [auctionBids, setAuctionBids] = useState<Record<string, string>>({});
    const [auctionTimes, setAuctionTimes] = useState<Record<string, number>>({});
    const auctionPollInterval = useRef<NodeJS.Timeout | null>(null);

    // Check for active auctions
    const activeAuctions = (state.auctions || []).filter((a: any) => a.status === 'active');
    const hasActiveAuctions = activeAuctions.length > 0;

    // Poll auctions every second (always, not just on tab)
    useEffect(() => {
        if (hasActiveAuctions) {
            // Poll immediately
            send('get_auctions', {});

            // Poll every second
            auctionPollInterval.current = setInterval(() => {
                send('get_auctions', {});
                // Update countdown timers
                const now = Date.now();
                setAuctionTimes(() => {
                    const newTimes: Record<string, number> = {};
                    (state.auctions || []).forEach((a: any) => {
                        if (a.status === 'active' && a.end_time) {
                            newTimes[a.id] = Math.max(0, a.end_time - now);
                        }
                    });
                    return newTimes;
                });
            }, 1000);
        } else {
            if (auctionPollInterval.current) {
                clearInterval(auctionPollInterval.current);
                auctionPollInterval.current = null;
            }
        }

        return () => {
            if (auctionPollInterval.current) {
                clearInterval(auctionPollInterval.current);
            }
        };
    }, [hasActiveAuctions, state.auctions, send]);

    // Update auction times when state changes
    useEffect(() => {
        if (hasActiveAuctions) {
            const now = Date.now();
            const newTimes: Record<string, number> = {};
            (state.auctions || []).forEach((a: any) => {
                if (a.status === 'active' && a.end_time) {
                    newTimes[a.id] = Math.max(0, a.end_time - now);
                }
            });
            setAuctionTimes(newTimes);
        }
    }, [state.auctions, hasActiveAuctions]);

    // Add Property modal state (always FOR SALE)
    const [newProp, setNewProp] = useState({
        name: '',
        price: '',
        colorGroup: '',
        colorHex: '#3B82F6',
        houseCost: '',
        hotelCost: '',
        rentBase: '',
        rent1House: '',
        rent2House: '',
        rent3House: '',
        rent4House: '',
        rentHotel: '',
        isRailroad: false,
        isUtility: false
    });
    const [colorGroupFilter, setColorGroupFilter] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [showQRGenerator, setShowQRGenerator] = useState(false);

    // Calculate values using new global properties and corporate stock system
    const netWorth = calcNetWorth(me, state.properties, state.companies);

    // Portfolio value is sum of all corporate shares * market price
    const portfolioValue = state.companies && typeof me.shares === 'object' ? Object.entries(me.shares || {}).reduce((sum, [id, qty]) => {
        const c = state.companies.find((company: any) => company.propertySetId === id);
        return sum + (Number(qty) * (c ? c.marketPrice : 0));
    }, 0) : 0;

    const availableCash = me.balance - (me.reservedCash || 0);


    const myActiveDebt = activeDebt(me);
    const myTotalDebt = totalDebt(me);

    // Get pending orders for this player
    // Orders removed - instant trading now

    // Calculate loan limits locally (mirrors backend logic)
    // CONSERVATIVE limits to prevent infinite money glitch
    const normalizeCreditFloat = (credit: number) => Math.max(0, Math.min(1, (credit - 300) / 550));
    const csn = normalizeCreditFloat(me.creditScore);
    // creditMult: 0.3 (bad credit) to 0.8 (perfect credit)
    const creditMult = 0.3 + 0.5 * csn;
    // Backend Logic Mirror
    // nwLending = Cash + 50% of Property Value (Shares excluded!)
    const myProperties = state.properties.filter((p: any) => p.ownerId === me.id);
    const propertyValueLending = myProperties.reduce((sum: number, p: any) => sum + (p.price * 0.5), 0);
    const nwLending = availableCash + propertyValueLending;

    // Cap Calculation
    const totalCap = Math.max(200, Math.floor(nwLending * creditMult));
    const availableCredit = Math.max(0, totalCap - myTotalDebt);

    const loanLimits = {
        emergency: Math.floor(availableCredit * 0.5),
        standard: Math.floor(availableCredit * 0.8),
        development: availableCredit
    };

    // Fixed loan rates (backend constants)
    const calculateEstimatedRate = (type: 'EMERGENCY' | 'STANDARD' | 'DEVELOPMENT') => {
        const rates: Record<string, number> = {
            EMERGENCY: 1200,  // 12% per turn
            STANDARD: 250,    // 2.5% per turn
            DEVELOPMENT: 150  // 1.5% per turn
        };
        return rates[type] || 200;
    };

    const estimatedRate = calculateEstimatedRate('STANDARD');

    // Calculate max installments for the chosen loan amount
    const MIN_PRINCIPAL_PER_INSTALLMENT = Math.max(100, Math.floor((state.settings?.goPayout || 200) / 2));
    const MAX_INSTALLMENTS_GLOBAL = 10;
    const calcMaxInstallments = (amt: number) => {
        if (amt <= 0) return 1;
        const raw = Math.floor(amt / MIN_PRINCIPAL_PER_INSTALLMENT);
        return Math.max(1, Math.min(raw, MAX_INSTALLMENTS_GLOBAL));
    };
    const maxInstallmentsForAmount = calcMaxInstallments(Number(amount) || 0);

    const openModal = (type: string) => { setModal(type); setAmount(''); setTargetId(''); setReason('Fine'); setLoanInstallments(1); };
    const closeModal = () => setModal(null);

    const inflationRate = state.inflationRate || 0;
    const finalAmount = inflationRate > 0 ? Math.floor(Number(amount || 0) * (1 + inflationRate)) : Number(amount || 0);

    let baseGoAmount = state.settings?.goPayout || 200;
    let goAmount = baseGoAmount;
    if (state.settings?.inflationMode === 'STANDARD' && inflationRate > 0) {
        goAmount = Math.floor(baseGoAmount * (1 + inflationRate));
    } else if (state.settings?.inflationMode === 'CAPITALISTIC') {
        goAmount = Math.floor(baseGoAmount * Math.pow(1.10, me.goPasses || 0));
    }

    const handleTransfer = () => {
        if (!amount || !targetId) return;
        const toPlayer = state.players.find((p: any) => p.id === targetId);
        setConfirmAction({
            type: 'transfer',
            data: { to_id: targetId, toName: toPlayer?.name, amount: Number(amount), description: `Transfer to ${toPlayer?.name}` }
        });
        closeModal();
    };
    const handlePayBank = () => { if (!amount) return; send('pay_bank', { player_id: me.id, amount: finalAmount, reason }); closeModal(); };
    const handleRequestBank = () => { if (!amount) return; send('request_bank', { player_id: me.id, amount: finalAmount, reason }); closeModal(); };
    const handleVaultAction = (action: 'deposit' | 'withdraw') => { if (!amount) return; send(action === 'deposit' ? 'vault_deposit' : 'vault_withdraw', { player_id: me.id, amount: Number(amount) }); closeModal(); };

    const handleTakeLoan = () => {
        if (!amount || Number(amount) <= 0) return;

        send('request_loan', {
            player_id: me.id,
            loan_type: 'STANDARD',
            amount: Number(amount),
            installments: loanInstallments
        });
        closeModal();
    };

    // Get loan limit for current type
    const getLoanLimit = () => {
        return loanLimits.standard;
    };

    return (
        <div className="app-container">
            {/* Header */}
            <div style={{ padding: '24px 24px 16px' }}>
                <div className="flex-between">
                    <div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>Welcome back</p>
                        <h1 style={{ fontSize: 28, fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{me.name}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={() => setShowGuide(true)}
                            style={{
                                width: 36, height: 36, borderRadius: 12,
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8', fontSize: 16, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >?</button>
                        <div style={{ textAlign: 'right', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Turn</p>
                            <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{me.turnIndex || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ padding: '0 16px', height: 'calc(100vh - 170px)', overflowY: 'auto' }}>

                {/* HOME TAB */}
                {tab === 'home' && (
                    <div className="fade-in">
                        {/* Balance Card */}
                        <div className="card" style={{
                            ...GLASS_CARD,
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
                            border: '1px solid rgba(0,200,150,0.2)',
                            padding: 24,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(0,200,150,0.2) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                            <p style={{ fontSize: 13, color: 'var(--mono-green)', fontWeight: 600, letterSpacing: '1px', marginBottom: 8, opacity: 0.9 }}>AVAILABLE CASH</p>
                            <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 4, textShadow: '0 4px 20px rgba(0,200,150,0.3)' }}>
                                ${me.balance.toLocaleString()}
                            </h1>
                            <div className="flex-between" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net Worth</p>
                                    <p style={{ fontSize: 15, fontWeight: 600 }}>${netWorth.toLocaleString()}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vault</p>
                                    <p style={{ fontSize: 15, fontWeight: 600 }}>${me.vault.toLocaleString()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Debt</p>
                                    <p style={{ fontSize: 15, fontWeight: 600, color: myActiveDebt > 0 ? 'var(--mono-red)' : 'var(--text-muted)' }}>
                                        ${myActiveDebt.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {me.reservedCash > 0 && (
                            <p style={{ fontSize: 11, color: 'var(--mono-gold)', marginTop: 8, textAlign: 'center' }}>
                                ${me.reservedCash.toFixed(0)} reserved for orders
                            </p>
                        )}

                        {/* Active Loans Warning */}
                        {(me.activeLoans?.length > 0) && (
                            <div className="card" style={{ background: 'linear-gradient(135deg, #2a1a1a 0%, #1f0f0f 100%)', border: '1px solid rgba(229,75,75,0.3)', padding: 12, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    {Icons.alert}
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mono-red)' }}>Active Loans</span>
                                </div>

                                {/* Active Loans */}
                                {(me.activeLoans || []).map((loan: any) => (
                                    <div key={loan.id} style={{ padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${LOAN_COLORS[loan.type]}` }}>
                                        <div className="flex-between" style={{ marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: LOAN_COLORS[loan.type] }}>{loan.type}</span>
                                            <span style={{ fontSize: 12 }}>${loan.principalRemaining.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                                            <span>Rate: {((loan.interestRateBps || 0) / 100).toFixed(1)}%/turn</span>
                                            <span>Paid: {loan.installmentsPaid}/{loan.installmentsTotal}</span>
                                            <span style={{ color: loan.misses > 0 ? 'var(--mono-red)' : 'inherit' }}>Miss: {loan.misses}/2</span>
                                        </div>
                                        {(loan.accruedInterest || 0) > 0 && (
                                            <p style={{ fontSize: 10, color: 'var(--mono-gold)', marginTop: 4 }}>
                                                Accrued interest: ${loan.accruedInterest.toLocaleString()}
                                            </p>
                                        )}
                                        {loan.type === 'EMERGENCY' && loan.emergencyDueNextPayEvent && (
                                            <p style={{ fontSize: 10, color: 'var(--mono-red)', marginTop: 4 }}>
                                                DUE IN FULL at next GO/Jail!
                                            </p>
                                        )}
                                    </div>
                                ))}


                            </div>
                        )}


                        {/* Free Parking Jackpot */}
                        {state.settings.freeParking && (state.freeParkingPot || 0) > 0 && (
                            <button
                                onClick={() => send('claim_free_parking', { player_id: me.id })}
                                className="btn"
                                style={{
                                    ...GLASS_CARD,
                                    width: '100%',
                                    marginBottom: 20,
                                    background: 'linear-gradient(135deg, var(--mono-gold) 0%, #d97706 100%)',
                                    border: 'none',
                                    padding: '16px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 16,
                                    boxShadow: '0 8px 25px -5px rgba(245, 158, 11, 0.5)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    color: 'white',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                }}>{Icons.car}</div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5 }}>Free Parking</p>
                                    <p style={{ fontSize: 24, fontWeight: 900, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>${(state.freeParkingPot || 0).toLocaleString()}</p>
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
                                    backgroundSize: '200% 200%',
                                    animation: 'shine 3s infinite linear'
                                }} />
                            </button>
                        )}

                        {/* Game Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <button className="btn btn-success" style={{ height: 56, fontSize: 16, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,200,150,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 0 }} onClick={() => send('pass_go', { player_id: me.id })}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{Icons.play} <span>GO</span></div>
                                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>+${goAmount.toLocaleString()}</div>
                            </button>
                            <button className="btn btn-primary" style={{ height: 56, fontSize: 14, fontWeight: 600 }} onClick={() => send('end_turn', { player_id: me.id })}>
                                {Icons.stop} End
                            </button>
                            <button className="btn btn-warning" style={{ height: 56, fontSize: 14, fontWeight: 600 }} onClick={() => send('jail_turn', { player_id: me.id })}>
                                {Icons.jail} Jail
                            </button>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
                            GO: salary + loan payments | End Turn: stock tick only | Jail: payments + stock tick
                        </p>

                        {/* Quick Actions */}
                        <h4 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>Quick Actions</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: state.settings.stocks !== false ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
                            {[
                                { icon: Icons.send, label: 'Send', action: () => openModal('transfer'), color: '#3B82F6' },
                                { icon: Icons.bank, label: 'Pay', action: () => openModal('pay_bank'), color: '#EF4444' },
                                { icon: Icons.download, label: 'Request', action: () => openModal('request_bank'), color: '#10B981' },
                                { icon: Icons.vault, label: 'Vault', action: () => openModal('vault'), color: '#F59E0B' },
                                ...(state.settings.stocks !== false ? [{ icon: Icons.trade, label: 'Trade', action: () => setShowTradingModal(true), color: '#8B5CF6' }] : []),
                            ].map((item, i) => (
                                <button key={i} onClick={item.action} className="card" style={{
                                    ...GLASS_PILL,
                                    padding: '12px 4px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'transform 0.1s'
                                }}>
                                    <div style={{
                                        color: item.color,
                                        fontSize: 18,
                                        background: `${item.color}20`,
                                        padding: 8,
                                        borderRadius: '50%',
                                        width: 36,
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>{item.icon}</div>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* Incoming Trades */}
                        <div style={{ marginTop: 12 }}>
                            <IncomingTrades state={state} me={me} send={send} onCounter={handleCounter} />
                        </div>

                        {/* Market Status */}
                        {state.settings.stocks !== false && (
                            <div className="card" style={{ marginTop: 12, background: state.market.volState === 'CHOPPY' ? 'linear-gradient(135deg, #2a1a1a 0%, #1f0f0f 100%)' : 'linear-gradient(135deg, #1a2a3d 0%, #162133 100%)' }}>
                                <div className="flex-between">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {Icons.chart}
                                        <div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Market Status</p>
                                            <p style={{ fontSize: 16, fontWeight: 600, color: state.market.volState === 'CHOPPY' ? 'var(--mono-red)' : 'var(--mono-green)' }}>
                                                {state.market.volState}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stock Price</p>
                                        <p style={{ fontSize: 18, fontWeight: 700 }}>${state.market.stockPrice}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: 20, textAlign: 'center' }}>
                            <button className="btn btn-ghost text-danger" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setConfirmAction({ type: 'bankrupt', data: {} })}>
                                Declare Bankruptcy
                            </button>
                        </div>
                    </div>
                )}

                {/* BANKING TAB */}
                {tab === 'banking' && (
                    <div className="fade-in">
                        {state.settings?.inflationMode && state.settings.inflationMode !== 'OFF' && (
                            <div className="card" style={{
                                ...GLASS_CARD,
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                marginBottom: 16,
                                padding: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 16 }}>📈</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--mono-gold)' }}>
                                        Current Inflation: {(inflationRate * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Because physical Monopoly cards don't change, just type the base number from the card below and we will automatically inflate it for you.
                                </p>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                            {[
                                { icon: Icons.send, label: 'Send', action: () => openModal('transfer') },
                                { icon: Icons.bank, label: 'Pay', action: () => openModal('pay_bank') },
                                { icon: Icons.download, label: 'Receive', action: () => openModal('request_bank') },
                                { icon: Icons.vault, label: 'Vault', action: () => openModal('vault') },
                            ].map((item, i) => (
                                <button key={i} onClick={item.action} className="card" style={{
                                    ...GLASS_PILL,
                                    padding: '10px 4px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <div style={{
                                        color: 'var(--text-secondary)',
                                        marginBottom: 2,
                                        fontSize: 16,
                                        background: 'rgba(255,255,255,0.05)',
                                        padding: 6,
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>{item.icon}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</div>
                                </button>
                            ))}
                        </div>

                        <div className="card" style={{
                            ...GLASS_CARD,
                            background: 'linear-gradient(135deg, rgba(26, 42, 61, 0.8) 0%, rgba(22, 33, 51, 0.9) 100%)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            marginBottom: 16,
                            padding: 20
                        }}>
                            <div className="flex-between">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: 10, borderRadius: 12 }}>
                                        {Icons.vault}
                                    </div>
                                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Vault Balance</span>
                                </div>
                                <span style={{ fontSize: 24, fontWeight: 700, textShadow: '0 2px 10px rgba(59, 130, 246, 0.3)' }}>${me.vault.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Loans Section */}
                        <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)' }}>{Icons.creditCard} Loans</h4>
                        <div className="card" style={{
                            ...GLASS_CARD,
                            border: 'none',
                            background: 'transparent',
                            boxShadow: 'none',
                            padding: 0,
                            marginBottom: 12
                        }}>
                            <div style={{
                                ...GLASS_CARD,
                                padding: 20,
                                marginBottom: 16,
                                background: 'linear-gradient(135deg, rgba(42, 26, 26, 0.8) 0%, rgba(31, 15, 15, 0.9) 100%)',
                                border: '1px solid rgba(229, 75, 75, 0.2)'
                            }}>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Active Debt</p>
                                <p style={{ fontSize: 28, fontWeight: 700, color: myActiveDebt > 0 ? 'var(--mono-red)' : 'var(--text-muted)', letterSpacing: '-0.5px' }}>
                                    ${myActiveDebt.toLocaleString()}
                                </p>
                            </div>

                            {/* Active Loans List */}
                            {(me.activeLoans?.length > 0) && (
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Active Loans</p>
                                    {(me.activeLoans || []).map((loan: any) => (
                                        <div key={loan.id} style={{
                                            ...GLASS_CARD,
                                            padding: 12,
                                            background: 'rgba(30, 41, 59, 0.4)',
                                            marginBottom: 10,
                                            borderLeft: `4px solid ${LOAN_COLORS[loan.type]}`,
                                            borderRadius: '0 8px 8px 0'
                                        }}>
                                            <div className="flex-between" style={{ marginBottom: 6 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{loan.type}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700 }}>${loan.principalRemaining.toLocaleString()}</span>
                                            </div>
                                            <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                <span>Rate: {((loan.interestRateBps || 0) / 100).toFixed(1)}%/turn</span>
                                                <span>Installments: {loan.installmentsPaid}/{loan.installmentsTotal}</span>
                                            </div>
                                            {(loan.accruedInterest || 0) > 0 && (
                                                <div className="flex-between" style={{ fontSize: 11, marginTop: 4 }}>
                                                    <span style={{ color: 'var(--mono-gold)' }}>Accrued Interest</span>
                                                    <span style={{ color: 'var(--mono-gold)', fontWeight: 600 }}>${loan.accruedInterest.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {loan.misses > 0 && (
                                                <p style={{ fontSize: 10, color: 'var(--mono-red)', marginTop: 4 }}>
                                                    {loan.misses}/2 missed payments
                                                </p>
                                            )}

                                            {/* Early Payoff Button */}
                                            {(() => {
                                                // Penalty: 20% flat on remaining principal (ignores accrued interest)
                                                const penaltyAmount = Math.ceil((loan.principalRemaining || 0) * 1.20);
                                                const canAfford = (me.balance || 0) >= penaltyAmount;
                                                return (
                                                    <button
                                                        onClick={() => send('pay_loan_early', { player_id: me.id, loan_id: loan.id })}
                                                        disabled={!canAfford}
                                                        style={{
                                                            width: '100%',
                                                            padding: '6px',
                                                            marginTop: 8,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: canAfford ? 'var(--mono-green)' : 'rgba(255,255,255,0.1)',
                                                            color: canAfford ? 'white' : 'var(--text-muted)',
                                                            border: 'none',
                                                            borderRadius: 4,
                                                            cursor: canAfford ? 'pointer' : 'not-allowed',
                                                            opacity: canAfford ? 1 : 0.6
                                                        }}
                                                    >
                                                        Pay Early: ${penaltyAmount.toLocaleString()} (+20% fee)
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            )}



                            <button
                                className="btn btn-primary"
                                onClick={() => openModal('take_loan')}
                            >
                                Apply for Loan
                            </button>
                        </div>
                    </div>
                )}

                {/* PROPERTY TAB - Global Properties System */}
                {tab === 'property' && (
                    <div className="fade-in">
                        {/* My Properties Summary */}
                        {(() => {
                            const myProps = (state.properties || []).filter((p: any) => p.ownerId === me.id);
                            const myValue = myProps.reduce((sum: number, p: any) => sum + p.price, 0);
                            const myMortgaged = myProps.filter((p: any) => p.isMortgaged).length;
                            return (
                                <div className="card" style={{
                                    ...GLASS_CARD,
                                    background: 'linear-gradient(135deg, rgba(42, 31, 61, 0.8) 0%, rgba(26, 21, 40, 0.9) 100%)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    marginBottom: 16,
                                    padding: 20
                                }}>
                                    <div className="flex-between" style={{ marginBottom: 8 }}>
                                        <div>
                                            <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.5px' }}>MY PROPERTIES</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{myProps.length} owned{myMortgaged > 0 ? `, ${myMortgaged} mortgaged` : ''}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 24, fontWeight: 700, textShadow: '0 2px 10px rgba(139, 92, 246, 0.3)' }}>${myValue.toLocaleString()}</p>
                                            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Value</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Add Property Buttons */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                            <button
                                className="btn btn-success"
                                style={{ flex: 1, padding: '12px', fontSize: 14, boxShadow: '0 4px 12px rgba(0,200,150,0.2)' }}
                                onClick={() => {
                                    setNewProp({
                                        name: '', price: '', colorGroup: '', colorHex: '#3B82F6',
                                        houseCost: '', hotelCost: '',
                                        rentBase: '', rent1House: '', rent2House: '', rent3House: '', rent4House: '', rentHotel: '',
                                        isRailroad: false, isUtility: false
                                    });
                                    setModal('add_property');
                                }}
                            >
                                + Add Custom
                            </button>
                            <button
                                className="btn"
                                style={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 600,
                                    padding: '12px',
                                    fontSize: 14,
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                }}
                                onClick={() => setShowScanner(true)}
                            >
                                Scan QR
                            </button>
                            <button
                                className="btn"
                                style={{
                                    flex: 0.5,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--text-muted)',
                                    backdropFilter: 'blur(4px)'
                                }}
                                onClick={() => setShowQRGenerator(true)}
                                title="Export Properties"
                            >
                                {Icons.download}
                            </button>
                        </div>

                        {/* Color Group Filter */}
                        {(() => {
                            // Get unique color groups from properties
                            const allGroups = (state.properties || []).map((p: any) => String(p.colorGroup));
                            const colorGroups: string[] = allGroups.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
                            return colorGroups.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 8, flexWrap: 'nowrap', maskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}>
                                    <button
                                        className={`btn ${!colorGroupFilter ? 'btn-primary' : ''}`}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: 11,
                                            whiteSpace: 'nowrap',
                                            borderRadius: 20,
                                            background: !colorGroupFilter ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                        onClick={() => setColorGroupFilter('')}
                                    >All</button>
                                    {colorGroups.map((group) => {
                                        const groupColor = (state.properties || []).find((p: any) => p.colorGroup === group)?.colorHex || '#666';
                                        const isLight = parseInt(groupColor.slice(1), 16) > 0x888888;
                                        const isSelected = colorGroupFilter === group;
                                        return (
                                            <button
                                                key={group}
                                                className="btn"
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: 11,
                                                    whiteSpace: 'nowrap',
                                                    borderRadius: 20,
                                                    background: isSelected ? groupColor : `${groupColor}20`,
                                                    color: isSelected && isLight ? '#000' : 'inherit',
                                                    border: `1px solid ${isSelected ? groupColor : 'rgba(255,255,255,0.1)'}`,
                                                    boxShadow: isSelected ? `0 0 10px ${groupColor}40` : 'none'
                                                }}
                                                onClick={() => setColorGroupFilter(group)}
                                            >{group}</button>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* Properties List */}
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {(state.properties || []).length === 0 && (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: 14, marginBottom: 8 }}>No properties yet</p>
                                    <p style={{ fontSize: 12 }}>Add custom properties using the button above</p>
                                </div>
                            )}
                            {(state.properties || [])
                                .filter((p: any) => !colorGroupFilter || p.colorGroup === colorGroupFilter)
                                .map((p: any) => {
                                    const owner = state.players.find((pl: any) => pl.id === p.ownerId);
                                    const isMine = p.ownerId === me.id;
                                    const improvements = p.improvements || 0;

                                    // Check if owner has full color set (for rent doubling)
                                    const groupProps = (state.properties || []).filter((gp: any) => gp.colorGroup === p.colorGroup);
                                    const ownsFullSet = p.ownerId && groupProps.length > 0 && groupProps.every((gp: any) => gp.ownerId === p.ownerId);
                                    const noDoubleRent = state.settings?.noDoubleRentOnFullSet || false;

                                    // Railroad: 25, 50, 100, 200 based on count owned
                                    const ownedRailroads = p.isRailroad && p.ownerId
                                        ? (state.properties || []).filter((rr: any) => rr.isRailroad && rr.ownerId === p.ownerId).length
                                        : 0;
                                    const railroadRent = p.isRailroad ? 25 * Math.pow(2, Math.max(0, ownedRailroads - 1)) : 0;

                                    // Utility: 4x or 10x dice roll
                                    const ownedUtilities = p.isUtility && p.ownerId
                                        ? (state.properties || []).filter((ut: any) => ut.isUtility && ut.ownerId === p.ownerId).length
                                        : 0;
                                    const utilityMultiplier = ownedUtilities >= 2 ? 10 : 4;

                                    // Calculate rent with doubling logic
                                    let rentDisplay: number | string;
                                    let isDoubled = false;

                                    if (p.isRailroad) {
                                        rentDisplay = railroadRent;
                                    } else if (p.isUtility) {
                                        rentDisplay = `${utilityMultiplier}× dice`;
                                    } else {
                                        rentDisplay = improvements >= 5 ? p.rentHotel :
                                            improvements === 4 ? p.rent4House :
                                                improvements === 3 ? p.rent3House :
                                                    improvements === 2 ? p.rent2House :
                                                        improvements === 1 ? p.rent1House : p.rentBase;

                                        // Double base rent if full set owned and no improvements and doubling allowed
                                        isDoubled = ownsFullSet && improvements === 0 && !noDoubleRent;
                                        if (isDoubled) {
                                            rentDisplay = p.rentBase * 2;
                                        }
                                    }

                                    return (
                                        <div
                                            key={p.id}
                                            className="card"
                                            style={{
                                                ...GLASS_CARD,
                                                padding: 12,
                                                marginBottom: 8,
                                                borderLeft: `4px solid ${p.colorHex || '#666'}`,
                                                opacity: p.isMortgaged ? 0.6 : 1,
                                                background: isMine
                                                    ? 'linear-gradient(135deg, rgba(26, 42, 26, 0.8) 0%, rgba(15, 26, 15, 0.9) 100%)'
                                                    : 'rgba(30, 41, 59, 0.6)',
                                                border: isMine
                                                    ? '1px solid rgba(74, 222, 128, 0.2)'
                                                    : '1px solid rgba(255, 255, 255, 0.05)',
                                                transition: 'transform 0.1s, box-shadow 0.1s',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedProperty(selectedProperty?.id === p.id ? null : p)}
                                        >
                                            <div className="flex-between" style={{ marginBottom: 4 }}>
                                                <div>
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                                                    {improvements > 0 && (
                                                        <span style={{ marginLeft: 8, fontSize: 10 }}>
                                                            {improvements >= 5 ? <span style={{ color: 'var(--mono-red)', fontWeight: 700 }}>H</span> : Array.from({ length: improvements }).map((_, i) => <span key={i} style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--mono-green)', borderRadius: 1, marginRight: 2 }} />)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: 14, color: p.isMortgaged ? 'var(--mono-gold)' : 'inherit' }}>
                                                    ${p.price}
                                                </span>
                                            </div>

                                            <div className="flex-between" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                                                <span>
                                                    Rent: {p.isUtility ? rentDisplay : `$${rentDisplay}`}
                                                    {isDoubled && <span style={{ color: 'var(--mono-gold)', marginLeft: 4 }}>(2×)</span>}
                                                    {p.isRailroad && ownedRailroads > 1 && <span style={{ color: 'var(--mono-gold)', marginLeft: 4 }}>({ownedRailroads} owned)</span>}
                                                </span>
                                                <span>{owner ? owner.name : 'FOR SALE'}</span>
                                            </div>

                                            {/* Expanded Details when selected */}
                                            {selectedProperty?.id === p.id && (
                                                <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {p.isRailroad ? (
                                                        // Railroad rent table
                                                        <div style={{ marginBottom: 8 }}>
                                                            <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--mono-gold)' }}>Railroad Rent</p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                                                                <span style={{ color: ownedRailroads >= 1 ? 'var(--mono-green)' : 'inherit' }}>1 owned: $25</span>
                                                                <span style={{ color: ownedRailroads >= 2 ? 'var(--mono-green)' : 'inherit' }}>2 owned: $50</span>
                                                                <span style={{ color: ownedRailroads >= 3 ? 'var(--mono-green)' : 'inherit' }}>3 owned: $100</span>
                                                                <span style={{ color: ownedRailroads >= 4 ? 'var(--mono-green)' : 'inherit' }}>4 owned: $200</span>
                                                            </div>
                                                            {ownedRailroads > 0 && (
                                                                <p style={{ fontSize: 10, marginTop: 6, color: 'var(--text-muted)' }}>
                                                                    Current: {ownedRailroads} owned = <strong>${railroadRent}</strong>
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : p.isUtility ? (
                                                        // Utility rent info
                                                        <div style={{ marginBottom: 8 }}>
                                                            <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--mono-gold)' }}>Utility Rent</p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                                                                <span style={{ color: ownedUtilities === 1 ? 'var(--mono-green)' : 'inherit' }}>1 owned: 4× dice roll</span>
                                                                <span style={{ color: ownedUtilities >= 2 ? 'var(--mono-green)' : 'inherit' }}>2 owned: 10× dice roll</span>
                                                            </div>
                                                            {ownedUtilities > 0 && (
                                                                <p style={{ fontSize: 10, marginTop: 6, color: 'var(--text-muted)' }}>
                                                                    Current: {ownedUtilities} owned = <strong>{utilityMultiplier}× dice</strong>
                                                                </p>
                                                            )}
                                                            <p style={{ fontSize: 9, marginTop: 4, color: 'var(--text-muted)' }}>
                                                                Enter your dice roll (2-12) to pay rent. It will be logged!
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        // Regular property rent table
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10, marginBottom: 8 }}>
                                                            <span>Base Rent: ${p.rentBase}{ownsFullSet && !noDoubleRent && ' (×2 full set)'}</span>
                                                            <span>1 House: ${p.rent1House}</span>
                                                            <span>2 Houses: ${p.rent2House}</span>
                                                            <span>3 Houses: ${p.rent3House}</span>
                                                            <span>4 Houses: ${p.rent4House}</span>
                                                            <span>Hotel: ${p.rentHotel}</span>
                                                            <span>House Cost: ${p.houseCost}</span>
                                                            <span>Hotel Cost: ${p.hotelCost}</span>
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: 8, marginTop: 12 }}>
                                                        {/* Property is in active auction - shown in pop-up automatically */}

                                                        {/* Unowned - Can Buy, Start Auction, or Delete */}
                                                        {!p.ownerId && (
                                                            <>
                                                                <button
                                                                    className="btn btn-success"
                                                                    style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmAction({
                                                                            type: 'buy_property',
                                                                            data: { property_id: p.id, name: p.name, price: p.price }
                                                                        });
                                                                    }}
                                                                    disabled={me.balance < p.price}
                                                                >
                                                                    {Icons.dollar} Buy ${p.price}
                                                                </button>
                                                                <button
                                                                    className="btn"
                                                                    style={{ padding: '8px 4px', fontSize: 11, background: 'var(--mono-gold)', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        send('start_auction', { player_id: me.id, property_id: p.id });
                                                                    }}
                                                                >
                                                                    {Icons.gavel} Auction ($10)
                                                                </button>
                                                                <button
                                                                    className="btn btn-ghost"
                                                                    style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8, border: '1px solid rgba(255,100,100,0.3)', color: '#ffaaaa' }}
                                                                    onClick={(e) => { e.stopPropagation(); send('delete_property', { player_id: me.id, property_id: p.id }); }}
                                                                >
                                                                    {Icons.alert} Delete
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Mine - Various Actions */}
                                                        {isMine && !p.isMortgaged && (
                                                            <>
                                                                {!p.isRailroad && !p.isUtility && improvements < 5 && (
                                                                    <button
                                                                        className="btn btn-primary"
                                                                        style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const isHotel = improvements === 4;
                                                                            const cost = isHotel ? p.hotelCost : p.houseCost;
                                                                            setConfirmAction({
                                                                                type: 'build',
                                                                                data: { property_id: p.id, name: p.name, cost, isHotel, houseNum: improvements + 1 }
                                                                            });
                                                                        }}
                                                                        disabled={me.balance < (improvements === 4 ? p.hotelCost : p.houseCost)}
                                                                    >
                                                                        {Icons.building} Build ${improvements === 4 ? p.hotelCost : p.houseCost}
                                                                    </button>
                                                                )}
                                                                {/* Manage Corporation */}
                                                                {state.settings.stocks !== false && ownsFullSet && isMine && !p.isRailroad && !p.isUtility && (
                                                                    <button
                                                                        className="btn"
                                                                        style={{ padding: '8px 4px', fontSize: 11, background: 'var(--mono-green)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setManageCompanyGroup(p.colorGroup);
                                                                            setManageCompanyAction(null);
                                                                            setManageCompanyValue('');
                                                                            setManageCompanyPrice('');
                                                                        }}
                                                                    >
                                                                        {Icons.trendUp} {state.companies?.some((c: any) => c.propertySetId === p.colorGroup) ? 'Manage Corp' : 'Issue Stock'}
                                                                    </button>
                                                                )}

                                                                {/* Develop (Loan) - finances 3 houses across the set */}
                                                                {ownsFullSet && isMine && !p.isRailroad && !p.isUtility && groupProps.some((gp: any) => (gp.improvements || 0) < 4) && (
                                                                    <button
                                                                        className="btn"
                                                                        style={{ padding: '8px 4px', fontSize: 11, background: 'var(--mono-purple)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const totalCost = (() => {
                                                                                let houses = 3, cost = 0;
                                                                                const temps = groupProps.map((g: any) => ({ ...g, imp: g.improvements || 0 }));
                                                                                while (houses > 0) {
                                                                                    const cands = temps.filter((t: any) => t.imp < 4);
                                                                                    if (cands.length === 0) break;
                                                                                    cands.sort((a: any, b: any) => a.imp - b.imp);
                                                                                    cands[0].imp++;
                                                                                    cost += cands[0].houseCost;
                                                                                    houses--;
                                                                                }
                                                                                return cost;
                                                                            })();
                                                                            setConfirmAction({
                                                                                type: 'dev_loan',
                                                                                data: { colorGroup: p.colorGroup, groupName: p.colorGroup, totalCost }
                                                                            });
                                                                        }}
                                                                    >
                                                                        {Icons.bank} Develop
                                                                    </button>
                                                                )}
                                                                {improvements > 0 && (
                                                                    <button
                                                                        className="btn btn-warning"
                                                                        style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const isHotel = improvements === 5;
                                                                            const refund = Math.floor((isHotel ? p.hotelCost : p.houseCost) / 2);
                                                                            setConfirmAction({
                                                                                type: 'demolish',
                                                                                data: { property_id: p.id, name: p.name, refund, isHotel }
                                                                            });
                                                                        }}
                                                                    >
                                                                        {Icons.home} Demolish
                                                                    </button>
                                                                )}
                                                                {improvements === 0 && (
                                                                    <>
                                                                        <button
                                                                            className="btn btn-warning"
                                                                            style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const mortgageValue = Math.floor(p.price / 2);
                                                                                setConfirmAction({
                                                                                    type: 'mortgage',
                                                                                    data: { property_id: p.id, name: p.name, mortgageValue }
                                                                                });
                                                                            }}
                                                                        >
                                                                            {Icons.lock} Mortgage
                                                                        </button>
                                                                        <button
                                                                            className="btn"
                                                                            style={{ padding: '8px 4px', fontSize: 11, background: 'var(--mono-gold)', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setInAppDialogValue(String(p.price));
                                                                                setInAppDialog({
                                                                                    type: 'input',
                                                                                    title: 'Start Auction',
                                                                                    message: `Starting bid for ${p.name} (default: $${p.price}):`,
                                                                                    defaultValue: String(p.price),
                                                                                    onConfirm: (val) => {
                                                                                        send('start_auction', { player_id: me.id, property_id: p.id, starting_price: Number(val) || p.price });
                                                                                    }
                                                                                });
                                                                            }}
                                                                        >
                                                                            {Icons.gavel} Auction
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {improvements === 0 && (
                                                                    <button
                                                                        className="btn btn-danger"
                                                                        style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setConfirmAction({
                                                                                type: 'sell_property',
                                                                                data: { property_id: p.id, name: p.name, price: p.price, salePrice: p.price, isMortgaged: false }
                                                                            });
                                                                        }}
                                                                    >
                                                                        {Icons.dollar} Sell
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {isMine && p.isMortgaged && (
                                                            <>
                                                                <button
                                                                    className="btn btn-success"
                                                                    style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const cost = Math.ceil(p.price * 55 / 100);
                                                                        setConfirmAction({
                                                                            type: 'unmortgage',
                                                                            data: { property_id: p.id, name: p.name, cost }
                                                                        });
                                                                    }}
                                                                    disabled={me.balance < Math.ceil(p.price * 55 / 100)}
                                                                >
                                                                    {Icons.lock} Unmortgage
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger"
                                                                    style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const mortgageValue = Math.floor(p.price / 2);
                                                                        const salePrice = p.price - mortgageValue;
                                                                        setConfirmAction({
                                                                            type: 'sell_property',
                                                                            data: { property_id: p.id, name: p.name, price: p.price, salePrice, mortgageValue, isMortgaged: true }
                                                                        });
                                                                    }}
                                                                >
                                                                    {Icons.dollar} Sell
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Bank-Owned Property - Can Auction or Buy */}
                                                        {p.ownerId && !owner && !isMine && (
                                                            <>
                                                                <button
                                                                    className="btn"
                                                                    style={{ padding: '8px 4px', fontSize: 11, background: 'var(--mono-gold)', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setInAppDialogValue(String(p.price));
                                                                        setInAppDialog({
                                                                            type: 'input',
                                                                            title: 'Start Auction',
                                                                            message: `Starting bid for ${p.name} (default: $${p.price}):`,
                                                                            defaultValue: String(p.price),
                                                                            onConfirm: (val) => {
                                                                                send('start_auction', { player_id: me.id, property_id: p.id, starting_price: Number(val) || p.price });
                                                                            }
                                                                        });
                                                                    }}
                                                                >
                                                                    {Icons.gavel} Auction
                                                                </button>
                                                                <button
                                                                    className="btn btn-success"
                                                                    style={{ padding: '8px 4px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', minHeight: 56, borderRadius: 8 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmAction({
                                                                            type: 'buy_property',
                                                                            data: { property_id: p.id, name: p.name, price: p.price }
                                                                        });
                                                                    }}
                                                                    disabled={me.balance < p.price}
                                                                >
                                                                    {Icons.dollar} Buy ${p.price}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Others' Property - Pay Rent */}
                                                    {owner && !isMine && !p.isMortgaged && (
                                                        p.isUtility ? (
                                                            // Utility: Need dice roll input
                                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                                <input
                                                                    type="number"
                                                                    min="2"
                                                                    max="12"
                                                                    placeholder="Dice"
                                                                    value={selectedProperty?.id === p.id ? diceRoll : ''}
                                                                    onChange={(e) => setDiceRoll(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        width: 50,
                                                                        padding: '4px 6px',
                                                                        fontSize: 10,
                                                                        background: 'var(--bg-input)',
                                                                        border: '1px solid var(--border-color)',
                                                                        borderRadius: 4,
                                                                        color: 'var(--text-primary)'
                                                                    }}
                                                                />
                                                                <button
                                                                    className="btn btn-danger"
                                                                    style={{ padding: '4px 8px', fontSize: 10 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const roll = Number(diceRoll);
                                                                        const rent = utilityMultiplier * roll;
                                                                        if (roll >= 2 && roll <= 12) {
                                                                            setConfirmAction({
                                                                                type: 'pay_rent',
                                                                                data: { property_id: p.id, name: p.name, rent, ownerName: owner.name, dice_roll: roll }
                                                                            });
                                                                        }
                                                                    }}
                                                                    disabled={!diceRoll || Number(diceRoll) < 2 || Number(diceRoll) > 12}
                                                                >
                                                                    Pay ${utilityMultiplier * (Number(diceRoll) || 0)}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // Regular property or Railroad
                                                            <button
                                                                className="btn btn-danger"
                                                                style={{ padding: '4px 8px', fontSize: 10 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rent = typeof rentDisplay === 'number' ? rentDisplay : 0;
                                                                    setConfirmAction({
                                                                        type: 'pay_rent',
                                                                        data: { property_id: p.id, name: p.name, rent, ownerName: owner.name }
                                                                    });
                                                                }}

                                                            >
                                                                Pay Rent ${rentDisplay}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* INVEST TAB */}
                {tab === 'invest' && (
                    <div className="fade-in">
                        {state.settings.stocks !== false ? (
                            <>
                                <div className="flex-between" style={{ marginBottom: 16 }}>
                                    <h2 style={{ fontSize: 18, margin: 0 }}>Corporate Stock Exchange</h2>
                                    <p style={{ fontSize: 12, color: 'var(--mono-green)', margin: 0 }}>
                                        Total Value: ${portfolioValue.toLocaleString()}
                                    </p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                    {state.companies?.length > 0 ? state.companies.map((company: any) => {
                                        const owner = state.players.find((p: any) => p.id === company.ownerId);
                                        const myShares = me.shares?.[company.propertySetId] || 0;
                                        const lowestOffer = company.offers?.slice().sort((a: any, b: any) => a.price - b.price)[0];
                                        return (
                                            <div key={company.propertySetId} className="card" style={{ padding: 16, background: 'rgba(0,0,0,0.2)' }}>
                                                <div className="flex-between" style={{ marginBottom: 12 }}>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {company.propertySetId} Corp
                                                            {company.ownerId === me.id && <span className="badge badge-warning" style={{ fontSize: 9, padding: '2px 4px' }}>CEO</span>}
                                                        </h3>
                                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>CEO: {owner?.name || 'Unknown'} • {company.sharesOutstanding} Shares Issued</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Market Price</p>
                                                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-green)' }}>
                                                            {company.marketPrice > 0 ? `$${company.marketPrice}` : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16, background: 'var(--bg-card)', padding: 12, borderRadius: 8 }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Yield</p>
                                                        <p style={{ fontSize: 14, fontWeight: 600 }}>{company.dividendPct > 0 ? `${company.dividendPct}%` : 'None'}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Owned</p>
                                                        <p style={{ fontSize: 14, fontWeight: 600 }}>{myShares}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Lowest Ask</p>
                                                        <p style={{ fontSize: 14, fontWeight: 600 }}>
                                                            {lowestOffer ? `$${lowestOffer.price}` : 'None'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn btn-success"
                                                        style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                                                        onClick={() => { setTradeStockCompany(company); setTradeStockType('buy'); setTradeStockQuantity(''); setTradeStockSeller(''); }}
                                                    >
                                                        Buy Shares
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                                                        disabled={myShares === 0}
                                                        onClick={() => { setTradeStockCompany(company); setTradeStockType('sell'); setTradeStockQuantity(''); setTradeStockSeller(''); }}
                                                    >
                                                        Sell Shares
                                                    </button>
                                                </div>

                                                {/* Active Offers / Order Book */}
                                                {company.offers && company.offers.length > 0 && (
                                                    <div style={{ marginTop: 16 }}>
                                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>Order Book / Active Listings</p>
                                                        <div style={{ display: 'grid', gap: 6 }}>
                                                            {company.offers.slice().sort((a: any, b: any) => a.price - b.price).map((offer: any) => {
                                                                const isMine = offer.sellerId === me.id || (offer.sellerId === 'COMPANY' && company.ownerId === me.id);
                                                                const sellerName = offer.sellerId === 'COMPANY' ? `${company.propertySetId} Corp` : state.players.find((p: any) => p.id === offer.sellerId)?.name || 'Unknown';
                                                                return (
                                                                    <div key={offer.id} className="flex-between" style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, alignItems: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{offer.quantity} shares</span>
                                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@ <span style={{ color: 'var(--mono-gold)' }}>${offer.price}</span>/ea</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sellerName}</span>
                                                                            {isMine && (
                                                                                <>
                                                                                    <button
                                                                                        className="btn btn-ghost"
                                                                                        style={{ padding: '2px 8px', fontSize: 10, border: '1px solid var(--border-color)' }}
                                                                                        onClick={() => {
                                                                                            setInAppDialogValue(String(offer.price));
                                                                                            setInAppDialog({
                                                                                                type: 'input',
                                                                                                title: 'Reprice Offer',
                                                                                                message: `Enter new asking price for your ${offer.quantity} shares:`,
                                                                                                defaultValue: String(offer.price),
                                                                                                onConfirm: (val) => {
                                                                                                    if (val && Number(val) > 0) {
                                                                                                        send('update_stock_offer', {
                                                                                                            player_id: me.id,
                                                                                                            property_set_id: company.propertySetId,
                                                                                                            offer_id: offer.id,
                                                                                                            new_price: Number(val)
                                                                                                        });
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        Reprice
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn btn-danger"
                                                                                        style={{ padding: '2px 8px', fontSize: 10 }}
                                                                                        onClick={() => {
                                                                                            send('cancel_stock_offer', {
                                                                                                player_id: me.id,
                                                                                                property_set_id: company.propertySetId,
                                                                                                offer_id: offer.id
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        Withdraw
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>No corporations have been formed yet.</p>
                                            <p style={{ color: 'var(--mono-gold)', fontSize: 12 }}>Monopolize a color group to issue public stock!</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="card" style={{ ...GLASS_CARD, padding: 24, textAlign: 'center' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>{Icons.trade}</div>
                                <h3 style={{ marginBottom: 8 }}>Trade Center</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                                    Create new trade offers or manage incoming requests from other players.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowTradingModal(true)} style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700 }}>
                                    Start New Trade
                                </button>
                                <div style={{ marginTop: 24, textAlign: 'left' }}>
                                    <IncomingTrades state={state} me={me} send={send} onCounter={handleCounter} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AUCTION MODAL - Shows automatically when active */}
                {hasActiveAuctions && activeAuctions.length > 0 && (() => {
                    const auction = activeAuctions[0]; // Show first active auction
                    const prop = state.properties?.find((p: any) => p.id === auction.property_id);
                    if (!prop) return null;

                    const timeLeft = auctionTimes[auction.id] ?? (auction.end_time ? Math.max(0, auction.end_time - Date.now()) : 0);
                    const secondsLeft = Math.floor(timeLeft / 1000);
                    const isUrgent = secondsLeft <= 10; // Urgent when 10s or less (after bid, timer resets to 10s)

                    const currentBidder = state.players?.find((p: any) => p.id === auction.current_bidder_id);
                    const sellerName = auction.seller_id === null ? 'Bank' :
                        auction.seller_id === 'BANK' ? <img src="/Logo.png" alt="MonoBank" style={{ maxHeight: 24, verticalAlign: 'middle', marginTop: -2 }} /> :
                            state.players?.find((p: any) => p.id === auction.seller_id)?.name || 'Unknown';

                    const minBid = auction.current_bidder_id === null
                        ? auction.starting_bid
                        : auction.current_bid + Math.max(10, Math.floor(auction.current_bid * 5 / 100));

                    const bidAmount = auctionBids[auction.id] || '';
                    const canBid = me.balance >= minBid && auction.seller_id !== me.id;

                    return (
                        <Modal
                            isOpen={true}
                            onClose={() => { }}  // Cannot close during active auction
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 6,
                                        background: prop.colorHex || '#666',
                                        border: '2px solid rgba(255,255,255,0.4)',
                                        flexShrink: 0
                                    }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Auction: {prop.name}</h3>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                            Everyone participates • Timer resets to 10s after each bid
                                        </p>
                                    </div>
                                </div>
                            }
                            actions={null}
                        >
                            <div style={{
                                background: isUrgent
                                    ? 'linear-gradient(135deg, #2a1515 0%, #1f0f0f 100%)'
                                    : 'linear-gradient(135deg, #1a2a2a 0%, #0f1f1f 100%)',
                                borderRadius: 12,
                                padding: 20,
                                border: `2px solid ${isUrgent ? 'var(--mono-red)' : 'var(--mono-gold)'}`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Urgent Overlay */}
                                {isUrgent && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 6,
                                        background: 'linear-gradient(90deg, transparent, var(--mono-red), transparent)',
                                        animation: 'pulse 0.5s infinite'
                                    }} />
                                )}

                                {/* Balance Display - Prominent */}
                                <div style={{
                                    padding: 12,
                                    background: 'rgba(0,200,150,0.15)',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    border: '1px solid rgba(0,200,150,0.3)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Your Balance</p>
                                            <p style={{ fontSize: 24, fontWeight: 700, color: me.balance >= minBid ? 'var(--mono-green)' : 'var(--mono-red)' }}>
                                                ${me.balance.toLocaleString()}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Minimum Bid</p>
                                            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-gold)' }}>
                                                ${minBid.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {me.balance < minBid && (
                                        <p style={{ fontSize: 11, color: 'var(--mono-red)', marginTop: 8, textAlign: 'center' }}>
                                            You cannot afford the minimum bid
                                        </p>
                                    )}
                                </div>

                                {/* 10-Second Timer - Prominent */}
                                <div style={{
                                    textAlign: 'center',
                                    padding: '16px',
                                    background: isUrgent ? 'rgba(229,75,75,0.2)' : 'rgba(0,200,150,0.15)',
                                    borderRadius: 12,
                                    marginBottom: 16,
                                    border: `2px solid ${isUrgent ? 'var(--mono-red)' : 'var(--mono-green)'}`
                                }}>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                        {secondsLeft <= 10 ? 'BID NOW - Timer resets to 10s after each bid!' : 'Time Remaining'}
                                    </p>
                                    <div style={{
                                        fontSize: 48,
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        color: isUrgent ? 'var(--mono-red)' : 'var(--mono-green)',
                                        letterSpacing: '4px',
                                        textShadow: isUrgent ? '0 0 20px var(--mono-red)' : 'none'
                                    }}>
                                        {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
                                    </div>
                                    {secondsLeft <= 10 && (
                                        <p style={{ fontSize: 11, color: 'var(--mono-red)', marginTop: 8 }}>
                                            Timer will reset to 10s if someone bids!
                                        </p>
                                    )}
                                </div>

                                {/* Property Info */}
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                        <strong>Property:</strong> {prop.name} ({prop.colorGroup}) • <strong>Seller:</strong> {sellerName}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        Base Price: ${prop.price.toLocaleString()}
                                        {prop.improvements > 0 && ` • ${prop.improvements === 5 ? 'Hotel' : `${prop.improvements} House${prop.improvements > 1 ? 's' : ''}`}`}
                                    </p>
                                </div>

                                {/* Current Bid */}
                                <div style={{
                                    padding: 14,
                                    background: 'rgba(0,0,0,0.4)',
                                    borderRadius: 10,
                                    marginBottom: 16,
                                    border: '1px solid rgba(255,255,255,0.15)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Current Highest Bid</p>
                                            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--mono-gold)', letterSpacing: '-1px' }}>
                                                ${auction.current_bid >= auction.starting_bid ? auction.current_bid.toLocaleString() : 'No Bids Yet'}
                                            </p>
                                            {auction.current_bid < auction.starting_bid && (
                                                <p style={{ fontSize: 11, color: 'var(--mono-gold)', marginTop: 4 }}>
                                                    Starting bid: ${auction.starting_bid.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        {currentBidder && (
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Leading Bidder</p>
                                                <p style={{ fontSize: 16, fontWeight: 600, color: currentBidder.id === me.id ? 'var(--mono-green)' : 'var(--mono-gold)' }}>
                                                    {currentBidder.id === me.id ? 'You' : currentBidder.name}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bid Input - Everyone can bid (except seller) */}
                                {canBid ? (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                            <input
                                                type="number"
                                                value={bidAmount}
                                                onChange={(e) => setAuctionBids({ ...auctionBids, [auction.id]: e.target.value })}
                                                placeholder={`Enter bid (min: $${minBid.toLocaleString()})`}
                                                min={minBid}
                                                style={{
                                                    flex: 1,
                                                    padding: '14px 16px',
                                                    background: 'var(--bg-input)',
                                                    border: `2px solid ${bidAmount && Number(bidAmount) >= minBid && Number(bidAmount) <= me.balance ? 'var(--mono-green)' : 'rgba(255,255,255,0.2)'}`,
                                                    borderRadius: 10,
                                                    color: 'var(--text-primary)',
                                                    fontSize: 16,
                                                    fontWeight: 600
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                className="btn btn-success"
                                                onClick={() => {
                                                    const bid = Number(bidAmount);
                                                    if (bid >= minBid && bid <= me.balance) {
                                                        send('place_bid', {
                                                            player_id: me.id,
                                                            auction_id: auction.id,
                                                            bid_amount: bid
                                                        });
                                                        setAuctionBids({ ...auctionBids, [auction.id]: '' });
                                                    }
                                                }}
                                                disabled={!bidAmount || Number(bidAmount) < minBid || Number(bidAmount) > me.balance}
                                                style={{
                                                    whiteSpace: 'nowrap',
                                                    padding: '14px 24px',
                                                    fontSize: 16,
                                                    fontWeight: 700
                                                }}
                                            >
                                                Bid ${bidAmount ? Number(bidAmount).toLocaleString() : ''}
                                            </button>
                                        </div>
                                        {bidAmount && Number(bidAmount) < minBid && (
                                            <p style={{ fontSize: 11, color: 'var(--mono-red)', textAlign: 'center' }}>
                                                Minimum bid is ${minBid.toLocaleString()}
                                            </p>
                                        )}
                                        {bidAmount && Number(bidAmount) > me.balance && (
                                            <p style={{ fontSize: 11, color: 'var(--mono-red)', textAlign: 'center' }}>
                                                Insufficient balance (have ${me.balance.toLocaleString()})
                                            </p>
                                        )}
                                    </div>
                                ) : auction.seller_id === me.id ? (
                                    <div style={{ padding: 12, background: 'rgba(244,199,82,0.15)', borderRadius: 8, textAlign: 'center', marginBottom: 16 }}>
                                        <p style={{ fontSize: 12, color: 'var(--mono-gold)' }}>
                                            You are the seller — you cannot bid on your own auction
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ padding: 12, background: 'rgba(229,75,75,0.15)', borderRadius: 8, textAlign: 'center', marginBottom: 16 }}>
                                        <p style={{ fontSize: 12, color: 'var(--mono-red)' }}>
                                            Insufficient balance to bid (need ${minBid.toLocaleString()}, have ${me.balance.toLocaleString()})
                                        </p>
                                    </div>
                                )}

                                {/* Recent Bid History */}
                                {auction.bids && auction.bids.length > 0 && (
                                    <div style={{
                                        padding: 12,
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: 8,
                                        maxHeight: 150,
                                        overflowY: 'auto'
                                    }}>
                                        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Recent Bids</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {[...auction.bids].reverse().slice(0, 8).map((bid: any, idx: number) => {
                                                const bidder = state.players?.find((p: any) => p.id === bid.player_id);
                                                return (
                                                    <div key={idx} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: 12,
                                                        padding: '6px 8px',
                                                        background: bidder?.id === me.id ? 'rgba(0,200,150,0.15)' : 'rgba(0,0,0,0.2)',
                                                        borderRadius: 6
                                                    }}>
                                                        <span style={{
                                                            color: bidder?.id === me.id ? 'var(--mono-green)' : 'var(--text-primary)',
                                                            fontWeight: bidder?.id === me.id ? 600 : 400
                                                        }}>
                                                            {bidder?.id === me.id ? 'You' : bidder?.name || 'Unknown'}
                                                        </span>
                                                        <span style={{ fontWeight: 700, color: 'var(--mono-gold)' }}>
                                                            ${bid.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Modal>
                    );
                })()}

                {/* HISTORY TAB */}
                {tab === 'history' && (
                    <div className="fade-in">
                        <div className="flex-between" style={{ marginBottom: 16 }}>
                            <h2>Transaction History</h2>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {me.isHost && (
                                    <>
                                        <span className="badge badge-warning" style={{ padding: '4px 8px' }}>HOST</span>
                                        {state.pausedUntil && state.pausedUntil > Date.now() ? (
                                            <button
                                                className="btn btn-success"
                                                style={{ padding: '4px 12px', fontSize: 11 }}
                                                onClick={() => send('unpause_room', { player_id: me.id })}
                                            >
                                                ⏸ Paused ({Math.ceil((state.pausedUntil - Date.now()) / 3600000)}h left) — Resume
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '4px 12px', fontSize: 11, border: '1px solid var(--border-color)' }}
                                                onClick={() => {
                                                    setInAppDialogValue('24');
                                                    setInAppDialog({
                                                        type: 'input',
                                                        title: 'Pause Room',
                                                        message: 'How many hours to pause? (1-48)',
                                                        defaultValue: '24',
                                                        onConfirm: (val) => {
                                                            if (val && Number(val) > 0) {
                                                                send('pause_room', { player_id: me.id, hours: Number(val) });
                                                            }
                                                        }
                                                    });
                                                }}
                                            >
                                                ⏸ Pause Room
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Host Rewind Section */}
                        {me.isHost && state.stateHistory && state.stateHistory.length > 0 && (
                            <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #2a2010 0%, #1f1a0d 100%)', border: '1px solid rgba(244,199,82,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mono-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                        <path d="M3 3v5h5" />
                                    </svg>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mono-gold)' }}>Rewind Actions</span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    As host, you can rewind to undo incorrect actions.
                                </p>
                                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {state.stateHistory.slice(0, 10).map((snapshot: any) => (
                                        <div key={snapshot.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: 8,
                                            marginBottom: 6
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {snapshot.description}
                                                </p>
                                                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                    {new Date(snapshot.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <button
                                                className="btn btn-warning"
                                                style={{ padding: '4px 10px', fontSize: 10, width: 'auto', marginLeft: 8 }}
                                                onClick={() => setConfirmAction({
                                                    type: 'rewind',
                                                    data: { snapshot_id: snapshot.id, description: snapshot.description }
                                                })}
                                            >
                                                Rewind
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transaction History */}
                        {state.transactions && state.transactions.length > 0 && (
                            <div>
                                {[...state.transactions].reverse().map((t: any) => (
                                    <div key={t.id} className="card" style={{
                                        padding: 12,
                                        marginBottom: 8,
                                        borderLeft: t.description.startsWith('HOST REWIND') ? '3px solid var(--mono-gold)' : undefined
                                    }}>
                                        <div className="flex-between">
                                            <span style={{ fontSize: 13 }}>{t.description}</span>
                                            <span style={{ fontWeight: 600, color: t.amount > 0 ? 'var(--mono-green)' : 'var(--text-muted)' }}>
                                                {t.amount > 0 ? `$${t.amount.toLocaleString()}` : '-'}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {new Date(t.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="bottom-nav" style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 20
            }}>
                <button className={`nav-item ${tab === 'banking' ? 'active' : ''}`} onClick={() => setTab('banking')}>
                    {Icons.bank}
                    <span>Bank</span>
                </button>
                <button className={`nav-item ${tab === 'property' ? 'active' : ''}`} onClick={() => setTab('property')}>
                    {Icons.building}
                    <span>Property</span>
                </button>
                <button
                    className={`nav-item ${tab === 'home' ? 'active' : ''}`}
                    onClick={() => setTab('home')}
                    style={{
                        background: 'linear-gradient(135deg, var(--mono-green), var(--mono-green-dark))',
                        borderRadius: '50%',
                        width: 52,
                        height: 52,
                        marginTop: -16,
                        boxShadow: 'var(--glow-green)',
                        padding: 0,
                        justifyContent: 'center'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                </button>
                <button className={`nav-item ${tab === 'invest' ? 'active' : ''}`} onClick={() => setTab('invest')}>
                    {state.settings.stocks !== false ? Icons.chart : Icons.trade}
                    <span>{state.settings.stocks !== false ? 'Invest' : 'Trade'}</span>
                </button>
                <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                    {Icons.list}
                    <span>History</span>
                </button>
            </div>

            {/* MODALS */}
            <Modal isOpen={modal === 'transfer'} onClose={closeModal} title="Send Money" actions={<button className="btn btn-primary" onClick={handleTransfer}>Send</button>}>
                <div className="input-group">
                    <label>Recipient</label>
                    <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                        <option value="">Select player...</option>
                        {state.players.filter((p: any) => p.id !== me.id).map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                </div>
                <div className="input-group">
                    <label>Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
            </Modal>

            <Modal isOpen={modal === 'pay_bank'} onClose={closeModal} title="Pay Bank" actions={<button className="btn btn-danger" onClick={handlePayBank}>Pay</button>}>
                <div className="input-group">
                    <label>Reason</label>
                    <select value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="Fine">Fine</option>
                        <option value="Tax">Tax</option>
                        <option value="Development">Development</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Base Amount (from card/rule)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
                {inflationRate > 0 && amount && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(229,75,75,0.15)', borderRadius: 8, textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-Inflated Amount (+{(inflationRate * 100).toFixed(1)}%)</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-red)' }}>${finalAmount.toLocaleString()}</p>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'request_bank'} onClose={closeModal} title="Request from Bank" actions={<button className="btn btn-success" onClick={handleRequestBank}>Request</button>}>
                <div className="input-group">
                    <label>Reason</label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Won Beauty Contest" />
                </div>
                <div className="input-group">
                    <label>Base Amount (from card/rule)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
                {inflationRate > 0 && amount && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,200,150,0.15)', borderRadius: 8, textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-Inflated Amount (+{(inflationRate * 100).toFixed(1)}%)</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-green)' }}>${finalAmount.toLocaleString()}</p>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'vault'} onClose={closeModal} title="Vault" actions={<><button className="btn btn-danger" onClick={() => handleVaultAction('withdraw')}>Withdraw</button><button className="btn btn-success" onClick={() => handleVaultAction('deposit')}>Deposit</button></>}>
                <div className="input-group">
                    <label>Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
            </Modal>

            {/* LOAN MODAL */}
            <Modal isOpen={modal === 'take_loan'} onClose={closeModal} title="Apply for Loan" actions={<button className="btn btn-primary" onClick={handleTakeLoan} disabled={!amount || Number(amount) <= 0 || Number(amount) > getLoanLimit()}>Apply</button>}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Current Debt</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: myTotalDebt > 0 ? 'var(--mono-red)' : 'var(--text-muted)' }}>
                            ${myTotalDebt.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Loan description */}
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 12, borderLeft: `3px solid ${LOAN_COLORS.STANDARD}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: LOAN_COLORS.STANDARD, marginBottom: 4 }}>Standard Loan</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Cash disbursed after 2 End Turns. Repay in chosen installments (1-10) at GO/Jail events.
                        2 missed payments = default.
                    </p>

                    {/* Dynamic rate and limit info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Your Rate</p>
                            <p style={{ fontSize: 16, fontWeight: 700, color: estimatedRate > 300 ? 'var(--mono-red)' : estimatedRate > 150 ? 'var(--mono-gold)' : 'var(--mono-green)' }}>
                                {(estimatedRate / 100).toFixed(2)}%<span style={{ fontSize: 10, fontWeight: 400 }}>/turn</span>
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Max Amount</p>
                            <p style={{ fontSize: 16, fontWeight: 700 }}>${getLoanLimit().toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Rate breakdown */}
                    <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                        Rate based on: Your payment history{state.market.volState === 'CHOPPY' && ' + Market Volatility'}
                    </div>
                </div>

                <div className="input-group">
                    <label>
                        {`Loan Amount (max: $${getLoanLimit().toLocaleString()})`}
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => {
                            setAmount(e.target.value);
                            // Reset installments if amount changes
                            setLoanInstallments(1);
                        }}
                        placeholder={"Enter amount..."}
                        max={getLoanLimit()}
                    />
                </div>

                {/* Installment selection for Standard/Development */}
                {amount && Number(amount) > 0 && (
                    <div className="input-group">
                        <label>Repayment Installments (1-{maxInstallmentsForAmount})</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {Array.from({ length: maxInstallmentsForAmount }, (_, i) => i + 1).map(num => (
                                <button
                                    key={num}
                                    onClick={() => setLoanInstallments(num)}
                                    style={{
                                        padding: '8px 12px',
                                        background: loanInstallments === num ? 'var(--mono-green)' : 'var(--bg-input)',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        color: loanInstallments === num ? 'white' : 'var(--text-primary)',
                                        fontWeight: loanInstallments === num ? 600 : 400
                                    }}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                            {loanInstallments === 1 ? 'Full payment at first GO/Jail' : `~$${Math.ceil(Number(amount) / loanInstallments).toLocaleString()} principal per payment`}
                        </p>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'add_property'} onClose={closeModal} title="Add Custom Property" actions={
                <button
                    className="btn btn-success"
                    onClick={() => {
                        if (!newProp.name || !newProp.price || !newProp.colorGroup || !newProp.colorHex) {
                            return;
                        }
                        send('create_property', {
                            player_id: me.id,
                            name: newProp.name,
                            price: Number(newProp.price),
                            colorGroup: newProp.colorGroup,
                            colorHex: newProp.colorHex,
                            houseCost: Number(newProp.houseCost) || 0,
                            hotelCost: Number(newProp.hotelCost) || 0,
                            rentBase: Number(newProp.rentBase) || 0,
                            rent1House: Number(newProp.rent1House) || 0,
                            rent2House: Number(newProp.rent2House) || 0,
                            rent3House: Number(newProp.rent3House) || 0,
                            rent4House: Number(newProp.rent4House) || 0,
                            rentHotel: Number(newProp.rentHotel) || 0,
                            isRailroad: newProp.isRailroad,
                            isUtility: newProp.isUtility
                        });
                        closeModal();
                    }}
                    disabled={!newProp.name || !newProp.price || !newProp.colorGroup}
                >
                    Create Property (FOR SALE)
                </button>
            }>
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {/* Basic Info */}
                    <div className="input-group">
                        <label>Property Name *</label>
                        <input
                            type="text"
                            value={newProp.name}
                            onChange={e => setNewProp({ ...newProp, name: e.target.value })}
                            placeholder="e.g. Park Avenue"
                        />
                    </div>

                    <div className="input-group">
                        <label>Price *</label>
                        <input
                            type="number"
                            value={newProp.price}
                            onChange={e => setNewProp({ ...newProp, price: e.target.value })}
                            placeholder="e.g. 350"
                        />
                    </div>

                    {/* Color Group - Existing groups or new */}
                    {(() => {
                        const existingGroups = (state.properties || []).map((p: any) => String(p.colorGroup));
                        const uniqueGroups: string[] = existingGroups.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

                        return (
                            <>
                                {uniqueGroups.length > 0 && (
                                    <div className="input-group">
                                        <label>Select Existing Color Group</label>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {uniqueGroups.map((group) => {
                                                const groupColor = (state.properties || []).find((p: any) => p.colorGroup === group)?.colorHex || '#666';
                                                const isSelected = newProp.colorGroup === group;
                                                return (
                                                    <button
                                                        key={group}
                                                        type="button"
                                                        onClick={() => setNewProp({ ...newProp, colorGroup: group, colorHex: groupColor })}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 11,
                                                            background: isSelected ? groupColor : `${groupColor}30`,
                                                            border: `2px solid ${groupColor}`,
                                                            borderRadius: 6,
                                                            cursor: 'pointer',
                                                            color: isSelected ? '#fff' : 'inherit',
                                                            fontWeight: isSelected ? 600 : 400
                                                        }}
                                                    >
                                                        {group}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Or create a new group below:</p>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                                    <div className="input-group">
                                        <label>{uniqueGroups.length > 0 ? 'New Group Name' : 'Color Group Name *'}</label>
                                        <input
                                            type="text"
                                            value={newProp.colorGroup}
                                            onChange={e => setNewProp({ ...newProp, colorGroup: e.target.value })}
                                            placeholder="e.g. Downtown, Beach"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Color *</label>
                                        <input
                                            type="color"
                                            value={newProp.colorHex}
                                            onChange={e => setNewProp({ ...newProp, colorHex: e.target.value })}
                                            style={{ height: 42, padding: 4, cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Preview */}
                    <div style={{
                        padding: 10,
                        marginBottom: 12,
                        borderRadius: 8,
                        borderLeft: `4px solid ${newProp.colorHex}`,
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        <span style={{ fontWeight: 600 }}>{newProp.name || 'Property Name'}</span>
                        <span style={{ float: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{newProp.colorGroup || 'Group'}</span>
                        <p style={{ fontSize: 10, color: 'var(--mono-green)', marginTop: 4 }}>Status: FOR SALE</p>
                    </div>

                    {/* Building Costs */}
                    <h4 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Building Costs</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>House Cost</label>
                            <input
                                type="number"
                                value={newProp.houseCost}
                                onChange={e => setNewProp({ ...newProp, houseCost: e.target.value })}
                                placeholder="e.g. 200"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>Hotel Cost</label>
                            <input
                                type="number"
                                value={newProp.hotelCost}
                                onChange={e => setNewProp({ ...newProp, hotelCost: e.target.value })}
                                placeholder="e.g. 200"
                            />
                        </div>
                    </div>

                    {/* Rent Prices */}
                    <h4 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Rent Prices</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>Base Rent</label>
                            <input
                                type="number"
                                value={newProp.rentBase}
                                onChange={e => setNewProp({ ...newProp, rentBase: e.target.value })}
                                placeholder="e.g. 35"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>1 House</label>
                            <input
                                type="number"
                                value={newProp.rent1House}
                                onChange={e => setNewProp({ ...newProp, rent1House: e.target.value })}
                                placeholder="e.g. 175"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>2 Houses</label>
                            <input
                                type="number"
                                value={newProp.rent2House}
                                onChange={e => setNewProp({ ...newProp, rent2House: e.target.value })}
                                placeholder="e.g. 500"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>3 Houses</label>
                            <input
                                type="number"
                                value={newProp.rent3House}
                                onChange={e => setNewProp({ ...newProp, rent3House: e.target.value })}
                                placeholder="e.g. 1100"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>4 Houses</label>
                            <input
                                type="number"
                                value={newProp.rent4House}
                                onChange={e => setNewProp({ ...newProp, rent4House: e.target.value })}
                                placeholder="e.g. 1300"
                            />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: 10 }}>Hotel</label>
                            <input
                                type="number"
                                value={newProp.rentHotel}
                                onChange={e => setNewProp({ ...newProp, rentHotel: e.target.value })}
                                placeholder="e.g. 1500"
                            />
                        </div>
                    </div>

                    {/* Special Types */}
                    <h4 style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Special Type (Optional)</h4>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newProp.isRailroad}
                                onChange={e => setNewProp({ ...newProp, isRailroad: e.target.checked, isUtility: false })}
                            />
                            <span style={{ fontSize: 12 }}>Railroad</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newProp.isUtility}
                                onChange={e => setNewProp({ ...newProp, isUtility: e.target.checked, isRailroad: false })}
                            />
                            <span style={{ fontSize: 12 }}>Utility</span>
                        </label>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Railroads: Rent based on # owned (25/50/100/200). Utilities: Rent = dice × multiplier.
                    </p>
                </div>
            </Modal>

            <Modal
                isOpen={confirmAction !== null}
                onClose={() => setConfirmAction(null)}
                title={
                    confirmAction?.type === 'bankrupt' ? 'Declare Bankruptcy' :
                        confirmAction?.type === 'rewind' ? 'Rewind' :
                            confirmAction?.type === 'buy_property' ? 'Buy Property' :
                                confirmAction?.type === 'sell_property' ? 'Sell Property' :
                                    confirmAction?.type === 'mortgage' ? 'Mortgage Property' :
                                        confirmAction?.type === 'unmortgage' ? 'Unmortgage Property' :
                                            confirmAction?.type === 'pay_rent' ? 'Pay Rent' :
                                                confirmAction?.type === 'transfer' ? 'Send Money' :
                                                    confirmAction?.type === 'build' ? 'Build' :
                                                        confirmAction?.type === 'demolish' ? 'Demolish' :
                                                            confirmAction?.type === 'dev_loan' ? 'Development Loan' :
                                                                'Confirm Action'
                }
                actions={
                    <>
                        <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
                        <button
                            className={`btn ${confirmAction?.type === 'bankrupt' || confirmAction?.type === 'sell_property' || confirmAction?.type === 'demolish' ? 'btn-danger' :
                                confirmAction?.type === 'rewind' || confirmAction?.type === 'mortgage' ? 'btn-warning' :
                                    'btn-success'
                                }`}
                            onClick={() => {
                                const d = confirmAction?.data;
                                switch (confirmAction?.type) {
                                    case 'bankrupt':
                                        send('bankrupt', { player_id: me.id });
                                        break;
                                    case 'rewind':
                                        send('rewind_to_snapshot', { player_id: me.id, snapshot_id: d.snapshot_id });
                                        break;
                                    case 'buy_property':
                                        send('buy_property', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'sell_property':
                                        send('sell_property_to_bank', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'mortgage':
                                        send('mortgage_property', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'unmortgage':
                                        send('unmortgage_property', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'pay_rent':
                                        send('pay_rent', { player_id: me.id, property_id: d.property_id, dice_roll: d.dice_roll });
                                        setDiceRoll('');
                                        break;
                                    case 'transfer':
                                        send('transfer', { from_id: me.id, to_id: d.to_id, amount: d.amount, description: d.description });
                                        break;
                                    case 'build':
                                        send('build_house', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'demolish':
                                        send('demolish_building', { player_id: me.id, property_id: d.property_id });
                                        break;
                                    case 'dev_loan':
                                        send('request_loan', {
                                            player_id: me.id,
                                            loan_type: 'DEVELOPMENT',
                                            amount: d.totalCost,
                                            installments: 20,
                                            financed_group: d.colorGroup
                                        });
                                        break;
                                }
                                setConfirmAction(null);
                            }}
                        >
                            {confirmAction?.type === 'rewind' ? 'Rewind' :
                                confirmAction?.type === 'buy_property' ? `Buy $${confirmAction?.data?.price}` :
                                    confirmAction?.type === 'sell_property' ? `Sell $${confirmAction?.data?.salePrice}` :
                                        confirmAction?.type === 'pay_rent' ? `Pay $${confirmAction?.data?.rent}` :
                                            confirmAction?.type === 'transfer' ? `Send $${confirmAction?.data?.amount}` :
                                                confirmAction?.type === 'build' ? `Build $${confirmAction?.data?.cost}` :
                                                    confirmAction?.type === 'demolish' ? 'Demolish' :
                                                        confirmAction?.type === 'dev_loan' ? `Finance $${confirmAction?.data?.totalCost}` :
                                                            'Confirm'}
                        </button>
                    </>
                }
            >
                {confirmAction?.type === 'bankrupt' && (
                    <p style={{ color: 'var(--mono-red)' }}>Are you sure? This will clear all assets and handle any outstanding loans.</p>
                )}
                {confirmAction?.type === 'rewind' && (
                    <div>
                        <p style={{ marginBottom: 8 }}>Rewind to before:</p>
                        <p style={{ fontWeight: 600, color: 'var(--mono-gold)', marginBottom: 8 }}>"{confirmAction.data.description}"</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>This cannot be undone.</p>
                    </div>
                )}
                {confirmAction?.type === 'buy_property' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Buy <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-green)' }}>${confirmAction.data.price}</p>
                    </div>
                )}
                {confirmAction?.type === 'sell_property' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Sell <strong>{confirmAction.data.name}</strong> to bank?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-gold)' }}>${confirmAction.data.salePrice}</p>
                        {confirmAction.data.isMortgaged && (
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                (Price ${confirmAction.data.price} - Mortgage ${confirmAction.data.mortgageValue})
                            </p>
                        )}
                    </div>
                )}
                {confirmAction?.type === 'mortgage' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Mortgage <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-gold)' }}>+${confirmAction.data.mortgageValue}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Unmortgage cost: ${Math.ceil(confirmAction.data.mortgageValue * 1.1)}
                        </p>
                    </div>
                )}
                {confirmAction?.type === 'unmortgage' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Unmortgage <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-red)' }}>-${confirmAction.data.cost}</p>
                    </div>
                )}
                {confirmAction?.type === 'pay_rent' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Pay rent for <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-red)' }}>${confirmAction.data.rent}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            To: {confirmAction.data.ownerName}
                        </p>
                    </div>
                )}
                {confirmAction?.type === 'transfer' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Send money to <strong>{confirmAction.data.toName}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-red)' }}>${confirmAction.data.amount}</p>
                    </div>
                )}
                {confirmAction?.type === 'build' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Build on <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-red)' }}>-${confirmAction.data.cost}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {confirmAction.data.isHotel ? 'Hotel' : `House #${confirmAction.data.houseNum}`}
                        </p>
                    </div>
                )}
                {confirmAction?.type === 'demolish' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Demolish on <strong>{confirmAction.data.name}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-green)' }}>+${confirmAction.data.refund}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            50% of build cost returned
                        </p>
                    </div>
                )}
                {confirmAction?.type === 'dev_loan' && (
                    <div>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Finance development of <strong style={{ color: 'var(--mono-purple)' }}>{confirmAction.data.groupName}</strong>?</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--mono-purple)' }}>${confirmAction.data.totalCost}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Builds 3 houses evenly across the set
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Repaid over 20 installments at 1.5%/turn
                        </p>
                    </div>
                )}
            </Modal>

            {/* Manage Company Modal */}
            <Modal
                isOpen={manageCompanyGroup !== null}
                onClose={() => setManageCompanyGroup(null)}
                title={`Manage Corp: ${manageCompanyGroup}`}
                actions={
                    <>
                        <button className="btn btn-ghost" onClick={() => setManageCompanyGroup(null)}>Close</button>
                    </>
                }
            >
                {manageCompanyGroup && (() => {
                    const company = state.companies?.find((c: any) => c.propertySetId === manageCompanyGroup);
                    return (
                        <div>
                            {company ? (
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: <strong style={{ color: 'var(--mono-green)' }}>Active</strong></p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Shares Outstanding: <strong>{company.sharesOutstanding}</strong></p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dividend Yield: <strong>{company.dividendPct}%</strong></p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Market Price: <strong>${company.marketPrice}</strong></p>
                                </div>
                            ) : (
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 12, color: 'var(--mono-gold)' }}>No corporation exists for this property group yet.</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Issue stock to monetize your monopoly and let other players invest!</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                <button
                                    className={`btn ${manageCompanyAction === 'issue' ? 'btn-primary' : 'btn-ghost'}`}
                                    style={{ flex: 1, padding: '8px' }}
                                    onClick={() => { setManageCompanyAction('issue'); setManageCompanyValue(''); setManageCompanyPrice(''); }}
                                >
                                    Issue Shares
                                </button>
                                {company && (
                                    <button
                                        className={`btn ${manageCompanyAction === 'dividend' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flex: 1, padding: '8px' }}
                                        onClick={() => { setManageCompanyAction('dividend'); setManageCompanyValue(company.dividendPct.toString()); }}
                                    >
                                        Set Dividend
                                    </button>
                                )}
                                {company && company.sharesOutstanding > 0 && (
                                    <button
                                        className={`btn ${manageCompanyAction === 'buyback' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flex: 1, padding: '8px' }}
                                        onClick={() => { setManageCompanyAction('buyback'); setManageCompanyValue(''); }}
                                    >
                                        Buy Back
                                    </button>
                                )}
                                <button
                                    className={`btn ${manageCompanyAction === 'sell_set' ? 'btn-danger' : 'btn-ghost'}`}
                                    style={{ flex: 1, padding: '8px' }}
                                    onClick={() => { setManageCompanyAction('sell_set'); setManageCompanyValue(''); }}
                                >
                                    Sell to Bank
                                </button>
                            </div>

                            {manageCompanyAction === 'issue' && (
                                <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                                    <p style={{ fontSize: 12, marginBottom: 8 }}>How many <strong>new</strong> shares to issue?</p>
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={manageCompanyValue}
                                        onChange={e => setManageCompanyValue(e.target.value)}
                                        className="mb-2"
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff', marginBottom: 12 }}
                                    />
                                    <p style={{ fontSize: 12, marginBottom: 8 }}>Initial Listing Price ($ per share):</p>
                                    <input
                                        type="number"
                                        placeholder="Price ($)"
                                        value={manageCompanyPrice}
                                        onChange={e => setManageCompanyPrice(e.target.value)}
                                        className="mb-2"
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                                    />
                                    <button
                                        className="btn btn-success"
                                        style={{ width: '100%', padding: '10px', marginTop: 8 }}
                                        disabled={!manageCompanyValue || Number(manageCompanyValue) <= 0 || !manageCompanyPrice || Number(manageCompanyPrice) <= 0}
                                        onClick={() => {
                                            send('issue_company_stock', {
                                                player_id: me.id,
                                                property_set_id: manageCompanyGroup,
                                                quantity: Number(manageCompanyValue),
                                                price: Number(manageCompanyPrice)
                                            });
                                            setManageCompanyGroup(null);
                                        }}
                                    >
                                        Issue {manageCompanyValue} Shares @ ${manageCompanyPrice}/ea
                                    </button>
                                    {company && (
                                        <p style={{ fontSize: 10, color: 'var(--mono-gold)', marginTop: 8 }}>
                                            Note: Since a corporation already exists, these will be sold via the market, not given to you for free.
                                        </p>
                                    )}
                                </div>
                            )}

                            {manageCompanyAction === 'dividend' && company && (
                                <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                                    <p style={{ fontSize: 12, marginBottom: 8 }}>Set Dividend Yield (%)</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Percentage of rent collected that is distributed to shareholders.</p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="number"
                                            placeholder="Percent (0-100)"
                                            min="0"
                                            max="100"
                                            value={manageCompanyValue}
                                            onChange={e => setManageCompanyValue(e.target.value)}
                                            style={{ flex: 1, padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                                        />
                                        <button
                                            className="btn btn-success"
                                            style={{ padding: '10px 20px' }}
                                            disabled={!manageCompanyValue || Number(manageCompanyValue) < 0 || Number(manageCompanyValue) > 100}
                                            onClick={() => {
                                                send('declare_dividend', {
                                                    player_id: me.id,
                                                    property_set_id: manageCompanyGroup,
                                                    dividend_pct: Number(manageCompanyValue)
                                                });
                                                setManageCompanyGroup(null);
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}

                            {manageCompanyAction === 'buyback' && company && (() => {
                                const availableForBuyback = company.offers
                                    ? company.offers.filter((o: any) => o.sellerId !== me.id).reduce((s: number, o: any) => s + o.quantity, 0)
                                    : 0;
                                const buybackQty = Number(manageCompanyValue) || 0;
                                // Estimate cost from cheapest offers
                                let estCost = 0;
                                let remaining = buybackQty;
                                const sorted = company.offers ? [...company.offers].filter((o: any) => o.sellerId !== me.id).sort((a: any, b: any) => a.price - b.price) : [];
                                for (const o of sorted) {
                                    if (remaining <= 0) break;
                                    const take = Math.min(remaining, o.quantity);
                                    estCost += take * o.price;
                                    remaining -= take;
                                }
                                const newOutstanding = Math.max(0, company.sharesOutstanding - buybackQty);
                                return (
                                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                                        <div style={{ padding: 10, background: 'rgba(244,199,82,0.1)', borderRadius: 6, marginBottom: 12, border: '1px solid rgba(244,199,82,0.3)' }}>
                                            <p style={{ fontSize: 11, color: 'var(--mono-gold)', margin: 0 }}>
                                                <strong>Share Buyback & Destruction</strong><br />
                                                Purchased shares are permanently destroyed, reducing shares outstanding.
                                                This concentrates future dividends among fewer shareholders — each remaining share earns more.
                                            </p>
                                        </div>
                                        <p style={{ fontSize: 12, marginBottom: 4, color: 'var(--text-muted)' }}>
                                            Shares Outstanding: <strong>{company.sharesOutstanding}</strong> • Available to buy back: <strong>{availableForBuyback}</strong>
                                        </p>
                                        <p style={{ fontSize: 12, marginBottom: 8 }}>How many shares to buy back & destroy?</p>
                                        <input
                                            type="number"
                                            placeholder="Quantity"
                                            value={manageCompanyValue}
                                            onChange={e => setManageCompanyValue(e.target.value)}
                                            min="1"
                                            max={availableForBuyback}
                                            style={{ width: '100%', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff', marginBottom: 8 }}
                                        />
                                        {buybackQty > 0 && buybackQty <= availableForBuyback && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                                                <p>Est. Cost: <strong style={{ color: 'var(--mono-red)' }}>${estCost.toLocaleString()}</strong></p>
                                                <p>Shares after: <strong>{company.sharesOutstanding}</strong> → <strong style={{ color: 'var(--mono-green)' }}>{newOutstanding}</strong></p>
                                            </div>
                                        )}
                                        <button
                                            className="btn btn-danger"
                                            style={{ width: '100%', padding: '10px', marginTop: 4 }}
                                            disabled={buybackQty <= 0 || buybackQty > availableForBuyback}
                                            onClick={() => {
                                                send('buyback_company_stock', {
                                                    player_id: me.id,
                                                    property_set_id: manageCompanyGroup,
                                                    quantity: buybackQty
                                                });
                                                setManageCompanyGroup(null);
                                            }}
                                        >
                                            🔥 Destroy {manageCompanyValue || 0} Shares (${estCost.toLocaleString()})
                                        </button>
                                    </div>
                                );
                            })()}

                            {manageCompanyAction === 'sell_set' && (() => {
                                const setProps = (state.properties || []).filter((p: any) => p.colorGroup === manageCompanyGroup && p.ownerId === me.id);
                                const appraisal = setProps.reduce((s: number, p: any) => {
                                    const base = Math.floor(p.price / 2);
                                    const improv = (p.improvements || 0) * Math.floor(p.houseCost / 2);
                                    return s + base + improv;
                                }, 0);
                                const hasStocks = company && company.sharesOutstanding > 0;
                                return (
                                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8 }}>
                                        <div style={{ padding: 10, background: 'rgba(255,60,60,0.1)', borderRadius: 6, marginBottom: 12, border: '1px solid rgba(255,60,60,0.3)' }}>
                                            <p style={{ fontSize: 11, color: 'var(--mono-red)', margin: 0 }}>
                                                <strong>⚠️ Sell Entire Set to Bank</strong><br />
                                                All {setProps.length} properties will be sold back to the bank. Improvements are demolished at half cost.
                                                {hasStocks && (
                                                    <><br /><br /><strong>Stock Warning:</strong> All {company.sharesOutstanding} outstanding shares will be forcibly bought back at market price (${company.marketPrice}) and destroyed. The buyback cost is deducted from your sale proceeds.</>
                                                )}
                                            </p>
                                        </div>
                                        <div style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.8 }}>
                                            <p>Properties: <strong>{setProps.map((p: any) => p.name).join(', ')}</strong></p>
                                            <p>Bank Appraisal: <strong style={{ color: 'var(--mono-green)' }}>${appraisal.toLocaleString()}</strong></p>
                                            {hasStocks && (
                                                <p>Est. Buyback Cost: <strong style={{ color: 'var(--mono-red)' }}>${(company.sharesOutstanding * company.marketPrice).toLocaleString()}</strong></p>
                                            )}
                                            {hasStocks && (
                                                <p>Est. Net Proceeds: <strong style={{ color: appraisal - company.sharesOutstanding * company.marketPrice >= 0 ? 'var(--mono-green)' : 'var(--mono-red)' }}>
                                                    ${Math.max(0, appraisal - company.sharesOutstanding * company.marketPrice).toLocaleString()}
                                                </strong></p>
                                            )}
                                        </div>
                                        <button
                                            className="btn btn-danger"
                                            style={{ width: '100%', padding: '10px' }}
                                            onClick={() => {
                                                setInAppDialog({
                                                    type: 'confirm',
                                                    title: 'Sell Set to Bank',
                                                    message: `Are you sure you want to sell the entire ${manageCompanyGroup} set to the bank?${hasStocks ? ' All shareholders will be compensated at market price.' : ''}`,
                                                    onConfirm: () => {
                                                        send('sell_set_to_bank', {
                                                            player_id: me.id,
                                                            property_set_id: manageCompanyGroup
                                                        });
                                                        setManageCompanyGroup(null);
                                                    }
                                                });
                                            }}
                                        >
                                            🏦 Sell Set to Bank
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}
            </Modal>

            {/* Trade Stock Modal (Buy/Sell) */}
            <Modal
                isOpen={tradeStockCompany !== null}
                onClose={() => setTradeStockCompany(null)}
                title={`${tradeStockType === 'buy' ? 'Buy' : 'Sell'} ${tradeStockCompany?.propertySetId} Stock`}
                actions={
                    <>
                        <button className="btn btn-ghost" onClick={() => setTradeStockCompany(null)}>Cancel</button>
                        <button
                            className={`btn ${tradeStockType === 'buy' ? 'btn-success' : 'btn-danger'}`}
                            disabled={
                                !tradeStockQuantity || Number(tradeStockQuantity) <= 0 ||
                                (tradeStockType === 'sell' && (!tradeStockPrice || Number(tradeStockPrice) <= 0))
                            }
                            onClick={() => {
                                if (tradeStockType === 'buy') {
                                    const buyPayload: any = {
                                        player_id: me.id,
                                        property_set_id: tradeStockCompany!.propertySetId,
                                        quantity: Number(tradeStockQuantity)
                                    };
                                    if (tradeStockSeller) buyPayload.seller_id = tradeStockSeller;
                                    send('buy_company_stock', buyPayload);
                                } else {
                                    send('sell_company_stock', {
                                        player_id: me.id,
                                        property_set_id: tradeStockCompany!.propertySetId,
                                        quantity: Number(tradeStockQuantity),
                                        price: Number(tradeStockPrice)
                                    });
                                }
                                setTradeStockCompany(null);
                            }}
                        >
                            Confirm {tradeStockType === 'buy' ? 'Buy' : 'Sell'}
                        </button>
                    </>
                }
            >
                {tradeStockCompany && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <p style={{ fontSize: 14 }}>Market Price: <strong style={{ color: 'var(--mono-green)' }}>${tradeStockCompany.marketPrice}</strong></p>
                            <p style={{ fontSize: 14 }}>Your Shares: <strong>{me.shares?.[tradeStockCompany.propertySetId] || 0}</strong></p>
                        </div>
                        {tradeStockCompany.ownerId === me.id && tradeStockType === 'buy' && (
                            <div style={{ padding: 12, background: 'rgba(244,199,82,0.15)', borderRadius: 8, marginBottom: 16, border: '1px solid var(--mono-gold)' }}>
                                <p style={{ fontSize: 12, color: 'var(--mono-gold)', margin: 0 }}>
                                    <strong>Insider Trading Rule:</strong> Buying <em>Corporation Treasury</em> shares takes 3 turns to clear. <strong>Buying from other players is instant.</strong> Choose a player seller below to bypass the delay.
                                </p>
                            </div>
                        )}
                        {tradeStockType === 'buy' && tradeStockCompany.offers && tradeStockCompany.offers.length > 0 && (
                            <>
                                <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Buy from:</p>
                                <select
                                    value={tradeStockSeller}
                                    onChange={e => setTradeStockSeller(e.target.value)}
                                    style={{ width: '100%', padding: '10px', fontSize: 14, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff', marginBottom: 16 }}
                                >
                                    <option value="">Any Seller (cheapest first)</option>
                                    {[...new Set(tradeStockCompany.offers.filter((o: any) => o.sellerId !== me.id).map((o: any) => o.sellerId))].map((sid: any) => {
                                        const sellerLabel = sid === 'COMPANY'
                                            ? `${tradeStockCompany.propertySetId} Corp (Treasury)${tradeStockCompany.ownerId === me.id ? ' ⏳ 3-turn delay' : ''}`
                                            : state.players.find((p: any) => p.id === sid)?.name || sid;
                                        const sellerShares = tradeStockCompany.offers.filter((o: any) => o.sellerId === sid).reduce((s: number, o: any) => s + o.quantity, 0);
                                        const lowestPrice = Math.min(...tradeStockCompany.offers.filter((o: any) => o.sellerId === sid).map((o: any) => o.price));
                                        return (
                                            <option key={sid} value={sid}>
                                                {sellerLabel} — {sellerShares} shares from ${lowestPrice}
                                            </option>
                                        );
                                    })}
                                </select>
                            </>
                        )}
                        <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Quantity to {tradeStockType}:</p>
                        <input
                            type="number"
                            placeholder="Shares qty"
                            value={tradeStockQuantity}
                            onChange={e => setTradeStockQuantity(e.target.value)}
                            min="1"
                            autoFocus
                            style={{ width: '100%', padding: '12px', fontSize: 16, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff', marginBottom: tradeStockType === 'sell' ? 16 : 0 }}
                        />
                        {tradeStockType === 'sell' && (
                            <>
                                <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>Limit Price per Share:</p>
                                <input
                                    type="number"
                                    placeholder="Asking Price ($)"
                                    value={tradeStockPrice}
                                    onChange={e => setTradeStockPrice(e.target.value)}
                                    min="1"
                                    style={{ width: '100%', padding: '12px', fontSize: 16, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff' }}
                                />
                            </>
                        )}
                        {tradeStockQuantity && Number(tradeStockQuantity) > 0 && tradeStockType === 'buy' && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                Estimated Cost: ~${(Number(tradeStockQuantity) * tradeStockCompany.marketPrice).toLocaleString()}
                            </p>
                        )}
                        {tradeStockQuantity && Number(tradeStockQuantity) > 0 && tradeStockPrice && Number(tradeStockPrice) > 0 && tradeStockType === 'sell' && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                Total Value of Listing: ${(Number(tradeStockQuantity) * Number(tradeStockPrice)).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}
            </Modal>

            <PropertyTradingModals modal={modal} setModal={setModal} selectedProperty={selectedProperty} tradeTargetId={tradeTargetId} setTradeTargetId={setTradeTargetId} tradeCash={tradeCash} setTradeCash={setTradeCash} listingPrice={listingPrice} setListingPrice={setListingPrice} auctionDuration={auctionDuration} setAuctionDuration={setAuctionDuration} closeModal={closeModal} send={send} me={me} state={state} />
            <TradingModal
                isOpen={showTradingModal}
                onClose={closeTradingModal}
                me={me}
                state={state}
                send={send}
                counterTrade={counterTrade}
            />

            {/* Property Card Scanner Overlay */}
            {
                showScanner && (
                    <PropertyScanner
                        onClose={() => setShowScanner(false)}
                        onScanComplete={(data: any | any[]) => {
                            const processProperty = (prop: any) => {
                                // Basic validation
                                if (!prop.name || !prop.price) return;

                                send('create_property', {
                                    player_id: me.id,
                                    name: prop.name,
                                    price: Number(prop.price),
                                    colorGroup: prop.colorGroup || 'Unknown',
                                    colorHex: prop.colorHex || '#3B82F6',
                                    houseCost: Number(prop.houseCost) || 0,
                                    hotelCost: Number(prop.hotelCost) || 0,
                                    rentBase: Number(prop.rentBase) || 0,
                                    rent1House: Number(prop.rent1House) || 0,
                                    rent2House: Number(prop.rent2House) || 0,
                                    rent3House: Number(prop.rent3House) || 0,
                                    rent4House: Number(prop.rent4House) || 0,
                                    rentHotel: Number(prop.rentHotel) || 0,
                                    isRailroad: prop.isRailroad || false,
                                    isUtility: prop.isUtility || false,
                                    ownerId: null // Reset to unowned (Bank) for board setup
                                });
                            };

                            if (Array.isArray(data)) {
                                // Bulk Import
                                data.forEach(processProperty);
                                setShowScanner(false);
                                // alert(`Imported ${data.length} properties!`);
                            } else {
                                // Single Import - Check for manual review vs auto
                                // For QR, we usually just want to import directly if it looks valid
                                if (data.name && data.price) {
                                    processProperty(data);
                                    setShowScanner(false);
                                } else {
                                    // Fallback to manual entry if partial data
                                    setNewProp({
                                        name: data.name || '',
                                        price: data.price || '',
                                        colorGroup: data.colorGroup || '',
                                        colorHex: data.colorHex || '#3B82F6',
                                        houseCost: data.houseCost || '',
                                        hotelCost: data.hotelCost || '',
                                        rentBase: data.rentBase || '',
                                        rent1House: data.rent1House || '',
                                        rent2House: data.rent2House || '',
                                        rent3House: data.rent3House || '',
                                        rent4House: data.rent4House || '',
                                        rentHotel: data.rentHotel || '',
                                        isRailroad: data.isRailroad || undefined,
                                        isUtility: data.isUtility || undefined,
                                    });
                                    setShowScanner(false);
                                    setModal('add_property');
                                }
                            }
                        }}
                    />
                )
            }

            {/* QR Generator Modal */}
            {
                showQRGenerator && (
                    <PropertyQRGenerator
                        properties={state.properties || []}
                        onClose={() => setShowQRGenerator(false)}
                    />
                )
            }

            {/* PENDING PAYMENT BANNER — shown when modal is closed but payment is still pending */}
            {
                pendingPayment && !showInsuffModal && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 70,
                            left: 12,
                            right: 12,
                            zIndex: 9998,
                            background: pendingCanPay
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))'
                                : 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(180, 30, 30, 0.95))',
                            borderRadius: 16,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                                {pendingCanPay ? '✅ READY TO PAY' : '⚠️ PENDING PAYMENT'}
                            </p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {pendingPayment.action === 'pay_bank'
                                    ? `$${pendingPayment.amount} to bank`
                                    : pendingPayment.action === 'transfer'
                                        ? `$${pendingPayment.amount} to ${pendingPayment.toName}`
                                        : `$${pendingPayment.rent} rent for ${pendingPayment.propertyName}`
                                }
                                {!pendingCanPay && <>{' · short $'}{pendingPayment.shortfall}</>}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {pendingCanPay ? (
                                <>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px 14px', fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, borderRadius: 10, whiteSpace: 'nowrap' }}
                                        onClick={() => { setPendingPayment(null); setShowInsuffModal(false); }}
                                    >Cancel</button>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px 14px', fontSize: 11, background: '#fff', color: '#059669', fontWeight: 700, borderRadius: 10, whiteSpace: 'nowrap' }}
                                        onClick={executePendingPayment}
                                    >Pay Now</button>
                                </>
                            ) : (
                                <button
                                    className="btn"
                                    style={{ padding: '6px 14px', fontSize: 11, background: '#fff', color: '#dc2626', fontWeight: 700, borderRadius: 10, whiteSpace: 'nowrap' }}
                                    onClick={() => setShowInsuffModal(true)}
                                >Options</button>
                            )}
                        </div>
                    </div>
                )
            }

            {/* INSUFFICIENT FUNDS MODAL */}
            {
                pendingPayment && showInsuffModal && (
                    <Modal
                        isOpen={true}
                        onClose={() => setShowInsuffModal(false)}
                        title={pendingCanPay ? '✅ Ready to Pay' : '⚠️ Insufficient Funds'}
                        actions={
                            <>
                                {pendingCanPay ? (
                                    <>
                                        <button className="btn btn-ghost" onClick={() => { setPendingPayment(null); setShowInsuffModal(false); }}>Cancel</button>
                                        <button className="btn btn-success" onClick={executePendingPayment}>
                                            Pay ${pendingPayment.amount || pendingPayment.rent} Now
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-ghost" onClick={() => setShowInsuffModal(false)}>Sell Assets First</button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => {
                                                if (pendingPayment.action === 'pay_bank') {
                                                    send('pay_bank_with_loan', { player_id: me.id, amount: pendingPayment.amount, reason: pendingPayment.reason });
                                                } else if (pendingPayment.action === 'transfer') {
                                                    send('transfer_with_loan', { from_id: me.id, to_id: pendingPayment.toId, amount: pendingPayment.amount, description: pendingPayment.description });
                                                } else {
                                                    send('pay_rent_with_loan', { player_id: me.id, property_id: pendingPayment.propertyId, dice_roll: pendingPayment.diceRoll });
                                                }
                                                setPendingPayment(null);
                                                setShowInsuffModal(false);
                                            }}
                                        >
                                            Take Emergency Loan (${pendingPayment.shortfall})
                                        </button>
                                    </>
                                )}
                            </>
                        }
                    >
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 16, marginBottom: 12 }}>
                                {pendingPayment.action === 'pay_bank' && (
                                    <>You need to pay <strong style={{ color: 'var(--mono-red)' }}>${pendingPayment.amount}</strong> to the bank{pendingPayment.reason ? ` (${pendingPayment.reason})` : ''}.</>
                                )}
                                {pendingPayment.action === 'transfer' && (
                                    <>You need to send <strong style={{ color: 'var(--mono-red)' }}>${pendingPayment.amount}</strong> to <strong>{pendingPayment.toName}</strong>.</>
                                )}
                                {(!pendingPayment.action || pendingPayment.action === 'pay_rent') && (
                                    <>You owe <strong style={{ color: 'var(--mono-red)' }}>${pendingPayment.rent}</strong> rent to <strong>{pendingPayment.ownerName}</strong> for <strong>{pendingPayment.propertyName}</strong>.</>
                                )}
                            </p>
                            {pendingCanPay ? (
                                <div style={{ ...GLASS_PILL, padding: '12px 16px', marginBottom: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
                                    <p style={{ fontSize: 14, color: 'var(--mono-green)' }}>✅ You now have enough cash to pay!</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Balance: <strong>${me.balance}</strong></p>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                                        You're short <strong style={{ color: 'var(--mono-gold)' }}>${pendingPayment.shortfall}</strong>.
                                        {me.balance > 0 && <> (Current balance: <strong>${me.balance}</strong>)</>}
                                    </p>
                                    <div style={{ ...GLASS_PILL, padding: '12px 16px', marginBottom: 12 }}>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Options:</p>
                                        <p style={{ fontSize: 13 }}>💰 <strong>Emergency Loan</strong> — borrow the shortfall at 12%/turn</p>
                                        <p style={{ fontSize: 13, marginTop: 4 }}>🏠 <strong>Sell/Trade assets</strong> — close this, sell properties to raise cash</p>
                                        <p style={{ fontSize: 13, marginTop: 4 }}>🏦 <strong>Mortgage</strong> — mortgage properties for quick cash</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </Modal>
                )
            }

            {/* HOW-TO GUIDE MODAL */}
            {
                showGuide && (
                    <Modal isOpen={true} onClose={() => setShowGuide(false)} title="📖 How To Play" actions={<button className="btn btn-primary" onClick={() => setShowGuide(false)}>Got it!</button>}>
                        <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '0 4px' }}>
                            {/* OVERVIEW */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.home} Overview
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    This is your <strong>digital Monopoly banker</strong>. It replaces paper money with real-time digital transactions.
                                    Play the board game normally — use this app for all money, properties, and loans.
                                </p>
                            </div>

                            {/* TABS */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.grid} Navigation Tabs
                                </h3>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px', marginBottom: 6 }}>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.bank} <strong>Bank</strong> — send money, pay bank, collect from bank, take loans, manage vault</p>
                                </div>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px', marginBottom: 6 }}>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Property</strong> — view/manage properties, build houses, mortgage, auction, scan QR deeds</p>
                                </div>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px', marginBottom: 6 }}>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.home} <strong>Home</strong> (center) — your dashboard with balance, net worth, loans, and quick actions</p>
                                </div>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px', marginBottom: 6 }}>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {state.settings.stocks !== false ? Icons.trendUp : Icons.trade}
                                        <strong>{state.settings.stocks !== false ? 'Invest' : 'Trade'}</strong> — {state.settings.stocks !== false ? 'buy/sell stocks on the market' : 'propose trades with other players'}
                                    </p>
                                </div>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px' }}>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.list} <strong>History</strong> — full transaction log, leaderboard, Free Parking jackpot</p>
                                </div>
                            </div>

                            {/* MONEY */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.dollar} Money & Transactions
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.send} <strong>Send Money</strong> — Pay another player (e.g., rent between friends)</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.bank} <strong>Pay Bank</strong> — Fines, taxes, or other bank payments</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.download} <strong>Collect from Bank</strong> — Receive money (e.g., Chance card winnings)</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.vault} <strong>Vault</strong> — Deposit cash into your vault for safekeeping. Vault auto-taps to cover loan payments.</p>
                                </div>
                            </div>

                            {/* PROPERTIES */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.building} Properties
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.grid} <strong>Scan QR</strong> — Scan a property's QR code to instantly add it to your portfolio</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.list} <strong>Add Custom</strong> — Manually add a property with custom name, price, and rent values</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Build</strong> — Build houses/hotels on properties you own the full color set of</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.home} <strong>Demolish</strong> — Sell back a house for 50% of build cost</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.dollar} <strong>Mortgage</strong> — Mortgage a property for instant cash (50% of price)</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.lock} <strong>Unmortgage</strong> — Pay to lift the mortgage and collect rent again</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.gavel} <strong>Auction</strong> — Start a timed auction for other players to bid on your property</p>
                                </div>
                            </div>

                            {/* BUILDING RULES */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.building} Building Rules
                                </h3>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px' }}>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.gavel} <strong>Even Building</strong> — You must build <em>evenly</em> across a color set. You can only build on the property with the fewest houses.</p>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.gavel} <strong>Even Demolish</strong> — You must demolish from the property with the most houses first.</p>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Hotels</strong> — Cost replaces 4 houses with 1 hotel. Maximum improvement.</p>
                                    <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.lock} <strong>Full Set Required</strong> — You must own ALL properties in a color group before building. Rent doubles on unimproved full sets.</p>
                                </div>
                            </div>

                            {/* RENT */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.dollar} Rent
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.check} <strong>Tap "Pay Rent"</strong> on opponent's property card → confirms amount → pays automatically</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.zap} <strong>Utility Rent</strong> — Enter your dice roll, rent = dice × multiplier (4× or 10× for full set)</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.car} <strong>Railroad Rent</strong> — $25 per railroad owned by that player (1=$25, 2=$50, 3=$100, 4=$200)</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.alert} <strong>Can't afford?</strong> — A red banner appears. Sell/mortgage assets first, then tap "Pay Now".</p>
                                </div>
                            </div>

                            {/* LOANS */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.bank} Loans
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.chart} <strong>Standard Loan</strong> — Borrow money at ~5%/turn. Choose 1–10 installments. Paid each time you pass GO.</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.alert} <strong>Emergency Loan</strong> — Auto-offered when you can't afford a payment. 12%/turn, 1 installment. Expensive!</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Development Loan</strong> — Finances 3 houses spread evenly across a color set. 1.5%/turn, 20 installments.</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.clock} <strong>Loan Payments</strong> — Deducted automatically when you pass GO. Vault is tapped if cash is short.</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.stop} <strong>Missing Payments</strong> — Miss 3 installments → insolvency warning → potential bankruptcy!</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.trendDown} <strong>Credit Score</strong> — Starts at 700. Late payments lower it, on-time payments raise it. Affects loan limits.</p>
                                </div>
                            </div>

                            {/* INSUFFICIENT FUNDS */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.alert} Can't Afford a Payment?
                                </h3>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px' }}>
                                    <p style={{ fontSize: 13, marginBottom: 6 }}>1️⃣ A <strong style={{ color: '#dc2626' }}>red banner</strong> appears at the bottom showing what you owe</p>
                                    <p style={{ fontSize: 13, marginBottom: 6 }}>2️⃣ Tap <strong>"Options"</strong> to see: Emergency Loan or Sell Assets</p>
                                    <p style={{ fontSize: 13, marginBottom: 6 }}>3️⃣ If you choose <strong>"Sell Assets First"</strong>, go sell/mortgage properties</p>
                                    <p style={{ fontSize: 13, marginBottom: 6 }}>4️⃣ Banner turns <strong style={{ color: '#10b981' }}>green</strong> when you have enough → tap <strong>"Pay Now"</strong></p>
                                    <p style={{ fontSize: 13 }}>5️⃣ Or tap <strong>"Cancel"</strong> to dismiss the payment entirely</p>
                                </div>
                            </div>

                            {/* PASSING GO */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.play} Passing GO
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.check} Tap <strong>"Pass GO"</strong> on the Home tab to collect ${state.settings?.goPayout || 200}</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.creditCard} Loan installments are deducted automatically from your GO payout</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.lock} If short on cash, your vault is auto-tapped to cover the difference</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.alert} If you still can't pay, the installment is marked as "missed"</p>
                                </div>
                            </div>

                            {/* FREE PARKING */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.car} Free Parking
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.dollar} All fines/taxes paid to the bank go into the <strong>Free Parking Jackpot</strong></p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.zap} Land on Free Parking? Tap the <strong>"Collect Jackpot"</strong> button on the History tab</p>
                                </div>
                            </div>

                            {/* CORPORATE STOCKS (only when stocks enabled) */}
                            {state.settings.stocks !== false && (
                                <div style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--mono-gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {Icons.trendUp} Corporate Stocks
                                    </h3>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Form a Company</strong> — Own a full color set → go to Manage Corp → Issue Shares at any price</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.chart} <strong>Stock Exchange</strong> — Buy & sell shares from the Invest tab. Shares earn dividends!</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.dollar} <strong>Dividends</strong> — When rent is paid to the CEO, a % is split among all shareholders proportionally</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.send} <strong>Issue Shares</strong> — CEO can issue new shares (if offers exist, price must be within ±$1 of lowest ask)</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.zap} <strong>Buyback & Destroy</strong> — CEO buys shares from market → shares are destroyed → dividends concentrate among fewer shares</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.alert} <strong>Sell Set to Bank</strong> — Sell all properties in a set back to the bank. If stocks exist, ALL shares are forcibly bought back at market price</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.lock} <strong>Insider Rule</strong> — CEO buying their own company's treasury shares has a 3-turn delay. Buying from other players is instant</p>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.trendUp} <strong>Net Worth</strong> — Your stock portfolio value (shares × market price) counts toward your net worth</p>
                                    </div>
                                </div>
                            )}

                            {/* TRADING */}
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.trade} Trading
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.send} <strong>Propose Trade</strong> — Select a player, pick properties, cash{state.settings.stocks !== false ? ', and stocks from any company' : ''} to offer and request</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.download} <strong>Incoming Trades</strong> — Accept, reject, or counter-offer other players' trade proposals</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.trade} <strong>Counter</strong> — Modify their offer and send back a counter-proposal</p>
                                    {state.settings.stocks !== false && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.chart} <strong>Stock Trades</strong> — Include shares from specific companies in trade offers. Pick quantity per company</p>
                                    )}
                                </div>
                            </div>

                            {/* TIPS */}
                            <div style={{ marginBottom: 8 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {Icons.zap} Pro Tips
                                </h3>
                                <div style={{ ...GLASS_PILL, padding: '10px 14px' }}>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.lock} Use the <strong>Vault</strong> to protect cash from spending temptation — it auto-covers loan payments</p>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.trendUp} Keep your <strong>credit score</strong> high by never missing loan payments — better rates and higher limits</p>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.building} <strong>Development Loans</strong> let you build houses with no cash upfront — great for early monopolies</p>
                                    <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.dollar} <strong>Mortgage</strong> properties before taking emergency loans — mortgaging has no interest!</p>
                                    {state.settings.stocks !== false && (
                                        <>
                                            <p style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.chart} <strong>Buy stocks</strong> in opponents' companies to earn passive dividends on their rent income</p>
                                            <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.zap} <strong>Buyback shares</strong> as CEO to concentrate dividends — fewer outstanding shares = more per share</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* INSOLVENCY WARNING MODAL */}
            {
                insolvencyWarning && (
                    <Modal
                        isOpen={true}
                        onClose={insolvencyWarning.hasAssets ? onDismissInsolvencyWarning : () => {
                            send('bankrupt', { player_id: me.id });
                            onDismissInsolvencyWarning();
                        }}
                        title="🚨 Insolvency Warning"
                        actions={
                            <>
                                {insolvencyWarning.hasAssets && (
                                    <button className="btn btn-primary" onClick={onDismissInsolvencyWarning}>
                                        Trade / Sell Assets
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        setConfirmAction({ type: 'bankrupt', data: {} });
                                        onDismissInsolvencyWarning();
                                    }}
                                >
                                    Declare Bankruptcy
                                </button>
                            </>
                        }
                    >
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 16, marginBottom: 12, color: 'var(--mono-red)' }}>
                                You missed <strong>${insolvencyWarning.amountOwed}</strong> in loan payments!
                            </p>
                            {insolvencyWarning.hasAssets ? (
                                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                                    You still own assets. Sell or trade properties to cover your debt before declaring bankruptcy.
                                </p>
                            ) : (
                                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                                    You have no remaining assets. You must declare bankruptcy.
                                </p>
                            )}
                        </div>
                    </Modal>
                )
            }
            {/* In-App Dialog Modal */}
            <Modal
                isOpen={inAppDialog !== null}
                onClose={() => setInAppDialog(null)}
                title={inAppDialog?.title || ''}
                actions={
                    <>
                        <button className="btn btn-ghost" onClick={() => setInAppDialog(null)}>Cancel</button>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                if (inAppDialog) {
                                    inAppDialog.onConfirm(inAppDialogValue);
                                    setInAppDialog(null);
                                }
                            }}
                        >
                            Confirm
                        </button>
                    </>
                }
            >
                <p style={{ fontSize: 14, marginBottom: 12 }}>{inAppDialog?.message}</p>
                {inAppDialog?.type === 'input' && (
                    <input
                        type="number"
                        value={inAppDialogValue}
                        onChange={e => setInAppDialogValue(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, color: '#fff', fontSize: 16 }}
                    />
                )}
            </Modal>
        </div >
    );
}
