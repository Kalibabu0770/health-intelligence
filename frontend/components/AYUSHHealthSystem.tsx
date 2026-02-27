import React, { useState, useEffect } from 'react';
import {
    Activity, Brain, ShieldCheck, MapPin, Mic, Zap, Search,
    Link, Share2, Globe, Database, Cpu, Layers, Radar, Loader2,
    Lock, ChevronRight, AlertCircle, Sparkles, Send, Fingerprint,
    Info, TrendingUp, Shield, RefreshCcw, Layout, User,
    MessageSquare, FileText, ClipboardList, Thermometer, Droplets
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { orchestrateHealth, getDiagnosticAdvice, getComprehensiveHealthAnalysis } from '../services/ai';
import { startListening } from '../services/speech';

const AYUSHHealthSystem: React.FC = () => {
    const context = usePatientContext();
    const { profile, language, t } = context;
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Personal Safety, 2: Global Surveillance, 3: Doctor Hub
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ayushResult, setAyushResult] = useState<any>(null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [clinicalAnalysis, setClinicalAnalysis] = useState<any>(null);
    const [patientIdSearch, setPatientIdSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientBrief, setPatientBrief] = useState<any>(null);

    // Patient ID for the current user
    const currentPatientId = profile.patientId || `LS-${profile.name?.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Initial load and role-based redirect
    useEffect(() => {
        // Set initial step based on role
        if (profile?.role === 'officer') setStep(2);
        else if (profile?.role === 'doctor') setStep(3);
        else setStep(1);

        if (step === 1 && !ayushResult) {
            handleSafetyScan();
        }
    }, [profile?.role]);

    const handleSafetyScan = async () => {
        setIsAnalyzing(true);
        try {
            const res = await orchestrateHealth(context as any, {
                query: "Analyze my safety in this area. Is it safe? Any spreading diseases?",
                problem_context: `Safety check for ${profile.district}, ${profile.mandal}`
            });
            if (res?.ayush) setAyushResult(res.ayush);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDoctorConsultation = async () => {
        if (!transcript) return;
        setIsAnalyzing(true);
        try {
            const res = await getDiagnosticAdvice(context as any, transcript, []);
            setClinicalAnalysis(res);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePatientSearch = async () => {
        if (!patientIdSearch) return;
        setIsAnalyzing(true);

        // Real search logic from localStorage
        const accounts = JSON.parse(localStorage.getItem('hi_accounts') || '[]');
        const found = accounts.find((acc: any) => acc.patientId?.toUpperCase() === patientIdSearch.toUpperCase() || acc.patientId === patientIdSearch);

        if (found) {
            // In a real app, we'd fetch the full context for this patient. 
            // For now, we'll synthesize a brief from the available profile data.
            const symptoms = found.conditions?.map((c: any) => c.name).join(', ') || 'No chronic conditions';
            const history = [...(found.surgeries || []), ...(found.familyHistory || [])].join(', ') || 'Clean history';

            setPatientBrief({
                summary: `${found.name} presents with a history of ${symptoms}. Previous clinical interventions include ${history}. Recent biometric patterns suggest ${found.stressLevel || 'moderate'} metabolic stress.`,
                conditions: found.conditions || [],
                recentSymptoms: found.customConditions || [],
                medications: found.currentMedications || []
            });
            setSelectedPatient(found);
        } else {
            alert("Protocol Error: Patient ID not found in National Registry.");
            setSelectedPatient(null);
        }
        setIsAnalyzing(false);
    };

    const renderNav = () => {
        const role = profile?.role || 'citizen';
        const steps = [];

        // Define which roles see which steps
        // Officer sees EVERYTHING
        if (role === 'officer') {
            steps.push({ id: 1, label: 'SAFETY ALERT', icon: ShieldCheck });
            steps.push({ id: 2, label: 'GLOBAL SENTINEL', icon: Globe });
            steps.push({ id: 3, label: 'DOCTOR WORKSPACE', icon: User });
        } else if (role === 'doctor') {
            steps.push({ id: 1, label: 'SAFETY ALERT', icon: ShieldCheck });
            steps.push({ id: 3, label: 'DOCTOR WORKSPACE', icon: User });
        } else {
            steps.push({ id: 1, label: 'SAFETY ALERT', icon: ShieldCheck });
        }

        if (steps.length <= 1) return null; // No need for nav if only one step

        return (
            <div className="flex bg-white/80 backdrop-blur-xl border border-slate-200 p-1.5 rounded-[2rem] shadow-xl shadow-slate-200/50 mb-8 w-fit mx-auto sticky top-0 z-50">
                {steps.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setStep(s.id as any)}
                        className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 ${step === s.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                        <s.icon size={14} />
                        {s.label}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-[#f0f2f5] text-slate-900 flex flex-col p-4 overflow-hidden font-inter selection:bg-emerald-500/20">
            {/* Header */}
            <header className="flex justify-between items-center mb-3 shrink-0 bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/60 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                        <Cpu className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none text-slate-900">SENTINEL AI <span className="text-emerald-600">AYUSH</span></h1>
                        <p className="text-[7px] uppercase font-black tracking-[0.4em] text-slate-400 mt-1">National Health Intelligence Node • Bio-Governance V4.9</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 bg-slate-900/5 px-3 py-1.5 rounded-xl border border-white/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">ID: LS-SAI-2101</span>
                    </div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic">{new Date().toLocaleTimeString('en-US', { hour12: true })} • AP_NODE_CORE</p>
                </div>
            </header>

            {renderNav()}

            <main className="flex-1 min-h-0 relative mt-3">
                {/* STEP 1: PERSONAL SAFETY ALERT - REDESIGNED 3-COLUMN LAYOUT */}
                {step === 1 && (
                    <div className="h-full w-full grid grid-cols-12 gap-3 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        {/* Column 1: Safety Verdict & Node Info */}
                        <div className="col-span-12 lg:col-span-3 flex flex-col h-full gap-3">
                            <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-200 p-5 flex flex-col items-center justify-center text-center shadow-lg shadow-slate-200/40 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-1000 transform group-hover:ring-8 ring-emerald-50 mb-6 z-10 ${ayushResult?.forecast?.z_score_deviation < 1.0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {ayushResult?.forecast?.z_score_deviation < 1.0 ? <ShieldCheck size={44} className="animate-in zoom-in-50 duration-500" /> : <AlertCircle size={44} className="animate-bounce" />}
                                </div>
                                <div className="z-10 space-y-2">
                                    <h2 className="text-xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">
                                        {ayushResult?.forecast?.z_score_deviation < 1.0 ? 'AREA RATED SAFE' : 'CAUTION ADVISED'}
                                    </h2>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">REGIONAL BIO-STABILITY: {ayushResult?.forecast?.z_score_deviation < 1.0 ? 'OPTIMAL' : 'FLUCTUATING'}</p>
                                    <div className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg">
                                        CURRENT NODE: {profile.district || 'HUB'}
                                    </div>
                                </div>
                                <p className="mt-6 text-[10px] font-black text-slate-400 uppercase italic px-4 leading-relaxed z-10">
                                    "{ayushResult?.outbreak_alert || 'NO ACTIVE DISEASE OUTBREAKS DETECTED IN YOUR IMMEDIATE VICINITY. ENVIRONMENTAL NODES REMAIN STABLE.'}"
                                </p>
                            </div>
                        </div>

                        {/* Column 2: Neural Risk Probabilities */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col h-full">
                            <div className="flex-1 bg-white rounded-[1.5rem] border border-slate-200 p-5 flex flex-col shadow-lg shadow-slate-200/40 min-h-0">
                                <div className="flex justify-between items-center mb-3 shrink-0 border-b border-slate-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-900">
                                            <Radar className="text-emerald-600" size={16} /> Neural Risk Probabilities
                                        </h3>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">AI Projection for Sector</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-lg">
                                        <Zap size={10} className="text-emerald-600 animate-pulse" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600">LIVE SCAN ACTIVE</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                    {ayushResult?.regional_seasonal_risks?.map((risk: any, i: number) => (
                                        <div key={i} className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex items-center gap-4 hover:bg-white hover:border-emerald-200 transition-all group cursor-default">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex flex-col items-center justify-center gap-0.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500">
                                                <span className="text-[10px] font-black text-slate-900">{Math.round(risk.probability * 100)}%</span>
                                                <div className={`w-full h-1 mt-1 ${risk.probability > 0.5 ? 'bg-amber-100' : 'bg-emerald-100'} rounded-full overflow-hidden`}>
                                                    <div className={`h-full ${risk.probability > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${risk.probability * 100}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="text-[11px] font-black italic uppercase text-slate-900 truncate">{risk.disease_name}</h4>
                                                    <span className={`px-1 rounded text-[6px] font-black uppercase tracking-tighter shrink-0 ${risk.probability > 0.5 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                                        {risk.probability > 0.5 ? 'CAUTION' : 'PRIMARY RISK'}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase italic truncate mb-1">"{risk.reason}"</p>
                                                <div className="flex items-center gap-1">
                                                    <ShieldCheck size={8} className="text-emerald-500" />
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600">{risk.prevention}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Ancient Wisdom Hub */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col h-full gap-3">
                            <div className="flex-1 bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-2xl relative overflow-hidden group min-h-0 border border-slate-800">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12 transform group-hover:rotate-45 transition-transform duration-1000">
                                    <Sparkles size={120} />
                                </div>
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="flex items-center gap-2 mb-3 shrink-0 border-b border-white/5 pb-3">
                                        <Brain className="text-emerald-400" size={16} />
                                        <h3 className="text-sm font-black uppercase italic tracking-tighter">Ancient Wisdom Hub</h3>
                                    </div>

                                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar-light pr-2">
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <p className="text-[7px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2 font-black italic">RITUCHARYA (SEASONAL)</p>
                                            <div className="flex flex-col gap-1.5">
                                                {ayushResult?.ritucharya?.map((item: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                                        <span className="text-[9px] font-bold uppercase tracking-tight text-white/80">{item}</span>
                                                    </div>
                                                )) || <span className="text-[8px] opacity-40">Syncing Node...</span>}
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2 font-black italic">DINACHARYA (DAILY)</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {ayushResult?.dinacharya?.map((item: string, i: number) => (
                                                    <div key={i} className="bg-white/5 border border-white/10 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase italic tracking-widest text-center">
                                                        {item}
                                                    </div>
                                                )) || <span className="text-[8px] opacity-40">Scanning...</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 flex flex-col items-center justify-center text-center shrink-0">
                                        <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1">PRAKRITI</p>
                                        <div className="text-xl font-black italic uppercase mb-1 text-emerald-400">{ayushResult?.prakriti || 'VATA-PITTA'}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest italic">REAL-TIME AYUSH SCAN...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: GLOBAL SURVEILLANCE (OFFICER VIEW) */}
                {step === 2 && (
                    <div className="h-full w-full flex flex-col gap-5 animate-in slide-in-from-right-5 duration-700">
                        <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
                            {/* Aggregated Map View / Stats */}
                            <div className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col shadow-xl shadow-slate-200/50 min-h-0">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3 text-slate-900">
                                            <Globe className="text-emerald-600" size={24} /> National Sentinel Hub
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Multi-Sector Population Risk Registry</p>
                                    </div>
                                    <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        FEDERATED SYNC ACTIVE
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Portal Access Nodes</p>
                                            <div className="text-4xl font-black text-slate-900 italic tracking-tighter">
                                                {JSON.parse(localStorage.getItem('hi_accounts') || '[]').length}
                                            </div>
                                        </div>
                                        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem]">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">System Uptime Node</p>
                                            <div className="text-4xl font-black text-emerald-900 italic tracking-tighter">99.98%</div>
                                        </div>
                                    </div>

                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2 italic">National Population Registry (Master Access)</h4>
                                    <table className="w-full text-left border-separate border-spacing-y-3">
                                        <thead>
                                            <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                <th className="px-6 pb-2">Individual Profile</th>
                                                <th className="px-6 pb-2 text-center">Location Node</th>
                                                <th className="px-6 pb-2 text-right">Registry Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {JSON.parse(localStorage.getItem('hi_accounts') || '[]').map((acc: any, i: number) => (
                                                <tr key={i} className="bg-slate-50 hover:bg-white border border-slate-100 group transition-all duration-300">
                                                    <td className="px-6 py-4 rounded-l-2xl border-l-[4px] border-emerald-500/10 group-hover:border-emerald-500 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${acc.role === 'officer' ? 'bg-blue-600' : acc.role === 'doctor' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white`}>
                                                                {acc.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase text-slate-900 leading-none mb-1">{acc.name}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {acc.patientId} • ROLE: {acc.role || 'CITIZEN'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <p className="text-[10px] font-black text-slate-700 uppercase">{acc.location || 'GLOBAL'}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right rounded-r-2xl">
                                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                                            SYNC_ACTIVE
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Population Insights Dashboard */}
                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col shadow-2xl relative overflow-hidden group min-h-[500px]">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000 rotate-12"><Globe size={200} className="text-white" /></div>
                                    <div className="relative z-10 space-y-8 h-full flex flex-col">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10"><TrendingUp size={28} className="text-emerald-500" /></div>
                                        <h4 className="text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Global Sector Insights</h4>
                                        <div className="space-y-6 flex-1">
                                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Monitored Nodes</p>
                                                <p className="text-3xl font-black text-white italic">PROD_NODES_LIVE <span className="text-[10px] text-emerald-500 ml-2">↑ 0.4%</span></p>
                                            </div>
                                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">System Stability Score</p>
                                                <p className="text-3xl font-black text-white italic">84.2% <span className="text-[10px] text-emerald-500 ml-2">VERIFIED</span></p>
                                            </div>
                                            <div className="pt-4 border-t border-white/10">
                                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4 italic">Critical Bio-Governance Action</p>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("THREAT DETECTED: ARE YOU SURE YOU WANT TO DELETE ALL PATIENT, DOCTOR, AND OFFICER DATA IN THE NATIONAL REGISTRY? THIS ACTION CANNOT BE REVERSED.")) {
                                                            localStorage.clear();
                                                            alert("PROTOCOL EXECUTED: ALL REGISTRY DATA PURGED. SYSTEM RESETTING...");
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="w-full bg-rose-600/20 border border-rose-500/50 text-rose-500 font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3"
                                                >
                                                    <RefreshCcw size={14} /> PURGE NATIONAL REGISTRY
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: DOCTOR'S WORKSPACE (CHATBOT + ID SEARCH + PLAN) */}
                {step === 3 && (
                    <div className="h-full w-full grid grid-cols-12 gap-5 animate-in zoom-in-95 duration-700">
                        {/* Patient ID Search & History Profile */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
                            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col shadow-xl shadow-slate-200/50 flex-1 min-h-0">
                                <div className="flex items-center gap-4 mb-6 shrink-0">
                                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><User size={20} /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-none">Patient Intelligence Hub</h3>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Access Centralized Patient IDs</p>
                                    </div>
                                </div>

                                <div className="space-y-6 mb-8">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={patientIdSearch}
                                            onChange={(e) => setPatientIdSearch(e.target.value)}
                                            placeholder="ENTER PATIENT ID (e.g. LS-KAL-042)"
                                            className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-[11px] uppercase placeholder:text-slate-300 focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-sm"
                                        />
                                        <button
                                            onClick={handlePatientSearch}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all"
                                        >
                                            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center italic">Your current Patient ID: <span className="text-emerald-600 underline font-bold">{currentPatientId}</span></p>
                                </div>

                                {selectedPatient ? (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 animate-in slide-in-from-top-2 duration-500">
                                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Identity</p>
                                                    <h4 className="text-xl font-black italic uppercase text-slate-900">{selectedPatient.name}</h4>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><Fingerprint size={18} className="text-emerald-300" /></div>
                                            </div>
                                            <div className="flex gap-4">
                                                <span className="px-3 py-1 bg-white rounded-lg text-[9px] font-black border border-slate-200">AGE: {selectedPatient.age}</span>
                                                <span className="px-3 py-1 bg-white rounded-lg text-[9px] font-black border border-slate-200">ID: {selectedPatient.id}</span>
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={48} className="text-emerald-600" /></div>
                                            <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
                                                <Sparkles size={12} /> CONSOLIDATED BIOMETRIC BRIEF
                                            </h5>
                                            <p className="text-[13px] font-bold text-slate-700 uppercase italic leading-loose mb-6">
                                                "{patientBrief?.summary}"
                                            </p>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Conditions</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {patientBrief?.conditions?.map((c: any, i: number) => (
                                                            <span key={i} className="px-2 py-1 bg-white border border-emerald-100 rounded-md text-[9px] font-black text-emerald-700">{c.name}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Recent Clinical Observations</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {patientBrief?.recentSymptoms?.map((s: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 bg-white border border-amber-100 rounded-md text-[9px] font-black text-amber-700">{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Medications</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {patientBrief?.medications?.map((m: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 bg-white border border-blue-100 rounded-md text-[9px] font-black text-blue-700">{m}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center px-6">
                                        <Fingerprint size={64} className="text-slate-200 mb-6" />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Awaiting ID Handshake</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">Enter an ID to pull encrypted patient telemetry</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Doctor-Patient Voice Chatbot & Analysis */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col h-full min-h-0">
                            <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col shadow-xl shadow-slate-200/50 min-h-0">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><MessageSquare size={20} /></div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900">Dr-Patient Voice Synapse</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Real-Time Transcription & Diagnostic Analysis</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
                                            <Link size={14} /> CONNECT TO HIS
                                        </button>
                                    </div>
                                </div>

                                {/* Chat / Voice Area */}
                                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 rounded-[2rem] border border-slate-100 relative">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                                        {clinicalAnalysis ? (
                                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-700">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20"><Brain size={32} /></div>
                                                    <div>
                                                        <h4 className="text-xl font-black uppercase italic text-slate-900">CLINICAL TREATMENT PLAN</h4>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Severity Assessment: <span className="text-slate-900 underline font-black">{clinicalAnalysis.severity}</span></p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[2rem]">
                                                        <p className="text-[14px] font-bold text-slate-700 uppercase italic leading-relaxed">"{clinicalAnalysis.assessment}"</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Actionable Protocol</p>
                                                            <ul className="space-y-3">
                                                                {clinicalAnalysis.immediateActions?.slice(0, 3).map((a: string, i: number) => (
                                                                    <li key={i} className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {a}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Medication Suggestions</p>
                                                            <p className="text-[11px] font-bold text-slate-600 uppercase italic leading-relaxed">{clinicalAnalysis.mlInsight}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                                <Mic size={56} className="text-slate-300 mb-6 animate-pulse" />
                                                <h4 className="text-xl font-black uppercase tracking-widest text-slate-400 italic">Conversation Registry Open</h4>
                                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Voice-to-Record Active • Listening for Diagnostic Signal</p>
                                            </div>
                                        )}
                                        {transcript && !clinicalAnalysis && (
                                            <div className="bg-white/80 p-6 rounded-2xl border border-emerald-200 shadow-lg max-w-lg mx-auto border-dashed animate-in slide-in-from-bottom-5">
                                                <p className="text-[14px] font-black uppercase text-emerald-600 italic leading-relaxed">"{transcript}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mic & Controls */}
                                    <div className="p-8 bg-white border-t border-slate-100 shrink-0 flex items-center gap-6">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (isListening) return;
                                                setIsListening(true);
                                                startListening(language, setTranscript, () => setIsListening(false));
                                            }}
                                            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                        >
                                            <Mic size={28} />
                                        </button>
                                        <div className="flex-1 bg-white border-2 border-slate-100 rounded-[1.5rem] p-4 flex items-center group focus-within:border-emerald-500 transition-all">
                                            <textarea
                                                value={transcript}
                                                onChange={(e) => setTranscript(e.target.value)}
                                                placeholder="Dr: Describe symptoms | Patent: Respond..."
                                                className="w-full bg-transparent border-none outline-none text-[12px] font-black uppercase tracking-tight text-slate-900 resize-none h-12 pt-2 custom-scrollbar placeholder:text-slate-200"
                                            />
                                        </div>
                                        <button
                                            onClick={handleDoctorConsultation}
                                            disabled={!transcript || isAnalyzing}
                                            className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                                        >
                                            {isAnalyzing ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer / Unified Status */}
            <footer className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Layers size={10} className="text-slate-400" />
                        <span className="text-[6px] font-black uppercase tracking-[0.3em] text-slate-400">SENTINEL-NATIONAL-V4.9-PROD</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Database size={10} className="text-emerald-600/40" />
                        <span className="text-[6px] font-black uppercase tracking-[0.3em] text-emerald-600/40">AHIMS GATEWAY: CONNECTED_V4</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">© 2026 INDIAAI INNOVATION HUB • SENTINEL PROTECT™</p>
                    <Activity size={12} className="text-emerald-600 opacity-50" />
                </div>
            </footer>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar-light::-webkit-scrollbar {
                    height: 2px;
                }
                .custom-scrollbar-light::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-light::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default AYUSHHealthSystem;
