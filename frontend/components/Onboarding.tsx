import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mic, Check, X, Plus, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { startListening } from '../services/speech';
import { UserProfile } from '../types';

export const INITIAL_PROFILE: UserProfile = {
    name: '', age: 0, gender: 'male', weight: 0,
    conditions: [],
    customConditions: [],
    surgeries: [],
    familyHistory: [],
    alcoholUsage: 'none', smoking: false,
    currentMedications: [], allergies: [],
    hasLiverDisease: false, hasKidneyDisease: false, hasDiabetes: false,
    hasHighBP: false, hasHeartDisease: false, hasAsthma: false,
    hasThyroid: false, hasGastric: false, hasBonePain: false, hasVisionIssues: false,
    isTribal: false,
    isPregnant: false,
    location: '',
    foodPreferences: [],
    habits: [],
    profession: '',
    workHoursPerDay: 8,
    workIntensity: 'moderate',
    role: 'citizen'
};

const Onboarding: React.FC<{ onComplete: (p: UserProfile) => Promise<void> }> = ({ onComplete }) => {
    const { language, t, profile } = usePatientContext();
    const [step, setStep] = useState(profile?.name ? 1.5 : 1);
    const [formData, setFormData] = useState<UserProfile>(profile || INITIAL_PROFILE);
    const [isFinishing, setIsFinishing] = useState(false);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData(profile);
            if (profile.name && step === 1) setStep(1.5);
        }
    }, [profile]);

    return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md min-h-[500px] rounded-xl p-8 sm:p-12 flex flex-col justify-center space-y-8 animate-in zoom-in-95 duration-500 shadow-xl border border-slate-200">
                <div className="text-center space-y-3">
                    <div className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 w-20 h-20 rounded-xl flex items-center justify-center mx-auto shadow-xl"><ShieldCheck size={40} /></div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase">{t.life_shield}</h1>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t.protocol_initialization || 'Protocol Initialization'}</p>
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in max-w-[320px] mx-auto w-full">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Full Identity Name"
                                className="w-full bg-slate-50 border border-slate-200 p-5 pr-12 rounded-xl font-black text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isListening) return;
                                    setIsListening(true);
                                    startListening(language, text => setFormData(p => ({ ...p, name: text })), () => setIsListening(false));
                                }}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                            >
                                <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={20} /></span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="Age"
                                    className="w-full bg-slate-50 border border-slate-200 p-5 rounded-xl font-black text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                                    value={formData.age || ''}
                                    onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setFormData(p => ({ ...p, age: parseInt(text.replace(/\D/g, '')) || p.age })), () => setIsListening(false));
                                    }}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={14} /></span>
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="Weight (kg)"
                                    className="w-full bg-slate-50 border border-slate-200 p-5 rounded-xl font-black text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                                    value={formData.weight || ''}
                                    onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setFormData(p => ({ ...p, weight: parseInt(text.replace(/\D/g, '')) || p.weight })), () => setIsListening(false));
                                    }}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={14} /></span>
                                </button>
                            </div>
                        </div>

                        <select
                            className="w-full bg-slate-50 border border-slate-200 p-5 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-emerald-500 transition-all appearance-none text-slate-500"
                            value={formData.gender}
                            onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                        >
                            <option value="male">Male Bio-Type</option>
                            <option value="female">Female Bio-Type</option>
                            <option value="other">Non-Binary Bio-Type</option>
                        </select>

                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Jurisdiction Pincode (e.g. 500001)"
                                className="w-full bg-slate-50 border border-slate-200 p-5 pr-12 rounded-xl font-black text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                                value={formData.location || ''}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        </div>

                        {formData.gender === 'female' && (
                            <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pregnancy Protocol</span>
                                <button
                                    onClick={() => setFormData({ ...formData, isPregnant: !formData.isPregnant })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.isPregnant ? 'bg-emerald-100' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPregnant ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (!formData.name) return alert("Enter Identity Name");
                                if (formData.age <= 0) return alert("Enter valid Age");
                                if (!formData.location) return alert("Enter Jurisdiction Pincode");
                                setStep(1.5);
                            }}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] tracking-[0.3em] shadow-xl active:scale-95 transition-all text-center"
                        >
                            Establish Basic Link
                        </button>
                    </div>
                )}

                {step === 1.5 && (
                    <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.chronic_conditions || 'Chronic Conditions'}</h3>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {[
                                { id: 'hasDiabetes', label: t.diabetes || 'Diabetes' },
                                { id: 'hasHighBP', label: t.hypertension || 'Hypertension' },
                                { id: 'hasLiverDisease', label: t.liver_disease || 'Liver Disease' },
                                { id: 'hasKidneyDisease', label: t.kidney_disease || 'Kidney Disease' },
                                { id: 'hasHeartDisease', label: t.heart_disease || 'Heart Disease' },
                                { id: 'hasAsthma', label: t.asthma || 'Asthma' },
                            ].map(condition => (
                                <button
                                    key={condition.id}
                                    onClick={() => setFormData({ ...formData, [condition.id]: !(formData as any)[condition.id] })}
                                    className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${(formData as any)[condition.id] ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                >
                                    {condition.label}
                                    {(formData as any)[condition.id] && <Check size={14} />}
                                </button>
                            ))}
                            {(formData.customConditions || []).map((cond, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                                    {cond}
                                    <button onClick={() => setFormData({ ...formData, customConditions: (formData.customConditions || []).filter((_, i) => i !== idx) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Other (e.g. Thyroid)"
                                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            setFormData({ ...formData, customConditions: [...(formData.customConditions || []), val] });
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                const val = input.value.trim();
                                if (val) {
                                    setFormData({ ...formData, customConditions: [...(formData.customConditions || []), val] });
                                    input.value = '';
                                }
                            }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
                        </div>

                        <button
                            onClick={() => setStep(1.6)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 1.6 && (
                    <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.family_history || 'Family History'}</h3>
                        <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.family_history_q || 'Is there history of disease in family?'}</p>

                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer', 'Asthma'].map(cond => (
                                <button
                                    key={cond}
                                    onClick={() => {
                                        const existing = formData.familyHistory || [];
                                        const next = existing.includes(cond) ? existing.filter(x => x !== cond) : [...existing, cond];
                                        setFormData({ ...formData, familyHistory: next });
                                    }}
                                    className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.familyHistory?.includes(cond) ? 'bg-emerald-50 border-blue-500 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                >
                                    {cond}
                                    {formData.familyHistory?.includes(cond) && <Check size={14} />}
                                </button>
                            ))}
                            {formData.familyHistory?.filter(c => !['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer', 'Asthma'].includes(c)).map((cond, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                                    {cond}
                                    <button onClick={() => setFormData({ ...formData, familyHistory: formData.familyHistory?.filter(x => x !== cond) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Other condition in family..."
                                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            setFormData({ ...formData, familyHistory: [...(formData.familyHistory || []), val] });
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                const val = input.value.trim();
                                if (val) {
                                    setFormData({ ...formData, familyHistory: [...(formData.familyHistory || []), val] });
                                    input.value = '';
                                }
                            }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
                        </div>

                        <button
                            onClick={() => setStep(1.7)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 1.7 && (
                    <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.surgical_history || 'Surgical History'}</h3>
                        <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.surgical_history_q || 'Have you undergone any surgeries?'}</p>

                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {['Appendix', 'Gallbladder', 'Hernia', 'C-Section', 'Heart Bypass', 'Knee Replacement'].map(surgery => (
                                <button
                                    key={surgery}
                                    onClick={() => {
                                        const existing = formData.surgeries || [];
                                        const next = existing.includes(surgery) ? existing.filter(x => x !== surgery) : [...existing, surgery];
                                        setFormData({ ...formData, surgeries: next });
                                    }}
                                    className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.surgeries?.includes(surgery) ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                >
                                    {surgery}
                                    {formData.surgeries?.includes(surgery) && <Check size={14} />}
                                </button>
                            ))}
                            {formData.surgeries?.filter(s => !['Appendix', 'Gallbladder', 'Hernia', 'C-Section', 'Heart Bypass', 'Knee Replacement'].includes(s)).map((surgery, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                                    {surgery}
                                    <button onClick={() => setFormData({ ...formData, surgeries: formData.surgeries?.filter(x => x !== surgery) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Other surgery or issue..."
                                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            setFormData({ ...formData, surgeries: [...(formData.surgeries || []), val] });
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                const val = input.value.trim();
                                if (val) {
                                    setFormData({ ...formData, surgeries: [...(formData.surgeries || []), val] });
                                    input.value = '';
                                }
                            }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
                        </div>

                        <button
                            onClick={() => setStep(1.72)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 1.72 && (
                    <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.allergies_title || 'Allergies'}</h3>
                        <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.allergies_q || 'Do you have any drug or food allergies?'}</p>

                        <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Peanuts', 'Dairy', 'Latex'].map(allergy => (
                                <button
                                    key={allergy}
                                    onClick={() => {
                                        const existing = formData.allergies || [];
                                        const next = existing.includes(allergy) ? existing.filter(x => x !== allergy) : [...existing, allergy];
                                        setFormData({ ...formData, allergies: next });
                                    }}
                                    className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.allergies?.includes(allergy) ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                >
                                    {allergy}
                                    {formData.allergies?.includes(allergy) && <Check size={14} />}
                                </button>
                            ))}
                            {formData.allergies?.filter(s => !['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Peanuts', 'Dairy', 'Latex'].includes(s)).map((allergy, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                                    {allergy}
                                    <button onClick={() => setFormData({ ...formData, allergies: formData.allergies?.filter(x => x !== allergy) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Other allergy..."
                                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            setFormData({ ...formData, allergies: [...(formData.allergies || []), val] });
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                const val = input.value.trim();
                                if (val) {
                                    setFormData({ ...formData, allergies: [...(formData.allergies || []), val] });
                                    input.value = '';
                                }
                            }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
                        </div>

                        <button
                            onClick={() => setStep(1.75)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 1.75 && (
                    <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Lifestyle & Habits</h3>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                            {[
                                { name: 'Kaini/Gutka', id: 'gutka' },
                                { name: 'Cigarettes', id: 'cigarettes' },
                                { name: 'Alcohol', id: 'alcohol' },
                                { name: 'Other Tobacco', id: 'tobacco' }
                            ].map(habit => (
                                <div key={habit.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                                    <p className="text-[10px] font-black uppercase text-slate-700">{habit.name}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['none', 'occasionally', 'daily'].map(freq => (
                                            <button
                                                key={freq}
                                                onClick={() => {
                                                    const existing = formData.habits?.filter(h => h.name !== habit.name) || [];
                                                    if (freq !== 'none') {
                                                        existing.push({ name: habit.name, frequency: freq as any });
                                                    }
                                                    setFormData({ ...formData, habits: existing });
                                                }}
                                                className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${(formData.habits?.find(h => h.name === habit.name)?.frequency || 'none') === freq
                                                    ? 'bg-emerald-100 border-2 border-emerald-500 text-slate-900 shadow-md'
                                                    : 'bg-white text-slate-400 border border-slate-100'
                                                    }`}
                                            >
                                                {freq}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Other habit (e.g. Soda)"
                                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                            setFormData({ ...formData, habits: [...(formData.habits || []), { name: val, frequency: 'daily' }] });
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                const val = input.value.trim();
                                if (val) {
                                    setFormData({ ...formData, habits: [...(formData.habits || []), { name: val, frequency: 'daily' }] });
                                    input.value = '';
                                }
                            }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
                        </div>

                        <button
                            onClick={() => setStep(1.8)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all mt-4 text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 1.8 && (
                    <div className="space-y-6 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Occupation & Labor</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t.profession_placeholder || 'Profession'}
                                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-xl font-bold"
                                    value={formData.profession || ''}
                                    onChange={e => setFormData({ ...formData, profession: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setFormData(p => ({ ...p, profession: text })), () => setIsListening(false));
                                    }}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={18} /></span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-slate-500">Daily Work Hours: {formData.workHoursPerDay}</p>
                                <input
                                    type="range"
                                    min="1" max="18"
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    value={formData.workHoursPerDay}
                                    onChange={e => setFormData({ ...formData, workHoursPerDay: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase text-slate-500">Workload Intensity</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'low', label: 'Low/Desk' },
                                        { id: 'moderate', label: 'Moderate' },
                                        { id: 'high', label: 'High/Physical' },
                                        { id: 'very_high', label: 'Extreme/Hard' }
                                    ].map(intensity => (
                                        <button
                                            key={intensity.id}
                                            onClick={() => setFormData({ ...formData, workIntensity: intensity.id as any })}
                                            className={`p-3 rounded-lg text-[8px] font-black uppercase border transition-all ${formData.workIntensity === intensity.id ? 'bg-emerald-100 border-2 border-emerald-500 text-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                        >
                                            {intensity.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.next_step || 'Next Step'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.dietary_preferences || 'Dietary Preferences'}</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'vegetarian', label: 'Vegetarian' },
                                    { key: 'vegan', label: 'Vegan' },
                                    { key: 'non_veg', label: 'Non-Veg' },
                                    { key: 'no_gluten', label: 'No Gluten' },
                                    { key: 'no_dairy', label: 'No Dairy' }
                                ].map(pref => (
                                    <button
                                        key={pref.key}
                                        onClick={() => {
                                            const current = formData.foodPreferences || [];
                                            const updated = current.includes(pref.label) ? current.filter(p => p !== pref.label) : [...current, pref.label];
                                            setFormData({ ...formData, foodPreferences: updated });
                                        }}
                                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${formData.foodPreferences?.includes(pref.label) ? 'bg-emerald-100 border-2 border-emerald-500 text-slate-900' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        {t[pref.key] || pref.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Other (e.g. Keto)"
                                    className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value.trim();
                                            if (val) {
                                                setFormData({ ...formData, foodPreferences: [...(formData.foodPreferences || []), val] });
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }
                                    }}
                                />
                                <button onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    if (input.value) {
                                        setFormData({ ...formData, foodPreferences: [...(formData.foodPreferences || []), input.value] });
                                        input.value = '';
                                    }
                                }} className="bg-emerald-100 border-2 border-emerald-500 text-slate-900 p-3 rounded-lg active:scale-95"><Plus size={14} /></button>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(3)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.establish_context || 'Establish Context'}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
                        <div className="bg-emerald-50 p-6 rounded-xl text-center space-y-3">
                            <h3 className="text-lg font-black text-emerald-900 uppercase">{t.clinical_safe || 'Clinical Safeguard'}</h3>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase leading-relaxed">{t.medical_context_note || 'This AI provides health observations based on your input. It does not replace professional medical advice.'}</p>
                        </div>
                        <button
                            onClick={() => setStep(4)}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all text-center"
                        >
                            {t.agree_continue || 'Agree & Continue'}
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8 animate-in zoom-in-95 text-center max-w-[300px] mx-auto w-full">
                        <CheckCircle2 className="text-emerald-500 mx-auto" size={80} strokeWidth={1} />
                        <h3 className="text-2xl font-black text-slate-900 uppercase">{t.node_ready || 'Guardian Node Ready'}</h3>
                        <button
                            onClick={async () => {
                                setIsFinishing(true);
                                try {
                                    await onComplete(formData);
                                } finally {
                                    setIsFinishing(false);
                                }
                            }}
                            disabled={isFinishing}
                            className="w-full bg-emerald-100 border-2 border-emerald-500 text-slate-900 py-6 rounded-xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {isFinishing ? <Loader2 size={18} className="animate-spin text-slate-900" /> : <ShieldCheck size={18} />}
                            {isFinishing ? 'Initializing Guardian...' : (t.launch_guardian || 'Launch Guardian')}
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default Onboarding;
