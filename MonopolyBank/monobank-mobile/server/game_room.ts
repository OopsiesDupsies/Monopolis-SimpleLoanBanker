import { DurableObject } from "cloudflare:workers";

// ===============================================
// MONOBANK CONSTANTS (ALL INTEGERS - Monopoly money)
// Based on: Interest ACCRUES on TURN TICK, PAID on GO
// Bank funds loans via CB (not own cash)
// ===============================================

// ===== GAME CONSTANTS =====
const GO_AMOUNT = 200;  // Comes from nowhere (game mechanic)
const MONOBANK_OWNER_ID = '__MONOBANK__';  // Special ID for bank-owned properties

// ===== BANK STARTING STATE =====
const DEFAULT_BANK_CASH = 5000;         // Starting operational cash
const DUMPED_SHARES_TOTAL = 0;        // Bank starts with 0 treasury shares - must issue when needed

// Stock price in dollars (integer)
const STOCK_PRICE_DEFAULT = 20;
const STOCK_PRICE_MIN = 1;
const STOCK_PRICE_MAX = Number.MAX_SAFE_INTEGER;

// Fee rates in basis points
const STOCK_FEE_BPS = 50;               // 0.5% fee
const SPREAD_CALM_BPS = 100;            // 1% spread
const SPREAD_CHOPPY_BPS = 200;          // 2% spread

// Mortgage rates (percentage)
const MORTGAGE_RATE_PCT = 50;
const UNMORTGAGE_RATE_PCT = 55;

// ===== CENTRAL BANK CONSTANTS (BPS PER TURN) =====
const CB_BASE_RATE_BPS = 50;            // 0.5% base rate per turn
const CB_RISK_PREMIUM_INCREMENT = 10;   // +0.1% per missed payment
const CB_BAILOUT_RATE_PENALTY = 100;    // +1% (100 bps) after bailout
const CB_TARGET_INFLATION = 100;        // Target inflation index

// ===== BANK MARGIN CONSTANTS (BPS) =====
// Bank margin = profit on top of CB rate
// Final player rate = CB rate + risk premium + bank margin
const MARGIN_EMERGENCY_BASE = 200;      // 2.0% base margin
const MARGIN_EMERGENCY_STRESS = 200;    // +2.0% when stressed
const MARGIN_STANDARD_BASE = 80;        // 0.8% base margin  
const MARGIN_STANDARD_STRESS = 120;     // +1.2% when stressed
const MARGIN_DEVELOPMENT_BASE = 60;     // 0.6% base margin
const MARGIN_DEVELOPMENT_STRESS = 90;   // +0.9% when stressed

// ===== DIVIDEND CONSTANTS =====
const DIVIDEND_RATE_BPS = 25;           // 0.25% of equity per tick
const MIN_EQUITY_FOR_DIVIDEND = 5000;   // Min equity to pay dividends

// ===== LOAN LIMITS =====
const MAX_INSTALLMENTS_GLOBAL = 10;
const MIN_PRINCIPAL_PER_INSTALLMENT = Math.max(100, Math.floor(GO_AMOUNT / 2));
const STANDARD_PENDING_TURNS = 2;
const MAX_LOAN_MISSES = 2;

// ===== BAILOUT CONSTANTS =====
const BAILOUT_NEGATIVE_TURNS_THRESHOLD = 2;  // 2 turns of negative + can't pay = bailout

// ===== STOCK ISSUANCE CONSTANTS (Mathematical Model) =====
// Formula: P(Q) = Pâ‚€ * e^(-k*Q/S), Q* â‰ˆ min(S/k, f*B/Pâ‚€)
// R(Q*) = Q* * Pâ‚€ * e^(-k*Q*/S)
// Where:
//   B = total cash balances of all players
//   Pâ‚€ = current stock price
//   S = shares outstanding (free float)
//   f âˆˆ (0,1) = assumed fraction of total cash that will chase the stock this tick (tuning knob)
//   k > 0 = price-impact knob (bigger k = price drops faster when you dump shares)
const STOCK_ISSUANCE_F = 0.15;  // f: fraction of total player cash that will chase stock (15% - tuning knob, 0 < f < 1)
const STOCK_ISSUANCE_K = 1.5;   // k: price-impact knob (bigger k = price drops faster when issuing shares)
const MAX_ISSUANCE_PCT_OF_OUTSTANDING = 50;  // Max 50% of outstanding shares per tick (prevents over-issuance)
const MIN_ISSUANCE_SHARES = 1;  // Minimum shares to issue (avoid tiny issuances)
const MAX_ISSUANCE_SHARES_ABSOLUTE = 10000;  // Hard cap: never issue more than this per tick

// ===== ENUMS =====
type LoanType = 'EMERGENCY' | 'STANDARD' | 'DEVELOPMENT';
type LoanStatus = 'PENDING' | 'ACTIVE' | 'PAID' | 'DEFAULTED';

// ===== INTEGER MATH HELPERS =====
function intCeilDiv(numerator: number, denominator: number): number {
    if (numerator <= 0) return 0;
    return Math.floor((numerator + denominator - 1) / denominator);
}

function intPct(value: number, pct: number): number {
    return Math.floor(value * pct / 100);
}

function intPctCeil(value: number, pct: number): number {
    return intCeilDiv(value * pct, 100);
}

function intBpsCeil(value: number, bps: number): number {
    return intCeilDiv(value * bps, 10000);
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// No longer needed - prices are in dollars (integers)

// ===== INTERFACES =====

// ===== PROPERTY SYSTEM (Fully Custom) =====
// No pre-defined properties - everything is created by players

interface Property {
    id: string;
    name: string;
    price: number;              // Purchase price

    // Custom color group
    colorGroup: string;         // Custom group name (e.g., "Downtown", "Beach")
    colorHex: string;           // Any hex color chosen by user

    // Building costs
    houseCost: number;
    hotelCost: number;

    // Rent schedule (all custom)
    rentBase: number;
    rent1House: number;
    rent2House: number;
    rent3House: number;
    rent4House: number;
    rentHotel: number;

    // Ownership
    ownerId: string | null;

    // State
    isMortgaged: boolean;
    improvements: number;       // 0-4 houses, 5 = hotel

    // Special types (optional)
    isRailroad: boolean;
    isUtility: boolean;
}

interface Loan {
    id: string;
    type: LoanType;
    status: LoanStatus;
    requestedAmount: number;       // Original amount requested
    principalRemaining: number;    // How much principal is still owed

    // === LOCKED RATES AT ORIGINATION ===
    cbRateLockedBps: number;       // CB rate at time of loan (locked)
    bankMarginLockedBps: number;   // Bank margin at time of loan (locked)
    finalRateLockedBps: number;    // Total rate = cb + margin (locked)

    // === ACCRUED INTEREST ===
    // Interest accrues on TURN TICK, paid on GO
    accruedInterest: number;       // Grows on tick, cleared on payment

    // Repayment plan for STANDARD/DEVELOPMENT
    installmentsTotal: number;     // Chosen by player (1..maxAllowed)
    installmentsPaid: number;      // How many paid so far
    installmentPrincipal: number;  // Principal per installment (fixed)

    // Emergency rule
    emergencyDueNextPayEvent: boolean;

    // Disbursement rules
    pendingTurnsRemaining: number; // For STANDARD (starts at 2)
    pendingUntilGo: boolean;       // For DEVELOPMENT (true until GO pressed)

    // Miss counter for defaults
    misses: number;

    createdAt: number;
}

interface StockOrder {
    id: string;
    playerId: string;
    side: 'BUY' | 'SELL';
    qty: number;
    timestamp: number;
}

// ===== BOND SYSTEM =====
interface Bond {
    id: string;
    issuerId: 'BANK' | string;  // 'BANK' for bank bonds, player ID for corporate bonds
    faceValue: number;          // Par value (e.g., $1000)
    couponRateBps: number;     // Annual interest rate in basis points (e.g., 500 = 5%)
    maturityTurns: number;      // Turns until maturity
    issuedAt: number;           // Turn number when issued
    ownerId: string | null;     // Current owner (null = bank holds)
    price: number;              // Current market price
}

interface BondOrder {
    id: string;
    playerId: string | 'BANK';
    bondId: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    limitPrice: number;
    filled: number;
    createdAt: number;
}

interface Player {
    id: string;
    name: string;
    balance: number;
    vault: number;

    // Turn tracking (Prompt 2)
    turnIndex: number;             // Increments on End Turn or Jail Turn
    lastPayTurnIndex: number;      // turnIndex at last GO/JailPay event

    // Loan arrays (Prompt 4)
    pendingLoans: Loan[];
    activeLoans: Loan[];

    creditScore: number;
    shares: Record<string, number>; // propertySetId -> qty
    properties: Property[];
    turns: number;
    isHost: boolean;
    isOriginalHost: boolean;       // First player who created the room
    ready: boolean;                // Ready to start game
    joinOrder: number;             // Order in which player joined (for host succession)
    reservedCash: number;
    reservedShares: number;
    goPasses?: number; // Tracks GO passes for Capitalistic inflation
    dividendsPaid?: number; // Lifetime dividends created by this player's corporations
}

interface CentralBank {
    // Policy rates (BPS per turn)
    baseRateBps: number;              // Base rate, adjusts with inflation
    riskPremiumBps: number;           // Rises when bank misses payments

    // Tracking
    missedPaymentsStreak: number;     // Consecutive CB payment failures
    inflationIndex: number;           // Proxy for economic stress
    targetInflationIndex: number;     // CB target
}

interface Bank {
    // === CASH (used for dividends, losses, CB payments) ===
    cash: number;

    // === CB DEBT (bank borrows from CB to fund player loans) ===
    cbDebtPrincipal: number;          // Total principal owed to CB
    cbDebtAccruedInterest: number;    // Interest accrued (paid on GO)
    cbMissedPaymentsStreak: number;   // Missed CB payment counter

    // === LOAN INCOME ===
    loanIncomeAccrued: number;        // Interest accrued from players (received on GO)
    loansOutPrincipal: number;        // Sum of player loan principals (asset)

    // === LOSSES ===
    losses: number;                   // Accumulated bad debt

    // === DIVIDEND ===
    dividendPerShare: number;         // Planned dividend per share
    profitStreak: number;             // Consecutive profitable rounds

    // === BAILOUT ===
    negativeDuesTurns: number;        // Turns with negative cash + unpaid dues
    bailouts: number;

    // === TRACKING ===
    interestEarned: number;           // Lifetime interest from player loans
    interestPaid: number;             // Lifetime interest paid to CB
    dividendsPaid: number;            // Lifetime dividends paid
}

// ===== CORPORATE STOCK MARKET =====

interface CompanyShareListing {
    id: string;
    sellerId: string;    // Player ID or 'COMPANY' (if set owner is issuing)
    quantity: number;
    price: number;
    listedAt: number;
}

interface Company {
    propertySetId: string;     // The color set (e.g. 'brown', 'dark_blue')
    ownerId: string;           // Current owner of the set
    dividendPct: number;       // 0-100% of rent goes to shareholders
    sharesOutstanding: number; // Total issued shares
    offers: CompanyShareListing[];
    marketPrice: number;       // Lowest non-company ask
}

interface PendingShareOrder {
    id: string;
    playerId: string;
    propertySetId: string;
    quantity: number;
    price: number;
    totalCost: number;         // amount locked from player's reservedCash
    turnsRemaining: number;    // 3 turns for set owners
    createdAt: number;
}

interface Market {
    volState: 'CALM' | 'CHOPPY';
    previousMoneySupply?: number; // Track for turn-over-turn inflation
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    timestamp: number;
}

interface Settings {
    goPayout: number;
    bankStartingCash: number;
    noDoubleRentOnFullSet: boolean;  // If true, don't double rent when full set owned with 0 improvements
    inflationMode: 'OFF' | 'STANDARD' | 'CAPITALISTIC';
}

interface TradeOffer {
    id: string;
    from_player_id: string;
    to_player_id: string;
    // New multi-asset format
    offer_properties: string[];
    offer_cash: number;
    offer_shares: Record<string, number>;
    offer_loans: string[];
    request_properties: string[];
    request_cash: number;
    request_shares: Record<string, number>;
    request_loans: string[];
    // Legacy single-property (kept for backward compat)
    property_id?: string;
    cash_offered?: number;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    timestamp: number;
}

interface PropertyListing {
    id: string;
    property_id: string;
    seller_id: string;
    price: number;
    listed_at: number;
}

interface Auction {
    id: string;
    property_id: string;
    seller_id: string | 'BANK' | null;  // null = unowned property, 'BANK' = bank-owned
    starting_bid: number;
    current_bid: number;
    current_bidder_id: string | null;
    end_time: number;              // Timestamp when auction ends
    created_at: number;            // Timestamp when auction started
    duration_ms: number;           // Duration in milliseconds (60000 for 60s)
    bids: {                        // Bid history
        player_id: string;
        amount: number;
        timestamp: number;
    }[];
    status: 'active' | 'ended' | 'cancelled';
    winner_id: string | null;      // Set when auction ends
}

interface Alert {
    id: string;
    type: string;
    message: string;
    player_id: string;
    timestamp: number;
    read: boolean;
}

interface StateSnapshot {
    id: string;
    timestamp: number;
    description: string;
    state: string;
}

interface State {
    roomCode: string;
    roomName: string;
    status: 'lobby' | 'active';
    settings: Settings;
    players: Player[];
    properties: Property[];       // Global properties array with ownership
    cb: CentralBank;              // Central Bank state
    bank: Bank;
    market: Market;
    companies: Company[];
    pendingShareOrders: PendingShareOrder[];
    bonds: Bond[];                // All bonds in the game
    bondOrders: BondOrder[];      // Active bond orders
    turnNumber: number;           // Global turn counter
    transactions: Transaction[];
    tradeOffers: TradeOffer[];
    propertyListings: PropertyListing[];
    auctions: Auction[];
    alerts: Alert[];
    stateHistory: StateSnapshot[];
    lastActivityAt: number;        // Last WebSocket message timestamp
    pausedUntil: number;           // If > 0, room is paused until this timestamp (max 2 days)
}

// Room info for registry
interface RoomInfo {
    code: string;
    name: string;
    playerCount: number;
    status: 'lobby' | 'active';
    createdAt: number;
}

// ===== HELPER FUNCTIONS =====

function normalizeCredit(creditScore: number): number {
    // Returns 0..100 (integer percentage)
    return Math.max(0, Math.min(100, Math.floor((creditScore - 300) * 100 / 550)));
}

function normalizeCreditFloat(creditScore: number): number {
    // Returns 0..1 for calculations
    return Math.max(0, Math.min(1, (creditScore - 300) / 550));
}

// ===== RATE CALCULATION (NEW SYSTEM) =====
// Player rate = CB rate + risk premium + bank margin
// Rates are LOCKED at loan origination

// Bank stress score (0 or 1 for simplicity)
function bankStressScore(bank: Bank): number {
    if (bank.cash <= 0) return 1;
    if (bank.cbMissedPaymentsStreak >= 1) return 1;
    return 0;
}

// Get current CB rate (base + risk premium)
function getCurrentCbRateBps(cb: CentralBank): number {
    return cb.baseRateBps + cb.riskPremiumBps;
}

// Get bank margin based on loan type and stress
function getBankMarginBps(loanType: LoanType, bank: Bank): number {
    const stress = bankStressScore(bank);
    switch (loanType) {
        case 'EMERGENCY':
            return MARGIN_EMERGENCY_BASE + MARGIN_EMERGENCY_STRESS * stress;
        case 'STANDARD':
            return MARGIN_STANDARD_BASE + MARGIN_STANDARD_STRESS * stress;
        case 'DEVELOPMENT':
            return MARGIN_DEVELOPMENT_BASE + MARGIN_DEVELOPMENT_STRESS * stress;
    }
}

// Quote loan rate (shown to player before confirming)
function quoteLoanRate(loanType: LoanType, cb: CentralBank, bank: Bank): {
    cbRate: number;
    bankMargin: number;
    finalRate: number;
} {
    const cbRate = getCurrentCbRateBps(cb);
    const bankMargin = getBankMarginBps(loanType, bank);
    return {
        cbRate,
        bankMargin,
        finalRate: cbRate + bankMargin
    };
}

// Legacy function for compatibility
function getLoanRateBps(loanType: LoanType): number {
    // Returns a rough estimate without CB/bank context
    switch (loanType) {
        case 'EMERGENCY': return CB_BASE_RATE_BPS + MARGIN_EMERGENCY_BASE;
        case 'STANDARD': return CB_BASE_RATE_BPS + MARGIN_STANDARD_BASE;
        case 'DEVELOPMENT': return CB_BASE_RATE_BPS + MARGIN_DEVELOPMENT_BASE;
    }
}

function getBankAppraisal(property: Property, inflationRate: number = 0): number {
    // Property value = purchase price + improvements value
    const improvementValue = property.improvements >= 5
        ? (4 * property.houseCost + property.hotelCost)
        : (property.improvements * property.houseCost);
    const baseValue = property.price + improvementValue;
    return Math.floor(baseValue * (1 + inflationRate));
}

// Asset worth using bank appraisal (from global properties)
function assetWorth(player: Player, properties: Property[], inflationRate: number = 0): number {
    return properties
        .filter(p => p.ownerId === player.id && !p.isMortgaged)
        .reduce((sum, p) => sum + getBankAppraisal(p, inflationRate), 0);
}


// Stock worth
function stockWorth(player: Player, companies: Company[]): number {
    let total = 0;
    if (player.shares) {
        for (const [setId, qty] of Object.entries(player.shares)) {
            if (qty <= 0) continue;
            const company = companies.find(c => c.propertySetId === setId);
            const price = company && company.marketPrice > 0 ? company.marketPrice : 1;
            total += qty * price;
        }
    }
    return total;
}

// Bank net worth calculation
// Net worth = cash - CB debt + property values
function bankNetWorth(bank: Bank, properties: Property[], inflationRate: number = 0): number {
    const bankProperties = properties.filter(p => p.ownerId === MONOBANK_OWNER_ID);
    const bankAssetValue = bankProperties.reduce((sum, p) => sum + getBankAppraisal(p, inflationRate), 0);
    return bank.cash - (bank.cbDebtPrincipal + bank.cbDebtAccruedInterest) + bankAssetValue;
}

// Active debt (sum of principal remaining for ACTIVE loans)
function activeDebt(player: Player): number {
    return (player.activeLoans || []).reduce((sum, loan) => sum + loan.principalRemaining, 0);
}

// Pending debt (sum of requested amounts for PENDING loans)
function pendingDebt(player: Player): number {
    return (player.pendingLoans || []).reduce((sum, loan) => sum + loan.requestedAmount, 0);
}

// Total debt used
function debtUsed(player: Player): number {
    return activeDebt(player) + pendingDebt(player);
}

// Net worth for display (now needs properties array)
function netWorth(player: Player, companies: Company[], properties: Property[], inflationRate: number = 0): number {
    return assetWorth(player, properties, inflationRate) + player.balance + stockWorth(player, companies) - activeDebt(player);
}

// Net worth for lending
function netWorthForLending(player: Player, companies: Company[], properties: Property[], inflationRate: number = 0): number {
    return assetWorth(player, properties, inflationRate) + player.balance + stockWorth(player, companies) - debtUsed(player);
}

// ===== PROPERTY HELPER FUNCTIONS =====

// Check if player owns full color group
// Check if player owns full color group (now with custom group names)
function ownsFullColorGroup(playerId: string, colorGroup: string, properties: Property[]): boolean {
    const groupProps = properties.filter(p => p.colorGroup === colorGroup);
    return groupProps.length > 0 && groupProps.every(p => p.ownerId === playerId);
}

// Calculate rent for a property
function calculateRent(property: Property, properties: Property[], noDoubleRent: boolean, diceRoll?: number, inflationRate: number = 0): number {
    if (property.isMortgaged) return 0;
    if (!property.ownerId) return 0;

    // Railroads: 25, 50, 100, 200 based on count
    if (property.isRailroad) {
        const ownedRailroads = properties.filter(p => p.isRailroad && p.ownerId === property.ownerId).length;
        return 25 * Math.pow(2, ownedRailroads - 1);
    }

    // Utilities: 4x or 10x dice roll
    if (property.isUtility) {
        const ownedUtils = properties.filter(p => p.isUtility && p.ownerId === property.ownerId).length;
        const multiplier = ownedUtils >= 2 ? 10 : 4;
        return multiplier * (diceRoll || 7); // Default to 7 if no dice roll
    }

    // Normal properties
    let rent = property.rentBase;

    if (property.improvements >= 5) {
        rent = property.rentHotel;
    } else if (property.improvements === 4) {
        rent = property.rent4House;
    } else if (property.improvements === 3) {
        rent = property.rent3House;
    } else if (property.improvements === 2) {
        rent = property.rent2House;
    } else if (property.improvements === 1) {
        rent = property.rent1House;
    } else {
        // Base rent - check for full set doubling
        const hasFullSet = ownsFullColorGroup(property.ownerId, property.colorGroup, properties);
        if (hasFullSet && !noDoubleRent) {
            rent = property.rentBase * 2;
        }
    }

    return Math.floor(rent * (1 + inflationRate));
}

// Get mortgage value (50% of price)
function getMortgageValue(property: Property, inflationRate: number = 0): number {
    return Math.floor(property.price * (1 + inflationRate) / 2);
}

// Update the market price of a company (lowest non-company ask)
function updateCompanyMarketPrice(company: Company) {
    const playerOffers = company.offers.filter(o => o.sellerId !== 'COMPANY');
    if (playerOffers.length > 0) {
        company.marketPrice = Math.min(...playerOffers.map(o => o.price));
    } else {
        company.marketPrice = 0;
    }
}

// Get unmortgage cost (55% of price)
function getUnmortgageCost(property: Property, inflationRate: number = 0): number {
    return Math.ceil(property.price * (1 + inflationRate) * 55 / 100);
}

// ===== BANK HELPER FUNCTIONS (ALL INTEGER MATH) =====

// Calculate bank equity = assets - liabilities (includes bank-owned properties)
function calcBankEquity(bank: Bank, properties: Property[], inflationRate: number = 0): number {
    // Assets: cash + loans out principal + accrued loan income + bank-owned properties
    const bankProperties = properties.filter(p => p.ownerId === MONOBANK_OWNER_ID);
    const bankPropertyValue = bankProperties.reduce((sum, p) => sum + Math.floor(p.price * (1 + inflationRate)), 0);

    const assets = bank.cash + bank.loansOutPrincipal + bank.loanIncomeAccrued + bankPropertyValue;
    // Liabilities: CB debt principal + accrued CB interest + losses
    const liabilities = bank.cbDebtPrincipal + bank.cbDebtAccruedInterest + bank.losses;

    return assets - liabilities;
}



// ===== COMPANY HEALTH SCORE (for smart contracts/bots) =====
// Returns -1 to +1 where:
// +1 = 100% certain/healthy
// -1 = 100% panic/uncertain
// 0 = neutral
// Better formula: Based on equity, debt coverage, and cash position
// CB loans are NORMAL - bank needs them to fund player loans. Health only goes negative if truly unhealthy.
function calcCompanyHealthScore(bank: Bank, properties: Property[], playerCount: number): number {
    if (playerCount <= 0) return 0;

    // Calculate components
    const bankProperties = properties.filter(p => p.ownerId === MONOBANK_OWNER_ID);
    const bankAssetValue = bankProperties.reduce((sum, p) => sum + p.price, 0);

    // ASSETS (what bank owns/will receive)
    const cashAndAssets = bank.cash + bankAssetValue;  // Liquid assets (cash + properties)
    const totalLoansOut = bank.loansOutPrincipal;  // Principal of loans bank made to players (assets)
    const accruedInterestIncome = bank.loanIncomeAccrued;  // Interest bank will receive (future income)

    // LIABILITIES (what bank owes)
    const cbDebtPrincipal = bank.cbDebtPrincipal;
    const cbDebtInterest = bank.cbDebtAccruedInterest;
    const cbDebtTotal = cbDebtPrincipal + cbDebtInterest;
    const losses = bank.losses;

    // EQUITY (net worth)
    // Assets: cash + properties + loans outstanding + accrued interest income
    // Liabilities: CB debt + losses
    const totalAssets = cashAndAssets + totalLoansOut + accruedInterestIncome;
    const totalLiabilities = cbDebtTotal + losses;
    const equity = totalAssets - totalLiabilities;

    let healthScore = 0;

    // ===== FACTOR 1: EQUITY POSITION (25% weight - REDUCED) =====
    // Only penalize if equity is SIGNIFICANTLY negative AND not covered by loans
    // CB loans that are covered by loans out should not make equity negative enough to hurt health
    if (equity > 0) {
        // Positive equity: contribute positively
        const equityRatio = Math.min(1.0, equity / Math.max(1, totalAssets));
        healthScore += equityRatio * 0.25;  // 0 to +0.25
    } else if (equity < 0) {
        // Negative equity: only penalize if it's significant AND not covered
        // If loans out cover CB debt principal, equity might be slightly negative (due to accrued interest) but that's OK
        const loansCoverCbDebt = cbDebtPrincipal > 0 && totalLoansOut >= cbDebtPrincipal * 0.9;  // 90% coverage

        if (!loansCoverCbDebt) {
            // Loans don't cover CB debt - this is a real problem
            const negativeRatio = Math.abs(equity) / Math.max(1, Math.max(Math.abs(totalAssets), Math.abs(totalLiabilities)));
            // Penalize if negative equity is > 20% of total
            if (negativeRatio > 0.2) {
                healthScore -= Math.min(0.25, negativeRatio * 0.25);  // -0.05 to -0.25 max
            }
        }
        // If loans cover CB debt, ignore small negative equity (it's just accrued interest mismatch)
    }

    // ===== FACTOR 2: DEBT COVERAGE (50% weight - MOST IMPORTANT) =====
    // CB loans are NORMAL and EXPECTED - bank needs them to fund player loans
    // Compare PRINCIPAL to PRINCIPAL (loans out vs CB debt principal), not including accrued interest
    // Health should be NEUTRAL or POSITIVE when loans out â‰ˆ CB debt principal (normal operation)
    // Health is positive when loans out > CB debt principal (healthy)
    // Health is negative ONLY when CB debt principal >> loans out (borrowed too much relative to lending)

    // Use principal-to-principal comparison (exclude accrued interest from coverage ratio)
    // Accrued interest is a separate concern (handled in equity calculation)
    if (cbDebtPrincipal > 0 && totalLoansOut > 0) {
        // Coverage ratio: loans out principal / CB debt principal
        // 1.0 = perfect match (loans = CB debt) = NEUTRAL (0), NOT negative!
        const coverageRatio = totalLoansOut / cbDebtPrincipal;

        let coverageScore = 0;
        if (coverageRatio >= 0.9) {
            // Healthy: loans cover or exceed CB debt (within 10% tolerance = normal operation)
            // 0.9-1.0 = neutral zone (0 to slightly positive), > 1.0 = positive
            if (coverageRatio >= 1.0) {
                // 1.0 = 0 (neutral), 1.5 = +0.3, 2.0 = +0.5 (capped)
                coverageScore = Math.min(0.5, (coverageRatio - 1.0) * 1.0);
            } else {
                // 0.9-1.0 = neutral to slightly positive (90%+ coverage is good enough)
                // Gradual curve: 0.9 -> 0, 1.0 -> 0 (neutral zone)
                coverageScore = 0;  // Neutral - loans cover most of CB debt
            }
        } else {
            // Risky: CB debt principal > loans out (more than 10% mismatch)
            // But be VERY gentle - only go negative if significant mismatch
            // 0.8 = -0.05, 0.5 = -0.2, 0.0 = -0.5 (capped)
            coverageScore = -Math.min(0.5, ((0.9 - coverageRatio) / 0.9) * 0.5);
        }
        healthScore += coverageScore * 0.5;  // 50% weight (most important factor)
    } else if (cbDebtPrincipal === 0 && totalLoansOut > 0) {
        // No CB debt but has loans out = healthy (self-funded)
        healthScore += 0.25;  // +0.25 bonus
    } else if (cbDebtPrincipal > 0 && totalLoansOut === 0) {
        // Has CB debt but no loans out = risky (borrowed but not lending)
        // BUT: this might be temporary (pending loans) - be forgiving
        // Only penalize if it's a significant amount relative to cash/assets
        const cbDebtVsAssets = cbDebtPrincipal / Math.max(1, cashAndAssets);
        if (cbDebtVsAssets > 0.5) {
            // Significant CB debt with no loans = risky
            healthScore -= 0.2;  // -0.2 penalty (moderate)
        } else {
            // Small CB debt relative to assets = might be temporary, minimal penalty
            healthScore -= 0.05;  // -0.05 penalty (very minor)
        }
    }
    // If both are 0: neutral (no debt, no loans) - contributes 0

    // ===== FACTOR 3: CASH POSITION (30% weight) =====
    // Negative cash is ALWAYS bad - immediate stress signal (regardless of CB loans)
    // Positive cash is good, especially relative to liabilities
    if (bank.cash < 0) {
        // Negative cash is a strong negative signal
        healthScore -= 0.4;  // -0.4 penalty (significant, can push health negative)
    } else if (bank.cash > 0) {
        // Positive cash is good
        if (totalLiabilities > 0) {
            // Cash ratio: cash / liabilities
            // 0.3x = minimal, 1.0x = healthy, 2.0x+ = very healthy
            const cashRatio = Math.min(3.0, bank.cash / totalLiabilities);
            // Score: 0.3x -> 0, 1.0x -> +0.25, 2.0x -> +0.5 (only positive)
            const cashScore = Math.max(0, (cashRatio - 0.3) * 0.36);
            healthScore += cashScore * 0.3;  // 30% weight
        } else {
            // No liabilities + positive cash = very healthy
            healthScore += 0.2;  // +0.2 bonus
        }
    }

    // Clamp to -1 to +1 range
    healthScore = Math.max(-1, Math.min(1, healthScore));

    return healthScore;
}

// ===== MAIN CLASS =====

export class GameRoom extends DurableObject {
    state: DurableObjectState;
    env: any;
    sessions: WebSocket[];
    gameState: State;
    roomCreated: boolean;

    constructor(state: DurableObjectState, env: any) {
        super(state, env);
        this.state = state;
        this.env = env;
        this.sessions = [];
        this.roomCreated = false;

        // Get room code from the Durable Object name
        const roomCode = state.id.name || state.id.toString().slice(0, 6).toUpperCase();
        console.log(`DO constructor: id.name=${state.id.name}, roomCode=${roomCode}`);

        this.gameState = {
            roomCode: roomCode,
            roomName: `Room ${roomCode}`,
            status: 'lobby',
            settings: {
                goPayout: GO_AMOUNT,
                bankStartingCash: DEFAULT_BANK_CASH,
                noDoubleRentOnFullSet: false,  // Default: double rent IS applied
                inflationMode: 'OFF'
            },
            players: [],
            properties: [],  // All properties are custom - added by players
            turnNumber: 0,

            // Central Bank (monetary policy)
            cb: {
                baseRateBps: CB_BASE_RATE_BPS,
                riskPremiumBps: 0,
                missedPaymentsStreak: 0,
                inflationIndex: CB_TARGET_INFLATION,
                targetInflationIndex: CB_TARGET_INFLATION
            },

            // MonoBank
            bank: {
                // Cash (for dividends, losses, CB payments)
                cash: DEFAULT_BANK_CASH,

                // CB debt (bank borrows from CB to fund player loans)
                cbDebtPrincipal: 0,
                cbDebtAccruedInterest: 0,
                cbMissedPaymentsStreak: 0,

                // Loan income
                loanIncomeAccrued: 0,
                loansOutPrincipal: 0,

                // Losses
                losses: 0,



                // Dividend
                dividendPerShare: 0,
                profitStreak: 0,

                // Bailout tracking
                negativeDuesTurns: 0,
                bailouts: 0,

                // Lifetime tracking
                interestEarned: 0,
                interestPaid: 0,
                dividendsPaid: 0
            },

            market: {
                volState: 'CALM',
                previousMoneySupply: undefined
            },
            companies: [],
            pendingShareOrders: [],
            bonds: [],           // Bank can issue bonds
            bondOrders: [],      // Bond trading orders
            transactions: [],
            tradeOffers: [],
            propertyListings: [],
            auctions: [],
            alerts: [],
            stateHistory: [],
            lastActivityAt: Date.now(),
            pausedUntil: 0
        };

        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<State>("gameState");
            if (stored) {
                this.gameState = stored;
                // ALWAYS use the DO name as the room code (might have changed if storage was from different DO)
                const oldCode = this.gameState.roomCode;
                this.gameState.roomCode = roomCode;
                this.gameState.roomName = stored.roomName || `Room ${roomCode}`;
                // Save if roomCode changed
                if (oldCode !== roomCode) {
                    console.log(`Fixing roomCode: ${oldCode} -> ${roomCode}`);
                    await this.state.storage.put("gameState", this.gameState);
                }
            }
            const created = await this.state.storage.get<boolean>("roomCreated");
            if (created) this.roomCreated = true;
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Log all incoming requests for debugging
        console.log(`DO fetch: ${request.method} ${path} roomCreated=${this.roomCreated}`);

        // Handle room initialization (called when room is created)
        if (path === '/init' && request.method === 'POST') {
            try {
                const body = await request.json() as { code?: string };
                if (body.code) {
                    // Update roomCode from the initialization request
                    this.gameState.roomCode = body.code;
                    this.gameState.roomName = `Room ${body.code}`;
                }
            } catch (e) {
                // Old format without code, use fallback
            }

            this.roomCreated = true;
            await this.state.storage.put("roomCreated", true);
            await this.state.storage.put("createdAt", Date.now());
            await this.state.storage.put("gameState", this.gameState);

            return new Response(JSON.stringify({ success: true, code: this.gameState.roomCode }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if room exists
        if (path === '/exists') {
            return new Response(JSON.stringify({ exists: this.roomCreated }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get room info (for registry/listing)
        if (path === '/info') {
            console.log(`/info: roomCreated=${this.roomCreated}, roomCode=${this.gameState.roomCode}, id.name=${this.state.id.name}`);
            if (!this.roomCreated) {
                return new Response(JSON.stringify({ exists: false }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            const createdAt = await this.state.storage.get<number>("createdAt") || Date.now();
            const info = {
                code: this.gameState.roomCode,
                name: this.gameState.roomName,
                playerCount: this.gameState.players.length,
                activeSessions: this.sessions.length,
                status: this.gameState.status,
                createdAt,
                lastActivityAt: this.gameState.lastActivityAt || createdAt,
                pausedUntil: this.gameState.pausedUntil || 0
            };
            return new Response(JSON.stringify({ exists: true, info }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Registry operations (for the REGISTRY DO instance)
        if ((path === '/registry/add' || path === 'registry/add') && request.method === 'POST') {
            try {
                const { code } = await request.json() as { code: string };
                const registry = await this.state.storage.get<string[]>("rooms") || [];
                if (!registry.includes(code)) {
                    registry.push(code);
                    await this.state.storage.put("rooms", registry);
                }
                return new Response(JSON.stringify({ success: true, added: code }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if ((path === '/registry/remove' || path === 'registry/remove') && request.method === 'POST') {
            const { code } = await request.json() as { code: string };
            let registry = await this.state.storage.get<string[]>("rooms") || [];
            registry = registry.filter(c => c !== code);
            await this.state.storage.put("rooms", registry);
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (path === '/registry/list' || path === 'registry/list') {
            const registry = await this.state.storage.get<string[]>("rooms") || [];
            return new Response(JSON.stringify({ rooms: registry }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Debug endpoint to see what path is being received
        if (path.includes('registry')) {
            return new Response(JSON.stringify({ debug: true, path, method: request.method }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Handle clear request (deletes DO state)
        if (path === '/clear' && request.method === 'POST') {
            await this.deleteRoom();
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // WebSocket upgrade
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Expected Upgrade: websocket", { status: 426 });
        }

        // Don't allow joining non-existent rooms
        if (!this.roomCreated) {
            return new Response("Room not found", { status: 404 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        await this.handleSession(server);
        return new Response(null, { status: 101, webSocket: client });
    }

    // Register this room with the global registry
    async registerWithRegistry() {
        const roomCode = this.gameState.roomCode;
        if (!roomCode || roomCode === '__REGISTRY__') {
            return;
        }

        try {
            const registryId = this.env.GAME_ROOM.idFromName("__REGISTRY__");
            const registryObj = this.env.GAME_ROOM.get(registryId);

            // Use a simple URL that will definitely work
            const response = await registryObj.fetch('http://do/registry/add', {
                method: 'POST',
                body: JSON.stringify({ code: roomCode }),
                headers: { 'Content-Type': 'application/json' }
            });

            const text = await response.text();
            console.log("Registry response:", response.status, text);
        } catch (e) {
            console.error("Failed to register with registry:", e);
        }
    }

    // Deregister this room from the global registry
    async deregisterFromRegistry() {
        const roomCode = this.gameState.roomCode;
        if (!roomCode || roomCode === '__REGISTRY__') {
            return;
        }

        try {
            const registryId = this.env.GAME_ROOM.idFromName("__REGISTRY__");
            const registryObj = this.env.GAME_ROOM.get(registryId);
            await registryObj.fetch('http://do/registry/remove', {
                method: 'POST',
                body: JSON.stringify({ code: roomCode }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error("Failed to deregister from registry:", e);
        }
    }

    // Broadcast message to all connected sessions
    broadcast(msg: { type: string, payload?: any }): void {
        const message = JSON.stringify(msg);
        for (const session of this.sessions) {
            try {
                if (session.readyState === 1) {  // WebSocket.OPEN
                    session.send(message);
                }
            } catch (err) {
                console.error("Error broadcasting:", err);
            }
        }
    }

    async handleSession(ws: WebSocket) {
        this.sessions.push(ws);
        ws.accept();

        // Check auctions before sending initial state
        await this.checkActiveAuctions();
        ws.send(JSON.stringify({ type: 'state', payload: this.getPublicState() }));

        ws.addEventListener("message", async (msg) => {
            try {
                const data = JSON.parse(msg.data as string);
                // Track last activity for grace period
                this.gameState.lastActivityAt = Date.now();
                // Check auctions before handling action
                await this.checkActiveAuctions();
                await this.handleAction(data, ws);
                // Check auctions after handling action (auction might have ended)
                await this.checkActiveAuctions();
            } catch (err) {
                console.error(err);
            }
        });

        ws.addEventListener("close", async () => {
            this.sessions = this.sessions.filter((s) => s !== ws);

            if (this.sessions.length === 0) {
                // Only auto-delete if no players have joined (empty lobby)
                // Rooms with players are handled by the cleanup function with grace periods
                if (this.gameState.players.length === 0) {
                    console.log(`Room ${this.gameState.roomCode} is an empty lobby with no sessions, deleting...`);
                    await this.deleteRoom();
                } else {
                    // Save state so it persists while everyone is disconnected
                    console.log(`Room ${this.gameState.roomCode} has ${this.gameState.players.length} players but 0 sessions — keeping alive (grace period)`);
                    await this.save();
                }
            }
        });
    }

    async deleteRoom() {
        // Deregister from the global registry before deleting
        await this.deregisterFromRegistry();

        this.roomCreated = false;
        await this.state.storage.deleteAll();
    }

    getInflationRate(): number {
        if (!this.gameState.settings.inflationMode || this.gameState.settings.inflationMode === 'OFF') return 0;
        const numPlayers = this.gameState.players.length || 1;
        const initialMoneyActual = numPlayers * 1500;
        const currentMoney = this.gameState.players.reduce((sum, p) => sum + p.balance + (p.vault || 0), 0);

        if (currentMoney > initialMoneyActual) {
            return (currentMoney - initialMoneyActual) / initialMoneyActual;
        }
        return 0;
    }

    getPublicState(): any {
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        // Calculate current CB rate for display
        const currentCbRate = cb.baseRateBps + cb.riskPremiumBps;

        // Calculate global inflation rate
        const inflationRate = this.getInflationRate();

        // Inflate global properties for the frontend
        const inflatedProperties = inflationRate > 0 ? this.gameState.properties.map(p => ({
            ...p,
            price: Math.floor(p.price * (1 + inflationRate)),
            houseCost: Math.floor(p.houseCost * (1 + inflationRate)),
            hotelCost: Math.floor(p.hotelCost * (1 + inflationRate)),
            rentBase: Math.floor(p.rentBase * (1 + inflationRate)),
            rent1House: Math.floor(p.rent1House * (1 + inflationRate)),
            rent2House: Math.floor(p.rent2House * (1 + inflationRate)),
            rent3House: Math.floor(p.rent3House * (1 + inflationRate)),
            rent4House: Math.floor(p.rent4House * (1 + inflationRate)),
            rentHotel: Math.floor(p.rentHotel * (1 + inflationRate)),
        })) : this.gameState.properties;

        return {
            ...this.gameState,
            properties: inflatedProperties,
            inflationRate, // Expose dynamically calculated rate
            // Expose CB rate info for loan quotes
            cb: {
                currentRateBps: currentCbRate,
                baseRateBps: cb.baseRateBps,
                riskPremiumBps: cb.riskPremiumBps
            },
            bank: {
                // Public info
                cash: bank.cash,
                bailouts: bank.bailouts,
                losses: bank.losses,

                // Interest tracking (players can see bank health)
                // Recalculate from actual loans to ensure accuracy (avoid rounding/tracking errors)
                loansOut: this.gameState.players.reduce((sum, p) =>
                    sum + (p.activeLoans || []).reduce((loanSum, loan) =>
                        loanSum + (loan.principalRemaining || 0), 0), 0),
                cbDebt: bank.cbDebtPrincipal,
                loanIncomeAccrued: bank.loanIncomeAccrued,
                cbInterestAccrued: bank.cbDebtAccruedInterest,

                // Profit tracking
                interestEarned: bank.interestEarned,
                interestPaid: bank.interestPaid,
                dividendsPaid: bank.dividendsPaid,
                profitStreak: bank.profitStreak
            },
            market: {
                ...this.gameState.market
            },
            companies: this.gameState.companies,
            pendingShareOrders: this.gameState.pendingShareOrders
        };
    }

    // ===== BANK FUNDING OPERATIONS (NEW MODEL) =====
    // Bank does NOT fund loans from its own cash
    // Bank borrows from CB to fund ALL player loans
    // Bank's cash is only for: dividends, losses, CB interest payments

    fundLoanViaCB(amount: number): void {
        const bank = this.gameState.bank;

        // Bank borrows from CB to fund the player loan
        // Cash doesn't change - it's a pass-through
        bank.cbDebtPrincipal += amount;
        bank.loansOutPrincipal += amount;

        this.logTransaction(`Bank borrowed $${amount} from CB to fund loan`, amount);
    }



    // Process bank tick operations (called on End Turn / Jail Turn)
    // ===============================================
    // TURN TICK (End Turn / Jail Turn)
    // Interest ACCRUES here but is NOT PAID until GO
    // ===============================================
    processBankTick(): void {
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        this.gameState.turnNumber++;

        // 1. CB updates policy rate (simple inflation control)
        this.cbUpdatePolicyRate();

        // 2. ACCRUE interest on ALL player loans (bank income accrues, not received yet)
        let totalAccruedFromPlayers = 0;
        for (const player of this.gameState.players) {
            for (const loan of player.activeLoans) {
                if (loan.principalRemaining > 0) {
                    const interest = intCeilDiv(loan.principalRemaining * loan.finalRateLockedBps, 10000);
                    loan.accruedInterest += interest;
                    totalAccruedFromPlayers += interest;
                }
            }
        }
        bank.loanIncomeAccrued += totalAccruedFromPlayers;

        // 3. ACCRUE interest on bank's CB debt (not paid yet)
        const cbRateNow = getCurrentCbRateBps(cb);
        if (bank.cbDebtPrincipal > 0) {
            const cbInterest = intCeilDiv(bank.cbDebtPrincipal * cbRateNow, 10000);
            bank.cbDebtAccruedInterest += cbInterest;
        }

        // 3.5. Pay bond coupons and mature bonds (on tick)
        this.payBondCoupons();
        this.matureBonds();

        // 8. Bailout check happens AFTER CB payment attempts (in processPayEvent, not here)
        // CB payments happen on GO/Jail Turn, not on End Turn

        // 9. Update stock price (uses best bid/ask from order book)
        // Stock price update happens in runStockTick_END_TURN_ONLY which is called separately
    }

    // CB adjusts base rate based on inflation
    cbUpdatePolicyRate(): void {
        const cb = this.gameState.cb;

        if (cb.inflationIndex > cb.targetInflationIndex) {
            cb.baseRateBps += 5;  // Raise rates
        } else if (cb.inflationIndex < cb.targetInflationIndex && cb.baseRateBps > 10) {
            cb.baseRateBps -= 5;  // Lower rates
        }
    }

    // CB punishes bank for missed payment
    cbPunishForMiss(): void {
        const cb = this.gameState.cb;
        cb.missedPaymentsStreak++;
        cb.riskPremiumBps += CB_RISK_PREMIUM_INCREMENT * cb.missedPaymentsStreak;
        this.logTransaction(`CB increased risk premium (missed payment #${cb.missedPaymentsStreak})`, 0);
    }



    // Bailout check: Bank misses CB payment 2+ times while negative
    // Called AFTER bank attempts to pay CB
    bankBailoutCheck(): void {
        const bank = this.gameState.bank;

        // Reset negative turns counter if bank is now positive
        if (bank.cash >= 0) {
            bank.negativeDuesTurns = 0;
        }

        // Bailout triggers when: Bank misses CB payment 2+ times AND is negative (cannot pay)
        if (bank.cbMissedPaymentsStreak >= 2 && bank.cash < 0) {
            this.executeBailout();
        }
    }

    // Execute bailout: Bank missed CB payment 2+ times while negative
    // Government injects cash, doubles shares, permanently increases CB rates
    executeBailout(): void {
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        // Government injects cash to bring bank back to positive + starting balance
        const deficit = Math.max(0, -bank.cash);
        const bailoutCash = deficit + this.gameState.settings.goPayout * 10;

        bank.bailouts++;
        bank.cash += bailoutCash;

        // CB rate permanently increases by 1% (100 bps) after bailout
        // This affects all future loans - players get higher rates
        cb.riskPremiumBps += CB_BAILOUT_RATE_PENALTY;  // +100 bps = +1%

        // Reset missed payment streak (bailout cleared the debt)
        bank.cbMissedPaymentsStreak = 0;
        bank.negativeDuesTurns = 0;
        bank.cbDebtAccruedInterest = 0;  // Clear accrued interest (government bailout clears CB debt interest)

        this.logTransaction(`ðŸ†˜ BAILOUT #${bank.bailouts}! Gov injected $${bailoutCash}, doubled shares, CB rate +${CB_BAILOUT_RATE_PENALTY / 100}%`, bailoutCash);

        for (const player of this.gameState.players) {
            this.createAlert(player.id, 'bailout', `Bank bailed out! Shares diluted, CB rate permanently increased by 1%. New loans will have higher rates.`);
        }
    }

    // ===== LOAN LIMIT CALCULATIONS (Prompt 5) =====

    calculateLoanLimits(player: Player): { emergency: number, standard: number, development: number } {
        const nwLending = netWorthForLending(player, this.gameState.companies, this.gameState.properties);
        const csn = normalizeCreditFloat(player.creditScore); // 0..1
        const currentDebt = debtUsed(player);

        // Credit multiplier: CONSERVATIVE to prevent infinite money glitch
        // Bad credit (300): can borrow 10% of net worth
        // Starting credit (400): can borrow ~17% of net worth  
        // Perfect credit (850): can borrow 50% of net worth
        const creditMult = 0.1 + 0.4 * csn;

        // Emergency cap: 15% of net worth max (small emergency loans only)
        const emergencyMax = Math.max(0, intPct(nwLending, 15));

        // Standard cap: creditMult * netWorth - existing debt
        const debtCapStandard = Math.floor(creditMult * nwLending);
        const standardMax = Math.max(0, debtCapStandard - currentDebt);

        // Development cap: slightly higher (creditMult + 10%)
        const debtCapDevelopment = Math.floor((creditMult + 0.1) * nwLending);
        const developmentMax = Math.max(0, debtCapDevelopment - currentDebt);

        return {
            emergency: emergencyMax,
            standard: standardMax,
            development: developmentMax
        };
    }

    // Prompt 6: Calculate max installments
    calculateMaxInstallments(amount: number): number {
        if (amount <= 0) return 1;
        const raw = Math.floor(amount / MIN_PRINCIPAL_PER_INSTALLMENT);
        return clamp(raw, 1, MAX_INSTALLMENTS_GLOBAL);
    }

    // ===== LOAN REQUEST =====

    requestLoan(player: Player, type: LoanType, amount: number, installmentsChosen: number): { success: boolean, error?: string } {
        const limits = this.calculateLoanLimits(player);
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        // Validate amount (integer)
        amount = Math.floor(amount);
        if (amount <= 0) return { success: false, error: 'Amount must be positive' };

        // CRITICAL: Bank cannot give out more money than its net worth
        const bankNW = bankNetWorth(bank, this.gameState.properties);
        if (bankNW <= 0) {
            return { success: false, error: 'Bank has insufficient net worth to issue loans' };
        }
        if (amount > bankNW) {
            return { success: false, error: `Loan amount ($${amount.toLocaleString()}) exceeds bank net worth ($${bankNW.toLocaleString()})` };
        }

        // Check type-specific limits
        if (type === 'EMERGENCY') {
            if (amount > limits.emergency) {
                return { success: false, error: `Emergency max: $${limits.emergency}` };
            }
        } else if (type === 'STANDARD') {
            if (amount > limits.standard) {
                return { success: false, error: `Standard max: $${limits.standard}` };
            }
        } else if (type === 'DEVELOPMENT') {
            if (amount > limits.development) {
                return { success: false, error: `Development max: $${limits.development}` };
            }
        }

        // Validate installments for Standard/Development
        const installments = type === 'EMERGENCY' ? 1 : installmentsChosen;
        if (type !== 'EMERGENCY') {
            const maxAllowed = this.calculateMaxInstallments(amount);
            if (installmentsChosen < 1 || installmentsChosen > maxAllowed) {
                return { success: false, error: `Installments must be 1-${maxAllowed}` };
            }
        }

        // === QUOTE RATE (CB rate + bank margin, LOCKED at origination) ===
        const rateQuote = quoteLoanRate(type, cb, bank);
        const cbRateLocked = rateQuote.cbRate;
        const bankMarginLocked = rateQuote.bankMargin;
        const finalRateLocked = rateQuote.finalRate;

        // Calculate installment principal (fixed amount per installment)
        const installmentPrincipal = intCeilDiv(amount, installments);

        // Create the loan with locked rates
        const loan: Loan = {
            id: crypto.randomUUID(),
            type,
            status: type === 'EMERGENCY' ? 'ACTIVE' : 'PENDING',
            requestedAmount: amount,
            principalRemaining: type === 'EMERGENCY' ? amount : 0,

            // Locked rates at origination
            cbRateLockedBps: cbRateLocked,
            bankMarginLockedBps: bankMarginLocked,
            finalRateLockedBps: finalRateLocked,

            // Accrued interest (starts at 0, grows on tick)
            accruedInterest: 0,

            installmentsTotal: installments,
            installmentsPaid: 0,
            installmentPrincipal: installmentPrincipal,

            emergencyDueNextPayEvent: type === 'EMERGENCY',
            pendingTurnsRemaining: type === 'STANDARD' ? STANDARD_PENDING_TURNS : 0,
            pendingUntilGo: type === 'DEVELOPMENT',
            misses: 0,
            createdAt: Date.now()
        };

        // Emergency: disbursement is immediate, funded via CB
        if (type === 'EMERGENCY') {
            this.fundLoanViaCB(amount);
            player.balance += amount;
            player.activeLoans.push(loan);
            this.logTransaction(`${player.name} took EMERGENCY @ ${finalRateLocked / 100}%/turn`, amount);
        } else {
            // Pending loan - no cash yet
            player.pendingLoans.push(loan);
            this.logTransaction(`${player.name} requested ${type} @ ${finalRateLocked / 100}%/turn (pending)`, amount);
        }

        return { success: true };
    }

    // ===== DISBURSEMENT (Prompt 8) =====

    // Disburse Standard loans when pendingTurnsRemaining reaches 0
    disburseStandardLoans(player: Player) {
        const toDisburse: Loan[] = [];

        player.pendingLoans = player.pendingLoans.filter(loan => {
            if (loan.type === 'STANDARD' && loan.pendingTurnsRemaining <= 0) {
                toDisburse.push(loan);
                return false;
            }
            return true;
        });

        for (const loan of toDisburse) {
            // Bank funds via CB (not from cash)
            this.fundLoanViaCB(loan.requestedAmount);

            loan.status = 'ACTIVE';
            loan.principalRemaining = loan.requestedAmount;
            loan.installmentsPaid = 0;
            loan.accruedInterest = 0;
            player.balance += loan.requestedAmount;
            player.activeLoans.push(loan);

            this.logTransaction(`${player.name} received STANDARD @ ${loan.finalRateLockedBps / 100}%/turn`, loan.requestedAmount);
            this.createAlert(player.id, 'loan_disbursed', `Standard loan of $${loan.requestedAmount} disbursed!`);
        }
    }

    // Disburse Development loans on GO press
    disburseDevelopmentLoans(player: Player) {
        const toDisburse: Loan[] = [];

        // Find all development loans that are pending until GO
        for (const loan of player.pendingLoans) {
            if (loan.type === 'DEVELOPMENT' && loan.pendingUntilGo) {
                toDisburse.push(loan);
            }
        }

        // Remove disbursed loans from pendingLoans
        player.pendingLoans = player.pendingLoans.filter(loan =>
            !(loan.type === 'DEVELOPMENT' && loan.pendingUntilGo)
        );

        if (toDisburse.length > 0) {
            this.logTransaction(`Disbursing ${toDisburse.length} DEVELOPMENT loan(s) for ${player.name}`, 0);
        }

        for (const loan of toDisburse) {
            // Bank funds via CB (not from cash) - IMPORTANT: This must happen BEFORE balance update
            const beforeCB = this.gameState.bank.cbDebtPrincipal;
            this.fundLoanViaCB(loan.requestedAmount);
            const afterCB = this.gameState.bank.cbDebtPrincipal;

            if (afterCB === beforeCB) {
                this.logTransaction(`ERROR: CB debt did not increase for DEVELOPMENT loan! (${beforeCB} -> ${afterCB})`, 0);
            }

            loan.status = 'ACTIVE';
            loan.principalRemaining = loan.requestedAmount;
            loan.pendingUntilGo = false;
            loan.installmentsPaid = 0;
            loan.accruedInterest = 0;
            player.balance += loan.requestedAmount;
            player.activeLoans.push(loan);

            this.logTransaction(`${player.name} received DEVELOPMENT @ ${loan.finalRateLockedBps / 100}%/turn`, loan.requestedAmount);
            this.createAlert(player.id, 'loan_disbursed', `Development loan of $${loan.requestedAmount} disbursed!`);
        }
    }

    // ===== PAY EVENT PROCESSING (Prompts 9, 10, 11) =====

    // ===============================================
    // GO PAYMENT EVENT
    // Interest already ACCRUED on TURN TICK. Now gets PAID/cleared.
    // Bank also pays CB here.
    // ===============================================
    processPayEvent(player: Player): { bankrupted: boolean } {
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        // Check if player has active loans BEFORE processing (CB payment only happens if player has loans)
        const hasActiveLoans = player.activeLoans && player.activeLoans.length > 0;

        // 1. Process Emergency loans FIRST (must pay in full: principal + accrued interest)
        const emergencyLoans = player.activeLoans.filter(l => l.type === 'EMERGENCY' && l.emergencyDueNextPayEvent);

        for (const loan of emergencyLoans) {
            // Interest already accrued on tick
            const interestDue = loan.accruedInterest;
            const principalDue = loan.principalRemaining;
            const due = interestDue + principalDue;

            if (player.balance >= due) {
                // Emergency loans: principalDue = loan.principalRemaining (full amount)
                const actualPrincipalPaid = Math.min(principalDue, loan.principalRemaining);

                player.balance -= due;
                bank.cash += due;
                bank.interestEarned += interestDue;
                bank.loansOutPrincipal -= actualPrincipalPaid;  // Only reduce by actual principal
                bank.loanIncomeAccrued -= interestDue;

                // Bank borrowed from CB to fund this loan, so when player pays principal, bank pays down CB principal
                if (actualPrincipalPaid > 0 && bank.cbDebtPrincipal > 0) {
                    const cbPrincipalPaydown = Math.min(actualPrincipalPaid, bank.cbDebtPrincipal);
                    bank.cbDebtPrincipal -= cbPrincipalPaydown;
                    bank.cash -= cbPrincipalPaydown;  // Bank uses the principal payment to pay down CB debt
                    this.logTransaction(`Bank paid down CB principal: $${cbPrincipalPaydown} (from ${player.name}'s loan payment)`, cbPrincipalPaydown);
                }

                loan.principalRemaining -= actualPrincipalPaid;
                loan.accruedInterest = 0;

                if (loan.principalRemaining <= 0) {
                    loan.principalRemaining = 0;
                    loan.status = 'PAID';
                    loan.emergencyDueNextPayEvent = false;
                    this.logTransaction(`${player.name} repaid EMERGENCY loan`, due);
                } else {
                    this.logTransaction(`${player.name} paid EMERGENCY loan (partial)`, due);
                }

                player.creditScore = Math.min(850, player.creditScore + 5);
            } else {
                // INSTANT BANKRUPTCY for unpaid emergency loan
                this.logTransaction(`${player.name} failed to repay EMERGENCY - BANKRUPTCY`, due);
                this.handleBankruptcy(player, loan);
                return { bankrupted: true };
            }
        }

        // Remove paid emergency loans
        player.activeLoans = player.activeLoans.filter(l => l.status !== 'PAID');

        // 2. Process Standard/Development loans (interest + installment)
        for (const loan of player.activeLoans) {
            if (loan.type === 'EMERGENCY') continue;
            if (loan.status !== 'ACTIVE') continue;

            // Interest already accrued on tick
            const interestDue = loan.accruedInterest;
            const principalDue = loan.installmentPrincipal;
            const due = interestDue + principalDue;

            if (player.balance >= due) {
                // On last payment, only pay the actual remaining principal (not full installmentPrincipal if it exceeds remaining)
                const actualPrincipalPaid = Math.min(principalDue, loan.principalRemaining);

                player.balance -= due;
                bank.cash += due;
                bank.interestEarned += interestDue;
                bank.loansOutPrincipal -= actualPrincipalPaid;  // Only reduce by actual principal paid
                bank.loanIncomeAccrued -= interestDue;

                // Bank borrowed from CB to fund this loan, so when player pays principal, bank pays down CB principal
                if (actualPrincipalPaid > 0 && bank.cbDebtPrincipal > 0) {
                    const cbPrincipalPaydown = Math.min(actualPrincipalPaid, bank.cbDebtPrincipal);
                    bank.cbDebtPrincipal -= cbPrincipalPaydown;
                    bank.cash -= cbPrincipalPaydown;  // Bank uses the principal payment to pay down CB debt
                    this.logTransaction(`Bank paid down CB principal: $${cbPrincipalPaydown} (from ${player.name}'s loan payment)`, cbPrincipalPaydown);
                }

                loan.principalRemaining -= actualPrincipalPaid;  // Use actual amount paid
                loan.accruedInterest = 0;
                loan.installmentsPaid++;
                loan.misses = 0;

                if (loan.principalRemaining <= 0) {
                    loan.principalRemaining = 0;
                    loan.status = 'PAID';
                    this.logTransaction(`${player.name} paid off ${loan.type} loan`, due);
                } else {
                    this.logTransaction(`${player.name} paid ${loan.type} (${loan.installmentsPaid}/${loan.installmentsTotal})`, due);
                }

                player.creditScore = Math.min(850, player.creditScore + 3);
            } else {
                // Missed payment - bank must still pay CB if it has enough cash
                loan.misses++;
                player.creditScore = Math.max(300, player.creditScore - 20);
                this.logTransaction(`${player.name} MISSED ${loan.type} payment #${loan.misses} (owed: $${due})`, due);
                this.createAlert(player.id, 'loan_missed', `Missed payment! (${loan.misses}/${MAX_LOAN_MISSES})`);

                // After 2 missed payments (MAX_LOAN_MISSES = 2), loan defaults
                if (loan.misses >= MAX_LOAN_MISSES) {
                    this.logTransaction(`${player.name} reached ${MAX_LOAN_MISSES} missed payments - DEFAULTING on ${loan.type} loan`, loan.principalRemaining);
                    this.handleLoanDefault(player, loan);
                    // After default, loan is closed - remove it from active loans
                    // But continue processing other loans and bank must still pay CB
                }
            }
        }

        // 2.5. Bank pays remaining defaulted loans FROM BALANCE
        // When a loan defaults, assets are seized, but if there's still remaining debt, bank must pay it
        const defaultedLoans = player.activeLoans.filter(l => l.status === 'DEFAULTED');
        for (const loan of defaultedLoans) {
            // Calculate remaining: principal + accrued interest that wasn't covered by seized assets
            const remainingPrincipal = loan.principalRemaining;
            const remainingInterest = loan.accruedInterest;
            const remainingTotal = remainingPrincipal + remainingInterest;

            if (remainingTotal > 0) {
                // Bank must pay remaining defaulted loan from its balance
                const bankCanPay = Math.min(remainingTotal, bank.cash);

                if (bankCanPay > 0) {
                    bank.cash -= bankCanPay;
                    bank.losses += bankCanPay;  // This is a loss for the bank

                    // Reduce loan amounts
                    if (bankCanPay >= remainingInterest) {
                        const principalPaid = bankCanPay - remainingInterest;
                        loan.accruedInterest = 0;
                        loan.principalRemaining = Math.max(0, remainingPrincipal - principalPaid);
                    } else {
                        loan.accruedInterest -= bankCanPay;
                    }

                    // If fully paid, mark as closed
                    if (loan.principalRemaining <= 0 && loan.accruedInterest <= 0) {
                        loan.principalRemaining = 0;
                        loan.accruedInterest = 0;
                    }

                    this.logTransaction(`Bank paid $${bankCanPay} from balance to cover ${player.name}'s defaulted ${loan.type} loan (remaining: $${remainingTotal - bankCanPay})`, bankCanPay);
                } else {
                    // Bank can't pay - add to losses
                    bank.losses += remainingTotal;
                    loan.principalRemaining = 0;
                    loan.accruedInterest = 0;
                    this.logTransaction(`Bank cannot pay remaining $${remainingTotal} from ${player.name}'s defaulted ${loan.type} loan - added to losses`, remainingTotal);
                }
            }
        }

        // Remove paid and defaulted loans (defaulted loans are closed in handleLoanDefault or above)
        player.activeLoans = player.activeLoans.filter(l => l.status === 'ACTIVE' || l.status === 'PAID');

        // 3. Bank pays CB ONLY if this player has/had active loans when they pressed GO/Jail Turn
        // Bank only pays CB when a player WITH loans presses GO/Jail Turn
        // If a player with NO loans presses GO, the bank does NOT pay CB
        // Even if player missed payments, bank should pay CB if it has enough cash (because bank borrowed from CB to fund this player's loan)
        if (hasActiveLoans || defaultedLoans.length > 0) {
            this.bankPayCB();

            // 4. Check for bailout AFTER attempting to pay CB (bank misses CB payment 2+ times while negative)
            this.bankBailoutCheck();
        }

        // Update lastPayTurnIndex
        player.lastPayTurnIndex = player.turnIndex;

        return { bankrupted: false };
    }

    // Bank attempts to pay CB from its cash
    // IMPORTANT: Bank MUST pay CB if it has enough cash, even if players missed loan payments
    bankPayCB(): void {
        const bank = this.gameState.bank;
        const cb = this.gameState.cb;

        const cbInterestDue = bank.cbDebtAccruedInterest;
        // For simplicity, no principal amortization - bank pays interest only
        const cbTotalDue = cbInterestDue;

        if (cbTotalDue <= 0) {
            bank.cbMissedPaymentsStreak = 0;
            return;
        }

        // Bank pays CB if it has enough cash (regardless of whether players paid their loans)
        if (bank.cash >= cbTotalDue) {
            bank.cash -= cbTotalDue;
            bank.cbDebtAccruedInterest = 0;
            bank.interestPaid += cbTotalDue;
            bank.cbMissedPaymentsStreak = 0;  // Reset streak on successful payment

            // Reset CB missed payments streak
            cb.missedPaymentsStreak = 0;

            this.logTransaction(`Bank paid CB interest: $${cbTotalDue}`, cbTotalDue);
        } else {
            // Bank misses CB payment - doesn't have enough cash
            bank.cbMissedPaymentsStreak++;

            // Pay as much as possible to interest first (partial payment)
            const payAmount = Math.max(0, bank.cash);
            if (payAmount > 0) {
                bank.cash -= payAmount;
                bank.cbDebtAccruedInterest -= payAmount;
                bank.interestPaid += payAmount;
                this.logTransaction(`Bank partially paid CB: $${payAmount}/${cbTotalDue} (shortfall: $${cbTotalDue - payAmount})`, payAmount);
            } else {
                this.logTransaction(`Bank MISSED CB payment completely: $${cbTotalDue} due (cash: $${bank.cash})`, 0);
            }

            // CB punishes bank for missing payment
            this.cbPunishForMiss();

            // Track negative turns for bailout check
            if (bank.cash < 0) {
                bank.negativeDuesTurns++;
            }
        }
    }

    // ===== DEFAULT/BANKRUPTCY (Prompt 12) =====
    // Default logic: Seize MINIMUM assets needed to satisfy loan
    // If can't satisfy full loan, player goes bankrupt

    handleLoanDefault(player: Player, loan: Loan) {
        const bank = this.gameState.bank;
        // Total owed = principal + accrued interest (loan is in default, interest must be paid too)
        const totalOwed = loan.principalRemaining + loan.accruedInterest;
        let remainingOwed = totalOwed;

        this.logTransaction(`${player.name} DEFAULTED on ${loan.type} loan (principal: $${loan.principalRemaining} + interest: $${loan.accruedInterest} = $${totalOwed} total)`, totalOwed);

        // Step 1: Seize cash first (minimum needed)
        const cashToSeize = Math.min(player.balance, remainingOwed);
        player.balance -= cashToSeize;
        bank.cash += cashToSeize;
        remainingOwed -= cashToSeize;

        // Step 2: Seize MINIMUM properties needed (highest value first, greedy algorithm)
        // Only seize what's needed to satisfy the loan
        const seizedProperties: Property[] = [];
        if (remainingOwed > 0) {
            // Get ALL player properties (unmortgaged first, then mortgaged)
            const unmortgagedProperties = this.gameState.properties.filter(p => p.ownerId === player.id && !p.isMortgaged);
            const mortgagedProperties = this.gameState.properties.filter(p => p.ownerId === player.id && p.isMortgaged);

            // Sort by value (highest first) - greedy algorithm: take most valuable first
            unmortgagedProperties.sort((a, b) => getBankAppraisal(b) - getBankAppraisal(a));
            mortgagedProperties.sort((a, b) => getBankAppraisal(b) - getBankAppraisal(a));

            // Try unmortgaged first (more valuable)
            for (const property of unmortgagedProperties) {
                if (remainingOwed <= 0) break;

                const value = getBankAppraisal(property);
                seizedProperties.push(property);
                remainingOwed -= value;
            }

            // If still need more, try mortgaged properties
            if (remainingOwed > 0) {
                for (const property of mortgagedProperties) {
                    if (remainingOwed <= 0) break;

                    const value = getBankAppraisal(property);
                    seizedProperties.push(property);
                    remainingOwed -= value;
                }
            }
        }

        // Step 3: Seize shares (if still needed)
        // Bank forces a buyback/dissolution of the player's shares to cover debt
        let sharesSeizedValue = 0;
        if (remainingOwed > 0) {
            for (const [setId, qty] of Object.entries(player.shares)) {
                if (qty <= 0) continue;
                if (remainingOwed <= 0) break;

                const company = this.gameState.companies.find(c => c.propertySetId === setId);
                if (!company) continue;

                // Take as many shares as needed to cover remainingOwed
                const price = company.marketPrice > 0 ? company.marketPrice : 1;
                const sharesNeeded = Math.ceil(remainingOwed / price);
                const sharesToTake = Math.min(qty, sharesNeeded);
                const stockValue = sharesToTake * price;

                // Dilute/dissolve shares (effectively a forced buyback that benefits the company)
                player.shares[setId] -= sharesToTake;
                company.sharesOutstanding = Math.max(0, company.sharesOutstanding - sharesToTake);

                sharesSeizedValue += stockValue;
                remainingOwed -= stockValue;

                this.logTransaction(`SEIZED: ${sharesToTake} shares of ${setId} ($${stockValue})`, stockValue);
                if (player.shares[setId] <= 0) delete player.shares[setId];
            }
        }

        // Step 4: Transfer seized properties to bank ownership
        let totalPropertyValue = 0;
        for (const property of seizedProperties) {
            const value = getBankAppraisal(property);
            totalPropertyValue += value;
            property.ownerId = MONOBANK_OWNER_ID;
            property.isMortgaged = false;  // Clear mortgage when seized
            property.improvements = 0;     // Clear improvements when seized
            this.logTransaction(`SEIZED: ${property.name} ($${value}) - now bank-owned`, value);
        }

        // Step 5: Check if loan was fully satisfied
        // If remainingOwed > 0 after seizing everything, player must go bankrupt
        if (remainingOwed > 0) {
            // Player can't satisfy the loan even after seizing all assets - BANKRUPTCY
            this.logTransaction(`${player.name} CANNOT satisfy default loan (still owe $${remainingOwed}) - BANKRUPTCY`, remainingOwed);

            // Handle bankruptcy (which will seize remaining assets and clear all loans)
            this.handleBankruptcy(player, loan);
            return;  // Exit early - bankruptcy handles everything
        }

        // Step 6: Loan is satisfied - close the loan and handle CB debt
        const totalSeized = cashToSeize + totalPropertyValue + sharesSeizedValue;
        const originalPrincipal = loan.principalRemaining;

        // Close the loan - reduce loansOutPrincipal by the original principal amount
        bank.loansOutPrincipal -= originalPrincipal;
        bank.loanIncomeAccrued -= loan.accruedInterest;  // Remove accrued interest since loan is defaulted

        // Bank borrowed from CB to fund this loan, so when loan defaults, reduce CB principal
        // Cash seized is used to pay down CB principal (reduce bank cash)
        // Properties/securities seized become bank assets (offsetting CB debt)
        if (originalPrincipal > 0 && bank.cbDebtPrincipal > 0) {
            const cbPrincipalPaydown = Math.min(originalPrincipal, bank.cbDebtPrincipal);
            bank.cbDebtPrincipal -= cbPrincipalPaydown;

            // Use seized cash to pay down CB principal (if cash was seized)
            if (cashToSeize > 0 && cbPrincipalPaydown > 0) {
                const cashUsedForCB = Math.min(cashToSeize, cbPrincipalPaydown);
                bank.cash -= cashUsedForCB;  // Bank uses seized cash to pay down CB principal

                const assetOffset = cbPrincipalPaydown - cashUsedForCB;
                if (assetOffset > 0) {
                    this.logTransaction(`Bank paid down CB principal: $${cashUsedForCB} (cash) + $${assetOffset} (assets offset) = $${cbPrincipalPaydown} total from ${player.name}'s default`, cbPrincipalPaydown);
                } else {
                    this.logTransaction(`Bank paid down CB principal: $${cbPrincipalPaydown} (from ${player.name}'s default)`, cbPrincipalPaydown);
                }
            } else if (cbPrincipalPaydown > 0) {
                // No cash seized, only assets - CB debt reduced by asset value
                this.logTransaction(`Bank reduced CB principal: $${cbPrincipalPaydown} (${player.name} default: assets offset debt)`, cbPrincipalPaydown);
            }
        }

        loan.principalRemaining = 0;
        loan.accruedInterest = 0;
        loan.status = 'DEFAULTED';

        player.creditScore = Math.max(300, player.creditScore - 150);
        this.logTransaction(`${player.name} default satisfied: Seized $${totalSeized} (cash: $${cashToSeize}, properties: $${totalPropertyValue}${sharesSeizedValue > 0 ? `, shares: $${sharesSeizedValue}` : ''}) to cover loan of $${totalOwed}`, totalSeized);
        this.createAlert(player.id, 'loan_default', `Defaulted on ${loan.type} loan. Assets seized to satisfy debt.`);

        // IMPORTANT: Bank MUST continue paying CB even after defaults
        // Bank still has CB debt and must service it
        this.bankPayCB();
    }

    handleBankruptcy(player: Player, triggerLoan: Loan) {
        const bank = this.gameState.bank;

        // Seize all cash
        const cashSeized = player.balance;
        bank.cash += cashSeized;
        player.balance = 0;

        // Seize all properties - transfer to bank ownership
        const playerProperties = this.gameState.properties.filter(p => p.ownerId === player.id);
        let totalPropertyValue = 0;
        for (const prop of playerProperties) {
            const value = getBankAppraisal(prop);
            totalPropertyValue += value;
            prop.ownerId = MONOBANK_OWNER_ID;
            prop.isMortgaged = false;
            prop.improvements = 0;
            // Bank now owns this property (not converted to cash, stays as bank asset)
            this.logTransaction(`SEIZED (BANKRUPTCY): ${prop.name} ($${value}) - now bank-owned`, value);
        }

        // Seize all shares
        let sharesSeizedValue = 0;
        for (const [setId, qty] of Object.entries(player.shares)) {
            if (qty <= 0) continue;

            const company = this.gameState.companies.find(c => c.propertySetId === setId);
            if (!company) continue;

            const price = company.marketPrice > 0 ? company.marketPrice : 1;
            const stockValue = qty * price;

            sharesSeizedValue += stockValue;
            company.sharesOutstanding = Math.max(0, company.sharesOutstanding - qty);

            this.logTransaction(`SEIZED (BANKRUPTCY): ${qty} shares of ${setId} ($${stockValue})`, stockValue);
        }
        player.shares = {};

        // Clear all loans with losses (principal + accrued interest)
        let totalPrincipalWriteoff = 0;
        let totalInterestWriteoff = 0;
        for (const loan of player.activeLoans) {
            const principalLoss = loan.principalRemaining;
            const interestLoss = loan.accruedInterest;
            bank.losses += principalLoss + interestLoss;
            bank.loansOutPrincipal -= principalLoss;
            bank.loanIncomeAccrued -= interestLoss;
            totalPrincipalWriteoff += principalLoss;
            totalInterestWriteoff += interestLoss;
            loan.status = 'DEFAULTED';
            loan.principalRemaining = 0;
            loan.accruedInterest = 0;
        }

        // Bank borrowed from CB to fund these loans, so when player bankrupts, reduce CB principal
        // Use seized cash to pay down CB principal (if any)
        if (totalPrincipalWriteoff > 0 && bank.cbDebtPrincipal > 0) {
            const cbPrincipalPaydown = Math.min(totalPrincipalWriteoff, bank.cbDebtPrincipal);
            bank.cbDebtPrincipal -= cbPrincipalPaydown;

            // Use seized cash to pay down CB principal
            if (cashSeized > 0 && cbPrincipalPaydown > 0) {
                const cashUsedForCB = Math.min(cashSeized, cbPrincipalPaydown);
                bank.cash -= cashUsedForCB;
                const assetOffset = cbPrincipalPaydown - cashUsedForCB;
                if (assetOffset > 0) {
                    this.logTransaction(`Bank paid down CB principal: $${cashUsedForCB} (cash) + $${assetOffset} (assets offset) = $${cbPrincipalPaydown} from ${player.name}'s bankruptcy`, cbPrincipalPaydown);
                } else {
                    this.logTransaction(`Bank paid down CB principal: $${cbPrincipalPaydown} (from ${player.name}'s bankruptcy)`, cbPrincipalPaydown);
                }
            } else {
                this.logTransaction(`Bank reduced CB principal: $${cbPrincipalPaydown} (${player.name} bankruptcy: assets offset debt)`, cbPrincipalPaydown);
            }
        }

        player.activeLoans = [];
        player.pendingLoans = [];

        // Clear vault
        bank.cash += player.vault;
        player.vault = 0;

        const totalSeized = cashSeized + totalPropertyValue + sharesSeizedValue;
        const totalOwed = totalPrincipalWriteoff + totalInterestWriteoff;
        this.logTransaction(`${player.name} BANKRUPTCY: Seized $${totalSeized} (cash: $${cashSeized}, properties: $${totalPropertyValue}${sharesSeizedValue > 0 ? `, shares: $${sharesSeizedValue}` : ''}) but still owe $${totalOwed} - bank loss: $${totalOwed}`, totalOwed);

        player.creditScore = 300;
        this.createAlert(player.id, 'bankruptcy', `Bankrupt! All assets seized.`);

        // IMPORTANT: Bank MUST continue paying CB even after bankruptcy
        // Bank still has CB debt and must service it
        this.bankPayCB();
        this.createAlert(player.id, 'bankruptcy', 'BANKRUPT! All assets seized.');

        // After seizing assets, bank should try to pay CB if it can
        this.bankPayCB();
    }



    // Match bond order against existing orders
    matchBondOrder(newOrder: BondOrder): void {
        const matchingOrders = this.gameState.bondOrders.filter(order => {
            if (order.id === newOrder.id) return false;
            if (order.bondId !== newOrder.bondId) return false;
            if (order.filled >= order.quantity) return false;

            if (newOrder.type === 'BUY') {
                return order.type === 'SELL' && order.limitPrice <= newOrder.limitPrice;
            } else {
                return order.type === 'BUY' && order.limitPrice >= newOrder.limitPrice;
            }
        });

        // Sort by price (best first)
        if (newOrder.type === 'BUY') {
            matchingOrders.sort((a, b) => a.limitPrice - b.limitPrice);  // Cheapest sell first
        } else {
            matchingOrders.sort((a, b) => b.limitPrice - a.limitPrice);  // Highest buy first
        }

        // Execute matches
        for (const matchOrder of matchingOrders) {
            if (newOrder.filled >= newOrder.quantity) break;

            const execPrice = Math.floor((newOrder.limitPrice + matchOrder.limitPrice) / 2);
            const remaining = newOrder.quantity - newOrder.filled;
            const matchRemaining = matchOrder.quantity - matchOrder.filled;
            const fillQty = Math.min(remaining, matchRemaining);

            this.executeBondTrade(matchOrder, newOrder, fillQty, execPrice);
        }
    }

    // Execute bond trade
    executeBondTrade(order1: BondOrder, order2: BondOrder, quantity: number, price: number): void {
        const buyOrder = order1.type === 'BUY' ? order1 : order2;
        const sellOrder = order1.type === 'SELL' ? order1 : order2;
        const bond = this.gameState.bonds.find(b => b.id === buyOrder.bondId);
        if (!bond) return;

        const buyer = buyOrder.playerId === 'BANK' ? null : this.gameState.players.find(p => p.id === buyOrder.playerId);
        const seller = sellOrder.playerId === 'BANK' ? null : this.gameState.players.find(p => p.id === sellOrder.playerId);
        const bank = this.gameState.bank;

        const cost = quantity * price;

        // Execute buy side
        if (buyOrder.playerId === 'BANK') {
            if (bank.cash >= cost) {
                bank.cash -= cost;
                bond.ownerId = 'BANK';
            } else {
                return;
            }
        } else if (buyer) {
            if (buyer.balance >= cost) {
                buyer.balance -= cost;
                bond.ownerId = buyer.id;
            } else {
                return;
            }
        }

        // Execute sell side
        if (sellOrder.playerId === 'BANK') {
            bank.cash += cost;
            bond.ownerId = null;  // Back to bank
        } else if (seller) {
            seller.balance += cost;
            bond.ownerId = null;  // Sold back to market
        }

        // Update order fills
        buyOrder.filled += quantity;
        sellOrder.filled += quantity;

        // Remove filled orders
        if (buyOrder.filled >= buyOrder.quantity) {
            const idx = this.gameState.bondOrders.indexOf(buyOrder);
            if (idx >= 0) this.gameState.bondOrders.splice(idx, 1);
        }
        if (sellOrder.filled >= sellOrder.quantity) {
            const idx = this.gameState.bondOrders.indexOf(sellOrder);
            if (idx >= 0) this.gameState.bondOrders.splice(idx, 1);
        }

        // Update bond price (moving average)
        bond.price = Math.floor((bond.price * 2 + price) / 3);

        const buyerName = buyer?.name || 'Bank';
        const sellerName = seller?.name || 'Bank';
        this.logTransaction(`${buyerName} bought ${quantity} bond(s) from ${sellerName} @ $${price}`, cost);
    }

    // Pay bond coupons (called on GO/tick)
    payBondCoupons(): void {
        const bank = this.gameState.bank;

        for (const bond of this.gameState.bonds) {
            if (!bond.ownerId || bond.ownerId === 'BANK') continue;  // Bank doesn't pay itself

            const player = this.gameState.players.find(p => p.id === bond.ownerId);
            if (!player) continue;

            // Calculate coupon payment (annual rate / turns per year, assume ~10 turns = 1 year)
            const couponPerTurn = Math.floor(bond.faceValue * bond.couponRateBps / 10000 / 10);

            if (couponPerTurn > 0 && bank.cash >= couponPerTurn) {
                bank.cash -= couponPerTurn;
                player.balance += couponPerTurn;
                this.logTransaction(`${player.name} received $${couponPerTurn} bond coupon (${bond.couponRateBps / 100}%)`, couponPerTurn);
            }
        }
    }

    // Mature bonds (return face value to owner)
    matureBonds(): void {
        const bank = this.gameState.bank;
        const currentTurn = this.gameState.turnNumber;

        for (const bond of this.gameState.bonds) {
            const turnsSinceIssue = currentTurn - bond.issuedAt;
            if (turnsSinceIssue >= bond.maturityTurns) {
                // Bond matures - pay face value to owner
                if (bond.ownerId && bond.ownerId !== 'BANK') {
                    const player = this.gameState.players.find(p => p.id === bond.ownerId);
                    if (player && bank.cash >= bond.faceValue) {
                        bank.cash -= bond.faceValue;
                        player.balance += bond.faceValue;
                        this.logTransaction(`${player.name} received $${bond.faceValue} bond maturity payment`, bond.faceValue);
                    }
                }

                // Remove matured bond
                const idx = this.gameState.bonds.indexOf(bond);
                if (idx >= 0) this.gameState.bonds.splice(idx, 1);
            }
        }
    }



    // Start auction timer (checks happen on each action/state update)
    // In Cloudflare, we check auctions periodically through state updates
    startAuctionTimer(auctionId: string): void {
        // Timer checks happen via checkActiveAuctions() called before broadcasts
        // This ensures auctions are checked frequently without long-running timers
    }

    // End auction and transfer property
    async endAuction(auctionId: string): Promise<void> {
        const auction = this.gameState.auctions.find(a => a.id === auctionId);
        if (!auction || auction.status !== 'active') return;

        const prop = this.gameState.properties.find(p => p.id === auction.property_id);
        if (!prop) return;

        auction.status = 'ended';

        if (auction.current_bidder_id && auction.current_bid >= auction.starting_bid) {
            // Valid winner - has placed bid at or above starting bid
            auction.winner_id = auction.current_bidder_id;
            // Winner exists - transfer property
            const winner = this.gameState.players.find(p => p.id === auction.current_bidder_id);

            if (winner) {  // Bid already deducted
                // Transfer property ownership
                const prevOwner = prop.ownerId;

                if (auction.seller_id === null || auction.seller_id === 'BANK') {
                    // Bank/Unowned property - 20% to bank, rest disappears
                    const bankCut = Math.floor(auction.current_bid * 20 / 100);
                    this.gameState.bank.cash += bankCut;
                } else {
                    // Player-owned - seller gets full amount
                    const seller = this.gameState.players.find(p => p.id === auction.seller_id);
                    if (seller) {
                        seller.balance += auction.current_bid;
                        prop.isMortgaged = false;  // Clear mortgage if any
                    }
                }

                prop.ownerId = winner.id;
                prop.isMortgaged = false;

                const sellerName = auction.seller_id === null ? 'Bank' :
                    auction.seller_id === 'BANK' ? 'MonoBank' :
                        this.gameState.players.find(p => p.id === auction.seller_id)?.name || 'Unknown';

                this.logTransaction(`${winner.name} won auction: ${prop.name} for $${auction.current_bid} (from ${sellerName})`, auction.current_bid);

                // Notify all players
                for (const player of this.gameState.players) {
                    if (player.id === winner.id) {
                        this.createAlert(player.id, 'auction_won', `You won ${prop.name} for $${auction.current_bid}!`);
                    } else if (auction.seller_id && player.id === auction.seller_id) {
                        this.createAlert(player.id, 'auction_sold', `${prop.name} sold for $${auction.current_bid}`);
                    }
                }
            } else {
                // Winner doesn't exist (player left?) - no winner, property stays
                auction.winner_id = null;
                // Refund last bidder if exists
                if (auction.bids.length > 0) {
                    const lastBid = auction.bids[auction.bids.length - 1];
                    const lastBidder = this.gameState.players.find(p => p.id === lastBid.player_id);
                    if (lastBidder) {
                        lastBidder.balance += lastBid.amount;  // Refund last bid
                    }
                }
                this.logTransaction(`Auction ended: ${prop.name} - No valid winner`, 0);
            }
        } else {
            // No valid bids - property stays with seller or unowned
            // Refund the starting bidder if there was one (but starting bid isn't deducted anyway)
            // Actually, starting_bid is just the minimum, no one pays it initially
            auction.winner_id = null;

            // If no bids were placed, property remains with current owner
            if (auction.bids.length === 0) {
                this.logTransaction(`Auction ended: ${prop.name} - No bids placed, property remains ${auction.seller_id === null ? 'unowned' : auction.seller_id === 'BANK' ? 'with bank' : 'with owner'}`, 0);
            } else {
                // Had bids but winner can't pay - refund last bidder if exists
                const lastBid = auction.bids[auction.bids.length - 1];
                if (lastBid) {
                    const lastBidder = this.gameState.players.find(p => p.id === lastBid.player_id);
                    if (lastBidder) {
                        lastBidder.balance += lastBid.amount;  // Refund last bid
                    }
                }
                this.logTransaction(`Auction ended: ${prop.name} - No valid winner`, 0);
            }
        }

        // Broadcast auction end
        this.broadcast({ type: 'auction_ended', payload: { auction_id: auctionId, winner_id: auction.winner_id, final_bid: auction.current_bid } });
        this.broadcast({ type: 'state', payload: this.getPublicState() });
        await this.save();
    }

    // Check all active auctions (called periodically on actions/state updates)
    async checkActiveAuctions(): Promise<void> {
        const now = Date.now();
        const expiredAuctions = this.gameState.auctions.filter(a =>
            a.status === 'active' && now >= a.end_time
        );

        for (const auction of expiredAuctions) {
            await this.endAuction(auction.id);
        }
    }



    // Decrement Standard pending turns
    decrementStandardPending(player: Player) {
        for (const loan of player.pendingLoans) {
            if (loan.type === 'STANDARD' && loan.pendingTurnsRemaining > 0) {
                loan.pendingTurnsRemaining--;
            }
        }
        // Check for disbursement
        this.disburseStandardLoans(player);
    }

    // Process pending share orders (insider trading wait periods)
    processPendingShareOrders() {
        for (let i = this.gameState.pendingShareOrders.length - 1; i >= 0; i--) {
            const order = this.gameState.pendingShareOrders[i];
            order.turnsRemaining--;

            if (order.turnsRemaining <= 0) {
                this.executePendingShareOrder(order);
                this.gameState.pendingShareOrders.splice(i, 1);
            }
        }
    }

    executePendingShareOrder(order: PendingShareOrder) {
        const player = this.gameState.players.find(p => p.id === order.playerId);
        const company = this.gameState.companies.find(c => c.propertySetId === order.propertySetId);
        if (!player || !company) return;

        let remainingToBuy = order.quantity;
        let executedQty = 0;
        let actualCost = 0;

        company.offers.sort((a, b) => a.price - b.price);

        for (let j = 0; j < company.offers.length; j++) {
            if (remainingToBuy <= 0) break;
            const offer = company.offers[j];
            if (offer.sellerId === player.id) continue;

            const take = Math.min(remainingToBuy, offer.quantity);
            const cost = take * offer.price;

            if (actualCost + cost > order.totalCost) {
                const maximumAffordable = Math.floor((order.totalCost - actualCost) / offer.price);
                if (maximumAffordable > 0) {
                    const partialTake = Math.min(take, maximumAffordable);
                    offer.quantity -= partialTake;
                    executedQty += partialTake;
                    actualCost += partialTake * offer.price;
                    remainingToBuy -= partialTake;

                    if (offer.sellerId === 'COMPANY') {
                        const owner = this.gameState.players.find(p => p.id === company.ownerId);
                        if (owner) owner.balance += partialTake * offer.price;
                        company.sharesOutstanding += partialTake;
                    } else {
                        const seller = this.gameState.players.find(p => p.id === offer.sellerId);
                        if (seller) seller.balance += partialTake * offer.price;
                    }
                }
                break;
            }

            offer.quantity -= take;
            executedQty += take;
            actualCost += cost;
            remainingToBuy -= take;

            if (offer.sellerId === 'COMPANY') {
                const owner = this.gameState.players.find(p => p.id === company.ownerId);
                if (owner) owner.balance += cost;
                company.sharesOutstanding += take;
            } else {
                const seller = this.gameState.players.find(p => p.id === offer.sellerId);
                if (seller) seller.balance += cost;
            }
        }

        company.offers = company.offers.filter(o => o.quantity > 0);
        updateCompanyMarketPrice(company);

        player.shares[order.propertySetId] = (player.shares[order.propertySetId] || 0) + executedQty;

        player.reservedCash = Math.max(0, (player.reservedCash || 0) - order.totalCost);
        const refund = order.totalCost - actualCost;
        if (refund > 0) {
            player.balance += refund;
        }

        this.logTransaction(`${player.name} insider buyback resolved: Bought ${executedQty} shares for $${actualCost} (Refund: $${refund})`, actualCost);
    }


    // ===== ACTION HANDLER =====

    async handleAction(action: any, sender: WebSocket) {
        const { type, payload } = action;

        // ===== LOBBY =====
        if (type === 'join') {
            const { name } = payload;

            if (this.gameState.status === 'active') {
                const existing = this.gameState.players.find(p => p.name === name);
                if (!existing) {
                    sender.send(JSON.stringify({ type: 'error', message: 'Game already started.' }));
                    sender.close(1008, 'Game already started');
                    return;
                }
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                return;
            }

            const existing = this.gameState.players.find(p => p.name === name);
            if (existing) {
                // If original host returns, give them back host status
                if (existing.isOriginalHost) {
                    // Remove host from current host
                    this.gameState.players.forEach(p => p.isHost = false);
                    existing.isHost = true;
                }
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                return;
            }

            const id = Math.random().toString(36).slice(2, 9);
            const isHost = this.gameState.players.length === 0;
            const joinOrder = this.gameState.players.length;

            const newPlayer: Player = {
                id,
                name,
                balance: 1500,
                vault: 0,
                turnIndex: 0,
                lastPayTurnIndex: 0,
                pendingLoans: [],
                activeLoans: [],
                creditScore: 400, // Start with POOR credit - must build it up!
                shares: {},
                properties: [],
                turns: 0,
                isHost,
                isOriginalHost: isHost, // First player is the original host
                ready: isHost, // Host is ready by default
                joinOrder,
                reservedCash: 0,
                reservedShares: 0
            };

            this.gameState.players.push(newPlayer);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'start_game') {
            const { playerId } = payload;
            const requester = this.gameState.players.find(p => p.id === playerId);
            if (!requester || !requester.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the host can start the game.' }));
                return;
            }

            // Check if all players are ready
            const notReady = this.gameState.players.filter(p => !p.ready);
            if (notReady.length > 0) {
                sender.send(JSON.stringify({ type: 'error', message: `Not all players are ready: ${notReady.map(p => p.name).join(', ')}` }));
                return;
            }

            // Need at least 2 players
            if (this.gameState.players.length < 2) {
                sender.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start.' }));
                return;
            }

            this.gameState.status = 'active';
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== READY TOGGLE =====
        if (type === 'toggle_ready') {
            if (this.gameState.status === 'active') return;

            const { playerId } = payload;
            const player = this.gameState.players.find(p => p.id === playerId);
            if (player) {
                player.ready = !player.ready;
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== KICK PLAYER (Host only) =====
        if (type === 'kick_player') {
            if (this.gameState.status === 'active') {
                sender.send(JSON.stringify({ type: 'error', message: 'Cannot kick players during active game.' }));
                return;
            }

            const { playerId, targetPlayerId } = payload;
            const requester = this.gameState.players.find(p => p.id === playerId);
            if (!requester || !requester.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the host can kick players.' }));
                return;
            }

            const target = this.gameState.players.find(p => p.id === targetPlayerId);
            if (!target) {
                sender.send(JSON.stringify({ type: 'error', message: 'Player not found.' }));
                return;
            }

            if (target.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Cannot kick the host.' }));
                return;
            }

            // Remove the player
            this.gameState.players = this.gameState.players.filter(p => p.id !== targetPlayerId);

            // Send kick message to the kicked player's session (if any)
            this.sessions.forEach(s => {
                s.send(JSON.stringify({ type: 'kicked', targetPlayerId }));
            });

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== LEAVE ROOM =====
        if (type === 'leave_room') {
            const { playerId } = payload;
            const player = this.gameState.players.find(p => p.id === playerId);
            if (!player) return;

            const wasHost = player.isHost;

            // Remove the player
            this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);

            // If the leaving player was the host, transfer host to next in line
            if (wasHost && this.gameState.players.length > 0) {
                // First check if original host is still in the room
                const originalHost = this.gameState.players.find(p => p.isOriginalHost);
                if (originalHost) {
                    originalHost.isHost = true;
                } else {
                    // Otherwise, give host to player with lowest joinOrder
                    const sortedPlayers = [...this.gameState.players].sort((a, b) => a.joinOrder - b.joinOrder);
                    sortedPlayers[0].isHost = true;
                }
            }

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== PAUSE / UNPAUSE ROOM (Host only) =====
        if (type === 'pause_room') {
            const { player_id, hours } = payload;
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player || !player.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the host can pause the room' }));
                return;
            }
            const requestedHours = Math.min(Math.max(Number(hours) || 2, 1), 48); // 1-48 hours, default 2
            this.gameState.pausedUntil = Date.now() + requestedHours * 60 * 60 * 1000;
            this.logTransaction(`${player.name} paused the room for ${requestedHours} hours`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'unpause_room') {
            const { player_id } = payload;
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player || !player.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the host can unpause the room' }));
                return;
            }
            this.gameState.pausedUntil = 0;
            this.logTransaction(`${player.name} unpaused the room`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'update_settings') {
            this.gameState.settings = { ...this.gameState.settings, ...payload };
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== UPDATE ROOM NAME (Host only) =====
        if (type === 'update_room_name') {
            const { playerId, roomName } = payload;
            const requester = this.gameState.players.find(p => p.id === playerId);
            if (!requester || !requester.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the host can change room name.' }));
                return;
            }
            if (typeof roomName === 'string' && roomName.trim().length > 0 && roomName.length <= 30) {
                this.gameState.roomName = roomName.trim();
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== TRANSFERS =====
        if (type === 'transfer') {
            const { from_id, to_id, amount, description } = payload;
            const amt = Math.floor(Number(amount) || 0);
            if (from_id && amt > 0) {
                const senderPlayer = this.gameState.players.find(p => p.id === from_id);
                if (senderPlayer && senderPlayer.balance >= amt) {
                    senderPlayer.balance -= amt;

                    if (to_id) {
                        const receiver = this.gameState.players.find(p => p.id === to_id);
                        if (receiver) {
                            const activeCorps = this.gameState.companies.filter(c => c.ownerId === to_id && c.dividendPct > 0 && c.sharesOutstanding > 0);

                            if (activeCorps.length > 0) {
                                const blendedPct = activeCorps.reduce((sum, c) => sum + c.dividendPct, 0) / activeCorps.length;
                                const totalDividendAmount = Math.floor(amt * (blendedPct / 100));

                                if (totalDividendAmount > 0) {
                                    const amountPerCorp = Math.floor(totalDividendAmount / activeCorps.length);

                                    for (const corp of activeCorps) {
                                        const perShare = amountPerCorp / corp.sharesOutstanding;
                                        for (const player of this.gameState.players) {
                                            const sharesOwned = player.shares[corp.propertySetId] || 0;
                                            if (sharesOwned > 0) {
                                                const payout = Math.floor(sharesOwned * perShare);
                                                player.balance += payout;
                                            }
                                        }
                                    }

                                    receiver.balance += (amt - totalDividendAmount);
                                    receiver.dividendsPaid = (receiver.dividendsPaid || 0) + totalDividendAmount;

                                    this.logTransaction(description || `Transfer from ${senderPlayer.name} (includes $${totalDividendAmount} dividends distributed)`, amt);
                                } else {
                                    receiver.balance += amt;
                                    this.logTransaction(description || `Transfer from ${senderPlayer.name}`, amt);
                                }
                            } else {
                                receiver.balance += amt;
                                this.logTransaction(description || `Transfer from ${senderPlayer.name}`, amt);
                            }
                        }
                    } else {
                        // Transfer to nowhere? Just log it
                        this.logTransaction(description || `Transfer from ${senderPlayer.name}`, amt);
                    }

                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'pay_bank') {
            const { player_id, amount, reason } = payload;
            const amt = Math.floor(Number(amount) || 0);
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && amt > 0 && p.balance >= amt) {
                p.balance -= amt;
                this.gameState.bank.cash += amt;
                this.logTransaction(`${p.name} paid Bank: ${reason}`, amt);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'request_bank') {
            const { player_id, amount, reason } = payload;
            const amt = Math.floor(Number(amount) || 0);
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && amt > 0) {
                p.balance += amt;
                this.gameState.bank.cash -= amt;
                if (this.gameState.bank.cash < 0) {
                    this.gameState.bank.cbDebtPrincipal += Math.abs(this.gameState.bank.cash);
                    this.gameState.bank.cash = 0;
                }
                this.logTransaction(`${p.name} received from Bank: ${reason}`, amt);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== VAULT =====
        if (type === 'vault_deposit') {
            const { player_id, amount } = payload;
            const amt = Math.floor(Number(amount) || 0);
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && amt > 0 && p.balance >= amt) {
                p.balance -= amt;
                p.vault += amt;
                this.logTransaction(`${p.name} deposited to Vault`, amt);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'vault_withdraw') {
            const { player_id, amount } = payload;
            const amt = Math.floor(Number(amount) || 0);
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && amt > 0 && p.vault >= amt) {
                p.vault -= amt;
                p.balance += amt;
                this.logTransaction(`${p.name} withdrew from Vault`, amt);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== LOAN REQUEST (Prompt 7) =====
        if (type === 'request_loan') {
            const { player_id, loan_type, amount, installments } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (!p) return;

            const amt = Math.floor(Number(amount) || 0);
            const inst = Math.floor(Number(installments) || 1);

            const result = this.requestLoan(p, loan_type as LoanType, amt, inst);

            if (!result.success) {
                sender.send(JSON.stringify({ type: 'error', message: result.error }));
                return;
            }

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== GET LOAN INFO =====
        if (type === 'get_loan_info') {
            const { player_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p) {
                const limits = this.calculateLoanLimits(p);
                sender.send(JSON.stringify({
                    type: 'loan_info',
                    payload: {
                        limits,
                        creditScore: p.creditScore,
                        netWorth: netWorth(p, this.gameState.companies, this.gameState.properties),
                        netWorthForLending: netWorthForLending(p, this.gameState.companies, this.gameState.properties),
                        activeDebt: activeDebt(p),
                        pendingDebt: pendingDebt(p),
                        maxInstallmentsGlobal: MAX_INSTALLMENTS_GLOBAL,
                        minPrincipalPerInstallment: MIN_PRINCIPAL_PER_INSTALLMENT
                    }
                }));
            }
        }


        // ===== CORPORATE STOCK MARKET =====

        if (type === 'declare_dividend') {
            const { player_id, property_set_id, dividend_pct } = payload;
            const pct = Math.floor(Number(dividend_pct));
            const p = this.gameState.players.find(p => p.id === player_id);
            if (!p) return;

            if (pct < 0 || pct > 100) {
                sender.send(JSON.stringify({ type: 'error', message: 'Dividend must be between 0 and 100' }));
                return;
            }

            if (!ownsFullColorGroup(player_id, property_set_id, this.gameState.properties)) {
                sender.send(JSON.stringify({ type: 'error', message: 'You must own the full property set to declare a dividend' }));
                return;
            }

            let company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) {
                company = {
                    propertySetId: property_set_id,
                    ownerId: player_id,
                    dividendPct: pct,
                    sharesOutstanding: 0,
                    offers: [],
                    marketPrice: 0
                };
                this.gameState.companies.push(company);
            } else {
                company.dividendPct = pct;
            }

            this.logTransaction(`${p.name} declared ${pct}% dividend for ${property_set_id}`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'issue_company_stock') {
            const { player_id, property_set_id, quantity, price } = payload;
            const qty = Math.floor(Number(quantity));
            let p_price = Math.floor(Number(price));
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player) return;

            if (qty <= 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'Invalid quantity' }));
                return;
            }

            if (!ownsFullColorGroup(player_id, property_set_id, this.gameState.properties)) {
                sender.send(JSON.stringify({ type: 'error', message: 'You must own the full property set to issue stock' }));
                return;
            }

            let company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) {
                if (p_price <= 0) {
                    sender.send(JSON.stringify({ type: 'error', message: 'Initial price must be greater than $0' }));
                    return;
                }

                company = {
                    propertySetId: property_set_id,
                    ownerId: player_id,
                    dividendPct: 0,
                    sharesOutstanding: 0,
                    offers: [],
                    marketPrice: 0
                };
                this.gameState.companies.push(company);
            } else {
                if (p_price <= 0) {
                    sender.send(JSON.stringify({ type: 'error', message: 'Invalid price' }));
                    return;
                }

                // If there are existing offers on the market, constrain new issuance to ±$1 of lowest ask
                if (company.offers.length > 0) {
                    const lowestAsk = Math.min(...company.offers.map(o => o.price));
                    if (Math.abs(p_price - lowestAsk) > 1) {
                        sender.send(JSON.stringify({ type: 'error', message: `Price must be within $1 of the lowest ask ($${lowestAsk}). Allowed range: $${lowestAsk - 1} – $${lowestAsk + 1}` }));
                        return;
                    }
                }
            }

            company.offers.push({
                id: crypto.randomUUID(),
                sellerId: 'COMPANY',
                quantity: qty,
                price: p_price,
                listedAt: Date.now()
            });

            this.logTransaction(`${player.name} Corporation issued ${qty} shares of ${property_set_id} at $${p_price}`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'buy_company_stock') {
            const { player_id, property_set_id, quantity, seller_id } = payload;
            const qty = Math.floor(Number(quantity));
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player || qty <= 0) return;

            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) return;

            // Sort offers cheapest first
            company.offers.sort((a, b) => a.price - b.price);

            // Filter offers based on seller_id if provided
            const eligibleOffers = seller_id
                ? company.offers.filter(o => o.sellerId === seller_id && o.sellerId !== player_id)
                : company.offers.filter(o => o.sellerId !== player_id);

            // Calculate cost for the requested quantity
            let remainingToBuy = qty;
            let totalCost = 0;
            let tempOffers = JSON.parse(JSON.stringify(eligibleOffers)); // deep copy to simulate

            for (const offer of tempOffers) {
                if (remainingToBuy <= 0) break;
                const take = Math.min(remainingToBuy, offer.quantity);
                totalCost += take * offer.price;
                remainingToBuy -= take;
            }

            if (remainingToBuy > 0) {
                sender.send(JSON.stringify({ type: 'error', message: `Not enough shares for sale from ${seller_id || 'any seller'} (can only buy ${qty - remainingToBuy})` }));
                return;
            }

            if (player.balance < totalCost) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${totalCost}, but only have $${player.balance}` }));
                return;
            }

            // Insider trading delay ONLY applies when CEO buys COMPANY (treasury) shares
            const buyingFromCompany = seller_id === 'COMPANY' || (!seller_id && eligibleOffers.some(o => o.sellerId === 'COMPANY'));
            if (company.ownerId === player_id && buyingFromCompany && !seller_id) {
                // The CEO is buying mixed offers that include COMPANY shares — apply delay to everything
                player.balance -= totalCost;
                player.reservedCash = (player.reservedCash || 0) + totalCost;

                this.gameState.pendingShareOrders.push({
                    id: crypto.randomUUID(),
                    playerId: player_id,
                    propertySetId: property_set_id,
                    quantity: qty,
                    price: 0,
                    totalCost: totalCost,
                    turnsRemaining: 3,
                    createdAt: Date.now()
                });

                this.logTransaction(`${player.name} initiated insider buyback of ${qty} ${property_set_id} shares (3 turns pending)`, totalCost);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
                return;
            }

            if (company.ownerId === player_id && seller_id === 'COMPANY') {
                // CEO explicitly picking COMPANY as seller — delay
                player.balance -= totalCost;
                player.reservedCash = (player.reservedCash || 0) + totalCost;

                this.gameState.pendingShareOrders.push({
                    id: crypto.randomUUID(),
                    playerId: player_id,
                    propertySetId: property_set_id,
                    quantity: qty,
                    price: 0,
                    totalCost: totalCost,
                    turnsRemaining: 3,
                    createdAt: Date.now()
                });

                this.logTransaction(`${player.name} initiated insider buyback of ${qty} ${property_set_id} shares (3 turns pending)`, totalCost);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
                return;
            }

            // Instant execution (non-insider, or CEO buying from a player)
            let executedQty = 0;
            let actualCost = 0;
            remainingToBuy = qty;

            for (let i = 0; i < company.offers.length; i++) {
                if (remainingToBuy <= 0) break;
                const offer = company.offers[i];
                if (offer.sellerId === player_id) continue;
                if (seller_id && offer.sellerId !== seller_id) continue;

                const take = Math.min(remainingToBuy, offer.quantity);
                const cost = take * offer.price;

                offer.quantity -= take;
                executedQty += take;
                actualCost += cost;
                remainingToBuy -= take;

                // Handle seller payments
                if (offer.sellerId === 'COMPANY') {
                    const owner = this.gameState.players.find(p => p.id === company.ownerId);
                    if (owner) owner.balance += cost;
                    company.sharesOutstanding += take;
                } else {
                    const seller = this.gameState.players.find(p => p.id === offer.sellerId);
                    if (seller) seller.balance += cost;
                }
            }

            // Cleanup empty offers
            company.offers = company.offers.filter(o => o.quantity > 0);
            updateCompanyMarketPrice(company);

            player.balance -= actualCost;
            player.shares[property_set_id] = (player.shares[property_set_id] || 0) + executedQty;

            this.logTransaction(`${player.name} bought ${executedQty} shares of ${property_set_id} for $${actualCost}`, actualCost);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'sell_company_stock') {
            const { player_id, property_set_id, quantity, price } = payload;
            const qty = Math.floor(Number(quantity));
            const p_price = Math.floor(Number(price));
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player || qty <= 0 || p_price <= 0) return;

            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) return;

            const ownedShares = player.shares[property_set_id] || 0;
            if (ownedShares < qty) {
                sender.send(JSON.stringify({ type: 'error', message: `You only own ${ownedShares} shares` }));
                return;
            }

            // Deduct shares from player instantly and list them
            player.shares[property_set_id] -= qty;
            if (player.shares[property_set_id] <= 0) delete player.shares[property_set_id];

            company.offers.push({
                id: crypto.randomUUID(),
                sellerId: player_id,
                quantity: qty,
                price: p_price,
                listedAt: Date.now()
            });

            updateCompanyMarketPrice(company);

            this.logTransaction(`${player.name} listed ${qty} shares of ${property_set_id} at $${p_price}`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'update_stock_offer') {
            const { player_id, property_set_id, offer_id, new_price } = payload;
            const price = Math.floor(Number(new_price));
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player) return;

            if (price <= 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'Price must be greater than $0' }));
                return;
            }

            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) return;

            const offer = company.offers.find(o => o.id === offer_id);
            if (!offer) {
                sender.send(JSON.stringify({ type: 'error', message: 'Offer not found' }));
                return;
            }

            // Only the seller (or the company owner for COMPANY shares) can update it
            if (offer.sellerId !== player_id && !(offer.sellerId === 'COMPANY' && company.ownerId === player_id)) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not authorized to update this offer' }));
                return;
            }

            offer.price = price;

            // Re-sort offers and update market price
            company.offers.sort((a, b) => a.price - b.price);
            updateCompanyMarketPrice(company);

            this.logTransaction(`${player.name} updated sell offer for ${property_set_id} to $${price}`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'cancel_stock_offer') {
            const { player_id, property_set_id, offer_id } = payload;
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player) return;

            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) {
                sender.send(JSON.stringify({ type: 'error', message: 'Corporation not found' }));
                return;
            }

            const offerIdx = company.offers.findIndex(o => o.id === offer_id);
            if (offerIdx === -1) {
                sender.send(JSON.stringify({ type: 'error', message: 'Offer not found' }));
                return;
            }

            const offer = company.offers[offerIdx];

            // Only the seller can cancel (or CEO can cancel COMPANY offers)
            if (offer.sellerId !== player_id && !(offer.sellerId === 'COMPANY' && company.ownerId === player_id)) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not authorized to cancel this offer' }));
                return;
            }

            // Return shares to the seller
            if (offer.sellerId === 'COMPANY') {
                // COMPANY shares weren't counted as outstanding, no shares to return to player
                // Just remove the listing
            } else {
                // Return shares to the player
                player.shares[property_set_id] = (player.shares[property_set_id] || 0) + offer.quantity;
            }

            // Remove the offer
            company.offers.splice(offerIdx, 1);
            updateCompanyMarketPrice(company);

            this.logTransaction(`${player.name} withdrew ${offer.quantity} shares of ${property_set_id} from market`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'buyback_company_stock') {
            const { player_id, property_set_id, quantity } = payload;
            const qty = Math.floor(Number(quantity));
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player || qty <= 0) return;

            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            if (!company) {
                sender.send(JSON.stringify({ type: 'error', message: 'Corporation not found' }));
                return;
            }

            if (company.ownerId !== player_id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only the CEO can buy back shares for destruction' }));
                return;
            }

            // Buyback only from players (not COMPANY offers). CEO is a player too.
            const eligibleOffers = company.offers.filter(o => o.sellerId !== 'COMPANY');

            // Count available shares from other players
            const availableQty = eligibleOffers.reduce((sum, o) => sum + o.quantity, 0);
            if (availableQty < qty) {
                sender.send(JSON.stringify({ type: 'error', message: `Only ${availableQty} shares available from other players` }));
                return;
            }

            // Buyback at market price (not individual offer prices)
            const buybackPrice = company.marketPrice || 1;
            const totalCost = qty * buybackPrice;

            if (player.balance < totalCost) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${totalCost} (${qty} × $${buybackPrice} market price), have $${player.balance}` }));
                return;
            }

            // Execute: buy from other players' offers at market price and DESTROY
            let remainingToBuy = qty;
            let executedQty = 0;

            // Sort eligible offers cheapest first
            eligibleOffers.sort((a, b) => a.price - b.price);

            for (const offer of eligibleOffers) {
                if (remainingToBuy <= 0) break;
                const take = Math.min(remainingToBuy, offer.quantity);
                const cost = take * buybackPrice; // Pay market price per share

                offer.quantity -= take;
                executedQty += take;
                remainingToBuy -= take;

                // Pay the seller at market price
                const seller = this.gameState.players.find(p => p.id === offer.sellerId);
                if (seller) seller.balance += cost;

                // Shares destroyed — decrement outstanding
                company.sharesOutstanding = Math.max(0, company.sharesOutstanding - take);
            }

            // Cleanup empty offers
            company.offers = company.offers.filter(o => o.quantity > 0);
            updateCompanyMarketPrice(company);

            // CEO pays
            const actualCost = executedQty * buybackPrice;
            player.balance -= actualCost;

            this.logTransaction(`${player.name} bought back & destroyed ${executedQty} shares of ${property_set_id} at $${buybackPrice}/ea ($${actualCost} total, outstanding: ${company.sharesOutstanding})`, actualCost);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        if (type === 'sell_set_to_bank') {
            const { player_id, property_set_id } = payload;
            const player = this.gameState.players.find(p => p.id === player_id);
            if (!player) return;

            // Verify player owns the full set
            if (!ownsFullColorGroup(player_id, property_set_id, this.gameState.properties)) {
                sender.send(JSON.stringify({ type: 'error', message: 'You must own the full property set to sell it to the bank' }));
                return;
            }

            const setProperties = this.gameState.properties.filter(p => p.colorGroup === property_set_id && p.ownerId === player_id);
            if (setProperties.length === 0) return;

            // Calculate sale price (bank appraisal = mortgage value typically = price / 2)
            const salePrice = setProperties.reduce((sum, p) => {
                const baseValue = Math.floor(p.price / 2);
                const improvementValue = (p.improvements || 0) * Math.floor(p.houseCost / 2);
                return sum + baseValue + improvementValue;
            }, 0);

            // Check if a company exists for this set — if so, force buyback all outstanding shares
            const company = this.gameState.companies.find(c => c.propertySetId === property_set_id);
            let totalBuybackCost = 0;

            if (company && company.sharesOutstanding > 0) {
                // Determine buyback price: market price (lowest non-CEO offer), or last known market price
                let buybackPrice = company.marketPrice;
                const nonCeoOffers = company.offers.filter(o => o.sellerId !== player_id);
                if (nonCeoOffers.length > 0) {
                    buybackPrice = Math.min(...nonCeoOffers.map(o => o.price));
                }
                if (buybackPrice <= 0) buybackPrice = 1; // Minimum $1 per share

                // Force-buy all outstanding shares from every player
                for (const p of this.gameState.players) {
                    const sharesOwned = p.shares[property_set_id] || 0;
                    if (sharesOwned > 0) {
                        const payout = sharesOwned * buybackPrice;
                        p.balance += payout;
                        totalBuybackCost += payout;
                        delete p.shares[property_set_id];
                    }
                }

                // Also cancel any pending share orders for this company
                this.gameState.pendingShareOrders = this.gameState.pendingShareOrders.filter(o => {
                    if (o.propertySetId === property_set_id) {
                        // Refund reserved cash
                        const orderPlayer = this.gameState.players.find(p => p.id === o.playerId);
                        if (orderPlayer) {
                            orderPlayer.reservedCash = Math.max(0, (orderPlayer.reservedCash || 0) - o.totalCost);
                            orderPlayer.balance += o.totalCost;
                        }
                        return false;
                    }
                    return true;
                });

                // Remove the company entirely
                this.gameState.companies = this.gameState.companies.filter(c => c.propertySetId !== property_set_id);
            } else if (company) {
                // Company exists but no outstanding shares — just remove it
                this.gameState.companies = this.gameState.companies.filter(c => c.propertySetId !== property_set_id);
            }

            // Remove improvements and transfer properties to bank
            for (const prop of setProperties) {
                prop.improvements = 0;
                prop.ownerId = null;
            }

            // CEO must pay buyback cost out of sale proceeds
            const netProceeds = Math.max(0, salePrice - totalBuybackCost);
            player.balance += netProceeds;

            this.logTransaction(
                `${player.name} sold ${property_set_id} set to bank for $${salePrice}` +
                (totalBuybackCost > 0 ? ` (buyback cost: $${totalBuybackCost}, net: $${netProceeds})` : ''),
                salePrice
            );
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== BOND SYSTEM =====

        // Bank issues a bond
        if (type === 'issue_bond') {
            const { face_value, coupon_rate_bps, maturity_turns } = payload;
            const faceValue = Math.floor(Number(face_value) || 1000);
            const couponRate = Math.floor(Number(coupon_rate_bps) || 500);  // Default 5%
            const maturity = Math.floor(Number(maturity_turns) || 20);  // Default 20 turns

            const bank = this.gameState.bank;

            if (faceValue < 100 || couponRate < 0 || maturity < 1) {
                sender.send(JSON.stringify({ type: 'error', message: 'Invalid bond parameters' }));
                return;
            }

            const bond: Bond = {
                id: crypto.randomUUID(),
                issuerId: 'BANK',
                faceValue,
                couponRateBps: couponRate,
                maturityTurns: maturity,
                issuedAt: this.gameState.turnNumber,
                ownerId: null,  // Bank holds initially
                price: faceValue  // Start at par
            };

            this.gameState.bonds.push(bond);
            bank.cash += faceValue;  // Bank receives cash from bond issuance

            this.logTransaction(`Bank issued bond: $${faceValue} @ ${couponRate / 100}% for ${maturity} turns`, faceValue);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Place bond order (buy or sell)
        if (type === 'place_bond_order') {
            const { player_id, bond_id, order_type, quantity, limit_price } = payload;
            const qty = Math.floor(Number(quantity) || 0);
            const price = Math.floor(Number(limit_price) || 0);

            const p = player_id === 'BANK' ? null : this.gameState.players.find(p => p.id === player_id);
            const bond = this.gameState.bonds.find(b => b.id === bond_id);

            if (!bond) {
                sender.send(JSON.stringify({ type: 'error', message: 'Bond not found' }));
                return;
            }

            if (!p && player_id !== 'BANK') {
                sender.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
                return;
            }

            if (qty <= 0 || price <= 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'Invalid quantity or price' }));
                return;
            }

            // Check ownership for sell orders
            if (order_type === 'SELL') {
                const owned = bond.ownerId === (player_id === 'BANK' ? 'BANK' : player_id) ? 1 : 0;
                if (owned < qty) {
                    sender.send(JSON.stringify({ type: 'error', message: `Only own ${owned} of this bond` }));
                    return;
                }
            }

            // Check budget for buy orders
            if (order_type === 'BUY') {
                const cost = qty * price;
                const available = p ? p.balance : this.gameState.bank.cash;
                if (cost > available) {
                    sender.send(JSON.stringify({ type: 'error', message: `Need $${cost}, have $${available}` }));
                    return;
                }
            }

            const order: BondOrder = {
                id: crypto.randomUUID(),
                playerId: player_id === 'BANK' ? 'BANK' : player_id,
                bondId: bond_id,
                type: order_type,
                quantity: qty,
                limitPrice: price,
                filled: 0,
                createdAt: Date.now()
            };

            // Try to match immediately
            this.matchBondOrder(order);

            // If unfilled, add to order book
            if (order.filled < order.quantity) {
                this.gameState.bondOrders.push(order);
                this.logTransaction(`${p?.name || 'Bank'} placed bond ${order_type} order: ${order.quantity - order.filled} @ $${price}`, 0);
            }

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Cancel bond order
        if (type === 'cancel_bond_order') {
            const { player_id, order_id } = payload;
            const orderIndex = this.gameState.bondOrders.findIndex(o => o.id === order_id && (o.playerId === player_id || (player_id === 'BANK' && o.playerId === 'BANK')));
            if (orderIndex === -1) {
                sender.send(JSON.stringify({ type: 'error', message: 'Order not found' }));
                return;
            }

            this.gameState.bondOrders.splice(orderIndex, 1);
            const p = this.gameState.players.find(p => p.id === player_id);
            this.logTransaction(`${p?.name || 'Bank'} cancelled bond order`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== BUTTON WIRING =====

        // GO PRESS (pay-only, no tick)
        if (type === 'pass_go') {
            const { player_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (!p) return;

            const bank = this.gameState.bank;

            // Step 1: GO salary - comes from NOWHERE (game mechanic, not bank)
            let baseGoAmount = this.gameState.settings.goPayout;
            let goAmount = baseGoAmount;

            const mode = this.gameState.settings.inflationMode || 'OFF';
            if (mode === 'STANDARD') {
                const stateSnapshot = this.getPublicState();
                const inflationRate = stateSnapshot.inflationRate || 0;
                goAmount = Math.floor(baseGoAmount * (1 + inflationRate));
            } else if (mode === 'CAPITALISTIC') {
                const passes = p.goPasses || 0;
                goAmount = Math.floor(baseGoAmount * Math.pow(1.10, passes));
            }

            p.balance += goAmount;
            p.goPasses = (p.goPasses || 0) + 1;

            // Bank cash NOT affected - GO salary is a game mechanic
            this.logTransaction(`${p.name} passed GO (+$${goAmount})`, goAmount);

            // Step 2: Process pay event FIRST (for existing loans)
            this.processPayEvent(p);

            // Step 2.5: Pay bond coupons
            this.payBondCoupons();
            this.matureBonds();

            // Step 3: Disburse Development loans AFTER payments
            // This way newly disbursed loans are due NEXT GO, not immediately
            this.disburseDevelopmentLoans(p);

            // Step 4: Update volState
            // CHOPPY only if truly unhealthy: negative equity AND not covered by loans, OR CB debt significantly exceeds loans out
            const equity = calcBankEquity(bank, this.gameState.properties);
            const loansCoverCbDebt = bank.cbDebtPrincipal === 0 || (bank.loansOutPrincipal > 0 && bank.loansOutPrincipal >= bank.cbDebtPrincipal * 0.9);  // 90% coverage = OK
            const cbDebtExceedsLoans = bank.cbDebtPrincipal > 0 && bank.loansOutPrincipal > 0 && bank.cbDebtPrincipal > bank.loansOutPrincipal * 1.2;  // CB debt > 120% of loans = risky
            const significantNegativeEquity = equity < 0 && !loansCoverCbDebt;  // Negative equity AND not covered = risky

            this.gameState.market.volState = (significantNegativeEquity || cbDebtExceedsLoans || bank.cash < 0) ? 'CHOPPY' : 'CALM';

            // Bailout check already done in processPayEvent() after bankPayCB()

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // END TURN (tick-only, no pay)
        if (type === 'end_turn') {
            const { player_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (!p) return;

            // Step 1: Increment turn
            p.turnIndex++;
            p.turns++;
            this.logTransaction(`${p.name} ended turn`, 0);

            // Step 2: Decrement Standard pending
            this.decrementStandardPending(p);

            // Step 3: Bank tick (pays CB interest, dividends)
            this.processBankTick();

            // Step 4: Process pending share orders
            this.processPendingShareOrders();

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // JAIL TURN (payment like GO but NO salary, tick like End Turn)
        if (type === 'jail_turn') {
            const { player_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (!p) return;

            this.logTransaction(`${p.name} took Jail Turn`, 0);

            // NO SALARY (unlike GO)

            // Step 1: Process loan payments (like GO)
            this.processPayEvent(p);

            // Step 2: Increment turn (like End Turn)
            p.turnIndex++;
            p.turns++;

            // Step 3: Decrement Standard pending
            this.decrementStandardPending(p);

            // Step 4: Bank tick
            this.processBankTick();

            // Step 5: Process pending share orders
            this.processPendingShareOrders();

            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== AUCTION STATUS POLLING =====

        // Get active auction status (for frontend polling)
        if (type === 'get_auctions') {
            // Check and end expired auctions first
            await this.checkActiveAuctions();

            // Return active auctions with time remaining
            const now = Date.now();
            const activeAuctions = this.gameState.auctions
                .filter(a => a.status === 'active')
                .map(a => ({
                    ...a,
                    time_left_ms: Math.max(0, a.end_time - now),
                    property: this.gameState.properties.find(p => p.id === a.property_id)
                }));

            sender.send(JSON.stringify({ type: 'auctions', payload: activeAuctions }));
            return;
        }

        // ===== PROPERTY (Fully Custom System) =====

        // Create a new custom property (any player can add)
        if (type === 'create_property') {
            const {
                name, price, colorGroup, colorHex,
                houseCost, hotelCost,
                rentBase, rent1House, rent2House, rent3House, rent4House, rentHotel,
                isRailroad, isUtility
            } = payload;

            // Validate required fields
            if (!name || !price || !colorGroup || !colorHex) {
                sender.send(JSON.stringify({ type: 'error', message: 'Missing required fields' }));
                return;
            }

            const newProperty: Property = {
                id: crypto.randomUUID(),
                name: String(name),
                price: Math.floor(Number(price) || 0),
                colorGroup: String(colorGroup),
                colorHex: String(colorHex),
                houseCost: Math.floor(Number(houseCost) || 0),
                hotelCost: Math.floor(Number(hotelCost) || 0),
                rentBase: Math.floor(Number(rentBase) || 0),
                rent1House: Math.floor(Number(rent1House) || 0),
                rent2House: Math.floor(Number(rent2House) || 0),
                rent3House: Math.floor(Number(rent3House) || 0),
                rent4House: Math.floor(Number(rent4House) || 0),
                rentHotel: Math.floor(Number(rentHotel) || 0),
                ownerId: null,  // Always FOR SALE initially
                isMortgaged: false,
                improvements: 0,
                isRailroad: Boolean(isRailroad),
                isUtility: Boolean(isUtility)
            };

            this.gameState.properties.push(newProperty);
            this.logTransaction(`Property created: ${name} in ${colorGroup} ($${newProperty.price})`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Delete a property (only unowned properties can be deleted)
        if (type === 'delete_property') {
            const { property_id } = payload;
            const prop = this.gameState.properties.find(p => p.id === property_id);

            if (!prop) return;
            if (prop.ownerId) {
                sender.send(JSON.stringify({ type: 'error', message: 'Cannot delete owned property' }));
                return;
            }

            this.gameState.properties = this.gameState.properties.filter(p => p.id !== property_id);
            this.logTransaction(`Property deleted: ${prop.name}`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Buy property from bank (unowned property)
        if (type === 'buy_property') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            // Can buy from bank (MONOBANK_OWNER_ID) or unowned (null), but not from players
            if (prop.ownerId && prop.ownerId !== MONOBANK_OWNER_ID) {
                sender.send(JSON.stringify({ type: 'error', message: 'Property owned by another player' }));
                return;
            }

            const inflationRate = this.getInflationRate();
            const inflatedPrice = Math.floor(prop.price * (1 + inflationRate));

            if (p.balance < inflatedPrice) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${inflatedPrice}, have $${p.balance}` }));
                return;
            }

            // 20% of purchase goes to bank, 80% "goes to game" (disappears)
            const bankCut = Math.floor(inflatedPrice * 20 / 100);
            p.balance -= inflatedPrice;
            this.gameState.bank.cash += bankCut;
            prop.ownerId = p.id;

            this.logTransaction(`${p.name} bought ${prop.name} for $${inflatedPrice}`, inflatedPrice);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Sell property to bank (at base price, minus mortgage if mortgaged)
        if (type === 'sell_property_to_bank') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (prop.ownerId !== p.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not your property' }));
                return;
            }
            if (prop.improvements > 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'Demolish buildings first' }));
                return;
            }

            // Calculate sale price: base price minus mortgage if mortgaged
            const inflationRate = this.getInflationRate();
            const inflatedPrice = Math.floor(prop.price * (1 + inflationRate));
            const mortgageValue = Math.floor(inflatedPrice / 2);  // 50% of price
            const wasMortgaged = prop.isMortgaged;
            let salePrice = inflatedPrice;

            if (wasMortgaged) {
                // If mortgaged, player gets price minus mortgage (which bank already paid)
                salePrice = inflatedPrice - mortgageValue;
            }

            // Bank required to buy at base price (but only pays difference if mortgaged)
            // Bank now OWNS this property (it's an asset, not FOR SALE)
            p.balance += salePrice;
            this.gameState.bank.cash -= salePrice;
            prop.ownerId = MONOBANK_OWNER_ID;  // Bank owns it now (counts as asset)
            prop.isMortgaged = false;  // Clear mortgage status

            if (wasMortgaged) {
                this.logTransaction(`${p.name} sold mortgaged ${prop.name} to bank for $${salePrice} (price $${inflatedPrice} - mortgage $${mortgageValue})`, salePrice);
            } else {
                this.logTransaction(`${p.name} sold ${prop.name} to bank for $${salePrice}`, salePrice);
            }
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Mortgage property (bank pays mortgage value)
        if (type === 'mortgage_property') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (prop.ownerId !== p.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not your property' }));
                return;
            }
            if (prop.isMortgaged) {
                sender.send(JSON.stringify({ type: 'error', message: 'Already mortgaged' }));
                return;
            }
            if (prop.improvements > 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'Demolish buildings first' }));
                return;
            }

            const inflationRate = this.getInflationRate();
            const mortgageValue = getMortgageValue(prop, inflationRate);
            p.balance += mortgageValue;
            this.gameState.bank.cash -= mortgageValue;
            prop.isMortgaged = true;

            this.logTransaction(`${p.name} mortgaged ${prop.name} for $${mortgageValue}`, mortgageValue);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Unmortgage property
        if (type === 'unmortgage_property') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (prop.ownerId !== p.id) return;
            if (!prop.isMortgaged) return;

            const inflationRate = this.getInflationRate();
            const cost = getUnmortgageCost(prop, inflationRate);
            if (p.balance < cost) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${cost}` }));
                return;
            }

            p.balance -= cost;
            this.gameState.bank.cash += cost;
            prop.isMortgaged = false;

            this.logTransaction(`${p.name} unmortgaged ${prop.name}`, cost);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== REAL-TIME PROPERTY AUCTIONS =====

        // Start auction for property (unowned starts at $10, owned at desired price)
        if (type === 'start_auction') {
            const { player_id, property_id, starting_price } = payload;
            const prop = this.gameState.properties.find(p => p.id === property_id);

            if (!prop) {
                sender.send(JSON.stringify({ type: 'error', message: 'Property not found' }));
                return;
            }

            // Check if already in auction
            const existingAuction = this.gameState.auctions.find(a => a.property_id === property_id && a.status === 'active');
            if (existingAuction) {
                sender.send(JSON.stringify({ type: 'error', message: 'Property already in auction' }));
                return;
            }

            let sellerId: string | 'BANK' | null = null;
            let startingBid = 10;  // Default for unowned

            const inflationRate = this.getInflationRate();
            const inflatedPrice = Math.floor(prop.price * (1 + inflationRate));

            if (prop.ownerId === null) {
                // Unowned property - starts at $10
                sellerId = null;
                startingBid = 10;
            } else if (prop.ownerId === MONOBANK_OWNER_ID) {
                // Bank-owned property - starts at desired price
                sellerId = 'BANK';
                startingBid = Math.max(10, Math.floor(Number(starting_price) || inflatedPrice));
            } else {
                // Player-owned property - must be owner to auction
                if (prop.ownerId !== player_id) {
                    sender.send(JSON.stringify({ type: 'error', message: 'Not your property' }));
                    return;
                }
                if (prop.improvements > 0) {
                    sender.send(JSON.stringify({ type: 'error', message: 'Demolish buildings first' }));
                    return;
                }
                sellerId = prop.ownerId;
                startingBid = Math.max(10, Math.floor(Number(starting_price) || inflatedPrice));
            }

            // Create 60-second auction
            const durationMs = 60000;  // 60 seconds
            const now = Date.now();
            const auction: Auction = {
                id: crypto.randomUUID(),
                property_id: prop.id,
                seller_id: sellerId,
                starting_bid: startingBid,
                current_bid: startingBid - 1,  // Starts below minimum so first bid must be >= starting_bid
                current_bidder_id: null,
                end_time: now + durationMs,
                created_at: now,
                duration_ms: durationMs,
                bids: [],
                status: 'active',
                winner_id: null
            };

            this.gameState.auctions.push(auction);

            const sellerName = sellerId === null ? 'Bank' : sellerId === 'BANK' ? 'MonoBank' : this.gameState.players.find(p => p.id === sellerId)?.name || 'Unknown';
            this.logTransaction(`Auction started: ${prop.name} (${sellerName}) - Starting bid $${startingBid}`, 0);

            // Start auction timer (check every second)
            this.startAuctionTimer(auction.id);

            this.broadcast({ type: 'auction_started', payload: auction });
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Place bid on auction
        if (type === 'place_bid') {
            const { player_id, auction_id, bid_amount } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const auction = this.gameState.auctions.find(a => a.id === auction_id);

            if (!p || !auction) {
                sender.send(JSON.stringify({ type: 'error', message: 'Invalid auction or player' }));
                return;
            }

            if (auction.status !== 'active') {
                sender.send(JSON.stringify({ type: 'error', message: 'Auction not active' }));
                return;
            }

            const now = Date.now();
            if (now >= auction.end_time) {
                // Auction expired - end it
                await this.endAuction(auction.id);
                sender.send(JSON.stringify({ type: 'error', message: 'Auction has ended' }));
                return;
            }

            const bid = Math.floor(Number(bid_amount) || 0);

            // Minimum bid: starting bid (if no bids yet) or current bid + increment
            let minBid: number;
            if (auction.current_bidder_id === null) {
                // No bids yet - must bid at least starting bid
                minBid = auction.starting_bid;
            } else {
                // Bids exist - must bid higher (5% increment or $10 minimum)
                minBid = auction.current_bid + Math.max(10, Math.floor(auction.current_bid * 5 / 100));
            }

            if (bid < minBid) {
                sender.send(JSON.stringify({ type: 'error', message: `Minimum bid is $${minBid}` }));
                return;
            }

            if (p.balance < bid) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${bid}, have $${p.balance}` }));
                return;
            }

            // Can't bid on your own auction
            if (auction.seller_id === p.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Cannot bid on your own auction' }));
                return;
            }

            // Refund previous bidder if any
            if (auction.current_bidder_id) {
                const prevBidder = this.gameState.players.find(pl => pl.id === auction.current_bidder_id);
                if (prevBidder) {
                    prevBidder.balance += auction.current_bid;  // Refund previous bid
                }
            }

            // Reserve new bid
            p.balance -= bid;

            // Update auction
            auction.current_bid = bid;
            auction.current_bidder_id = p.id;
            auction.bids.push({
                player_id: p.id,
                amount: bid,
                timestamp: now
            });

            // Reset timer to 10 seconds after each bid (everyone participates, 10s countdown)
            auction.end_time = now + 10000;  // Always reset to 10 seconds from now after each bid

            this.logTransaction(`${p.name} bid $${bid} on ${this.gameState.properties.find(pr => pr.id === auction.property_id)?.name}`, bid);

            // Broadcast bid update to all players
            this.broadcast({ type: 'auction_bid', payload: { auction_id, bidder_id: p.id, bid_amount: bid, end_time: auction.end_time } });
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Build house (need full color group, 4 houses before hotel)
        if (type === 'build_house') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (prop.ownerId !== p.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not your property' }));
                return;
            }
            if (prop.isRailroad || prop.isUtility) {
                sender.send(JSON.stringify({ type: 'error', message: 'Cannot build on railroads/utilities' }));
                return;
            }
            if (prop.isMortgaged) {
                sender.send(JSON.stringify({ type: 'error', message: 'Property is mortgaged' }));
                return;
            }
            if (!ownsFullColorGroup(p.id, prop.colorGroup, this.gameState.properties)) {
                sender.send(JSON.stringify({ type: 'error', message: 'Need full color group to build' }));
                return;
            }
            if (prop.improvements >= 5) {
                sender.send(JSON.stringify({ type: 'error', message: 'Already has hotel (max)' }));
                return;
            }

            // Determine cost
            const inflationRate = this.getInflationRate();
            const isHotel = prop.improvements === 4;
            const cost = Math.floor((isHotel ? prop.hotelCost : prop.houseCost) * (1 + inflationRate));

            if (p.balance < cost) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${cost}` }));
                return;
            }

            // 20% of build cost goes to bank
            const bankCut = Math.floor(cost * 20 / 100);
            p.balance -= cost;
            this.gameState.bank.cash += bankCut;
            prop.improvements++;

            const buildingType = prop.improvements >= 5 ? 'hotel' : 'house';
            this.logTransaction(`${p.name} built ${buildingType} on ${prop.name}`, cost);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Demolish house/hotel (50% back, 20% of that deducted from bank)
        if (type === 'demolish_building') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (prop.ownerId !== p.id) return;
            if (prop.improvements <= 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'No buildings to demolish' }));
                return;
            }

            // Determine refund
            const inflationRate = this.getInflationRate();
            const wasHotel = prop.improvements >= 5;
            const originalCost = Math.floor((wasHotel ? prop.hotelCost : prop.houseCost) * (1 + inflationRate));
            const refund = Math.floor(originalCost * 50 / 100);
            const bankDeduction = Math.floor(refund * 20 / 100);

            // Player gets 50% back (from game)
            p.balance += refund;
            // Bank loses 20% of that refund
            this.gameState.bank.cash -= bankDeduction;
            prop.improvements--;

            const buildingType = wasHotel ? 'hotel' : 'house';
            this.logTransaction(`${p.name} demolished ${buildingType} on ${prop.name} (+$${refund})`, 0);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Pay rent to property owner
        if (type === 'pay_rent') {
            const { player_id, property_id, dice_roll } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);

            if (!p || !prop) return;
            if (!prop.ownerId || prop.ownerId === p.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'No rent owed' }));
                return;
            }

            const owner = this.gameState.players.find(o => o.id === prop.ownerId);
            if (!owner) return;

            const inflationRate = this.getInflationRate();
            const rent = calculateRent(prop, this.gameState.properties, this.gameState.settings.noDoubleRentOnFullSet, dice_roll, inflationRate);

            if (rent <= 0) {
                sender.send(JSON.stringify({ type: 'error', message: 'No rent due (mortgaged)' }));
                return;
            }

            if (p.balance < rent) {
                sender.send(JSON.stringify({ type: 'error', message: `Need $${rent}, have $${p.balance}` }));
                return;
            }

            p.balance -= rent;

            // Check for company dividend split
            const company = this.gameState.companies?.find(c => c.propertySetId === prop.colorGroup);
            if (company && company.dividendPct > 0 && company.sharesOutstanding > 0) {
                const dividendPool = Math.floor(rent * company.dividendPct / 100);
                const ownerKeeps = rent - dividendPool;

                // Owner gets their non-dividend portion
                owner.balance += ownerKeeps;

                // Distribute dividend pool proportionally to all shareholders
                let distributed = 0;
                const shareholders: { player: any, shares: number }[] = [];
                for (const pl of this.gameState.players) {
                    const shares = (pl.shares?.[company.propertySetId] || 0);
                    if (shares > 0) {
                        shareholders.push({ player: pl, shares });
                    }
                }

                for (let i = 0; i < shareholders.length; i++) {
                    const sh = shareholders[i];
                    let payout: number;
                    if (i === shareholders.length - 1) {
                        // Last shareholder gets remainder to avoid rounding errors
                        payout = dividendPool - distributed;
                    } else {
                        payout = Math.floor(dividendPool * sh.shares / company.sharesOutstanding);
                    }
                    if (payout > 0) {
                        sh.player.balance += payout;
                        distributed += payout;
                    }
                }

                // If no shareholders at all, owner gets everything
                if (shareholders.length === 0) {
                    owner.balance += dividendPool;
                }

                if (dividendPool > 0 && shareholders.length > 0) {
                    this.logTransaction(`${prop.colorGroup} Corp: $${dividendPool} dividends from $${rent} rent (${company.dividendPct}%)`, dividendPool);
                }
            } else {
                // No company or no dividend - owner gets full rent
                owner.balance += rent;
            }

            // Log with details for utilities (dice roll)
            if (prop.isUtility && dice_roll) {
                const ownedUtils = this.gameState.properties.filter(pr => pr.isUtility && pr.ownerId === prop.ownerId).length;
                const multiplier = ownedUtils >= 2 ? 10 : 4;
                this.logTransaction(`${p.name} paid $${rent} rent to ${owner.name} for ${prop.name} (rolled ${dice_roll} Ã— ${multiplier})`, rent);
            } else if (prop.isRailroad) {
                const ownedRailroads = this.gameState.properties.filter(pr => pr.isRailroad && pr.ownerId === prop.ownerId).length;
                this.logTransaction(`${p.name} paid $${rent} rent to ${owner.name} for ${prop.name} (${ownedRailroads} railroads owned)`, rent);
            } else {
                this.logTransaction(`${p.name} paid $${rent} rent to ${owner.name} for ${prop.name}`, rent);
            }
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // Transfer property between players
        if (type === 'transfer_property') {
            const { from_player_id, to_player_id, property_id, price } = payload;
            const fromPlayer = this.gameState.players.find(p => p.id === from_player_id);
            const toPlayer = this.gameState.players.find(p => p.id === to_player_id);
            const prop = this.gameState.properties.find(pr => pr.id === property_id);
            const salePrice = Math.floor(Number(price) || 0);

            if (!fromPlayer || !toPlayer || !prop) return;
            if (prop.ownerId !== fromPlayer.id) {
                sender.send(JSON.stringify({ type: 'error', message: 'Not your property' }));
                return;
            }
            if (salePrice > 0 && toPlayer.balance < salePrice) {
                sender.send(JSON.stringify({ type: 'error', message: `Buyer needs $${salePrice}` }));
                return;
            }

            // Transfer
            if (salePrice > 0) {
                toPlayer.balance -= salePrice;
                fromPlayer.balance += salePrice;
            }
            prop.ownerId = toPlayer.id;

            this.logTransaction(`${fromPlayer.name} transferred ${prop.name} to ${toPlayer.name}${salePrice > 0 ? ` for $${salePrice}` : ''}`, salePrice);
            this.broadcast({ type: 'state', payload: this.getPublicState() });
            await this.save();
        }

        // ===== TRADING (Updated for global properties) =====
        if (type === 'create_trade_offer') {
            const { from_player_id, to_player_id, offer_properties, offer_cash, offer_shares, offer_loans, request_properties, request_cash, request_shares, request_loans } = payload;
            const fromPlayer = this.gameState.players.find(p => p.id === from_player_id);
            const toPlayer = this.gameState.players.find(p => p.id === to_player_id);

            if (fromPlayer && toPlayer && from_player_id !== to_player_id) {
                const tradeOffer: TradeOffer = {
                    id: crypto.randomUUID(),
                    from_player_id,
                    to_player_id,
                    offer_properties: offer_properties || [],
                    offer_cash: Math.floor(Number(offer_cash) || 0),
                    offer_shares: offer_shares || {},
                    offer_loans: offer_loans || [],
                    request_properties: request_properties || [],
                    request_cash: Math.floor(Number(request_cash) || 0),
                    request_shares: request_shares || {},
                    request_loans: request_loans || [],
                    status: 'pending',
                    timestamp: Date.now()
                };
                this.gameState.tradeOffers.push(tradeOffer);
                const offerSummary = [
                    ...(tradeOffer.offer_properties.map(id => this.gameState.properties.find(p => p.id === id)?.name).filter(Boolean)),
                    tradeOffer.offer_cash > 0 ? `$${tradeOffer.offer_cash}` : null
                ].filter(Boolean).join(', ') || 'a trade';
                this.createAlert(to_player_id, 'trade_offer', `${fromPlayer.name} sent you ${offerSummary}`);
                this.logTransaction(`${fromPlayer.name} sent trade offer to ${toPlayer.name}`, 0);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'counter_trade') {
            const { trade_id, player_id, offer_properties, offer_cash, offer_shares, offer_loans, request_properties, request_cash, request_shares, request_loans } = payload;
            const originalTrade = this.gameState.tradeOffers.find(t => t.id === trade_id && t.status === 'pending');
            if (originalTrade && originalTrade.to_player_id === player_id) {
                // Mark original as rejected
                originalTrade.status = 'rejected';
                const fromPlayer = this.gameState.players.find(p => p.id === player_id);
                const toPlayer = this.gameState.players.find(p => p.id === originalTrade.from_player_id);
                if (fromPlayer && toPlayer) {
                    const counterOffer: TradeOffer = {
                        id: crypto.randomUUID(),
                        from_player_id: player_id,
                        to_player_id: originalTrade.from_player_id,
                        offer_properties: offer_properties || [],
                        offer_cash: Math.floor(Number(offer_cash) || 0),
                        offer_shares: offer_shares || {},
                        offer_loans: offer_loans || [],
                        request_properties: request_properties || [],
                        request_cash: Math.floor(Number(request_cash) || 0),
                        request_shares: request_shares || {},
                        request_loans: request_loans || [],
                        status: 'pending',
                        timestamp: Date.now()
                    };
                    this.gameState.tradeOffers.push(counterOffer);
                    this.createAlert(originalTrade.from_player_id, 'trade_offer', `${fromPlayer.name} sent a counter-offer`);
                    this.logTransaction(`${fromPlayer.name} counter-offered ${toPlayer.name}`, 0);
                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'accept_trade') {
            const { trade_id, player_id } = payload;
            const trade = this.gameState.tradeOffers.find(t => t.id === trade_id && t.status === 'pending');

            if (trade && trade.to_player_id === player_id) {
                const fromPlayer = this.gameState.players.find(p => p.id === trade.from_player_id);
                const toPlayer = this.gameState.players.find(p => p.id === trade.to_player_id);

                if (fromPlayer && toPlayer) {
                    // Transfer offered properties (from -> to)
                    for (const propId of (trade.offer_properties || [])) {
                        const prop = this.gameState.properties.find(p => p.id === propId);
                        if (prop && prop.ownerId === fromPlayer.id) {
                            prop.ownerId = toPlayer.id;
                        }
                    }
                    // Transfer requested properties (to -> from)
                    for (const propId of (trade.request_properties || [])) {
                        const prop = this.gameState.properties.find(p => p.id === propId);
                        if (prop && prop.ownerId === toPlayer.id) {
                            prop.ownerId = fromPlayer.id;
                        }
                    }
                    // Transfer cash
                    if ((trade.offer_cash || 0) > 0) {
                        fromPlayer.balance -= trade.offer_cash;
                        toPlayer.balance += trade.offer_cash;
                    }
                    if ((trade.request_cash || 0) > 0) {
                        toPlayer.balance -= trade.request_cash;
                        fromPlayer.balance += trade.request_cash;
                    }
                    // Transfer shares
                    for (const [companyId, qty] of Object.entries(trade.offer_shares || {})) {
                        if (qty > 0) {
                            const fromShares = (fromPlayer as any).shares || {};
                            const toShares = (toPlayer as any).shares || {};
                            const available = fromShares[companyId] || 0;
                            const transfer = Math.min(qty, available);
                            fromShares[companyId] = (fromShares[companyId] || 0) - transfer;
                            toShares[companyId] = (toShares[companyId] || 0) + transfer;
                            (fromPlayer as any).shares = fromShares;
                            (toPlayer as any).shares = toShares;
                        }
                    }
                    for (const [companyId, qty] of Object.entries(trade.request_shares || {})) {
                        if (qty > 0) {
                            const toShares = (toPlayer as any).shares || {};
                            const fromShares = (fromPlayer as any).shares || {};
                            const available = toShares[companyId] || 0;
                            const transfer = Math.min(qty, available);
                            toShares[companyId] = (toShares[companyId] || 0) - transfer;
                            fromShares[companyId] = (fromShares[companyId] || 0) + transfer;
                            (toPlayer as any).shares = fromShares;
                            (fromPlayer as any).shares = toShares;
                        }
                    }
                    // Transfer loans
                    for (const loanId of (trade.offer_loans || [])) {
                        const loanIdx = (fromPlayer as any).activeLoans?.findIndex((l: any) => l.id === loanId);
                        if (loanIdx !== undefined && loanIdx >= 0) {
                            const [loan] = (fromPlayer as any).activeLoans.splice(loanIdx, 1);
                            (toPlayer as any).activeLoans = (toPlayer as any).activeLoans || [];
                            (toPlayer as any).activeLoans.push(loan);
                        }
                    }
                    for (const loanId of (trade.request_loans || [])) {
                        const loanIdx = (toPlayer as any).activeLoans?.findIndex((l: any) => l.id === loanId);
                        if (loanIdx !== undefined && loanIdx >= 0) {
                            const [loan] = (toPlayer as any).activeLoans.splice(loanIdx, 1);
                            (fromPlayer as any).activeLoans = (fromPlayer as any).activeLoans || [];
                            (fromPlayer as any).activeLoans.push(loan);
                        }
                    }

                    trade.status = 'accepted';
                    this.createAlert(trade.from_player_id, 'trade_accepted', `${toPlayer.name} accepted your trade`);
                    this.logTransaction(`Trade completed between ${fromPlayer.name} and ${toPlayer.name}`, (trade.offer_cash || 0) + (trade.request_cash || 0));
                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'reject_trade') {
            const { trade_id, player_id } = payload;
            const trade = this.gameState.tradeOffers.find(t => t.id === trade_id && t.status === 'pending');
            if (trade && trade.to_player_id === player_id) {
                trade.status = 'rejected';
                this.createAlert(trade.from_player_id, 'trade_rejected', 'Trade rejected');
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'cancel_trade') {
            const { trade_id, player_id } = payload;
            const trade = this.gameState.tradeOffers.find(t => t.id === trade_id && t.status === 'pending');
            if (trade && trade.from_player_id === player_id) {
                trade.status = 'cancelled';
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== SELLING =====
        if (type === 'sell_to_bank') {
            const { player_id, property_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && p.properties) {
                const propIndex = p.properties.findIndex(prop => prop.id === property_id);
                if (propIndex !== -1) {
                    const property = p.properties[propIndex];
                    const salePrice = intPct(getBankAppraisal(property), MORTGAGE_RATE_PCT);
                    p.properties.splice(propIndex, 1);
                    p.balance += salePrice;
                    this.logTransaction(`${p.name} sold ${property.name} to bank`, salePrice);
                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'list_property') {
            const { player_id, property_id, price } = payload;
            const listPrice = Math.floor(Number(price) || 0);
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p && listPrice > 0 && p.properties) {
                const property = p.properties.find(prop => prop.id === property_id);
                if (property) {
                    const listing: PropertyListing = {
                        id: crypto.randomUUID(),
                        property_id,
                        seller_id: player_id,
                        price: listPrice,
                        listed_at: Date.now()
                    };
                    this.gameState.propertyListings.push(listing);
                    this.logTransaction(`${p.name} listed ${property.name} for $${listPrice}`, 0);
                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'buy_listed_property') {
            const { listing_id, buyer_id } = payload;
            const listing = this.gameState.propertyListings.find(l => l.id === listing_id);
            if (listing) {
                const seller = this.gameState.players.find(p => p.id === listing.seller_id);
                const buyer = this.gameState.players.find(p => p.id === buyer_id);
                if (seller && buyer && buyer.balance >= listing.price && seller.properties) {
                    const propIndex = seller.properties.findIndex(p => p.id === listing.property_id);
                    if (propIndex !== -1) {
                        const property = seller.properties[propIndex];
                        property.price = listing.price;
                        seller.properties.splice(propIndex, 1);
                        if (!buyer.properties) buyer.properties = [];
                        buyer.properties.push(property);
                        buyer.balance -= listing.price;
                        seller.balance += listing.price;
                        this.gameState.propertyListings = this.gameState.propertyListings.filter(l => l.id !== listing_id);
                        this.createAlert(listing.seller_id, 'property_sold', `${buyer.name} bought ${property.name}`);
                        this.logTransaction(`${buyer.name} bought ${property.name}`, listing.price);
                        this.broadcast({ type: 'state', payload: this.getPublicState() });
                        await this.save();
                    }
                }
            }
        }

        if (type === 'cancel_listing') {
            const { listing_id, player_id } = payload;
            const listing = this.gameState.propertyListings.find(l => l.id === listing_id && l.seller_id === player_id);
            if (listing) {
                this.gameState.propertyListings = this.gameState.propertyListings.filter(l => l.id !== listing_id);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== AUCTIONS (old handler removed - use start_auction instead) =====

        if (type === 'place_bid') {
            const { auction_id, bidder_id, bid_amount } = payload;
            const bidAmt = Math.floor(Number(bid_amount) || 0);
            const auction = this.gameState.auctions.find(a => a.id === auction_id && a.status === 'active');
            if (auction && Date.now() < auction.end_time) {
                const bidder = this.gameState.players.find(p => p.id === bidder_id);
                const minBid = auction.current_bid + 10;
                if (bidder && bidAmt >= minBid && bidder.balance >= bidAmt) {
                    if (auction.current_bidder_id) {
                        const prevBidder = this.gameState.players.find(p => p.id === auction.current_bidder_id);
                        if (prevBidder) {
                            prevBidder.balance += auction.current_bid;
                            this.createAlert(auction.current_bidder_id, 'auction_outbid', 'You were outbid!');
                        }
                    }
                    bidder.balance -= bidAmt;
                    auction.current_bid = bidAmt;
                    auction.current_bidder_id = bidder_id;
                    this.logTransaction(`${bidder.name} bid $${bidAmt}`, 0);
                    this.broadcast({ type: 'state', payload: this.getPublicState() });
                    await this.save();
                }
            }
        }

        if (type === 'end_auction') {
            const { auction_id } = payload;
            const auction = this.gameState.auctions.find(a => a.id === auction_id && a.status === 'active');
            if (auction && (Date.now() >= auction.end_time || payload.force)) {
                const seller = this.gameState.players.find(p => p.id === auction.seller_id);
                if (auction.current_bidder_id && seller && seller.properties) {
                    const winner = this.gameState.players.find(p => p.id === auction.current_bidder_id);
                    if (winner) {
                        const propIndex = seller.properties.findIndex(p => p.id === auction.property_id);
                        if (propIndex !== -1) {
                            const property = seller.properties[propIndex];
                            property.price = auction.current_bid;
                            seller.properties.splice(propIndex, 1);
                            if (!winner.properties) winner.properties = [];
                            winner.properties.push(property);
                            seller.balance += auction.current_bid;
                            this.createAlert(auction.current_bidder_id, 'auction_won', `You won ${property.name}!`);
                            this.logTransaction(`${winner.name} won auction for ${property.name}`, auction.current_bid);
                        }
                    }
                } else if (auction.current_bidder_id) {
                    const bidder = this.gameState.players.find(p => p.id === auction.current_bidder_id);
                    if (bidder) bidder.balance += auction.current_bid;
                }
                auction.status = 'ended';
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'cancel_auction') {
            const { auction_id, player_id } = payload;
            const auction = this.gameState.auctions.find(a => a.id === auction_id && a.seller_id === player_id && a.status === 'active');
            if (auction && !auction.current_bidder_id) {
                auction.status = 'cancelled';
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        if (type === 'mark_alert_read') {
            const { alert_id, player_id } = payload;
            const alert = this.gameState.alerts.find(a => a.id === alert_id && a.player_id === player_id);
            if (alert) {
                alert.read = true;
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== BANKRUPTCY =====
        if (type === 'bankrupt') {
            const { player_id } = payload;
            const p = this.gameState.players.find(p => p.id === player_id);
            if (p) {
                // Create a dummy loan to trigger bankruptcy handler
                const dummyLoan: Loan = {
                    id: 'bankruptcy',
                    type: 'EMERGENCY',
                    status: 'ACTIVE',
                    requestedAmount: 0,
                    principalRemaining: 0,
                    cbRateLockedBps: 0,
                    bankMarginLockedBps: 0,
                    finalRateLockedBps: 0,
                    accruedInterest: 0,
                    installmentsTotal: 1,
                    installmentsPaid: 0,
                    installmentPrincipal: 0,
                    emergencyDueNextPayEvent: false,
                    pendingTurnsRemaining: 0,
                    pendingUntilGo: false,
                    misses: 0,
                    createdAt: Date.now()
                };
                this.handleBankruptcy(p, dummyLoan);
                this.logTransaction(`${p.name} declared BANKRUPTCY!`, 0);
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            }
        }

        // ===== HOST REWIND =====
        if (type === 'rewind_to_snapshot') {
            const { player_id, snapshot_id } = payload;
            const requester = this.gameState.players.find(p => p.id === player_id);
            if (!requester || !requester.isHost) {
                sender.send(JSON.stringify({ type: 'error', message: 'Only host can rewind' }));
                return;
            }
            if (!this.gameState.stateHistory) {
                sender.send(JSON.stringify({ type: 'error', message: 'No history' }));
                return;
            }
            const snapshotIndex = this.gameState.stateHistory.findIndex(s => s.id === snapshot_id);
            if (snapshotIndex === -1) {
                sender.send(JSON.stringify({ type: 'error', message: 'Snapshot not found' }));
                return;
            }
            const snapshot = this.gameState.stateHistory[snapshotIndex];
            try {
                const restoredState = JSON.parse(snapshot.state) as State;
                const newHistory = this.gameState.stateHistory.slice(snapshotIndex + 1);
                this.gameState = { ...restoredState, stateHistory: newHistory };
                this.gameState.transactions.unshift({
                    id: Math.random().toString(36).slice(2),
                    description: `HOST REWIND: "${snapshot.description}"`,
                    amount: 0,
                    timestamp: Date.now()
                });
                this.broadcast({ type: 'state', payload: this.getPublicState() });
                await this.save();
            } catch (err) {
                sender.send(JSON.stringify({ type: 'error', message: 'Failed to restore' }));
            }
        }
    }

    logTransaction(description: string, amount: number) {
        this.saveSnapshot(description);
        this.gameState.transactions.unshift({
            id: Math.random().toString(36).slice(2),
            description,
            amount,
            timestamp: Date.now()
        });
        this.gameState.transactions = this.gameState.transactions.slice(0, 50);
    }

    saveSnapshot(description: string) {
        const stateToSave = { ...this.gameState, stateHistory: [] };
        const snapshot: StateSnapshot = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            description,
            state: JSON.stringify(stateToSave)
        };
        if (!this.gameState.stateHistory) this.gameState.stateHistory = [];
        this.gameState.stateHistory.unshift(snapshot);
        this.gameState.stateHistory = this.gameState.stateHistory.slice(0, 20);
    }


    async save() {
        await this.state.storage.put("gameState", this.gameState);
    }

    createAlert(player_id: string, type: string, message: string) {
        this.gameState.alerts.unshift({
            id: crypto.randomUUID(),
            type,
            message,
            player_id,
            timestamp: Date.now(),
            read: false
        });
        this.gameState.alerts = this.gameState.alerts.slice(0, 50);
    }
}

