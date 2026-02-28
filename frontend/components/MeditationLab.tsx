import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Wind } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const MeditationLab: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
    const { t, logMeditation, meditationLogs } = usePatientContext();
    const [mins, setMins] = useState(10);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const timerRef = useRef<any>(null);

    const startTimer = () => {
        setTimeLeft(mins * 60);
        setIsActive(true);
    };

    const stopTimer = () => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play chime sound
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch (e) { console.warn("Audio play blocked"); }

            logMeditation({
                id: Date.now().toString(),
                durationMinutes: mins,
                timestamp: Date.now()
            });
            alert(t.session_complete || "Meditation Session Complete");
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isActive, timeLeft, logMeditation, mins, t.session_complete]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
            <div className="flex items-center gap-3">
                {!embedded && <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm text-slate-900 active:scale-90"><ChevronLeft size={20} /></button>}
                <h2 className="text-xl font-black text-slate-900 uppercase">{t.mindfulness_lab || "Mindfulness Lab"}</h2>
            </div>

            <div className="bg-white text-slate-900 p-10 rounded-xl shadow-2xl text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Wind size={120} /></div>

                {isActive ? (
                    <div className="space-y-6 relative z-10">
                        <div className="text-7xl font-black tabular-nums tracking-tighter text-emerald-400">{formatTime(timeLeft)}</div>
                        <button onClick={stopTimer} className="w-full py-5 bg-slate-100 hover:bg-slate-100 rounded-xl font-black uppercase text-xs border border-slate-100 transition-all active:scale-95">{t.cancel_session}</button>
                    </div>
                ) : (
                    <div className="space-y-6 relative z-10">
                        <div className="flex flex-col items-center gap-2">
                            <h3 className="text-xl font-black">{t.meditation_timer || "Meditation Timer"}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.select_duration}</p>
                        </div>

                        <div className="flex justify-center gap-4">
                            {[5, 10, 15, 20].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMins(m)}
                                    className={`w-14 h-14 rounded-xl flex items-center justify-center font-black transition-all ${mins === m ? 'bg-emerald-100 text-slate-900 shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        <button onClick={startTimer} className="w-full py-6 bg-emerald-100 text-slate-900 rounded-xl font-black uppercase text-xs shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
                            {t.start_meditation || "Start Session"}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">{t.recent_sessions}</h3>
                <div className="space-y-3">
                    {meditationLogs && meditationLogs.length > 0 ? (
                        meditationLogs.slice(0, 5).map(m => (
                            <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2.5 rounded-xl text-emerald-600 shadow-sm"><Wind size={18} /></div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-slate-900">{t.focus_session}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(m.timestamp).toLocaleDateString()} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-slate-900">{m.durationMinutes}m</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-[9px] font-black text-slate-300 uppercase text-center py-4">{t.no_sessions_logged}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MeditationLab;
