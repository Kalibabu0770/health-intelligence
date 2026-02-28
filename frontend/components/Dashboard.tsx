import React from 'react';
import {
    ShieldCheck, Activity, Heart, Zap, RefreshCcw,
    Apple, Dumbbell, Clock, Pill, CheckCircle2,
    Calendar, TrendingUp, Sparkles, Layout, Stethoscope, ChevronRight,
    ArrowUpRight, Target, BrainCircuit, ActivitySquare
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const Dashboard: React.FC<{
    unifiedData: any,
    isOrchestrating: boolean,
    onRefresh: () => void,
    onOpenFoodLog?: () => void,
    onOpenWorkoutLog?: () => void,
    onOpenMeditationLog?: () => void,
    onOpenCheckIn?: () => void,
    onOpenMeds?: () => void,
    onSetScreen?: (screen: any) => void,
    theme: 'light' | 'dark'
}> = ({ unifiedData, isOrchestrating, onRefresh, onOpenCheckIn, onOpenMeds, onSetScreen, onOpenFoodLog }) => {
    const { nutritionLogs, activityLogs, profile, riskScores, medications, meditationLogs, t, language } = usePatientContext();

    const today = new Date().toDateString();
    const todayFood = (nutritionLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);
    const todayWorkout = (activityLogs || []).filter((l: any) => new Date(l.timestamp || l.date).toDateString() === today);
    const todayMed = (meditationLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);

    const activities = [
        ...todayFood.map(l => ({ type: 'food', time: l.timestamp, title: l.name || t.nutrition_logged || 'Intake', detail: `${l.calories} kcal`, icon: Apple, color: 'emerald' })),
        ...todayWorkout.map(l => ({ type: 'workout', time: l.timestamp || l.date, title: l.type || t.activity_node || 'Activity', detail: `${l.duration || l.minutes} mins`, icon: Dumbbell, color: 'blue' })),
        ...todayMed.map(l => ({ type: 'meditation', time: l.timestamp, title: t.neural_sync || 'Sync', detail: `${l.duration} mins`, icon: Zap, color: 'indigo' }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const healthScoreVal = riskScores?.healthScore || 85;
    const totalCal = todayFood.reduce((s, l) => s + (l.calories || 0), 0);

    const navModules = [
        { id: 'files', title: t.bio_hub || 'HEALTH FILES', icon: Layout, color: 'slate', screen: 'reports' },
        { id: 'scanner', title: t.safety_adherence || 'SAFETY & ADHERENCE', icon: ShieldCheck, color: 'rose', screen: 'analysis' },
        { id: 'vitals', title: t.vitals_trend || 'VITALS TREND', icon: Activity, color: 'blue', screen: 'reports' },
        { id: 'ayush', title: t.ayush_ai || 'AYUSH AI', icon: Sparkles, color: 'emerald', screen: 'ayush' },
        { id: 'meds', title: t.meds || 'MEDICATION', icon: Pill, color: 'emerald', screen: 'meds' },
        { id: 'disease', title: t.triage_hub || 'DISEASE FINDER', icon: Stethoscope, color: 'indigo', screen: 'symptoms' }
    ];

    return (
        <div className="h-full w-full bg-[#fcfdfe] p-4 lg:p-6 flex flex-col gap-5 font-sans overflow-y-auto custom-scrollbar relative">

            {/* ═══ SIMPLE GUIDANCE HEADER ═══ */}
            <header className="flex flex-col gap-4 bg-white border-2 border-emerald-500 p-5 rounded-xl shadow-sm shrink-0">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 shadow-sm shrink-0">
                        <Heart size={32} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-slate-900 leading-tight">Hello! Welcome to your Health Guardian.</h1>
                        <p className="text-sm font-bold text-slate-600 mt-1">This screen shows your daily health. If you feel sick or need to log your food, tap the big buttons below. We are here to help you stay healthy.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 mt-2">
                    <button onClick={onOpenCheckIn} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white shadow-md flex items-center justify-center gap-3 active:scale-95 transition-all text-sm font-black uppercase tracking-wide">
                        <Stethoscope size={20} />
                        I Feel Sick (Check Symptoms)
                    </button>
                    <button onClick={onRefresh} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50">
                        <RefreshCcw size={20} className={isOrchestrating ? 'animate-spin' : ''} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            <main className="flex flex-col lg:grid grid-cols-12 gap-5 min-h-min pb-4">

                {/* BIOMETRIC CORE (Classic Widget Mix) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-5 h-full">
                    <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[300px]">
                        <div className="absolute top-0 inset-x-0 h-1 bg-emerald-100 opacity-20" />
                        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em] mb-6 italic">{t.molecular_readiness || 'Molecular Readiness'}</h3>

                        <div className="relative w-36 h-36 p-4 rounded-full border-4 border-slate-50 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                <circle cx="50" cy="50" r="46" fill="none"
                                    stroke={healthScoreVal > 75 ? '#10b981' : '#f59e0b'}
                                    strokeWidth="6" strokeLinecap="round"
                                    strokeDasharray={`${healthScoreVal * 2.89} 289`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">{healthScoreVal}%</span>
                                <span className="text-[7px] font-black uppercase text-slate-400 mt-2 tracking-widest">{t.score || 'Score'}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-100 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{t.optimal_sync_active || 'Optimal Sync Active'}</span>
                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-4 shrink-0">
                        <div className="bg-white border-2 border-emerald-200 rounded-xl p-5 flex flex-col justify-between aspect-square group overflow-hidden">
                            <Apple size={28} className="text-emerald-500 transition-transform group-hover:scale-110" />
                            <div className="mt-2">
                                <p className="text-2xl font-black text-slate-900 leading-none">{totalCal}<span className="text-[10px] ml-1.5 text-slate-500">KCAL</span></p>
                                <p className="text-xs font-bold text-slate-500 mt-2">Food Eaten Today</p>
                            </div>
                        </div>
                        <div onClick={onOpenMeds} className="bg-white border-2 border-emerald-200 rounded-xl p-5 flex flex-col justify-between aspect-square group cursor-pointer hover:border-emerald-500 transition-all">
                            <Pill size={28} className="text-emerald-500 transition-transform group-hover:scale-110" />
                            <div className="mt-2">
                                <p className="text-2xl font-black text-slate-900 leading-none">{medications.length}<span className="text-[10px] ml-1.5 text-slate-400">MEDS</span></p>
                                <p className="text-xs font-bold text-slate-500 mt-2">Your Medicines</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODULAR HUB & ACTIVITY FEED */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 min-h-0">

                    {/* MODULE QUICK-NAV GRID (The "New Feature") */}
                    <section className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
                        {navModules.map(mod => (
                            <button
                                key={mod.id}
                                onClick={() => onSetScreen?.(mod.screen)}
                                className="bg-white border-2 border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 group hover:shadow-lg hover:border-emerald-300 transition-all"
                            >
                                <div className={`w-12 h-12 rounded-full bg-${mod.color}-50 text-${mod.color}-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                    <mod.icon size={24} />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 leading-tight uppercase">{mod.title}</h4>
                            </button>
                        ))}
                    </section>

                    {/* ACTIVITY FEED (Refined Classic) */}
                    <section className="bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[350px]">
                        <header className="px-6 py-4 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <Activity size={16} className="text-slate-900" />
                                <h3 className="text-[10px] font-black uppercase tracking-tight italic uppercase">{t.protocol_activity_feed || 'Protocol Activity Feed'}</h3>
                            </div>
                            <button onClick={onOpenFoodLog} className="h-7 px-4 rounded-lg bg-emerald-100 border-2 border-emerald-500 text-slate-900 text-[7px] font-black uppercase tracking-widest hover:bg-white border-2 border-emerald-500 transition-all">+ {t.register_intake || 'REGISTER INTAKE'}</button>
                        </header>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
                            {activities.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                                    <Layout size={32} strokeWidth={1} />
                                    <p className="text-[8px] font-black uppercase tracking-[0.4em] mt-3">{t.registry_offline || 'Registry Offline'}</p>
                                </div>
                            ) : (
                                activities.map((act, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
                                        <div className={`w-9 h-9 rounded-xl bg-white text-${act.color}-600 flex items-center justify-center shadow-sm shrink-0`}>
                                            <act.icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[11px] font-black text-slate-900 uppercase truncate">{act.title}</p>
                                                <p className="text-[7px] font-bold text-slate-400 tabular-nums uppercase">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <p className="text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-widest leading-none">
                                                <span className={`text-${act.color}-600`}>{act.detail}</span> • BIOMETRIC_SYNC
                                            </p>
                                        </div>
                                        <ChevronRight size={12} className="text-slate-200 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.06); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Dashboard;
