import React, { useState, useEffect } from 'react';
import { ShieldCheck, ChevronRight, Lock, User, MapPin, Search, Loader2, Fingerprint, Mic, Check, Activity, Heart, Wind, Droplets, Sparkles, Box, ShieldAlert, Plus, X, ArrowRight, ArrowLeft, RefreshCcw, Brain, Globe } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { startListening } from '../services/speech';
import { INITIAL_PROFILE } from './Onboarding';

const LoginScreen: React.FC<{ onLogin: () => void, onRegister: () => void }> = ({ onLogin, onRegister }) => {
    const { t, language, updateProfile } = usePatientContext();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [pin, setPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Auth Mode: 'register' | 'questions' | 'select' | 'reset' | 'portal'
    const [mode, setMode] = useState<'register' | 'questions' | 'select' | 'reset' | 'portal'>('portal');
    const [selectedPortalRole, setSelectedPortalRole] = useState<'citizen' | 'officer' | 'doctor' | null>(null);
    const [regStep, setRegStep] = useState(1);
    const [resetStep, setResetStep] = useState(1);
    const [resetData, setResetData] = useState({ location: '', dob: '', nickname: '', newPassword: '' });

    const [regData, setRegData] = useState({
        ...INITIAL_PROFILE,
        name: '', dobDay: '', dobMonth: '', dobYear: '', dob: '', age: 0, nickname: '', weight: '' as any, location: '',
        gender: 'male' as any,
        password: '',
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

    // Calculate age automatically when DOB parts change
    useEffect(() => {
        const { dobDay, dobMonth, dobYear } = regData;
        if (dobDay && dobMonth && dobYear && dobYear.length === 4) {
            const day = parseInt(dobDay);
            const month = parseInt(dobMonth);
            const year = parseInt(dobYear);

            if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
                const today = new Date();
                const birthDate = new Date(year, month - 1, day);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                const dobString = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                setRegData(prev => ({ ...prev, age, dob: dobString }));
            }
        }
    }, [regData.dobDay, regData.dobMonth, regData.dobYear]);

    useEffect(() => {
        const saved = localStorage.getItem('hi_accounts');
        if (saved) {
            const parsed = JSON.parse(saved);
            const accountList = parsed || [];
            setAccounts(accountList);
            // Default to 'select' if accounts exist, else 'register'
            if (accountList.length > 0) setMode('select');
            else setMode('register');
        } else {
            setMode('register');
        }
    }, []);

    const handlePinSubmit = () => {
        if (!selectedAccount) return;

        setIsVerifying(true);
        setLoginError('');

        setTimeout(() => {
            if (pin === selectedAccount.password) {
                updateProfile(selectedAccount);
                onLogin();
            } else {
                setLoginError('Invalid Security Protocol PIN');
            }
            setIsVerifying(false);
        }, 1200);
    };

    const nextProtocol = () => {
        if (regStep === 1) {
            if (!regData.name || !regData.dob || !regData.location || !regData.nickname) return alert("All bio-metrics and nicknames are required for link initialization.");
            setMode('questions');
            setRegStep(2);
        } else if (regStep < 5) {
            setRegStep(prev => prev + 1);
        } else {
            if (regData.password.length !== 4) return alert("Security PIN must be exactly 4 digits.");
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
            weight: parseInt(regData.weight) || 0,
            id: 'node-' + Math.random().toString(36).substr(2, 9),
            patientId: `LS-${regData.name?.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            role: regData.role || 'citizen'
        };

        const existing = JSON.parse(localStorage.getItem('hi_accounts') || '[]');
        localStorage.setItem('hi_accounts', JSON.stringify([...existing, finalProfile]));

        setTimeout(() => {
            updateProfile(finalProfile as any);
            onLogin();
            setIsVerifying(false);
        }, 1500);
    };

    const handleResetProtocol = () => {
        if (!selectedAccount) return;

        if (resetStep === 1) {
            const isValid =
                resetData.location === selectedAccount.location &&
                resetData.dob === selectedAccount.dob &&
                resetData.nickname === selectedAccount.nickname;

            if (isValid) {
                setResetStep(2);
            } else {
                alert("Identity mismatch. Protocol reset failed.");
            }
        } else {
            if (resetData.newPassword.length !== 4) return alert("New PIN must be 4 digits.");

            setIsVerifying(true);
            setTimeout(() => {
                const allAccounts = JSON.parse(localStorage.getItem('hi_accounts') || '[]');
                const updated = allAccounts.map((acc: any) =>
                    acc.id === selectedAccount.id ? { ...acc, password: resetData.newPassword } : acc
                );
                localStorage.setItem('hi_accounts', JSON.stringify(updated));
                setAccounts(updated);
                setSelectedAccount({ ...selectedAccount, password: resetData.newPassword });
                setMode('select');
                setResetStep(1);
                setResetData({ location: '', dob: '', nickname: '', newPassword: '' });
                setIsVerifying(false);
                alert("Security PIN successfully reset.");
            }, 1500);
        }
    };

    const toggleTag = (field: string, val: string) => {
        const current = (regData as any)[field] || [];
        const updated = current.includes(val) ? current.filter((v: any) => v !== val) : [...current, val];
        setRegData({ ...regData, [field]: updated });
    };

    const Header = () => (
        <div className="flex flex-col items-center mb-8 shrink-0">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-4">
                <ShieldCheck size={28} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">LifeShield <span className="text-emerald-500">AI</span></h1>
            <div className="h-1 w-8 bg-emerald-100 rounded-full mt-2" />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] h-screen w-full flex items-center justify-center bg-[#F1F5F9] font-sans selection:bg-emerald-100 selection:text-emerald-900 px-4">

            {/* Minimalist Background Gradients */}
            <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500 max-h-[90vh]">

                {isVerifying ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-[3px] border-slate-100 rounded-full" />
                            <div className="w-16 h-16 border-t-[3px] border-emerald-500 rounded-full absolute inset-0 animate-spin" />
                            <ShieldCheck className="absolute inset-0 m-auto text-emerald-500" size={24} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Synchronizing Node</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 animate-pulse">Establishing Secure Link...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <Header />

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                            {/* Portal Selection */}
                            {mode === 'portal' && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="text-center mb-8">
                                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Select Access Gateway</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t.node_telemetry_registry || 'LifeShield Protocol Portal'}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => { setSelectedPortalRole('citizen'); setMode('select'); }}
                                            className="group relative bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex items-center gap-5 hover:border-emerald-500 hover:shadow-2xl transition-all duration-500"
                                        >
                                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                                                <User size={28} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-md font-black text-slate-900 uppercase tracking-tight leading-none">Citizen Guardian</h3>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 italic shadow-sm">AI Health Triage • AYUSH Wisdom</p>
                                            </div>
                                            <div className="absolute right-6 text-slate-100 group-hover:text-emerald-100 transition-colors">
                                                <Fingerprint size={32} strokeWidth={1} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setSelectedPortalRole('doctor'); setMode('select'); }}
                                            className="group relative bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex items-center gap-5 hover:border-indigo-500 hover:shadow-2xl transition-all duration-500"
                                        >
                                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                <Activity size={28} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-md font-black text-slate-900 uppercase tracking-tight leading-none">Medical Doctor</h3>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 italic shadow-sm">Clinical Synapse • ID Intelligence</p>
                                            </div>
                                            <div className="absolute right-6 text-slate-100 group-hover:text-indigo-100 transition-colors">
                                                <Brain size={32} strokeWidth={1} />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setSelectedPortalRole('officer'); setMode('select'); }}
                                            className="group relative bg-slate-900 border-2 border-slate-800 p-6 rounded-[2rem] flex items-center gap-5 hover:border-blue-500 hover:shadow-2xl transition-all duration-500"
                                        >
                                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                                <ShieldCheck size={28} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-md font-black text-white uppercase tracking-tight leading-none">Officer Node</h3>
                                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-2 italic shadow-sm">Population AHIMS • EHR Synchronizer</p>
                                            </div>
                                            <div className="absolute right-6 text-white/5 group-hover:text-blue-500/10 transition-colors">
                                                <Globe size={32} strokeWidth={1} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Account Selection */}
                            {mode === 'select' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    {selectedAccount ? (
                                        <div className="space-y-8 py-4">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="w-20 h-20 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 border border-emerald-100 mb-4">
                                                    <User size={40} />
                                                </div>
                                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedAccount.name}</h2>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{selectedAccount.location} Terminal</p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        placeholder="••••"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-2xl text-center text-4xl font-black tracking-[0.6em] focus:bg-white focus:border-emerald-500 transition-all outline-none"
                                                        maxLength={4}
                                                        autoFocus
                                                        value={pin}
                                                        onChange={e => setPin(e.target.value)}
                                                    />
                                                    <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200" size={20} />
                                                </div>
                                                {loginError && <p className="text-[10px] font-black text-rose-500 uppercase text-center">{loginError}</p>}
                                                <button
                                                    onClick={handlePinSubmit}
                                                    disabled={pin.length !== 4}
                                                    className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-30 disabled:shadow-none"
                                                >
                                                    Verify Access
                                                </button>
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={() => setMode('reset')}
                                                        className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                                                    >
                                                        Forgot Security PIN? Reset Protocol
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedAccount(null); setPin(''); setLoginError(''); }}
                                                        className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors"
                                                    >
                                                        Not {selectedAccount.name.split(' ')[0]}? Switch Identity
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex flex-col">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{selectedPortalRole === 'officer' ? 'Officer Personnel' : 'Authorized Citizens'}</h3>
                                                    <button onClick={() => { setMode('portal'); setSelectedPortalRole(null); }} className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1">
                                                        <ArrowLeft size={8} /> Switch Gateway
                                                    </button>
                                                </div>
                                                <button onClick={() => { setMode('register'); setRegData(prev => ({ ...prev, role: selectedPortalRole || 'citizen' })); }} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                                    <Plus size={12} /> New {selectedPortalRole === 'officer' ? 'Node' : 'Link'}
                                                </button>
                                            </div>
                                            {(() => {
                                                const filtered = accounts.filter(acc => (acc.role === selectedPortalRole) || (!acc.role && selectedPortalRole === 'citizen'));
                                                if (filtered.length > 0) {
                                                    return filtered.map((acc, i) => (
                                                        <button key={i} onClick={() => setSelectedAccount(acc)} className="group w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-5 hover:bg-white hover:border-emerald-500 hover:shadow-xl transition-all">
                                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm border border-slate-50">
                                                                <User size={24} />
                                                            </div>
                                                            <div className="text-left flex-1">
                                                                <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1.5">{acc.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">ID: {acc.patientId || 'PENDING'} • {acc.location}</p>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${acc.role === 'officer' ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                        {acc.role || 'citizen'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={18} className="text-slate-200 group-hover:text-emerald-500 transition-all" />
                                                        </button>
                                                    ));
                                                } else {
                                                    return (
                                                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">No Authorized {selectedPortalRole === 'officer' ? 'Personnel' : 'Citizen'} Nodes Detected</p>
                                                            <div className="flex flex-col gap-3 px-8">
                                                                <button onClick={() => { setMode('register'); setRegData(prev => ({ ...prev, role: selectedPortalRole || 'citizen' })); }} className="bg-emerald-600 text-white w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100">Initialize New {selectedPortalRole === 'officer' ? 'Officer Node' : 'Guardian Link'}</button>
                                                                <button onClick={() => { setMode('portal'); setSelectedPortalRole(null); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 py-2 italic flex items-center justify-center gap-2">
                                                                    <ArrowLeft size={10} /> Switch Gateway Protocol
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Registration Flow */}
                            {(mode === 'register' || mode === 'questions') && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-400">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest pl-1">
                                                {selectedPortalRole === 'officer' ? 'Officer Personnel Registry' : 'Guardian Link Setup'}
                                            </h3>
                                            <button onClick={() => setMode('select')} className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1">
                                                <ArrowLeft size={8} /> Return to Accounts
                                            </button>
                                        </div>
                                        <div className="bg-emerald-50 px-3 py-1 rounded-full text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                            Step {regStep}/4
                                        </div>
                                    </div>

                                    {/* Step 1: Basic Bio-Metrics */}
                                    {regStep === 1 && (
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Full Identity Name"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                                    value={regData.name}
                                                    onChange={e => setRegData({ ...regData, name: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (isListening) return;
                                                        setIsListening(true);
                                                        startListening(language, t => setRegData(p => ({ ...p, name: t })), () => setIsListening(false));
                                                    }}
                                                    className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all active:scale-95 ${isListening ? 'text-rose-500 animate-pulse' : 'text-slate-300 hover:text-emerald-500'}`}
                                                >
                                                    <Mic size={20} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="relative col-span-3 grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        placeholder="DD"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-center text-sm focus:border-emerald-500 outline-none"
                                                        value={regData.dobDay}
                                                        onChange={e => setRegData({ ...regData, dobDay: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                                    />
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        placeholder="MM"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-center text-sm focus:border-emerald-500 outline-none"
                                                        value={regData.dobMonth}
                                                        onChange={e => setRegData({ ...regData, dobMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                                                    />
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        placeholder="YYYY"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-center text-sm focus:border-emerald-500 outline-none"
                                                        value={regData.dobYear}
                                                        onChange={e => setRegData({ ...regData, dobYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                                                    />
                                                    <div className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-emerald-500 uppercase tracking-widest">Date of Birth</div>
                                                </div>
                                                <div className="relative">
                                                    <input type="number" readOnly placeholder="Age" className="w-full bg-emerald-50 border-2 border-emerald-100 p-5 rounded-2xl font-black text-center text-xs text-emerald-700 outline-none" value={regData.age || ''} />
                                                    <div className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-emerald-500 uppercase tracking-widest">Age</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="relative">
                                                    <input type="number" placeholder="Weight (Kg)" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none" value={regData.weight} onChange={e => setRegData({ ...regData, weight: e.target.value })} />
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase italic">Body Mass Node</div>
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Security Nickname (For Recovery)"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                                    value={regData.nickname}
                                                    onChange={e => setRegData({ ...regData, nickname: e.target.value })}
                                                />
                                                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    placeholder="Area Pincode (6 Digits)"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none transition-all"
                                                    value={regData.location}
                                                    onChange={e => setRegData({ ...regData, location: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                                />
                                                <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <select className="bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none" value={regData.gender} onChange={e => setRegData({ ...regData, gender: e.target.value as any })}>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                                <button
                                                    onClick={() => setRegData({ ...regData, isTribal: !regData.isTribal })}
                                                    className={`p-5 rounded-2xl font-bold text-[10px] uppercase border-2 transition-all ${regData.isTribal ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                >
                                                    {regData.isTribal ? 'Tribal Node ✅' : 'Tribal Initial?'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Chronic Conditions */}
                                    {regStep === 2 && (
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                {[
                                                    { id: 'hasDiabetes', label: 'Diabetes', icon: Droplets, color: 'text-blue-500' },
                                                    { id: 'hasHighBP', label: 'Hypertension', icon: Activity, color: 'text-rose-500' },
                                                    { id: 'hasHeartDisease', label: 'Heart', icon: Heart, color: 'text-rose-600' },
                                                    { id: 'hasAsthma', label: 'Respiratory', icon: Wind, color: 'text-cyan-500' },
                                                    { id: 'hasThyroid', label: 'Thyroid', icon: Sparkles, color: 'text-purple-500' },
                                                    { id: 'hasGastric', label: 'Gastric', icon: Box, color: 'text-orange-500' },
                                                ].map(c => (
                                                    <div key={c.id} className="space-y-2">
                                                        <button onClick={() => setRegData({ ...regData, [c.id]: !(regData as any)[c.id] })}
                                                            className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${(regData as any)[c.id] ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-50 hover:border-slate-100'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <c.icon size={18} className={c.color} />
                                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 text-left">{c.label}</span>
                                                            </div>
                                                            {(regData as any)[c.id] && <Check className="text-emerald-500" size={16} />}
                                                        </button>
                                                        {(regData as any)[c.id] && (
                                                            <input
                                                                type="text"
                                                                className="w-full bg-slate-50 border-b-2 border-emerald-200 p-3 text-[10px] font-bold outline-none uppercase tracking-widest"
                                                                placeholder={`Details for ${c.label}...`}
                                                                value={(regData as any)[c.id + 'Details'] || ''}
                                                                onChange={e => setRegData({ ...regData, [c.id + 'Details']: e.target.value })}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Custom Entry for Other Conditions */}
                                            <div className="pt-2 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-[1px] bg-slate-100" />
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Other Conditions</span>
                                                    <div className="flex-1 h-[1px] bg-slate-100" />
                                                </div>

                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        id="custom-condition-input"
                                                        placeholder="Enter other condition (e.g. Arthritis)"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[10px] uppercase focus:bg-white focus:border-blue-400 outline-none transition-all pr-12"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val) {
                                                                    setRegData({ ...regData, customConditions: [...(regData.customConditions as any), val] as any });
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById('custom-condition-input') as HTMLInputElement;
                                                            if (input && input.value.trim()) {
                                                                setRegData({ ...regData, customConditions: [...(regData.customConditions as any), input.value.trim()] as any });
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {(regData.customConditions as any).map((cond: string, idx: number) => (
                                                        <div key={idx} className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in zoom-in-95">
                                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{cond}</span>
                                                            <button onClick={() => setRegData({ ...regData, customConditions: (regData.customConditions as any).filter((_: any, i: number) => i !== idx) })} className="text-blue-300 hover:text-blue-600">
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 3: Medical History */}
                                    {regStep === 3 && (
                                        <div className="space-y-8 pb-4">
                                            {/* Surgical History */}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Surgical History</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Heart', 'Appendix', 'Hernia', 'Gallbladder', 'Knee'].map(s => (
                                                        <button key={s} onClick={() => toggleTag('surgeries', s)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${regData.surgeries.includes(s) ? 'bg-emerald-600 border-slate-200 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>{s}</button>
                                                    ))}
                                                    {/* Render custom surgeries that aren't in the preset list */}
                                                    {regData.surgeries.filter(s => !['Heart', 'Appendix', 'Hernia', 'Gallbladder', 'Knee'].includes(s)).map(s => (
                                                        <button key={s} onClick={() => toggleTag('surgeries', s)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 bg-emerald-600 border-slate-200 text-white shadow-md flex items-center gap-2">
                                                            {s} <X size={10} className="text-slate-400 hover:text-white" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative group mt-2">
                                                    <input
                                                        type="text"
                                                        id="custom-surgery-input"
                                                        placeholder="Add other surgery..."
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[10px] uppercase focus:bg-white focus:border-emerald-400 outline-none transition-all pr-12"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val && !regData.surgeries.includes(val)) {
                                                                    setRegData({ ...regData, surgeries: [...regData.surgeries, val] });
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById('custom-surgery-input') as HTMLInputElement;
                                                            if (input && input.value.trim() && !regData.surgeries.includes(input.value.trim())) {
                                                                setRegData({ ...regData, surgeries: [...regData.surgeries, input.value.trim()] });
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Genetic Markers */}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Genetic Markers</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['Diabetes', 'Cancer', 'Stroke', 'Cardiac'].map(f => (
                                                        <button key={f} onClick={() => toggleTag('familyHistory', f)} className={`p-4 rounded-xl text-[10px] font-black uppercase border-2 text-center transition-all ${regData.familyHistory.includes(f) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>{f}</button>
                                                    ))}
                                                </div>
                                                {/* Render custom family history items */}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {regData.familyHistory.filter(f => !['Diabetes', 'Cancer', 'Stroke', 'Cardiac'].includes(f)).map(f => (
                                                        <div key={f} className="bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in zoom-in-95">
                                                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{f}</span>
                                                            <button onClick={() => setRegData({ ...regData, familyHistory: regData.familyHistory.filter(item => item !== f) })} className="text-rose-300 hover:text-rose-600">
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="relative group mt-2">
                                                    <input
                                                        type="text"
                                                        id="custom-genetic-input"
                                                        placeholder="Add other genetic risk..."
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[10px] uppercase focus:bg-white focus:border-rose-400 outline-none transition-all pr-12"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val && !regData.familyHistory.includes(val)) {
                                                                    setRegData({ ...regData, familyHistory: [...regData.familyHistory, val] });
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById('custom-genetic-input') as HTMLInputElement;
                                                            if (input && input.value.trim() && !regData.familyHistory.includes(input.value.trim())) {
                                                                setRegData({ ...regData, familyHistory: [...regData.familyHistory, input.value.trim()] });
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 4: Lifestyle & Habits */}
                                    {regStep === 4 && (
                                        <div className="space-y-6 pb-4">
                                            {/* Profession & Sleep */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        placeholder="Profession (e.g. Farmer, Engineer)"
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                                                        value={regData.profession}
                                                        onChange={e => setRegData({ ...regData, profession: e.target.value })}
                                                    />
                                                </div>
                                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sleep Clock</p>
                                                        <span className="text-sm font-black text-slate-900">{regData.sleepHours} Hrs</span>
                                                    </div>
                                                    <input type="range" min="4" max="11" className="w-full h-1.5 bg-slate-200 rounded-full appearance-none accent-emerald-500 cursor-pointer" value={regData.sleepHours} onChange={e => setRegData({ ...regData, sleepHours: parseInt(e.target.value) })} />
                                                </div>
                                            </div>

                                            {/* Personal Habits */}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clinical Habits</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Smoking', 'Alcohol', 'Tobacco', 'Betel Nut'].map(h => (
                                                        <button key={h} onClick={() => toggleTag('habits', h)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${regData.habits.includes(h) ? 'bg-emerald-600 border-slate-200 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>{h}</button>
                                                    ))}
                                                    {/* Render custom habits */}
                                                    {regData.habits.filter(h => !['Smoking', 'Alcohol', 'Tobacco', 'Betel Nut'].includes(h)).map(h => (
                                                        <button key={h} onClick={() => toggleTag('habits', h)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 bg-emerald-600 border-slate-200 text-white shadow-md flex items-center gap-2">
                                                            {h} <X size={10} className="text-slate-400 hover:text-white" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative group mt-2">
                                                    <input
                                                        type="text"
                                                        id="custom-habit-input"
                                                        placeholder="Add other habit..."
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[10px] uppercase focus:bg-white focus:border-blue-400 outline-none transition-all pr-12"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val && !regData.habits.includes(val)) {
                                                                    setRegData({ ...regData, habits: [...regData.habits, val] });
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById('custom-habit-input') as HTMLInputElement;
                                                            if (input && input.value.trim() && !regData.habits.includes(input.value.trim())) {
                                                                setRegData({ ...regData, habits: [...regData.habits, input.value.trim()] });
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Allergies */}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Allergies (Drug/Food)</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Penicillin', 'Sulfa', 'Peanuts', 'Dairy', 'Gluten'].map(a => (
                                                        <button key={a} onClick={() => toggleTag('allergies', a)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${regData.allergies.includes(a) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>{a}</button>
                                                    ))}
                                                    {/* Render custom allergies */}
                                                    {regData.allergies.filter(a => !['Penicillin', 'Sulfa', 'Peanuts', 'Dairy', 'Gluten'].includes(a)).map(a => (
                                                        <button key={a} onClick={() => toggleTag('allergies', a)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 bg-rose-500 border-rose-500 text-white shadow-md flex items-center gap-2">
                                                            {a} <X size={10} className="text-white hover:text-slate-200" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative group mt-2">
                                                    <input
                                                        type="text"
                                                        id="custom-allergy-input"
                                                        placeholder="Add other allergy..."
                                                        className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[10px] uppercase focus:bg-white focus:border-rose-400 outline-none transition-all pr-12"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                if (val && !regData.allergies.includes(val)) {
                                                                    setRegData({ ...regData, allergies: [...regData.allergies, val] });
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const input = document.getElementById('custom-allergy-input') as HTMLInputElement;
                                                            if (input && input.value.trim() && !regData.allergies.includes(input.value.trim())) {
                                                                setRegData({ ...regData, allergies: [...regData.allergies, input.value.trim()] });
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Stress & Water */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 text-center">Neural Stress Load</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['low', 'mid', 'high'].map(s => (
                                                            <button key={s} onClick={() => setRegData({ ...regData, stressLevel: s as any })} className={`py-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${regData.stressLevel === s ? 'bg-emerald-600 border-slate-200 text-white' : 'bg-slate-50 border-transparent text-slate-400'}`}>{s}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 text-center">Water Quality</p>
                                                    <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-[11px] uppercase outline-none focus:border-emerald-500" value={regData.waterSource} onChange={e => setRegData({ ...regData, waterSource: e.target.value as any })}>
                                                        <option value="tap">Municipal Tap</option>
                                                        <option value="well">Well/Borewell</option>
                                                        <option value="bottled">Filtered</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 5: Finalize & Password Creation */}
                                    {regStep === 5 && (
                                        <div className="space-y-6 text-center py-6">
                                            <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mx-auto shadow-emerald-200 animate-bounce-slow">
                                                <Lock size={48} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Access Protocol</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose text-center">Establish your 4-digit Security PIN</p>
                                            </div>
                                            <div className="relative max-w-[200px] mx-auto">
                                                <input
                                                    type="password"
                                                    maxLength={4}
                                                    placeholder="••••"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-center text-3xl font-black tracking-[0.4em] focus:bg-white focus:border-emerald-500 transition-all outline-none"
                                                    value={regData.password}
                                                    onChange={e => setRegData({ ...regData, password: e.target.value.replace(/\D/g, '') })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-4">
                                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><ShieldCheck className="text-emerald-500 mx-auto mb-2" size={24} /><p className="text-[9px] font-black text-slate-400 uppercase">Encrypted</p></div>
                                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100"><Fingerprint className="text-emerald-500 mx-auto mb-2" size={24} /><p className="text-[9px] font-black text-slate-400 uppercase">Unique ID</p></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-6 border-t border-slate-50 overflow-hidden">
                                        {regStep > 1 && (
                                            <button onClick={() => setRegStep(prev => prev - 1)} className="p-5 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                                                <ArrowLeft size={20} />
                                            </button>
                                        )}
                                        <button
                                            onClick={nextProtocol}
                                            className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                        >
                                            {regStep === 5 ? 'Establish Node' : 'Continue Protocol'}
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>

                                    {/* Secondary Action: Return to Logins */}
                                    {accounts.length > 0 && regStep === 1 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-[1px] bg-slate-100" />
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Or Secure Profile</span>
                                                <div className="flex-1 h-[1px] bg-slate-100" />
                                            </div>
                                            <button
                                                onClick={() => setMode('select')}
                                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                            >
                                                <ShieldCheck size={18} />
                                                Existing Node? Protocol Login
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reset Password Flow */}
                            {mode === 'reset' && selectedAccount && (
                                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                                    <div className="flex flex-col items-center text-center mb-4">
                                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-100 mb-3">
                                            <ShieldAlert size={32} />
                                        </div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase">Node Reset Protocol</h2>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verifying Identity for {selectedAccount.name}</p>
                                    </div>

                                    {resetStep === 1 ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <input type="text" placeholder="Registered Pincode" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none" value={resetData.location} onChange={e => setResetData({ ...resetData, location: e.target.value })} />
                                                <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Date of Birth (DD/MM/YYYY)" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none" value={resetData.dob} onChange={e => setResetData({ ...resetData, dob: e.target.value })} />
                                                <Activity className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Your Security Nickname" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none" value={resetData.nickname} onChange={e => setResetData({ ...resetData, nickname: e.target.value })} />
                                                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase text-center tracking-widest">Identity Confirmed. Enter New PIN.</p>
                                            <div className="relative max-w-[200px] mx-auto">
                                                <input
                                                    type="password"
                                                    maxLength={4}
                                                    placeholder="••••"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-center text-3xl font-black tracking-[0.4em] focus:bg-white focus:border-emerald-500 transition-all outline-none"
                                                    value={resetData.newPassword}
                                                    onChange={e => setResetData({ ...resetData, newPassword: e.target.value.replace(/\D/g, '') })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => { setMode('select'); setResetStep(1); }} className="p-5 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <button
                                            onClick={handleResetProtocol}
                                            className={`flex-1 ${resetStep === 1 ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'} text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-[0.98]`}
                                        >
                                            {resetStep === 1 ? 'Verify Identity' : 'Update PIN'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Protocol: Fresh Start / System Purge */}
                <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
                    <button
                        onClick={() => {
                            if (confirm("CRITICAL PROTOCOL: Are you sure you want to purge ALL registry data (Patients, Doctors, & Officers)? This action cannot be undone.")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="text-[8px] font-black text-slate-400/50 uppercase tracking-[0.4em] hover:text-rose-500 transition-all flex items-center gap-2"
                    >
                        <RefreshCcw size={8} /> SYSTEM_PURGE_PROTOCOL_V4
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default LoginScreen;
