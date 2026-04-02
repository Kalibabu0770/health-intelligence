import React, { useState, useEffect } from 'react';
import { database } from '../services/firebaseConfig';
import { ref, onValue, set } from 'firebase/database';
import { Timer, AlertTriangle, Droplet, Play, RotateCcw, Plus, Minus } from 'lucide-react';

const DEVICE_ID = "BED-01"; // Hardcoded for this separate dashboard

const SalineDashboard: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
    const [isEmpty, setIsEmpty] = useState<boolean>(false);
    const [inputMin, setInputMin] = useState<number>(60);

    useEffect(() => {
        const statusRef = ref(database, `saline_status/${DEVICE_ID}`);
        const unsub = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.remaining_seconds !== undefined) setTimeLeft(data.remaining_seconds);
                if (data.is_empty !== undefined) setIsEmpty(data.is_empty);
            }
        });
        return () => unsub();
    }, []);

    const setTimer = (minutes: number) => {
        const seconds = minutes * 60;
        set(ref(database, `saline_status/${DEVICE_ID}/remaining_seconds`), seconds);
        // Also reset empty status if setting new time
        set(ref(database, `saline_status/${DEVICE_ID}/is_empty`), false);
    };

    const resetEmpty = () => {
        set(ref(database, `saline_status/${DEVICE_ID}/is_empty`), false);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <header className="w-full max-w-md mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
                        <Droplet size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Saline Monitor</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{DEVICE_ID}</p>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-md space-y-6">

                {/* STATUS CARD */}
                <div className={`relative bg-white rounded-3xl p-8 text-center shadow-xl shadow-slate-200/50 border-2 overflow-hidden transition-all duration-500
                    ${isEmpty ? 'border-rose-500 ring-4 ring-rose-100' : 'border-slate-100'}`}>

                    {isEmpty && (
                        <div className="absolute inset-0 bg-rose-500/10 animate-pulse z-0"></div>
                    )}

                    <div className="relative z-10">
                        {isEmpty ? (
                            <div className="animate-bounce">
                                <AlertTriangle size={64} className="mx-auto text-rose-500 mb-4" />
                                <h2 className="text-3xl font-black text-rose-600 mb-2">SALINE EMPTY!</h2>
                                <p className="text-rose-400 font-medium">Please replace the bag immediately.</p>
                                <button
                                    onClick={resetEmpty}
                                    className="mt-6 bg-rose-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-rose-500/30 hover:bg-rose-600 active:scale-95 transition-all"
                                >
                                    Dismiss Alert
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Time Remaining</div>
                                <div className="text-7xl font-black text-slate-800 tabular-nums tracking-tighter mb-4">
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    RUNNING
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTROLS */}
                {!isEmpty && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <Timer size={14} /> Set Timer
                        </h3>

                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setInputMin(Math.max(1, inputMin - 5))} className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <Minus size={20} />
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-3xl font-bold text-slate-800">{inputMin}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Minutes</div>
                            </div>
                            <button onClick={() => setInputMin(inputMin + 5)} className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>

                        <button
                            onClick={() => setTimer(inputMin)}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" /> Start / Update Timer
                        </button>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                            <button onClick={() => setTimer(15)} className="py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors">
                                15 Min
                            </button>
                            <button onClick={() => setTimer(30)} className="py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors">
                                30 Min
                            </button>
                            <button onClick={() => setTimer(60)} className="py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-colors">
                                60 Min
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SalineDashboard;
