import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string | React.ReactNode;
    children: React.ReactNode;
    actions?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, actions }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
            backdropFilter: 'blur(4px)'
        }} onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget && onClose) {
                onClose();
            }
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: 500,
                margin: 0,
                maxHeight: '90vh',
                overflowY: 'auto',
                animation: 'slideUp 0.3s ease',
                position: 'relative',
                background: 'rgba(30, 41, 59, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                borderRadius: '16px'
            }} onClick={(e) => e.stopPropagation()}>
                <div className="flex-between mb-4" style={{ alignItems: 'center' }}>
                    {typeof title === 'string' ? <h2>{title}</h2> : <div style={{ flex: 1 }}>{title}</div>}
                    {onClose && typeof onClose === 'function' && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 28, cursor: 'pointer', padding: '0 8px', lineHeight: 1 }}>
                            &times;
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    {children}
                </div>

                {actions && (
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
