import React, { useState } from 'react';
import { Pencil, Check, Mic, Heart, X } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { UserProfile } from '../types';

const ProfileScreen: React.FC = () => {
    const { profile, updateProfile, resetVault, t } = usePatientContext();
    const [isEditing, setIsEditing] = useState(false);
    const [edited, setEdited] = useState<UserProfile | null>(profile);

    if (!profile || !edited) return null;

    const handleSave = () => {
        if (edited) {
            updateProfile(edited);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEdited(profile);
        setIsEditing(false);
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar px-4 lg:px-8 py-8 animate-in fade-in duration-500 pb-32 bg-slate-50/30">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header with obvious edit controls */}
                <div className="flex justify-between items-center px-2">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t.identity || 'Identity'}</h2>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">{t.bio_context_registry || 'Bio-Context Registry'}</p>
                    </div>

                    {!isEditing ? (
                        <button
                            onClick={() => { setEdited(profile); setIsEditing(true); }}
                            className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:border-emerald-500 hover:text-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                        >
                            <Pencil size={18} />
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-rose-100 text-rose-500 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                            >
                                <X size={18} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
                            >
                                <Check size={18} />
                                Save Identity
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl text-center flex flex-col items-center justify-center space-y-8">
                    <div className="w-28 h-28 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 text-5xl font-black shadow-inner border-4 border-white">
                        {profile.name?.charAt(0) || 'U'}
                    </div>

                    {isEditing ? (
                        <div className="w-full space-y-6 text-left">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Full Identity Name</label>
                                <div className="relative">
                                    <input
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                        value={edited.name}
                                        onChange={e => setEdited({ ...edited, name: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-emerald-600 hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <Mic size={22} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Age (Yrs)</label>
                                    <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-base outline-none focus:border-emerald-500 transition-all" value={edited.age || ''} onChange={e => setEdited({ ...edited, age: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Weight (Kg)</label>
                                    <input type="number" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-base outline-none focus:border-emerald-500 transition-all" value={edited.weight || ''} onChange={e => setEdited({ ...edited, weight: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Region / Location</label>
                                <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-base outline-none focus:border-emerald-500 transition-all" value={edited.location || ''} onChange={e => setEdited({ ...edited, location: e.target.value })} placeholder="State, City or Pincode" />
                            </div>

                            <div className="pt-6 space-y-6 border-t border-slate-50 mt-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Profession</label>
                                    <input className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-base outline-none focus:border-emerald-500 transition-all" value={edited.profession || ''} onChange={e => setEdited({ ...edited, profession: e.target.value })} placeholder="Software Engineer, Farmer, etc." />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-4">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Work Hours Per Day</label>
                                        <span className="text-sm font-black text-emerald-600">{edited.workHoursPerDay} HRS</span>
                                    </div>
                                    <input type="range" min="1" max="18" className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={edited.workHoursPerDay} onChange={e => setEdited({ ...edited, workHoursPerDay: parseInt(e.target.value) })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Dietary Filter</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: 'vegetarian', label: 'Vegetarian' },
                                            { key: 'non_veg', label: 'Non-Veg' },
                                            { key: 'vegan', label: 'Vegan' },
                                            { key: 'keto', label: 'Keto' }
                                        ].map(diet => (
                                            <button
                                                key={diet.key}
                                                onClick={() => {
                                                    const prefs = edited.foodPreferences || [];
                                                    if (prefs.includes(diet.label)) setEdited({ ...edited, foodPreferences: prefs.filter(p => p !== diet.label) });
                                                    else setEdited({ ...edited, foodPreferences: [...prefs, diet.label] });
                                                }}
                                                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${edited.foodPreferences?.includes(diet.label) ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400'}`}
                                            >
                                                {diet.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4 border-t border-slate-50">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">{t.chronic_conditions || 'Chronic Conditions'}</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'hasDiabetes', label: t.diabetes || 'Diabetes' },
                                            { id: 'hasHighBP', label: t.hypertension || 'Hypertension' },
                                            { id: 'hasLiverDisease', label: t.liver_disease || 'Liver Disease' },
                                            { id: 'hasKidneyDisease', label: t.kidney_disease || 'Kidney Disease' },
                                            { id: 'hasHeartDisease', label: t.heart_disease || 'Heart Disease' },
                                        ].map(cond => (
                                            <button
                                                key={cond.id}
                                                onClick={() => setEdited({ ...edited, [cond.id]: !(edited as any)[cond.id] })}
                                                className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${(edited as any)[cond.id] ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'}`}
                                            >
                                                {cond.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 active:scale-[0.98] transition-all mt-8"
                            >
                                Complete Identity Update
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 w-full">
                            <h3 className="font-black text-4xl text-slate-900 uppercase tracking-tighter leading-none">{profile.name}</h3>
                            <div className="pt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AHMIS ID: </span>
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg text-xs ml-2">{profile.patientId || 'PENDING'}</span>
                            </div>

                            <div className="flex items-center justify-center gap-6 mt-8">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.age || 'Age'}</p>
                                    <p className="text-xl font-black text-slate-800">{profile.age} <span className="text-[10px] text-slate-400">{t.yrs || 'YRS'}</span></p>
                                </div>
                                <div className="w-px h-10 bg-slate-100" />
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.weight || 'Weight'}</p>
                                    <p className="text-xl font-black text-slate-800">{profile.weight} <span className="text-[10px] text-slate-400">{t.kg || 'KG'}</span></p>
                                </div>
                                <div className="w-px h-10 bg-slate-100" />
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Worker</p>
                                    <p className="text-xl font-black text-slate-800">{profile.workHoursPerDay} <span className="text-[10px] text-slate-400">HRS</span></p>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-50 space-y-6">
                                {profile.location && (
                                    <div className="flex flex-col items-center">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Node Location</p>
                                        <p className="text-sm font-black text-emerald-800 uppercase tracking-tight flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            {profile.location}
                                        </p>
                                    </div>
                                )}

                                {profile.foodPreferences && profile.foodPreferences.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dietary Preferences</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {profile.foodPreferences.map(p => (
                                                <span key={p} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-10 flex flex-col items-center gap-4">
                                <button onClick={resetVault} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-all active:scale-95 border-b border-rose-100">
                                    Reset Biometric Vault Data
                                </button>
                                <p className="text-[8px] font-black text-slate-300 uppercase leading-relaxed max-w-xs">
                                    Resetting vault will delete all local health records and cannot be undone.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ProfileScreen;
