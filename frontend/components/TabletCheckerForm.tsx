import React, { useState, useRef } from 'react';
import { Camera, Mic, Trash2, Plus, Loader2 } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { identifyMedicineFromImage, analyzeTabletSafety } from '../services/ai';
import { startListening } from '../services/speech';

const TabletCheckerForm: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
    const context = usePatientContext();
    const { t, language } = context;
    const [medicines, setMedicines] = useState<string[]>(['']);
    const [problem, setProblem] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [isListeningSymptom, setIsListeningSymptom] = useState(false);
    const [isListeningMed, setIsListeningMed] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetIdx, setTargetIdx] = useState<number | null>(null);

    const handleIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && targetIdx !== null) {
            setIsIdentifying(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const res = await identifyMedicineFromImage(base64, language);
                if (res) updateMedicine(targetIdx, res.name);
                setIsIdentifying(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const addMedicine = () => setMedicines([...medicines, '']);
    const updateMedicine = (idx: number, val: string) => {
        const next = [...medicines];
        next[idx] = val;
        setMedicines(next);
    };
    const removeMedicine = (idx: number) => {
        if (medicines.length === 1) { updateMedicine(0, ''); return; }
        setMedicines(medicines.filter((_, i) => i !== idx));
    };

    const handleCheck = async () => {
        const activeMeds = medicines.filter(m => m.trim());
        if (activeMeds.length === 0 || !problem.trim()) return;
        setLoading(true);
        try {
            const res = await analyzeTabletSafety(context, activeMeds, problem);
            let status: 'SAFE' | 'CAUTION' | 'DANGER' = 'CAUTION';
            let summary = res;
            if (res.includes('[SAFE]')) { status = 'SAFE'; summary = res.replace('[SAFE]', '').trim(); }
            else if (res.includes('[DANGER]')) { status = 'DANGER'; summary = res.replace('[DANGER]', '').trim(); }
            else if (res.includes('[CAUTION]')) { status = 'CAUTION'; summary = res.replace('[CAUTION]', '').trim(); }
            setResult({ summary, status, id: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
            if (onRefresh) onRefresh();
        } catch (e) { alert(t.safety_node_offline || 'Safety node offline.'); } finally { setLoading(false); }
    };

    // ── RESULT VIEW ──
    if (result) {
        const isDanger = result.status === 'DANGER';
        const isSafe = result.status === 'SAFE';
        const statusColor = isDanger ? 'text-red-400' : isSafe ? 'text-emerald-400' : 'text-amber-400';
        const statusBg = isDanger ? 'bg-red-500/15' : isSafe ? 'bg-emerald-500/15' : 'bg-amber-500/15';
        const statusBdr = isDanger ? 'border-red-500/30' : isSafe ? 'border-emerald-500/30' : 'border-amber-500/30';
        const barColor = isDanger ? 'bg-red-500' : isSafe ? 'bg-emerald-500' : 'bg-amber-500';
        const barPct = isDanger ? 90 : isSafe ? 15 : 50;

        return (
            <div className="space-y-3 animate-in zoom-in-95 duration-300">
                <div className={`${statusBg} border ${statusBdr} rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusBg} border ${statusBdr}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${statusColor}`}>
                                {isDanger ? '⚠ DANGER' : isSafe ? '✓ SAFE' : '! CAUTION'}
                            </span>
                        </div>
                        <span className="text-[7px] font-bold text-slate-900/30 uppercase font-mono">{result.id}</span>
                    </div>
                    <div className="mb-3">
                        <div className="flex justify-between text-[7px] font-black uppercase text-slate-900/30 mb-1">
                            <span>Risk Level</span><span>{barPct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }} />
                        </div>
                    </div>
                    <p className={`text-[11px] font-bold leading-relaxed ${statusColor.replace('400', '200')}`}>
                        {result.summary}
                    </p>
                </div>
                <button
                    onClick={() => { setResult(null); setMedicines(['']); setProblem(''); }}
                    className="w-full py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-900/40 font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900/70 active:scale-95 transition-all"
                >
                    ↩ {t.new_scan || 'New Scan'}
                </button>
            </div>
        );
    }

    // ── INPUT VIEW ──
    return (
        <div className="space-y-4">
            <div>
                <p className="text-[8px] font-black text-slate-900/30 uppercase tracking-widest mb-2">{t.medicines_to_analyze || 'Medicines to Analyze'}</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-0.5">
                    {medicines.map((med, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 text-[8px] font-black flex items-center justify-center shrink-0 border border-emerald-500/30">{idx + 1}</span>
                            <div className="flex-1 relative">
                                <input
                                    className="w-full py-2.5 pl-3 pr-16 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all placeholder:text-slate-900/20 placeholder:text-[9px] placeholder:uppercase"
                                    placeholder={t.med_placeholder || 'Medicine name...'}
                                    onChange={e => updateMedicine(idx, e.target.value)}
                                    value={med}
                                />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
                                    <button
                                        onClick={() => { setTargetIdx(idx); fileInputRef.current?.click(); }}
                                        className="p-1.5 text-slate-900/20 hover:text-emerald-400 active:scale-90 transition-all rounded-lg hover:bg-emerald-500/10"
                                        title="Scan medicine from photo"
                                    >
                                        {isIdentifying && targetIdx === idx ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsListeningMed(idx);
                                            startListening(language, text => { updateMedicine(idx, text); setIsListeningMed(null); });
                                        }}
                                        className={`p-1.5 transition-all rounded-lg active:scale-90 ${isListeningMed === idx ? 'bg-emerald-500 text-white animate-pulse' : 'text-slate-900/20 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                        title="Voice input"
                                    >
                                        <Mic size={12} />
                                    </button>
                                </div>
                            </div>
                            {medicines.length > 1 && (
                                <button
                                    onClick={() => removeMedicine(idx)}
                                    className="p-1.5 text-slate-900/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    onClick={addMedicine}
                    className="w-full mt-2 py-2 rounded-xl bg-white/3 border border-dashed border-slate-100 text-slate-900/30 font-black text-[8px] uppercase hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-1.5"
                >
                    <Plus size={10} /> {t.add_medicine || 'Add Medicine'}
                </button>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdentify} />

            <div>
                <p className="text-[8px] font-black text-slate-900/30 uppercase tracking-widest mb-2">{t.chief_complaint_condition || 'Problem/Condition'}</p>
                <div className="relative">
                    <textarea
                        className="w-full py-3 pl-3 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all h-20 resize-none placeholder:text-slate-900/20 placeholder:text-[9px] placeholder:uppercase"
                        placeholder={t.chief_complaint_placeholder || 'Describe symptoms or condition...'}
                        value={problem}
                        onChange={e => setProblem(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            setIsListeningSymptom(true);
                            startListening(language, text => { setProblem(text); setIsListeningSymptom(false); });
                        }}
                        className={`absolute right-2 top-2.5 p-1.5 rounded-lg transition-all ${isListeningSymptom ? 'bg-emerald-500 text-white animate-pulse' : 'text-slate-900/20 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                    >
                        <Mic size={13} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                    onClick={handleCheck}
                    disabled={loading || medicines.filter(m => m.trim()).length === 0 || !problem.trim()}
                    className="col-span-2 py-4 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Analyze Safety'}
                </button>
            </div>
        </div>
    );
};

export default TabletCheckerForm;
