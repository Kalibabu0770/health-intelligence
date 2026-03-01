import React, { useState, useRef } from 'react';
import {
    Pill, ClipboardList, Trash2, X, Camera, Mic, Check, Plus, Loader2,
    ShieldAlert, Info, ShieldCheck, Filter, ChevronRight, Clock, Activity
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { identifyMedicineFromImage } from '../services/ai';
import { startListening } from '../services/speech';
import {
    ResponsiveContainer, AreaChart, Area
} from 'recharts';

const MedsScreen: React.FC<{ initialTab?: 'registry' | 'safety', onBack?: () => void }> = ({ initialTab = 'registry', onBack }) => {
    const { medications, addMedication, removeMedication, t, language, riskScores } = usePatientContext();
    const [showAdd, setShowAdd] = useState(false);
    const [newMed, setNewMed] = useState({ drugName: '', dosage: '', times: ['08:00'], foodInstruction: 'none' as any, color: 'emerald' });
    const [isIdentifying, setIsIdentifying] = useState(false);
    const medPhotoRef = useRef<HTMLInputElement>(null);

    const handleMedPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsIdentifying(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const result = await identifyMedicineFromImage(base64, language);
                if (result) {
                    setNewMed(prev => ({ ...prev, drugName: result.name, dosage: result.dosage }));
                }
                setIsIdentifying(false);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-white font-sans animate-in fade-in duration-500">

            {/* ═══ STREAMLINED HEADER ═══ */}
            <div className="bg-white border-b border-slate-50 px-8 py-5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-11 h-11 bg-rose-600 rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
                        <Pill size={22} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-rose-600 uppercase tracking-[0.3em]">{t.bio_pharmacy || 'Integrated Bio-Pharmacy'}</p>
                        <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight leading-none mt-1">{t.medication_reminder || 'Medication Reminder'}</h1>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowAdd(true)} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 px-6 py-3 rounded-xl shadow-lg active:scale-95 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white border-2 border-slate-300 transition-colors">
                        <Plus size={14} /> {t.register_protocol || 'Register Protocol'}
                    </button>
                    {onBack && (
                        <button onClick={onBack} className="w-11 h-11 border border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-200 rounded-xl flex items-center justify-center transition-all">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar min-h-0 bg-transparent relative z-10">
                <div className="max-w-4xl mx-auto h-full w-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 pb-6">

                    {/* ═══ MEDICATION INVENTORY ═══ */}
                    <div className="w-full flex flex-col gap-6 h-full">
                        <div className="flex-1 bg-white/60  rounded-xl border border-white/80 shadow-sm overflow-hidden flex flex-col pt-6">
                            <div className="px-8 mb-5 flex justify-between items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.active_protocol || 'Active Protocols'}</h3>
                                <span className="bg-rose-500/10 text-rose-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">{medications.length} {t.rems || 'rems'}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-3">
                                {medications.length > 0 ? medications.map(med => (
                                    <div key={med.id} className="group relative bg-white/40 border border-slate-100 p-4 rounded-xl hover:border-rose-500/20 transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${med.color === 'red' ? 'bg-red-50 text-red-500 border-red-100' :
                                                med.color === 'blue' ? 'bg-emerald-50 text-blue-500 border-blue-100' :
                                                    med.color === 'green' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                        med.color === 'yellow' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                            med.color === 'purple' ? 'bg-purple-50 text-purple-500 border-purple-100' :
                                                                'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}>
                                                <Pill size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-black uppercase text-slate-900 leading-none mb-1.5">{med.drugName}</h4>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{med.dosage}</span>
                                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                    <span className="text-[9px] font-bold text-rose-500/60 uppercase tracking-widest">{med.times.length} {t.slots || 'Slots'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeMedication(med.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                                        <Pill size={40} strokeWidth={1.5} />
                                        <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em]">Registry Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ═══ MODAL (Compacted) ═══ */}
            {showAdd && (
                <div className="fixed inset-0 bg-white border-2 border-emerald-500/10  z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg p-8 rounded-xl shadow-2xl space-y-6 relative overflow-hidden border border-slate-100">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">{t.molecular_registration || 'Add Protocol'}</h3>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Initialize safety node</p>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={16} /></button>
                        </div>

                        <div className="space-y-5">
                            <div className="flex justify-between gap-2">
                                {['red', 'blue', 'green', 'yellow', 'purple'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewMed({ ...newMed, color })}
                                        className={`flex-1 h-9 rounded-xl transition-all relative ${color === 'red' ? 'bg-red-500' :
                                            color === 'blue' ? 'bg-blue-500' :
                                                color === 'green' ? 'bg-emerald-100' :
                                                    color === 'yellow' ? 'bg-yellow-400' : 'bg-purple-500'
                                            } ${newMed.color === color ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-40'}`}
                                    >
                                        {newMed.color === color && <Check size={14} className="mx-auto text-slate-900 stroke-[4]" />}
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <input className="w-full p-4 pr-20 bg-slate-50 border border-slate-100 rounded-xl font-black text-[12px] outline-none focus:border-rose-500 transition-all uppercase" placeholder="COMPOUND NAME" value={newMed.drugName} onChange={e => setNewMed({ ...newMed, drugName: e.target.value })} />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                                    <button onClick={() => medPhotoRef.current?.click()} className="w-8 h-8 flex items-center justify-center text-rose-500 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        {isIdentifying ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                    </button>
                                    <button onClick={() => startListening(language, text => setNewMed(p => ({ ...p, drugName: text })))} className="w-8 h-8 flex items-center justify-center text-rose-500 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={14} /></span>
                                    </button>
                                </div>
                                <input type="file" ref={medPhotoRef} className="hidden" accept="image/*" onChange={handleMedPhoto} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-[12px] outline-none focus:border-rose-500 uppercase" placeholder="DOSAGE (500MG)" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })} />
                                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-[12px] outline-none focus:border-rose-500 uppercase appearance-none" value={newMed.foodInstruction} onChange={e => setNewMed({ ...newMed, foodInstruction: e.target.value as any })}>
                                    <option value="none">NO FILTER</option>
                                    <option value="before">PRE-MEAL</option>
                                    <option value="after">POST-MEAL</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 tracking-widest">
                                    <span>slots</span>
                                    <button onClick={() => setNewMed({ ...newMed, times: [...newMed.times, '12:00'] })} className="text-rose-500 flex items-center gap-1">+ add node</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newMed.times.map((time, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                            <input type="time" className="bg-transparent font-black text-[11px] outline-none" value={time} onChange={e => {
                                                const next = [...newMed.times];
                                                next[i] = e.target.value;
                                                setNewMed({ ...newMed, times: next });
                                            }} />
                                            {newMed.times.length > 1 && <button onClick={() => setNewMed({ ...newMed, times: newMed.times.filter((_, idx) => idx !== i) })}><X size={12} className="text-rose-400" /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                addMedication(newMed);
                                setNewMed({ drugName: '', dosage: '', times: ['08:00'], foodInstruction: 'none', color: 'emerald' });
                                setShowAdd(false);
                                if (onBack) onBack();
                            }}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 active:scale-[0.98] transition-all"
                        >
                            EXECUTE PROTOCOL
                        </button>
                    </div>
                </div>
            )}

            {/* INTEGRITY FOOTER */}
            <div className="shrink-0 h-12 bg-white border-t border-slate-50 px-8 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center border border-rose-100"><ShieldCheck size={12} /></div>
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">{t.mol_integrity || 'Integrity verified'} <span className="text-slate-900 ml-2">v3.2.0</span></p>
                </div>
                <p className="text-[7px] font-black text-slate-200 uppercase tracking-[0.4em] italic leading-none pointer-events-none">LIFESHIELD PRECISION ENGINE</p>
            </div>

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
        </div>
    );
};

export default MedsScreen;
