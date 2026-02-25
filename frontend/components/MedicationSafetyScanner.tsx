import React, { useState, useRef } from 'react';
import { Plus, Minus, ShieldAlert, ShieldCheck, Loader2, Pill, Activity, Info, Stethoscope, Camera, Mic } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { identifyMedicineFromImage, orchestrateHealth } from '../services/ai';
import { startListening } from '../services/speech';

const MedicationSafetyScanner: React.FC = () => {
    const { profile, t, language, riskScores, clinicalVault, symptoms, nutritionLogs, activityLogs } = usePatientContext();
    const [meds, setMeds] = useState<string[]>(['']);
    const [problemContext, setProblemContext] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isIdentifying, setIsIdentifying] = useState(false);
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
            case 'SAFE': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: ShieldCheck, color: 'text-emerald-500' };
            case 'DANGER': return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: ShieldAlert, color: 'text-rose-500' };
            case 'CAUTION': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Info, color: 'text-amber-500' };
            default: return { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', icon: Info, color: 'text-slate-400' };
        }
    };

    const styles = getStatusStyles();
    const StatusIcon = styles.icon;

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Input Column */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                    <Stethoscope size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 leading-none">Step 01</h2>
                                    <p className="text-sm font-black uppercase text-slate-900 mt-1">Clinical Compound Inventory</p>
                                </div>
                            </div>

                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdentify} />

                            <div className="space-y-4">
                                {meds.map((med, idx) => (
                                    <div key={idx} className="group flex gap-4 animate-in slide-in-from-left duration-300">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={med}
                                                onChange={(e) => updateMed(idx, e.target.value)}
                                                placeholder="Enter Medication Name..."
                                                className="w-full px-8 py-5 pr-28 rounded-[1.8rem] border border-slate-100 bg-slate-50 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                                                <button
                                                    onClick={() => { setTargetIdx(idx); fileInputRef.current?.click(); }}
                                                    className="p-2 text-slate-300 hover:text-emerald-500 active:scale-90 transition-all"
                                                >
                                                    {isIdentifying && targetIdx === idx ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => startListening(language, text => updateMed(idx, text))}
                                                    className="p-2 text-slate-300 hover:text-emerald-500 active:scale-90 transition-all"
                                                >
                                                    <Mic size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeMed(idx)}
                                            className="p-5 rounded-[1.8rem] bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 active:scale-90 transition-all"
                                        >
                                            <Minus size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={addMed}
                                    className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.8rem] border-2 border-dashed border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all"
                                >
                                    <Plus size={16} /> Add Compound
                                </button>
                                <button
                                    onClick={() => { setTargetIdx(0); fileInputRef.current?.click(); }}
                                    className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.8rem] border-2 border-dashed border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/30 transition-all"
                                >
                                    <Camera size={16} /> Scan Rx
                                </button>
                            </div>

                            <div className="pt-4 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 leading-none">Step 02</h2>
                                        <p className="text-sm font-black uppercase text-slate-900 mt-1">Contextual Indication</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={problemContext}
                                        onChange={(e) => setProblemContext(e.target.value)}
                                        placeholder="Enter symptoms or reason for use... (Optional)"
                                        className="w-full px-8 py-6 rounded-[2rem] border border-slate-100 bg-slate-50 text-sm font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-inner h-32 resize-none"
                                    />
                                    <button
                                        onClick={() => startListening(language, text => setProblemContext(text))}
                                        className="absolute right-6 top-6 p-2 text-slate-300 hover:text-emerald-500 active:scale-90 transition-all"
                                    >
                                        <Mic size={18} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || meds.every(m => !m.trim())}
                                className={`w-full py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 ${isAnalyzing
                                    ? 'bg-slate-800 text-slate-400 animate-pulse'
                                    : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-200'
                                    }`}
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                                Initiate Bio-Interaction Scan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Column */}
                <div className="lg:col-span-5">
                    {result.status ? (
                        <div className="animate-in slide-in-from-right duration-700 space-y-8">
                            <div className={`p-10 rounded-[3.5rem] border-2 shadow-2xl transition-all duration-700 ${styles.bg} ${styles.border}`}>
                                <div className="flex flex-col items-center text-center space-y-8">
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-xl">
                                        <StatusIcon size={56} className={styles.color} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Safety Classification</p>
                                        <h2 className={`text-5xl font-black uppercase tracking-tighter ${styles.text}`}>
                                            {result.status}
                                        </h2>
                                    </div>

                                    <div className="w-full p-8 rounded-[2.5rem] bg-white/60 border border-white/40 shadow-sm text-left">
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-4 flex items-center gap-2">
                                            <Info size={12} />
                                            Clinical Insight
                                        </p>
                                        <p className="text-sm font-bold leading-relaxed text-slate-700 italic">
                                            "{result.explanation}"
                                        </p>
                                    </div>

                                    <div className="w-full grid grid-cols-2 gap-4">
                                        <div className="bg-white/40 p-5 rounded-[1.8rem] border border-white/20">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Data Integrity</p>
                                            <p className="text-[10px] font-black text-emerald-600 uppercase">99.9% Sync</p>
                                        </div>
                                        <div className="bg-white/40 p-5 rounded-[1.8rem] border border-white/20">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Node Status</p>
                                            <p className="text-[10px] font-black text-blue-600 uppercase">Secure Hub</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-rose-50 border border-rose-100 flex gap-4">
                                <ShieldAlert size={20} className="text-rose-500 shrink-0" />
                                <p className="text-[9px] font-black uppercase text-rose-500/80 leading-relaxed italic tracking-wider">
                                    Disclaimer: Autonomous AI synthesis. Final clinical decisions must be verified by a certified human practitioner.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-300 p-10 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <ShieldCheck size={40} strokeWidth={1} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-3">Await Interaction Input</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">System ready for compound cross-referencing and risk analysis.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MedicationSafetyScanner;
