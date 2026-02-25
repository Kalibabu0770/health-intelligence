import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, Lock, User, MapPin, Search, Loader2, Fingerprint, Mic, Check, Activity, Heart, Wind, Droplets, Sparkles, Box, ShieldAlert, Plus, X } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { startListening } from '../services/speech';
import { INITIAL_PROFILE } from './Onboarding';

const LoginScreen: React.FC<{ onLogin: () => void, onRegister: () => void }> = ({ onLogin, onRegister }) => {
    const { t, language, updateProfile } = usePatientContext();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [pin, setPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Auth Mode: 'register' | 'questions' | 'select'
    const [mode, setMode] = useState<'register' | 'questions' | 'select'>('register');
    const [regStep, setRegStep] = useState(1);
    const [regData, setRegData] = useState({
        ...INITIAL_PROFILE,
        name: '', age: '' as any, weight: '' as any, location: '',
        gender: 'male' as any,
        isPregnant: false,
        isTribal: false,
        hasThyroid: false,
        hasGastric: false,
        hasBonePain: false,
        hasVisionIssues: false,
        customConditions: [],
        familyHistory: [],
        surgeries: [],
        habits: [],
        allergies: [],
        // Follow-up specific data
        diabetesDetails: '',
        hypertensionDetails: '',
        heartDetails: '',
        asthmaDetails: '',
        thyroidDetails: '',
        gastricDetails: '',
        boneDetails: '',
        visionDetails: '',
        // Lifestyle data
        sleepHours: 7,
        stressLevel: 'low',
        waterSource: 'tap',
        tobaccoFrequency: '',
        alcoholFrequency: ''
    });

    useEffect(() => {
        const saved = localStorage.getItem('hi_accounts');
        if (saved) {
            const parsed = JSON.parse(saved);
            setAccounts(parsed || []);
        }
        setMode('register');
    }, []);

    const handlePinSubmit = () => {
        setIsVerifying(true);
        setTimeout(() => {
            updateProfile(selectedAccount);
            onLogin();
            setIsVerifying(false);
        }, 1200);
    };

    const nextProtocol = () => {
        if (regStep === 1) {
            if (!regData.name || !regData.age || !regData.location) return alert("All bio-metrics are required for link initialization.");
            setMode('questions');
            setRegStep(2);
        } else if (regStep < 5) {
            setRegStep(prev => prev + 1);
        } else {
            finalizeGuardianLink();
        }
    };

    const finalizeGuardianLink = () => {
        if (!/^\d{6}$/.test(regData.location)) {
            return alert("Regional Pincode must be exactly 6 digits.");
        }

        setIsVerifying(true);
        const finalProfile = {
            ...regData,
            age: parseInt(regData.age) || 0,
            weight: parseInt(regData.weight) || 0,
            id: 'node-' + Math.random().toString(36).substr(2, 9),
            role: 'citizen'
        };

        // Save to accounts
        const existing = JSON.parse(localStorage.getItem('hi_accounts') || '[]');
        localStorage.setItem('hi_accounts', JSON.stringify([...existing, finalProfile]));

        setTimeout(() => {
            updateProfile(finalProfile as any);
            onLogin();
            setIsVerifying(false);
        }, 1500);
    };

    const toggleTag = (field: string, val: string) => {
        const current = (regData as any)[field] || [];
        const updated = current.includes(val) ? current.filter((v: any) => v !== val) : [...current, val];
        setRegData({ ...regData, [field]: updated });
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] font-sans overflow-hidden relative selection:bg-emerald-100 selection:text-emerald-900">

            {/* Premium Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-emerald-100 rounded-full blur-[140px] opacity-40 animate-pulse" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-100 rounded-full blur-[140px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-30 animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* Authentication Card */}
            <div className="relative z-10 w-full max-w-[1020px] h-[720px] flex px-6">

                {/* Visual Side (LHS) */}
                <div className="hidden lg:flex flex-[0.7] bg-slate-900 rounded-l-[4rem] relative overflow-hidden group shadow-2xl">
                    <img
                        src="https://images.unsplash.com/photo-1628595305748-03893c52e1f2?q=80&w=1974&auto=format&fit=crop"
                        className="absolute inset-0 object-cover opacity-60 scale-100 group-hover:scale-110 transition-transform duration-[10s]"
                        alt="Health AI"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                    <div className="relative z-10 p-16 flex flex-col justify-between h-full w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                                <ShieldCheck size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">LifeShield <span className="text-emerald-500">AI</span></h2>
                        </div>
                        <div className="space-y-6">
                            <div className="inline-flex px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                Global Health Sentinel
                            </div>
                            <h3 className="text-6xl font-black text-white leading-tight uppercase tracking-tighter">
                                Neural <br /> Guardian <br /> <span className="text-emerald-500">Network.</span>
                            </h3>
                            <p className="text-slate-400 text-base font-medium leading-relaxed max-w-sm uppercase tracking-wide">
                                Real-time clinical surveillance and predictive bio-risk analysis for the modern citizen.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400"><Fingerprint size={20} /></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Security Level: Grade-A Encrypted</p>
                        </div>
                    </div>
                </div>

                {/* Interaction Side (RHS) */}
                <div className="flex-1 bg-white lg:rounded-r-[4rem] rounded-[4rem] shadow-2xl border border-white/50 relative overflow-hidden flex flex-col p-14">

                    {isVerifying ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-slate-100 rounded-full" />
                                <div className="w-24 h-24 border-t-4 border-emerald-500 rounded-full absolute inset-0 animate-spin" />
                                <ShieldCheck className="absolute inset-0 m-auto text-emerald-500" size={32} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 uppercase">Synchronizing Node</h3>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Establishing Clinical Secure Link...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="shrink-0 mb-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                        {mode === 'select' ? 'Authorization' : mode === 'questions' ? 'Bio-Link Mapper' : 'Protocol Initialize'}
                                    </h2>
                                    <p className="text-sm font-black text-emerald-600 uppercase tracking-widest mt-2">
                                        {(mode === 'questions' || mode === 'register') ? `Initialization Step ${regStep}/5` : 'Regional Node Setup'}
                                    </p>
                                </div>
                                {mode === 'select' && (
                                    <button onClick={() => { setMode('register'); setRegStep(1); setSelectedAccount(null); }} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-all">
                                        <Plus size={24} />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0">

                                {mode === 'select' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                        {selectedAccount ? (
                                            <div className="space-y-10 pt-10">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner group">
                                                        <User size={64} className="group-hover:text-emerald-500 transition-colors" />
                                                    </div>
                                                    <div className="text-center">
                                                        <h4 className="text-2xl font-black text-slate-900 uppercase">{selectedAccount.name}</h4>
                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{selectedAccount.location} Terminal</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-6 max-w-sm mx-auto">
                                                    <div className="relative">
                                                        <input
                                                            type="password"
                                                            placeholder="••••"
                                                            className="w-full bg-slate-50 border border-slate-100 p-8 rounded-[2rem] text-center text-5xl font-black tracking-[0.8em] focus:bg-white focus:border-emerald-500 transition-all outline-none"
                                                            maxLength={4}
                                                            autoFocus
                                                            value={pin}
                                                            onChange={e => setPin(e.target.value)}
                                                        />
                                                        <Lock className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-200" size={28} />
                                                    </div>
                                                    <button onClick={handlePinSubmit} disabled={pin.length !== 4} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-emerald-600 transition-all disabled:opacity-30">Verify Link Access</button>
                                                    <button onClick={() => { setSelectedAccount(null); setPin(''); }} className="w-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 py-3">Switch Identity</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-5">
                                                {accounts.map((acc, i) => (
                                                    <button key={i} onClick={() => setSelectedAccount(acc)} className="group w-full bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex items-center gap-8 hover:bg-white hover:border-emerald-500 hover:shadow-2xl transition-all">
                                                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm border border-slate-50">
                                                            <User size={32} />
                                                        </div>
                                                        <div className="text-left flex-1">
                                                            <p className="text-lg font-black text-slate-900 uppercase leading-none mb-2">{acc.name}</p>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{acc.age} yrs • {acc.location}</p>
                                                        </div>
                                                        <ChevronRight size={24} className="text-slate-200 group-hover:text-emerald-500 translate-x-0 group-hover:translate-x-2 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {mode === 'register' && regStep === 1 && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 pb-10">
                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Full Identity Name"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-7 rounded-[2rem] font-bold text-lg focus:bg-white focus:border-emerald-500 transition-all outline-none shadow-sm"
                                                    value={regData.name}
                                                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                                                />
                                                <Mic className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-emerald-500 cursor-pointer" size={28} onClick={() => startListening(language, t => setRegData(p => ({ ...p, name: t })))} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="relative">
                                                    <input type="number" placeholder="Biological Age" className="w-full bg-slate-50 border-2 border-slate-100 p-7 rounded-[2rem] font-bold text-lg focus:border-emerald-500 outline-none shadow-sm" value={regData.age} onChange={e => setRegData({ ...regData, age: e.target.value })} />
                                                    <div className="absolute right-7 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300 uppercase">Yrs</div>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" placeholder="Body Weight" className="w-full bg-slate-50 border-2 border-slate-100 p-7 rounded-[2rem] font-bold text-lg focus:border-emerald-500 outline-none shadow-sm" value={regData.weight} onChange={e => setRegData({ ...regData, weight: e.target.value })} />
                                                    <div className="absolute right-7 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300 uppercase">Kg</div>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={6}
                                                    placeholder="Regional Area PIN (6 Digits)"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-7 rounded-[2rem] font-bold text-lg focus:border-emerald-500 outline-none shadow-sm"
                                                    value={regData.location}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        setRegData({ ...regData, location: val });
                                                    }}
                                                />
                                                <MapPin className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-300" size={28} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <select
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-7 rounded-[2rem] font-bold text-lg focus:border-emerald-500 outline-none appearance-none shadow-sm"
                                                    value={regData.gender}
                                                    onChange={e => setRegData({ ...regData, gender: e.target.value as any, isPregnant: false })}
                                                >
                                                    <option value="male">Male Bio-Type</option>
                                                    <option value="female">Female Bio-Type</option>
                                                    <option value="other">Other Bio-Type</option>
                                                </select>
                                                <div className="bg-slate-50 border-2 border-slate-100 px-8 rounded-[2rem] flex items-center justify-between shadow-sm">
                                                    <span className="text-sm font-black uppercase text-slate-400">Tribal Identity?</span>
                                                    <button
                                                        onClick={() => setRegData({ ...regData, isTribal: !regData.isTribal })}
                                                        className={`w-14 h-7 rounded-full transition-all relative ${regData.isTribal ? 'bg-amber-500' : 'bg-slate-200'}`}
                                                    >
                                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${regData.isTribal ? 'left-8' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button onClick={nextProtocol} className="w-full bg-slate-900 text-white py-7 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-6">
                                                Next Protocol <ChevronRight size={28} />
                                            </button>
                                        </div>

                                        {accounts.length > 0 && (
                                            <div className="pt-12 space-y-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex-1 h-[2px] bg-slate-50" />
                                                    <span className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">Authorized Identities</span>
                                                    <div className="flex-1 h-[2px] bg-slate-50" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {accounts.map((acc, i) => (
                                                        <button key={i} onClick={() => { setSelectedAccount(acc); setMode('select'); }} className="group w-full bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-6 hover:border-emerald-500 hover:shadow-xl transition-all">
                                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                                <User size={24} />
                                                            </div>
                                                            <div className="text-left flex-1">
                                                                <p className="text-base font-black text-slate-900 uppercase leading-none mb-1">{acc.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{acc.age} yrs • {acc.location}</p>
                                                            </div>
                                                            <ChevronRight size={20} className="text-slate-200 group-hover:text-emerald-500 transition-all" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {mode === 'questions' && (
                                    <div className="animate-in fade-in slide-in-from-right-8 pb-10">

                                        {regStep === 2 && (
                                            <div className="space-y-6">
                                                {[
                                                    { id: 'hasDiabetes', label: t.diabetes || 'Diabetes Mellitus', icon: Droplets, color: 'text-blue-500 bg-blue-50', followUp: t.insulin_status || 'Taking Insulin or Oral Meds?' },
                                                    { id: 'hasHighBP', label: t.hypertension || 'Hypertension', icon: Activity, color: 'text-rose-500 bg-rose-50', followUp: t.bp_medication || 'Regular BP Monitoring?' },
                                                    { id: 'hasHeartDisease', label: t.heart_disease || 'Heart Protocol', icon: Heart, color: 'text-rose-600 bg-rose-100', followUp: t.heart_stents || 'Any stents or past procedures?' },
                                                    { id: 'hasAsthma', label: t.asthma || 'Respiratory Issue', icon: Wind, color: 'text-cyan-500 bg-cyan-50', followUp: t.asthma_frequency || 'Using Inhaler daily?' },
                                                    { id: 'hasThyroid', label: t.thyroid || 'Thyroid Disorder', icon: Sparkles, color: 'text-purple-500 bg-purple-50', followUp: t.thyroid_type || 'Hypo or Hyper?' },
                                                    { id: 'hasGastric', label: t.gastric || 'Gastric Problem', icon: Box, color: 'text-orange-500 bg-orange-50', followUp: 'Gas, Acidity or IBS?' },
                                                    { id: 'hasBonePain', label: t.bone_joint || 'Bone/Joint Pain', icon: ShieldAlert, color: 'text-slate-500 bg-slate-50', followUp: 'Back, Knee or Neck?' },
                                                    { id: 'hasVisionIssues', label: 'Vision Node', icon: Search, color: 'text-indigo-500 bg-indigo-50', followUp: 'Using Glasses or Glaucoma?' },
                                                ].map(c => (
                                                    <div key={c.id} className="space-y-4">
                                                        <button onClick={() => setRegData({ ...regData, [c.id]: !(regData as any)[c.id] })}
                                                            className={`w-full p-7 rounded-[2rem] flex items-center justify-between border-2 transition-all ${(regData as any)[c.id] ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-slate-50 border-slate-50 hover:border-slate-200'}`}>
                                                            <div className="flex items-center gap-7">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${c.color}`}><c.icon size={28} /></div>
                                                                <span className="text-base font-black uppercase tracking-widest text-slate-700">{c.label}</span>
                                                            </div>
                                                            {(regData as any)[c.id] && <Check className="text-emerald-600" size={28} />}
                                                        </button>
                                                        {(regData as any)[c.id] && c.followUp && (
                                                            <div className="px-8 pb-2 animate-in slide-in-from-top-2">
                                                                <div className="bg-white border-l-4 border-emerald-500 p-6 rounded-r-[2rem] shadow-sm space-y-4">
                                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{c.followUp}</p>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-slate-50 border-b-2 border-slate-100 p-4 text-sm font-bold outline-none focus:border-emerald-500"
                                                                        placeholder="Enter clinical details..."
                                                                        value={(regData as any)[c.id + 'Details'] || ''}
                                                                        onChange={e => setRegData({ ...regData, [c.id + 'Details']: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {regStep === 3 && (
                                            <div className="space-y-10">
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Clinical Surgeries</p>
                                                    <div className="flex flex-wrap gap-3">
                                                        {['Appendix', 'Heart Bypass', 'Hernia', 'Gallbladder', 'Knee', 'C-Section'].map(s => (
                                                            <button key={s} onClick={() => toggleTag('surgeries', s)} className={`px-7 py-4 rounded-[1.5rem] text-xs font-black uppercase border-2 transition-all ${regData.surgeries.includes(s) ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}>{s}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Genetics History</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {['Diabetes', 'Cancer', 'Stroke', 'Heart Failure'].map(f => (
                                                            <button key={f} onClick={() => toggleTag('familyHistory', f)} className={`p-6 rounded-[2rem] text-[11px] font-black uppercase border-2 text-left transition-all ${regData.familyHistory.includes(f) ? 'bg-rose-600 border-rose-600 text-white shadow-xl' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}>{f}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {regStep === 4 && (
                                            <div className="space-y-8">
                                                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest pl-1">{t.sleep_quality || 'Sleep Protocol'}</p>
                                                    <div className="flex justify-between items-center text-sm font-black uppercase text-slate-400">
                                                        <span>Daily Duration</span>
                                                        <span className="text-slate-900 text-xl">{regData.sleepHours} Hours</span>
                                                    </div>
                                                    <input type="range" min="3" max="12" className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-slate-900 cursor-pointer" value={regData.sleepHours} onChange={e => setRegData({ ...regData, sleepHours: parseInt(e.target.value) })} />
                                                </div>
                                                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                                                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest pl-1">{t.stress_level || 'Neuro-Stress Load'}</p>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {['low', 'moderate', 'high'].map(s => (
                                                            <button key={s} onClick={() => setRegData({ ...regData, stressLevel: s as any })} className={`py-5 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${regData.stressLevel === s ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-transparent text-slate-400'}`}>{s}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                                                    <p className="text-xs font-black text-orange-600 uppercase tracking-widest pl-1">{t.water_source || 'Hydration Origin'}</p>
                                                    <select className="w-full bg-white border-2 border-slate-100 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:border-emerald-500" value={regData.waterSource} onChange={e => setRegData({ ...regData, waterSource: e.target.value as any })}>
                                                        <option value="tap">Municipal Tap</option>
                                                        <option value="well">Open Well / Borewell</option>
                                                        <option value="bottled">Filtered / Bottled</option>
                                                        <option value="river">River / Natural Source</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {regStep === 5 && (
                                            <div className="space-y-10 py-10">
                                                <div className="bg-[#059669] p-12 rounded-[4rem] text-white relative overflow-hidden group shadow-2xl">
                                                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                                                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                                                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-2 shadow-xl"><Sparkles size={40} /></div>
                                                        <h4 className="text-3xl font-black uppercase tracking-tighter">Guardian node Ready</h4>
                                                        <p className="text-xs font-bold uppercase opacity-80 tracking-[0.2em] leading-relaxed max-w-xs">Neural risk core calibrated. Identity link secured. Encryption active.</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 flex items-center gap-5">
                                                        <ShieldCheck className="text-emerald-600" size={32} />
                                                        <div><p className="text-[10px] font-black text-slate-400 uppercase">Surveillance</p><p className="text-sm font-black text-slate-800 uppercase">Active</p></div>
                                                    </div>
                                                    <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 flex items-center gap-5">
                                                        <Activity className="text-blue-600" size={32} />
                                                        <div><p className="text-[10px] font-black text-slate-400 uppercase">Analysis</p><p className="text-sm font-black text-slate-800 uppercase">Real-Time</p></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-10 flex gap-5">
                                            {regStep > 1 && (
                                                <button onClick={() => setRegStep(prev => prev - 1)} className="px-10 py-6 rounded-[2rem] border-2 border-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Back</button>
                                            )}
                                            <button onClick={nextProtocol} className="flex-1 bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.4em] shadow-xl hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-4">
                                                {regStep === 5 ? 'Initialize Node' : 'Continue Protocol'}
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                .animate-bounce-slow { animation: bounce-slow 10s ease-in-out infinite; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 20px; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </div>
    );
};

export default LoginScreen;
