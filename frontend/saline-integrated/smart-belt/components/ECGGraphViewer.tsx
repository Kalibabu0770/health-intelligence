import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Pause, Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface ECGGraphViewerProps {
    deviceId?: string;
    patientName?: string;
}

interface ECGDataPoint {
    timestamp: number;
    value: number;
}

const ECGGraphViewer: React.FC<ECGGraphViewerProps> = ({ deviceId, patientName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [ecgData, setEcgData] = useState<ECGDataPoint[]>([]);
    const [heartRate, setHeartRate] = useState<number>(0);
    const [signalQuality, setSignalQuality] = useState<'good' | 'fair' | 'poor'>('good');
    const animationFrameRef = useRef<number>();
    const dataBufferSize = 500; // Number of points to display

    useEffect(() => {
        if (!deviceId) return;

        // TODO: Replace with real Firebase/Supabase realtime subscription
        // For now, simulate ECG waveform
        const interval = setInterval(() => {
            if (!isPaused) {
                generateSimulatedECG();
            }
        }, 20); // 50 Hz sampling rate

        return () => clearInterval(interval);
    }, [deviceId, isPaused]);

    useEffect(() => {
        if (!isPaused) {
            drawECG();
        }
    }, [ecgData, isPaused]);

    // Simulate ECG waveform (REPLACE WITH REAL DATA)
    const generateSimulatedECG = () => {
        const now = Date.now();

        // Generate realistic ECG pattern (PQRST wave)
        const t = (now % 1000) / 1000; // Normalize to 0-1 for one heartbeat cycle
        let value = 512; // Baseline

        // P wave (0-0.15)
        if (t < 0.1) {
            value += 20 * Math.sin(t * Math.PI / 0.1);
        }
        // QRS complex (0.15-0.25)
        else if (t >= 0.15 && t < 0.18) {
            value -= 30 * Math.sin((t - 0.15) * Math.PI / 0.03);
        }
        else if (t >= 0.18 && t < 0.21) {
            value += 150 * Math.sin((t - 0.18) * Math.PI / 0.03);
        }
        else if (t >= 0.21 && t < 0.25) {
            value -= 40 * Math.sin((t - 0.21) * Math.PI / 0.04);
        }
        // T wave (0.35-0.5)
        else if (t >= 0.35 && t < 0.5) {
            value += 40 * Math.sin((t - 0.35) * Math.PI / 0.15);
        }

        // Add small noise for realism
        value += (Math.random() - 0.5) * 5;

        setEcgData(prev => {
            const newData = [...prev, { timestamp: now, value }];
            if (newData.length > dataBufferSize) {
                return newData.slice(-dataBufferSize);
            }
            return newData;
        });

        // Simulate heart rate detection
        if (t < 0.05) {
            setHeartRate(70 + Math.floor(Math.random() * 10)); // Simulate 70-80 bpm
        }

        // Simulate signal quality
        setSignalQuality(Math.random() > 0.1 ? 'good' : Math.random() > 0.5 ? 'fair' : 'poor');
    };

    // Draw ECG waveform on canvas
    const drawECG = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        drawGrid(ctx, width, height);

        // Draw ECG waveform
        if (ecgData.length < 2) return;

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 3;

        ctx.beginPath();
        ecgData.forEach((point, index) => {
            const x = (index / dataBufferSize) * width;
            const y = height - ((point.value - 400) / 300) * height; // Normalize to canvas height

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
    };

    // Draw background grid
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;

        // Vertical lines
        const verticalSpacing = width / 20;
        for (let x = 0; x <= width; x += verticalSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        const horizontalSpacing = height / 10;
        for (let y = 0; y <= height; y += horizontalSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw centerline
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    if (!deviceId) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Device Connected</h3>
                <p className="text-gray-600">Link a Smart Belt device to view live ECG data</p>
            </div>
        );
    }

    return (
        <div className={`bg-gray-900 rounded-xl shadow-2xl overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Real-Time ECG Monitor
                        </h3>
                        {patientName && (
                            <p className="text-green-100 text-sm mt-1">Patient: {patientName}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Heart Rate */}
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <div className="text-green-100 text-xs mb-1">Heart Rate</div>
                            <div className="text-white text-2xl font-bold">{heartRate} <span className="text-sm">bpm</span></div>
                        </div>

                        {/* Signal Quality */}
                        <div className="bg-white/20 rounded-lg px-4 py-2">
                            <div className="text-green-100 text-xs mb-1">Signal Quality</div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${signalQuality === 'good' ? 'bg-green-400' :
                                        signalQuality === 'fair' ? 'bg-yellow-400' :
                                            'bg-red-400'
                                    } animate-pulse`} />
                                <span className="text-white text-sm font-medium capitalize">{signalQuality}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                title={isPaused ? 'Resume' : 'Pause'}
                            >
                                {isPaused ? (
                                    <Play className="w-5 h-5 text-white" />
                                ) : (
                                    <Pause className="w-5 h-5 text-white" />
                                )}
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                            >
                                {isFullscreen ? (
                                    <Minimize2 className="w-5 h-5 text-white" />
                                ) : (
                                    <Maximize2 className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ECG Canvas */}
            <div className="p-6">
                <canvas
                    ref={canvasRef}
                    width={isFullscreen ? 1600 : 1200}
                    height={isFullscreen ? 600 : 300}
                    className="w-full h-auto rounded-lg border border-gray-700"
                />

                {/* Paused Overlay */}
                {isPaused && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded-xl shadow-2xl p-6 flex items-center gap-3">
                            <Pause className="w-6 h-6 text-gray-700" />
                            <span className="text-lg font-semibold text-gray-900">Monitoring Paused</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="bg-gray-800 px-6 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-6 text-gray-400">
                    <div>
                        <span className="font-medium text-gray-300">Device:</span> {deviceId}
                    </div>
                    <div>
                        <span className="font-medium text-gray-300">Sampling Rate:</span> 50 Hz
                    </div>
                    <div>
                        <span className="font-medium text-gray-300">Lead:</span> Lead I
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-gray-400">Live</span>
                </div>
            </div>
        </div>
    );
};

export default ECGGraphViewer;
