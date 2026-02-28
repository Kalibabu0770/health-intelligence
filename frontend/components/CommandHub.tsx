import React from 'react';
import {
    ChevronRight, ShieldCheck, RefreshCcw, Stethoscope, Pill, Activity,
    Leaf, ClipboardList, FileText, AlertTriangle, UserCircle, Zap,
    TrendingUp, Shield, Beaker, Fingerprint, Brain, ShieldAlert
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const CommandModule: React.FC<{
    title: string;
    subTitle: string;
    icon: any;
    color: string;
    gradient: string;
    onAnalysisClick: () => void;
    children: React.ReactNode;
    statusBadge?: string;
    statusColor?: string;
}> = ({ title, subTitle, icon: Icon, color, gradient, onAnalysisClick, children, statusBadge, statusColor = 'emerald' }) => {
    return (
        <div className="flex flex-col h-full rounded-xl border border-slate-100 overflow-hidden transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 bg-white group relative">
            {/* Background Glow */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity duration-700`} />

            <div className="p-6 shrink-0 flex items-center justify-between border-b border-slate-50 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-slate-900 shadow-xl shadow-slate-200 group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-[12px] font-black uppercase tracking-tight text-slate-900 leading-none">{title}</h3>
                            {statusBadge && (
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-[4px] bg-${statusColor}-50 text-${statusColor}-600 border border-${statusColor}-100 uppercase tracking-widest`}>
                                    {statusBadge}
                                </span>
                            )}
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-2">{subTitle}</p>
                    </div>
                </div>
                <button
                    onClick={onAnalysisClick}
                    className="w-10 h-10 rounded-xl text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 hover:shadow-inner transition-all duration-300 flex items-center justify-center group/btn"
                >
                    <ChevronRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="flex-1 p-6 min-h-0 overflow-hidden relative z-10">
                {children}
            </div>

            {/* Micro-Interaction Bar */}
            <div className="h-1 w-0 bg-gradient-to-r from-emerald-500 to-blue-500 group-hover:w-full transition-all duration-700 ease-out" />
        </div>
    );
};

const CommandHub: React.FC<{
    unifiedData: any,
    isOrchestrating: boolean,
    onRefresh: () => void,
    onOpenAnalysis: (node: string) => void,
    theme: 'light' | 'dark'
}> = ({ unifiedData, isOrchestrating, onRefresh, onOpenAnalysis }) => {
    const { nutritionLogs, activityLogs, medications, clinicalVault, profile, t } = usePatientContext();
    const today = new Date().toDateString();

    const todayFood = (nutritionLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);
    const totalCal = todayFood.reduce((s: number, l: any) => s + (l.calories || 0), 0);
    const todayWorkout = (activityLogs || []).filter((l: any) => new Date(l.timestamp || l.date).toDateString() === today);
    const totalWorkMin = todayWorkout.reduce((s: number, l: any) => s + (l.duration || l.minutes || 0), 0);
    const todayMeds = (medications || []).filter((m: any) => m.times);

    return (
        <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-700">

            {/* ═══ ZONE 01: MASTER BIO-COMMAND BAR ═══ */}
            <div className="h-[12%] shrink-0 flex items-center justify-between px-10 rounded-xl border border-white bg-white/70  shadow-[0_25px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 opacity-50" />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-2xl shadow-emerald-200 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-20 group-hover:translate-y-0 transition-transform duration-500" />
                        <ShieldCheck size={28} strokeWidth={2.5} className="relative z-10" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[14px] font-black uppercase tracking-tight text-slate-900 leading-none">
                                {t.integrated_command || "Integrated Command"} <span className="text-emerald-600 italic">{t.sentinel || "Sentinel"}</span>
                            </h1>
                            <div className="flex items-center gap-1.5 bg-emerald-100/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 bg-emerald-100 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{t.quantum_bio_sync || "Quantum Bio-Sync"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none truncate italic max-w-xl">
                                {isOrchestrating ? "🛡️ SYNTHESIZING MOLECULAR DATA PATHWAYS..." : (unifiedData?.guardian_summary?.slice(0, 100) || "BIO-COMMAND STANDBY. AWAITING CORE RESILIENCE PARAMETERS...")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.node_identity || "Node Identity"}</span>
                        <p className="text-xs font-black text-slate-900 uppercase mt-1">{profile?.name || 'Auth_User_01'}</p>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="w-14 h-14 rounded-xl transition-all duration-300 active:scale-95 bg-emerald-100 border-2 border-emerald-500 text-slate-900 shadow-2xl shadow-slate-200 flex items-center justify-center hover:bg-emerald-700 group"
                    >
                        <RefreshCcw size={22} className={`${isOrchestrating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* ═══ MAIN STRATEGIC GRID ═══ */}
            <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">

                {/* DOMAIN A: CLINICAL NODES (LEFT SECTOR) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 min-h-0">
                    <div className="flex-1">
                        <CommandModule
                            title={t.disease_triage || "Disease Triage"}
                            subTitle={t.clinical_reasoning_hub || "Clinical Reasoning Hub"}
                            icon={Stethoscope}
                            color="indigo"
                            gradient="from-indigo-600 to-violet-500"
                            onAnalysisClick={() => onOpenAnalysis('symptoms')}
                            statusBadge="V2.4"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="space-y-4">
                                    <div className="p-5 rounded-xl border border-indigo-50 bg-indigo-50/20 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform"><Brain size={40} className="text-emerald-600" /></div>
                                        <p className="text-[11px] font-bold text-indigo-900/70 leading-relaxed uppercase italic relative z-10">
                                            Clinical diagnostic engine operational. Neural-mapping active.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-emerald-100 rounded-full" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logic: Active</span>
                                        </div>
                                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sync: 100%</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenAnalysis('symptoms')}
                                    className="w-full py-4.5 bg-indigo-600 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    Initialize Triage Protocol
                                </button>
                            </div>
                        </CommandModule>
                    </div>

                    <div className="flex-1">
                        <CommandModule
                            title={t.medication_safety || "Medication Safety"}
                            subTitle={t.predictive_danger_analysis || "Predictive Danger Analysis"}
                            icon={ShieldAlert}
                            color="rose"
                            gradient="from-rose-600 to-pink-500"
                            onAnalysisClick={() => onOpenAnalysis('medsafety')}
                            statusBadge="Warning"
                            statusColor="rose"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { l: 'Lethal', v: '0', c: 'rose' },
                                            { l: 'Adverse', v: '2', c: 'amber' },
                                            { l: 'Stable', v: 'Active', c: 'emerald' }
                                        ].map((stat, i) => (
                                            <div key={i} className={`p-4 rounded-2.5xl border border-${stat.c}-100 bg-${stat.c}-50/30 text-center`}>
                                                <p className={`text-[16px] font-black text-${stat.c}-600 leading-none mb-1.5`}>{stat.v}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{stat.l}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                                        <AlertTriangle size={16} className="text-rose-500" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase italic">Predictive risk scanning enabled.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenAnalysis('medsafety')}
                                    className="w-full py-4.5 bg-rose-600 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all"
                                >
                                    Execute Bio-Scan
                                </button>
                            </div>
                        </CommandModule>
                    </div>
                </div>

                {/* DOMAIN B: ADHERENCE & WELLNESS (CENTER SECTOR) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 min-h-0">
                    <div className="flex-[0.6]">
                        <CommandModule
                            title={t.protocol_adherence || "Protocol Adherence"}
                            subTitle={t.adherence_sentinel || "Adherence Sentinel"}
                            icon={ClipboardList}
                            color="blue"
                            gradient="from-blue-600 to-indigo-500"
                            onAnalysisClick={() => onOpenAnalysis('meds')}
                            statusBadge="Synced"
                        >
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="flex-1 space-y-4 overflow-hidden">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Protocol Feed</span>
                                        <Fingerprint size={14} className="text-blue-500 opacity-30" />
                                    </div>
                                    <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {(todayMeds || []).length === 0 ? (
                                            <div className="h-40 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 opacity-40">
                                                <ClipboardList size={32} strokeWidth={1} />
                                                <p className="text-[9px] mt-4 uppercase font-black tracking-widest">No active protocols</p>
                                            </div>
                                        ) : (
                                            todayMeds.slice(0, 5).map((m: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-5 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]"><Pill size={18} /></div>
                                                        <span className="text-[11px] font-black text-slate-900 truncate max-w-[120px] uppercase">{m.drugName}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest">{m.times?.[0] || '--:--'}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onOpenAnalysis('meds')}
                                    className="w-full py-4.5 bg-emerald-100 border-2 border-emerald-500 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 hover:bg-emerald-700 transition-all shadow-xl"
                                >
                                    Full Adherence Schedule
                                </button>
                            </div>
                        </CommandModule>
                    </div>

                    <div className="flex-[0.4] grid grid-cols-2 gap-8">
                        <CommandModule
                            title={t.life_audit || "Life Audit"}
                            subTitle={t.tracker || "Tracker"}
                            icon={TrendingUp}
                            color="blue"
                            gradient="from-blue-600 to-cyan-500"
                            onAnalysisClick={() => onOpenAnalysis('lifeaudit')}
                        >
                            <div className="space-y-4">
                                <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-2xl font-black text-slate-900 leading-none mb-1">{totalCal}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kcal In</p>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (totalCal / 2200) * 100)}%` }} />
                                </div>
                            </div>
                        </CommandModule>

                        <CommandModule
                            title={t.wisdom || "Wisdom"}
                            subTitle={t.ayush || "AYUSH"}
                            icon={Leaf}
                            color="emerald"
                            gradient="from-emerald-600 to-teal-500"
                            onAnalysisClick={() => onOpenAnalysis('ayush')}
                        >
                            <div className="h-full flex flex-col justify-center text-center p-2">
                                <Leaf size={32} className="text-emerald-500 mx-auto mb-3 opacity-40" />
                                <p className="text-[9px] font-black text-emerald-800 uppercase leading-relaxed">Sattvic Phase Active</p>
                            </div>
                        </CommandModule>
                    </div>
                </div>

                {/* DOMAIN C: REGISTRY & IDENTITY (RIGHT SECTOR) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-8 min-h-0">
                    <div
                        onClick={() => onOpenAnalysis('reports')}
                        className="flex-1 p-8 rounded-xl border border-slate-100 bg-white flex flex-col justify-between cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><FileText size={100} /></div>
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-slate-900 shadow-2xl shadow-blue-100 relative z-10">
                            <FileText size={28} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[16px] font-black uppercase text-slate-900 tracking-tight leading-none">Bio-Vault Registry</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                                {clinicalVault?.length || 0} SECURE NODES
                            </p>
                        </div>
                        <ChevronRight size={20} className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-all opacity-40 group-hover:opacity-100" />
                    </div>

                    <div
                        onClick={() => onOpenAnalysis('profile')}
                        className="flex-1 p-8 rounded-xl border border-slate-100 bg-white flex flex-col justify-between cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><UserCircle size={100} /></div>
                        <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-2xl shadow-emerald-100 relative z-10">
                            <UserCircle size={28} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[16px] font-black uppercase text-slate-900 tracking-tight leading-none">Identity Matrix</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 truncate">
                                {profile?.name?.toUpperCase() || 'AUTHORIZED'}
                            </p>
                        </div>
                        <ChevronRight size={20} className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-all opacity-40 group-hover:opacity-100" />
                    </div>

                    <div className="p-8 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-4 opacity-50 hover:opacity-100 transition-opacity">
                        <ShieldCheck size={40} className="text-slate-300" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] italic">V2.8 SENTINEL PROTOCOL</p>
                    </div>
                </div>

            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.08); border-radius: 10px; }
                .py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
                .rounded-2.5xl { border-radius: 1.25rem; }
            `}</style>
        </div>
    );
};

export default CommandHub;
