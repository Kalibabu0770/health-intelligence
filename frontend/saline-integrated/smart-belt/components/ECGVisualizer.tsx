import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ECGVisualizerProps {
    dataPoint: number; // Single analog value streaming in
    leadsConnected?: boolean; // ECG electrodes connection status
}

const ECGVisualizer: React.FC<ECGVisualizerProps> = ({ dataPoint, leadsConnected = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dataBuffer = useRef<number[]>(new Array(200).fill(512)); // Initialize flat line (midpoint 1024/2 for 10-bit ADC)

    useEffect(() => {
        // Push new point
        dataBuffer.current.push(dataPoint);
        if (dataBuffer.current.length > 200) {
            dataBuffer.current.shift();
        }

        draw();
    }, [dataPoint]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Grid lines (Cosmetic)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // ECG Line
        ctx.beginPath();
        ctx.strokeStyle = leadsConnected ? '#ef4444' : '#94a3b8'; // Red when connected, gray when not
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        const step = width / dataBuffer.current.length;

        // Normalize 0-1024 to height
        // Inverting Y because canvas 0 is top
        dataBuffer.current.forEach((val, i) => {
            const y = height - ((val / 1024) * height);
            const x = i * step;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    };

    return (
        <div className="p-4 bg-white/80 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm relative">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Live ECG Rhythm (Lead I)</h3>
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full h-[150px] rounded-lg bg-slate-50 border border-slate-100"
                />

                {/* ECG Leads Disconnected Overlay */}
                {!leadsConnected && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-white">
                        <div className="animate-pulse mb-3">
                            <AlertTriangle size={48} className="text-rose-400" />
                        </div>
                        <div className="text-lg font-black uppercase tracking-wide">ECG ELECTRODES NOT CONNECTED</div>
                        <div className="text-sm opacity-75 mt-2 max-w-md text-center">
                            Please attach ECG pads to patient's chest to monitor heart rhythm
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ECGVisualizer;
