import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mic, Dumbbell } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { startListening } from '../services/speech';

const WorkoutLogScreen: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
    const { activityLogs, logWorkout, language, t } = usePatientContext();
    const [type, setType] = useState('');
    const [mins, setMins] = useState('');

    const [isTracking, setIsTracking] = useState(false);
    const [steps, setSteps] = useState(0);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        let interval: any;
        if (isTracking) {
            startTimeRef.current = Date.now();
            // Simulate real-time tracking if no sensors, or assume mobile usage
            // For now, we simulate "live" steps counter
            interval = setInterval(() => {
                setSteps(s => s + Math.floor(Math.random() * 3));
            }, 2000);

            // In a real mobile app, we would use:
            // window.addEventListener('devicemotion', handleMotion);
        } else {
            if (startTimeRef.current && steps > 0) {
                // Auto log on stop
                const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000));
                if (confirm(`Tracking stopped. Log ${steps} steps walk for ${duration} mins?`)) {
                    logWorkout({ id: Date.now().toString(), type: 'Walking (Live)', durationMinutes: duration, intensity: 'medium', timestamp: Date.now(), steps: steps });
                }
                setSteps(0);
                startTimeRef.current = null;
            }
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTracking, steps, logWorkout]);

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
            <div className="flex items-center gap-3 mb-2">
                {!embedded && <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm text-slate-900 active:scale-90"><ChevronLeft size={20} /></button>}
                <h2 className="text-xl font-black text-slate-900 uppercase">{t.vitality_lab}</h2>
            </div>

            {/* Live Tracker */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl relative overflow-hidden">
                <div className="relative z-10 text-center space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">{t.edge_inference_active}</h3>
                    <div className="text-6xl font-black tabular-nums tracking-tighter">{steps}</div>
                    <p className="text-[9px] font-bold uppercase text-slate-400">{t.steps_detected}</p>

                    <button onClick={() => setIsTracking(!isTracking)} className={`w-full py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all ${isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-100 hover:bg-emerald-100 border-2 border-emerald-500'}`}>
                        {isTracking ? t.stop_sync : t.initialize_sensor}
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="relative">
                    <input className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder={t.activity_placeholder} value={type} onChange={e => setType(e.target.value)} />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            startListening(language, setType);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all"
                    >
                        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event("start-global-dictation")); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={18} /></span>
                    </button>
                </div>
                <div className="relative">
                    <input type="number" className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder={t.duration_placeholder} value={mins} onChange={e => setMins(e.target.value)} />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            startListening(language, setMins);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all"
                    >
                        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event("start-global-dictation")); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={18} /></span>
                    </button>
                </div>
                <button onClick={() => { if (type && mins) { logWorkout({ id: Date.now().toString(), type, durationMinutes: Number(mins), intensity: 'medium', timestamp: Date.now() }); setType(''); setMins(''); } }} className="w-full bg-blue-600 text-slate-900 font-black py-6 rounded-xl shadow-xl active:scale-95 text-[11px] uppercase italic tracking-wider">{t.log_effort || "Log Effort"}</button>
            </div>

            <div className="space-y-3">
                {activityLogs.map(w => (
                    <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Dumbbell size={18} /></div>
                            <div>
                                <p className="font-black text-slate-900 text-[12px] uppercase">{w.type}</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(w.timestamp).toLocaleTimeString()} {w.steps ? `• ${w.steps} Steps` : ''}</p>
                            </div>
                        </div>
                        <span className="font-black text-slate-900 text-[12px]">{w.durationMinutes}m</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkoutLogScreen;
