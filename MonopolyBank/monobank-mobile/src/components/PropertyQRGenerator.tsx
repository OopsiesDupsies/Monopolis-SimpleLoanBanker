import { useRef, useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';
import { compressProperties } from '../utils/qrCompression';

interface PropertyQRGeneratorProps {
    properties: any[];
    onClose: () => void;
}

export function PropertyQRGenerator({ properties, onClose }: PropertyQRGeneratorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [qrModules, setQrModules] = useState<{ dots: any[], finders: any[] }>({ dots: [], finders: [] });
    const [qrSize, setQrSize] = useState(0);

    // Serialize properties to JSON string
    const payload = compressProperties(properties);

    const logoUrl = "/smallhatlogo.png";

    // Helper for Robust Rounded Rectangles (Canvas API polyfill)
    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    };

    useEffect(() => {
        // Generate QR Code Data w/ High Error Correction
        const qr = QRCodeLib.create(payload, { errorCorrectionLevel: 'H' });
        const modules = qr.modules;

        const dots: any[] = [];
        const finders: any[] = [];
        const size = modules.size;
        setQrSize(size);

        // Calculate Logo Area (Quiet Zone)
        // Logo is 20%, Quiet Zone is 28% -> Gives ~1 module buffer on all sides
        const logoZoneSize = Math.floor(size * 0.28);
        const logoStart = Math.floor((size - logoZoneSize) / 2);
        const logoEnd = logoStart + logoZoneSize;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (modules.get(x, y)) {
                    // Check if (x,y) is part of a Finder Pattern (7x7 squares at corners)
                    const isTopLeft = x < 7 && y < 7;
                    const isTopRight = x >= size - 7 && y < 7;
                    const isBottomLeft = x < 7 && y >= size - 7;

                    // Check if (x,y) is inside the Logo Quiet Zone
                    const isLogoZone = x >= logoStart && x < logoEnd && y >= logoStart && y < logoEnd;

                    if (isTopLeft || isTopRight || isBottomLeft) {
                        finders.push({ x, y });
                    } else if (!isLogoZone) {
                        dots.push({ x, y });
                    }
                }
            }
        }
        setQrModules({ dots, finders });
    }, [payload]);

    const downloadQR = () => {
        const svg = svgRef.current;
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        const logoImg = new Image();

        logoImg.onload = () => {
            img.onload = () => {
                const padding = 40;
                const scale = 10;
                canvas.width = (qrSize * scale) + (padding * 2);
                canvas.height = (qrSize * scale) + (padding * 2);

                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw White Rounded Background
                    ctx.fillStyle = "white";
                    const bgRadius = 40;
                    drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, bgRadius);

                    ctx.fillStyle = "black";

                    // Draw Finders (Squares)
                    qrModules.finders.forEach((d: any) => {
                        ctx.fillRect(
                            (d.x * scale) + padding,
                            (d.y * scale) + padding,
                            scale,
                            scale
                        );
                    });

                    // Draw Dots (Rounded Squares)
                    qrModules.dots.forEach((d: any) => {
                        const x = (d.x * scale) + padding;
                        const y = (d.y * scale) + padding;
                        const size = scale;
                        const radius = scale * 0.3; // Rounded corner radius

                        drawRoundedRect(ctx, x + (scale * 0.05), y + (scale * 0.05), size * 0.9, size * 0.9, radius);
                    });

                    // Draw Logo (20% size)
                    const logoPixelSize = Math.floor(qrSize * 0.20) * scale;
                    const logoOffset = ((qrSize * scale) - logoPixelSize) / 2 + padding;
                    ctx.drawImage(logoImg, logoOffset, logoOffset, logoPixelSize, logoPixelSize);

                    const pngFile = canvas.toDataURL("image/png");
                    const downloadLink = document.createElement("a");
                    downloadLink.download = `monopoly-board-state-${Date.now()}.png`;
                    downloadLink.href = pngFile;
                    downloadLink.click();
                }
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
        };
        logoImg.src = logoUrl;
    };

    return (
        <div className="bottom-sheet-overlay" onClick={onClose}>
            <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle" />

                <div className="flex-between" style={{ marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Save Board State</h2>
                    <button onClick={onClose} className="btn-close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, padding: 0 }}>×</button>
                </div>

                <div style={{ background: 'white', padding: 20, borderRadius: 16, display: 'flex', justifyContent: 'center', marginBottom: 24, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                    {/* Custom SVG Renderer */}
                    {qrSize > 0 && (
                        <svg
                            ref={svgRef}
                            width="220"
                            height="220"
                            viewBox={`0 0 ${qrSize} ${qrSize}`}
                            style={{ maxWidth: '100%', height: 'auto' }}
                            shapeRendering="geometricPrecision"
                        >
                            <rect width="100%" height="100%" fill="white" />

                            {/* Finder Patterns (Squares) */}
                            {qrModules.finders?.map((d: any, i: number) => (
                                <rect
                                    key={`f-${i}`}
                                    x={d.x}
                                    y={d.y}
                                    width={1}
                                    height={1}
                                    fill="black"
                                    shapeRendering="crispEdges"
                                />
                            ))}

                            {/* Data Modules (Rounded Squares) */}
                            {qrModules.dots?.map((d: any, i: number) => (
                                <rect
                                    key={`d-${i}`}
                                    x={d.x + 0.05}     // Slight offset
                                    y={d.y + 0.05}
                                    width={0.9}        // 90% fill
                                    height={0.9}
                                    rx={0.25}          // Rounded corners
                                    fill="black"
                                />
                            ))}

                            {/* Center Logo in SVG (20% Size) */}
                            <image
                                href={logoUrl}
                                x={(qrSize - (Math.floor(qrSize * 0.20))) / 2}
                                y={(qrSize - (Math.floor(qrSize * 0.20))) / 2}
                                width={Math.floor(qrSize * 0.20)}
                                height={Math.floor(qrSize * 0.20)}
                            />
                        </svg>
                    )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>
                    Scan this QR code on another device to import the entire board state ({properties.length} properties).
                </p>

                <div style={{ display: 'grid', gap: 12 }}>
                    <button className="btn btn-primary" onClick={downloadQR}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Download Image
                    </button>
                    <button className="btn btn-ghost" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
