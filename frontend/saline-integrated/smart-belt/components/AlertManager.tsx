import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Bell, X, Zap } from 'lucide-react';
import { SmartBeltTelemetry, RiskAnalysisResult } from '../types';

interface HealthAlert {
    id: string;
    patientName: string;
    type: string;
    severity: 'warning' | 'critical';
    timestamp: number;
}

const AlertManager: React.FC = () => {
    const [alerts, setAlerts] = useState<HealthAlert[]>([]);
    const [isMuted, setIsMuted] = useState(false);

    const playSiren = useCallback(() => {
        if (isMuted) return;
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // "Hospital Alert" sound: sliding pitch
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } catch (e) {
            console.error("Audio failed", e);
        }
    }, [isMuted]);

    const addAlert = useCallback((name: string, type: string, severity: 'warning' | 'critical') => {
        const id = Math.random().toString(36).substr(2, 9);
        setAlerts(prev => [{ id, patientName: name, type, severity, timestamp: Date.now() }, ...prev].slice(0, 5));
        if (severity === 'critical') {
            playSiren();
        }
    }, [playSiren]);

    // Expose addAlert to window for global access (simplest for this architecture)
    useEffect(() => {
        (window as any).triggerHealthAlert = addAlert;
        return () => { delete (window as any).triggerHealthAlert; };
    }, [addAlert]);

    const removeAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    if (alerts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full animate-fade-in-up">
            {alerts.map(alert => (
                <div
                    key={alert.id}
                    className={`p-4 rounded-2xl shadow-2xl border flex gap-4 transition-all ${alert.severity === 'critical'
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${alert.severity === 'critical' ? 'bg-white/20' : 'bg-rose-50 text-rose-600'
                        }`}>
                        <Zap size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className={`text-sm font-bold truncate ${alert.severity === 'critical' ? 'text-white' : 'text-slate-900'}`}>
                                {alert.patientName}
                            </h4>
                            <button onClick={() => removeAlert(alert.id)} className="opacity-60 hover:opacity-100 p-1">
                                <X size={14} />
                            </button>
                        </div>
                        <p className={`text-xs mt-0.5 ${alert.severity === 'critical' ? 'text-rose-100' : 'text-slate-500'}`}>
                            {alert.type} Detected
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlertManager;
