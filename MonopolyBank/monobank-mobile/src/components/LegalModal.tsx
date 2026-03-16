
interface LegalModalProps {
    onAccept: () => void;
}

export function LegalModal({ onAccept }: LegalModalProps) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div className="card" style={{
                width: 500,
                maxWidth: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'linear-gradient(145deg, rgba(26, 36, 56, 1) 0%, rgba(20, 28, 46, 1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ padding: '24px 24px 0' }}>
                    <h2 style={{ marginBottom: 8, fontSize: 24, background: 'linear-gradient(90deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome to MonoBank</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 24 }}>Compliance & Terms of Use</p>
                </div>

                <div style={{ padding: '0 24px 24px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>

                    <div className="mb-4">
                        <h3 style={{ color: 'white', marginBottom: 8 }}>1. Non-Affiliation Disclaimer</h3>
                        <p>
                            <strong>MonoBank</strong> is an unofficial companion tool designed to enhance gameplay.
                            It is <strong>not affiliated with, endorsed by, or sponsored by Hasbro, Inc., Mattel, Inc.,</strong> or any of their subsidiaries.
                            Monopoly® is a registered trademark of Hasbro, Inc.
                        </p>
                    </div>

                    <div className="mb-4">
                        <h3 style={{ color: 'white', marginBottom: 8 }}>2. Usage Policy</h3>
                        <p>
                            This application is a <strong>digital banking assistant</strong> meant to be used alongside physical board games.
                            It does not distribute illegal copies of any game, nor does it replace the need for the physical game board, cards, or pieces.
                        </p>
                    </div>

                    <div className="mb-4">
                        <h3 style={{ color: 'white', marginBottom: 8 }}>3. EU GDPR & Privacy (Data Protection)</h3>
                        <p>
                            We value your privacy and comply with European Union standards:
                        </p>
                        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                            <li><strong>No Personal Data:</strong> We do not collect names, emails, or personal identifiers.</li>
                            <li><strong>Ephemeral Data:</strong> Game data is stored temporarily in your browser and on our ephemeral workers. It is automatically cleared after inactivity.</li>
                            <li><strong>Cookies:</strong> We use local storage solely for game state persistence. No tracking cookies are used.</li>
                        </ul>
                    </div>

                    <div className="mb-4">
                        <h3 style={{ color: 'white', marginBottom: 8 }}>4. Terms of Agreement</h3>
                        <p>
                            By clicking "Accept & Enter", you acknowledge that you are using this tool for personal, non-commercial entertainment purposes and agree to the terms above.
                        </p>
                    </div>

                </div>

                <div style={{
                    padding: 24,
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        className="btn btn-primary"
                        onClick={onAccept}
                        style={{
                            padding: '12px 32px',
                            fontSize: 15,
                            borderRadius: 12,
                            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
                        }}
                    >
                        Accept & Enter
                    </button>
                </div>
            </div>
        </div>
    );
}
