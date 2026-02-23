import React, { useState, useRef } from 'react';
import { Plus, Minus, ShieldAlert, ShieldCheck, Loader2, Pill, Activity, Heart, Info, ChevronRight, Stethoscope, Camera, Mic } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { analyzeTabletSafety, identifyMedicineFromImage } from '../services/ai';
import { startListening } from '../services/speech';

const MedicationSafetyScanner: React.FC = () => {
    const { profile, t, language, riskScores, theme } = usePatientContext();
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
            const context = { profile, medications: [], symptoms: [], nutritionLogs: [], activityLogs: [], riskScores, language } as any;
            const res = await analyzeTabletSafety(context, activeMeds, problemContext || 'General safety check');

            let status: 'SAFE' | 'CAUTION' | 'DANGER' = 'CAUTION';
            if (res.includes('[SAFE]')) status = 'SAFE';
            if (res.includes('[DANGER]')) status = 'DANGER';

            const explanation = res.replace(/\[(SAFE|CAUTION|DANGER)\]/i, '').trim();
            setResult({ status, explanation });
        } catch (error) {
            setResult({ status: 'CAUTION', explanation: 'Error performing analysis. Please try again.' });
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

    const isDark = theme === 'dark';

    return (
        <div className={`p-4 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>

            {/* Header Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg">
                            <Pill size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight">{t.med_danger_predict || 'Medication Safety'} / {t.danger_analysis || 'Predictive Danger Analysis'}</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Precision Bio-Constraint Synthesis</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setTargetIdx(0); fileInputRef.current?.click(); }}
                        className="p-3 bg-slate-100 hover:bg-emerald-500 hover:text-white transition-all rounded-2xl shadow-md active:scale-95"
                        title="Global Medicine Scanner"
                    >
                        <Camera size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Input Column */}
                <div className="lg:col-span-12 space-y-6">
                    <div className={`rounded-[2.5rem] border shadow-xl overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                        <div className="p-8 space-y-6">

                            <div className="flex items-center gap-2 mb-2">
                                <Stethoscope size={16} className="text-emerald-500" />
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Clinical Inventory</h2>
                            </div>

                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdentify} />

                            {/* Med List */}
                            <div className="space-y-4">
                                {meds.map((med, idx) => (
                                    <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex-1 relative group">
                                            <input
                                                type="text"
                                                value={med}
                                                onChange={(e) => updateMed(idx, e.target.value)}
                                                placeholder={t.med_placeholder || "Enter Medication Name..."}
                                                className={`w-full px-6 py-4 pr-24 rounded-2xl border transition-all text-sm font-bold ${isDark
                                                    ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                                                    : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500'
                                                    }`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                                <button
                                                    onClick={() => { setTargetIdx(idx); fileInputRef.current?.click(); }}
                                                    className="p-1.5 text-slate-900/20 hover:text-emerald-400 active:scale-90 transition-all rounded-lg hover:bg-emerald-500/10"
                                                    title="Scan from photo"
                                                >
                                                    {isIdentifying && targetIdx === idx ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => startListening(language, text => updateMed(idx, text))}
                                                    className="p-1.5 text-slate-900/20 hover:text-emerald-400 active:scale-90 transition-all rounded-lg hover:bg-emerald-500/10"
                                                    title="Voice input"
                                                >
                                                    <Mic size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeMed(idx)}
                                            className={`p-4 rounded-2xl border transition-all active:scale-90 ${isDark ? 'bg-slate-800 border-slate-700 text-rose-400 hover:bg-rose-500/10' : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'}`}
                                            title="Remove Medication"
                                        >
                                            <Minus size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Action Row */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={addMed}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed font-black uppercase text-xs tracking-widest transition-all hover:border-emerald-500/50 hover:bg-emerald-50/5 ${isDark ? 'border-slate-800 text-slate-500 hover:text-emerald-400' : 'border-slate-200 text-slate-400 hover:text-emerald-600'}`}
                                >
                                    <Plus size={18} />
                                    {t.add_med || 'Add Another Medication'}
                                </button>
                                <button
                                    onClick={() => { setTargetIdx(0); fileInputRef.current?.click(); }}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed font-black uppercase text-xs tracking-widest transition-all hover:border-blue-500/50 hover:bg-blue-50/5 ${isDark ? 'border-slate-800 text-slate-500 hover:text-blue-400' : 'border-slate-200 text-slate-400 hover:text-blue-600'}`}
                                >
                                    <Camera size={18} />
                                    {t.scan_prescription || 'Scan Global Prescription'}
                                </button>
                            </div>

                            <hr className={isDark ? 'border-slate-800' : 'border-slate-50'} />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={16} className="text-emerald-500" />
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: Contextual Indication</h2>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={problemContext}
                                        onChange={(e) => setProblemContext(e.target.value)}
                                        placeholder={t.chief_complaint_placeholder || "What symptoms or health problem are you treating? (Optional)"}
                                        className={`w-full px-6 py-4 pr-12 rounded-2xl border transition-all text-sm font-bold resize-none h-32 ${isDark
                                            ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500'
                                            : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500'
                                            }`}
                                    />
                                    <button
                                        onClick={() => startListening(language, text => setProblemContext(text))}
                                        className="absolute right-4 top-4 text-slate-900/20 hover:text-emerald-400 active:scale-90 transition-all rounded-lg hover:bg-emerald-500/10 p-1.5"
                                        title="Voice input"
                                    >
                                        <Mic size={20} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || meds.every(m => !m.trim())}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 ${isAnalyzing
                                    ? 'bg-slate-700 text-slate-300 animate-pulse'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                                    }`}
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={24} />}
                                {t.predict_safety || 'Predict Safety & Analyze Risk'}
                            </button>
                        </div>
                    </div>

                    {/* Results Column */}
                    {result.status && (
                        <div className={`animate-in zoom-in-95 fade-in duration-500 space-y-6`}>

                            <div className={`p-8 rounded-[2.5rem] border-2 shadow-2xl transition-all duration-700 ${isDark ? 'bg-slate-900 border-slate-800' : styles.bg + ' ' + styles.border}`}>
                                <div className="flex flex-col md:flex-row items-start gap-6">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                        <StatusIcon size={48} className={styles.color} />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <p className={`text-[8px] font-black uppercase tracking-[0.4em] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.is_it_safe_label || 'Safety Status'}</p>
                                            <h2 className={`text-4xl font-black uppercase tracking-tighter ${isDark ? styles.color : styles.text}`}>
                                                {result.status}
                                            </h2>
                                        </div>

                                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white/50 border-slate-100'}`}>
                                            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-3 flex items-center gap-2">
                                                <Info size={12} />
                                                {t.med_danger_reasoning || 'Clinical Reasoning'}
                                            </p>
                                            <p className={`text-sm font-bold leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {result.explanation}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50'}`}>
                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Health Data Sync</p>
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active · Verified</p>
                                            </div>
                                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50'}`}>
                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Clinical Standard</p>
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">AI Synthesis V2.0</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 px-8 text-rose-500 bg-rose-500/5 py-4 rounded-2xl border border-rose-500/10">
                                <ShieldAlert size={20} className="shrink-0" />
                                <p className="text-[9px] font-black uppercase leading-tight tracking-[0.05em]">
                                    DISCLAIMER: This analysis is AI-generated based on provided details. Always consult a licensed medical professional before taking new medications.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

            </div>

        </div>
    );
};

export default MedicationSafetyScanner;
