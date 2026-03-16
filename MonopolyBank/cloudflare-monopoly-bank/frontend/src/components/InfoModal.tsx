
interface InfoModalProps {
    onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
    return (
        <div className="bottom-sheet-overlay" onClick={onClose} style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" onClick={e => e.stopPropagation()} style={{
                width: 450,
                maxWidth: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                padding: 0
            }}>
                <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Information</h2>
                    <button onClick={onClose} className="btn-close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, padding: 0, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ padding: 24 }}>

                    <div style={{ textAlign: 'center', marginBottom: 30 }}>
                        <img src="/smallhatlogo.png" alt="Logo" style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.9 }} />
                        <h3 style={{ color: 'white', fontSize: 18 }}>MonoBank</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Version 3.0.0</p>
                    </div>

                    <div className="mb-4">
                        <h4 style={{ color: 'var(--mono-gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>About</h4>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            MonoBank is a full-featured digital banker for property trading games.
                            It handles transactions, loans, auctions, property management, player-to-player trading,
                            and an optional corporate stock market — so you can focus on strategy.
                        </p>
                    </div>

                    <div className="mb-4">
                        <h4 style={{ color: 'var(--mono-blue)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Features</h4>
                        <ul style={{ fontSize: 14, color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.6 }}>
                            <li>Fast QR Code Game Sharing & Property Scanning</li>
                            <li>Automated Auctions & Player-to-Player Trading</li>
                            <li>Loan System with Credit Scoring</li>
                            <li>Corporate Stock Market with Dividends & Buybacks</li>
                            <li>Property Set Sale to Bank with Forced Share Buyback</li>
                            <li>Per-Company Stock Trading in Deals</li>
                            <li>Net Worth Tracking (Cash + Properties + Stocks)</li>
                            <li>Real-time Transaction History & Leaderboard</li>
                            <li>Vault for Secure Cash Storage</li>
                        </ul>
                    </div>

                    <div className="mb-4">
                        <h4 style={{ color: 'var(--mono-green)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Credits</h4>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            Designed & Developed for Monopolists worldwide.
                        </p>
                    </div>

                    <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        <p>Not affiliated with Hasbro or Mattel.</p>
                        <p>© {new Date().getFullYear()} MonoBank Project</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
