import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { decompressProperties } from '../utils/qrCompression';

// SVG Icon
const CameraIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

interface PropertyScannerProps {
    onScanComplete: (data: any | any[]) => void;
    onClose: () => void;
}

export function PropertyScanner({ onScanComplete, onClose }: PropertyScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [useCamera, setUseCamera] = useState(true);

    // Camera handling
    useEffect(() => {
        if (!useCamera) return;

        let stream: MediaStream | null = null;
        let animationFrameId: number;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Wait for video to be ready
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        requestAnimationFrame(tick);
                    };
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Could not access camera. Please upload an image instead.");
                setUseCamera(false);
            }
        };

        const tick = () => {
            if (!videoRef.current || !canvasRef.current) return;

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        handleScan(code.data);
                        return; // Stop scanning loop on success
                    }
                }
            }
            animationFrameId = requestAnimationFrame(tick);
        };

        startCamera();

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            cancelAnimationFrame(animationFrameId);
        };
    }, [useCamera]);

    const handleScan = (data: string) => {
        try {
            // Pass raw string (could be JSON or Base64)
            const fullData = decompressProperties(data);

            // Basic validation
            if (Array.isArray(fullData) && fullData.length > 0) {
                onScanComplete(fullData);
                onClose();
            } else {
                setError("Invalid QR code format. Not a property list.");
            }
        } catch (e) {
            setError("Failed to parse QR code data.");
            console.error("Parse error:", e);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    handleScan(code.data);
                } else {
                    setError("No QR code found in image.");
                }
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="bottom-sheet-overlay" onClick={onClose}>
            <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle" />

                <div className="flex-between" style={{ marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Scan Property QR</h2>
                    <button onClick={onClose} className="btn-close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, padding: 0 }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <button
                        className={`btn ${useCamera ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setUseCamera(true); setError(null); }}
                        style={{ flex: 1 }}
                    >
                        <CameraIcon /> Camera
                    </button>
                    <label
                        className={`btn ${!useCamera ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                    >
                        <UploadIcon /> Upload
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            onClick={() => { setUseCamera(false); setError(null); }}
                        />
                    </label>
                </div>

                <div style={{ position: 'relative', background: '#000', borderRadius: 16, overflow: 'hidden', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                    {useCamera ? (
                        <>
                            <video
                                ref={videoRef}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
                                playsInline
                                muted
                            />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '200px',
                                height: '200px',
                                border: '2px solid rgba(255,255,255,0.8)',
                                borderRadius: 16,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                            }} />
                            <p style={{ position: 'absolute', bottom: 20, color: 'white', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20, fontSize: 13, backdropFilter: 'blur(4px)' }}>
                                Point camera at QR Code
                            </p>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                            <p>Upload a QR code image to scan</p>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(229, 75, 75, 0.15)', border: '1px solid rgba(229, 75, 75, 0.3)', color: 'var(--mono-red)', borderRadius: 12, fontSize: 13, textAlign: 'center' }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
