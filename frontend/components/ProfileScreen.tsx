import React, { useState } from 'react';
import { Pencil, Check, Mic, Heart } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { startListening } from '../services/speech';
import { UserProfile } from '../types';

const ProfileScreen: React.FC = () => {
    const { profile, updateProfile, resetVault, language, t } = usePatientContext();
    const [isEditing, setIsEditing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [edited, setEdited] = useState<UserProfile | null>(profile);

    if (!profile || !edited) return null;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">{t.identity}</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.bio_context_registry}</p>
                </div>
                <button onClick={() => {
                    if (isEditing && edited) {
                        updateProfile(edited);
                    } else {
                        setEdited(profile);
                    }
                    setIsEditing(!isEditing);
                }} className={`p-4 rounded-xl shadow-md active:scale-90 transition-all ${isEditing ? 'bg-white text-slate-900' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {isEditing ? <Check size={20} /> : <Pencil size={20} />}
                </button>
            </div>

            <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-6">
                <div className="w-24 h-24 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-4xl font-black shadow-inner border-4 border-white">{profile.name.charAt(0)}</div>
                {isEditing ? (
                    <div className="w-full space-y-4">
                        <div className="relative">
                            <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-lg outline-none" value={edited.name} onChange={e => setEdited({ ...edited, name: e.target.value })} placeholder="Identity" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isListening) return;
                                    setIsListening(true);
                                    startListening(language, text => setEdited(p => p ? { ...p, name: text } : null), () => setIsListening(false));
                                }}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                            >
                                <Mic size={20} />
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <div className="relative w-1/2">
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none pr-10" value={edited.age || ''} onChange={e => setEdited({ ...edited, age: Number(e.target.value) })} placeholder={t.age} />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setEdited(p => p ? { ...p, age: parseInt(text.replace(/\D/g, '')) || p.age } : null), () => setIsListening(false));
                                    }}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                            <div className="relative w-1/2">
                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none pr-10" value={edited.weight || ''} onChange={e => setEdited({ ...edited, weight: Number(e.target.value) })} placeholder={t.weight} />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setEdited(p => p ? { ...p, weight: parseInt(text.replace(/\D/g, '')) || p.weight } : null), () => setIsListening(false));
                                    }}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <Mic size={14} />
                                </button>
                            </div>
                        </div>

                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none appearance-none" value={edited.gender} onChange={e => setEdited({ ...edited, gender: e.target.value as any })}>
                            <option value="male">{t.male}</option>
                            <option value="female">{t.female}</option>
                            <option value="other">{t.other}</option>
                        </select>

                        <div className="relative">
                            <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none" value={edited.location || ''} onChange={e => setEdited({ ...edited, location: e.target.value })} placeholder={t.region_placeholder} />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isListening) return;
                                    setIsListening(true);
                                    startListening(language, text => setEdited(p => p ? { ...p, location: text } : null), () => setIsListening(false));
                                }}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                            >
                                <Mic size={20} />
                            </button>
                        </div>

                        <div className="pt-4 space-y-4 border-t border-slate-50 mt-4">
                            <div className="relative">
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none" value={edited.profession || ''} onChange={e => setEdited({ ...edited, profession: e.target.value })} placeholder="Profession" />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isListening) return;
                                        setIsListening(true);
                                        startListening(language, text => setEdited(p => p ? { ...p, profession: text } : null), () => setIsListening(false));
                                    }}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 active:scale-90 transition-all ${isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 hover:text-emerald-700'}`}
                                >
                                    <Mic size={20} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-slate-400">Work Hours: {edited.workHoursPerDay}</p>
                                <input type="range" min="1" max="18" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={edited.workHoursPerDay} onChange={e => setEdited({ ...edited, workHoursPerDay: parseInt(e.target.value) })} />
                            </div>
                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none appearance-none" value={edited.workIntensity} onChange={e => setEdited({ ...edited, workIntensity: e.target.value as any })}>
                                <option value="low">Low Intensity</option>
                                <option value="moderate">Moderate Intensity</option>
                                <option value="high">High Intensity</option>
                                <option value="very_high">Extreme Intensity</option>
                            </select>
                        </div>

                        <div className="space-y-2 pt-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.dietary_filter}</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {[
                                    { key: 'vegetarian', label: 'Veg' },
                                    { key: 'non_veg', label: 'Non-Veg' },
                                    { key: 'vegan', label: 'Vegan' },
                                    { key: 'keto', label: 'Keto' }
                                ].map(diet => (
                                    <button key={diet.key} onClick={() => {
                                        const prefs = edited.foodPreferences || [];
                                        if (prefs.includes(diet.label)) setEdited({ ...edited, foodPreferences: prefs.filter(p => p !== diet.label) });
                                        else setEdited({ ...edited, foodPreferences: [...prefs, diet.label] });
                                    }} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${edited.foodPreferences?.includes(diet.label) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                        {t[diet.key] || diet.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.chronic_conditions}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'hasDiabetes', label: t.diabetes },
                                    { id: 'hasHighBP', label: t.hypertension },
                                    { id: 'hasLiverDisease', label: t.liver_disease },
                                    { id: 'hasKidneyDisease', label: t.kidney_disease },
                                    { id: 'hasHeartDisease', label: t.heart_disease },
                                    { id: 'hasAsthma', label: t.asthma },
                                ].map(cond => (
                                    <button
                                        key={cond.id}
                                        onClick={() => setEdited({ ...edited, [cond.id]: !(edited as any)[cond.id] })}
                                        className={`p-2 rounded-lg text-[8px] font-black uppercase border transition-all ${(edited as any)[cond.id] ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                    >
                                        {cond.label}
                                    </button>
                                ))}
                            </div>
                            {edited.gender === 'female' && (
                                <button
                                    onClick={() => setEdited({ ...edited, isPregnant: !edited.isPregnant })}
                                    className={`w-full p-2 rounded-lg text-[8px] font-black uppercase border transition-all ${edited.isPregnant ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    {t.pregnant}: {edited.isPregnant ? t.confirm || 'YES' : t.no || 'NO'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 w-full text-slate-900">
                        <h3 className="font-black text-3xl text-slate-900 uppercase leading-none">{profile.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{profile.age} {t.yrs} • {profile.weight} {t.kg} • {t[profile.gender.toLowerCase()] || profile.gender}</p>

                        {(profile.location || (profile.foodPreferences && profile.foodPreferences.length > 0)) && (
                            <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                                {profile.location && <p className="text-xs font-black text-emerald-800 uppercase tracking-tight flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> {profile.location}</p>}
                                {profile.foodPreferences && profile.foodPreferences.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {profile.foodPreferences.map(p => <span key={p} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">{p}</span>)}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={resetVault} className="mt-10 text-[9px] font-black text-rose-500 uppercase tracking-widest border border-rose-100 px-6 py-3 rounded-xl hover:bg-rose-50 transition-all active:scale-95">{t.reset_biometric_vault}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileScreen;
