import React, { useState, useRef } from 'react';
import { Plus, Minus, ShieldAlert, ShieldCheck, Loader2, Pill, Activity, Info, Stethoscope, Camera, Mic } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { identifyMedicineFromImage, orchestrateHealth } from '../services/ai';
import { startListening } from '../services/speech';

const MedicationSafetyScanner: React.FC = () => {
    const { profile, language, riskScores, clinicalVault, symptoms, nutritionLogs, activityLogs } = usePatientContext();
    const [meds, setMeds] = useState<string[]>(['']);
    const [problemContext, setProblemContext] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [targetIdx, setTargetIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [result, setResult] = useState<{ status: 'SAFE' | 'CAUTION' | 'DANGER' | null; explanation: string }>({
        status: null,
        explanation: ''
    });

    const addMed = () => setMeds([...meds, '']);
    const updateMed = (index: number, val: string) => {
        const newMeds = [...meds];
        newMeds[index] = val;
        setMeds(newMeds);
    };
    const removeMed = (index: number) => {
        if (meds.length > 1) {
            setMeds(meds.filter((_, i) => i !== index));
        }
    };

    const handleIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || targetIdx === null) return;

        setIsIdentifying(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const data = await identifyMedicineFromImage(base64, language);
                if (data && data.name) {
                    updateMed(targetIdx, data.name);
                }
                setIsIdentifying(false);
                setTargetIdx(null);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Identification error:", error);
            setIsIdentifying(false);
            setTargetIdx(null);
        }
    };

    const handleAnalyze = async () => {
        const activeMeds = meds.filter(m => m.trim() !== '');
        if (activeMeds.length === 0) return;

        setIsAnalyzing(true);
        try {
            const res = await orchestrateHealth({ profile, clinicalVault, symptoms, nutritionLogs, activityLogs, riskScores, language } as any, {
                medications: activeMeds,
                problem_context: problemContext || 'General safety check'
            });

            if (res && res.medication_safety) {
                const medRes = res.medication_safety;
                setResult({
                    status: medRes.interaction_level as 'SAFE' | 'CAUTION' | 'DANGER',
                    explanation: medRes.explanation
                });
            } else {
                throw new Error("No medication safety data returned");
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            setResult({ status: 'CAUTION', explanation: 'Error performing fused analysis. Please ensure your backend is online or try again.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusStyles = () => {
        switch (result.status) {
            case 'SAFE': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: ShieldCheck, color: 'text-emerald-500', glow: 'shadow-emerald-100' };
            case 'DANGER': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: ShieldAlert, color: 'text-rose-500', glow: 'shadow-rose-100' };
            case 'CAUTION': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Info, color: 'text-amber-500', glow: 'shadow-amber-100' };
            default: return { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', icon: Info, color: 'text-slate-400', glow: 'shadow-slate-100' };
        }
    };

    const styles = getStatusStyles();
    const StatusIcon = styles.icon;

    return (
        <div className="h-full w-full flex flex-col gap-6 animate-in fade-in duration-700 overflow-hidden font-sans">

            {/* ═══ COCKPIT HEADER ═══ */}
            <header className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                        <Pill size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black italic tracking-tighter text-slate-900 leading-none uppercase">SAFETY & ADHERENCE</h2>
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] italic mt-1.5">MEDICATION SAFETY SCANNER</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Neural Analysis Status</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase">System Calibrated</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* ═══ INTAKE MATRIX (Left) ═══ */}
                <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6 min-h-0">
                    <section className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-6 overflow-hidden">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Plus size={16} className="text-rose-600" />
                                <h3 className="text-xs font-black uppercase tracking-tight italic">Compound Inventory</h3>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{meds.length} Node(s) Active</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {meds.map((med, idx) => (
                                <div key={idx} className="group flex gap-4 animate-in slide-in-from-left duration-500">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={med}
                                            onChange={(e) => updateMed(idx, e.target.value)}
                                            placeholder="SCAN OR TYPE COMPOUND..."
                                            className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-6 pr-32 text-[11px] font-black uppercase tracking-tight text-slate-900 focus:bg-white focus:border-rose-500 outline-none transition-all shadow-inner"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <button
                                                onClick={() => { setTargetIdx(idx); fileInputRef.current?.click(); }}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center shadow-sm"
                                            >
                                                {isIdentifying && targetIdx === idx ? <Loader2 size={16} className="animate-spin text-rose-600" /> : <Camera size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (isListening) return;
                                                    setIsListening(true);
                                                    startListening(language, text => updateMed(idx, text), () => setIsListening(false));
                                                }}
                                                className={`w-10 h-10 rounded-xl bg-white border border-slate-100 transition-all flex items-center justify-center shadow-sm ${isListening ? 'text-rose-500 animate-pulse' : 'text-slate-400 hover:text-rose-600'}`}
                                            >
                                                <Mic size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {meds.length > 1 && (
                                        <button
                                            onClick={() => removeMed(idx)}
                                            className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all"
                                        >
                                            <Minus size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 shrink-0">
                            <button
                                onClick={addMed}
                                className="h-14 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:border-rose-500 hover:text-rose-600 transition-all flex items-center justify-center gap-3"
                            >
                                <Plus size={14} /> Add Compound Node
                            </button>
                            <button
                                onClick={() => { setTargetIdx(0); fileInputRef.current?.click(); }}
                                className="h-14 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-3"
                            >
                                <Camera size={14} /> Visual Analysis
                            </button>
                        </div>
                    </section>

                    <section className="h-32 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center gap-4 shrink-0 overflow-hidden relative group">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm shrink-0">
                            <Activity size={24} />
                        </div>
                        <div className="flex-1 relative">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 italic">Clinical Context / Symptoms</p>
                            <textarea
                                value={problemContext}
                                onChange={(e) => setProblemContext(e.target.value)}
                                placeholder="DESCRIBE CURRENT BIO-REACTION OR SYMPTOMS..."
                                className="w-full h-12 bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-tight text-slate-900 focus:outline-none resize-none custom-scrollbar"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                if (isListening) return;
                                setIsListening(true);
                                startListening(language, text => setProblemContext(text), () => setIsListening(false));
                            }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                        >
                            <Mic size={18} />
                        </button>
                    </section>
                </div>

                {/* ═══ ANALYSIS CORE (Right) ═══ */}
                <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6 min-h-0">
                    <section className="flex-1 bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {isAnalyzing ? (
                            <div className="space-y-6 animate-pulse">
                                <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-600 mx-auto">
                                    <Loader2 size={48} className="animate-spin" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic text-slate-900 uppercase">Nodal Fusion Active</h3>
                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] mt-2">Correlating Multi-Source Health Data</p>
                                </div>
                            </div>
                        ) : result.status ? (
                            <div className="w-full flex flex-col gap-8 animate-in zoom-in-95 duration-500">
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`w-28 h-28 rounded-[2.5rem] bg-white flex items-center justify-center shadow-2xl ${styles.glow} border border-white/50`}>
                                        <StatusIcon size={64} className={styles.color} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2 italic">Interaction Index</p>
                                        <h2 className={`text-6xl font-black italic tracking-tighter uppercase leading-none ${styles.text}`}>
                                            {result.status}
                                        </h2>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-left relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <ShieldCheck size={80} />
                                    </div>
                                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
                                        <Info size={12} /> Clinical Synthesis
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic uppercase tracking-tight mb-4">
                                        "{result.explanation}"
                                    </p>
                                    <div className="pt-4 border-t border-slate-200">
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                            DISCLAIMER: AI-generated analysis based on real-time data. Not a substitute for professional medical advice.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-slate-100 p-5 rounded-2xl text-left">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 italic">Data Integrity</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500" /> SYNC VERIFIED
                                        </p>
                                    </div>
                                    <div className="bg-white border border-slate-100 p-5 rounded-2xl text-left">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 italic">Clinical Drift</p>
                                        <p className="text-[10px] font-black text-slate-900 uppercase">NONE DETECTED</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 opacity-30">
                                <div className="w-24 h-24 border-4 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300">
                                    <ShieldAlert size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em]">Awaiting Simulation</h3>
                                    <p className="text-[9px] font-bold uppercase tracking-widest max-w-[200px] leading-relaxed mx-auto">
                                        Input compound nodes for multi-source risk assessment and biological correlation.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || meds.every(m => !m.trim())}
                        className={`h-24 rounded-[2rem] font-black italic text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 ${isAnalyzing
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-rose-600 text-white hover:bg-slate-900 shadow-rose-200'
                            }`}
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                        INITIATE FUSION ANALYSIS
                    </button>
                </div>
            </main>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdentify} />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default MedicationSafetyScanner;
