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
    theme: 'light' | 'dark'
}> = ({ unifiedData, isOrchestrating, onRefresh, onOpenCheckIn, onOpenFoodLog, onOpenMeds }) => {
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

    return (
        <div className="h-full w-full p-4 lg:p-6 flex flex-col gap-4 overflow-hidden bg-transparent text-slate-900 font-sans relative">

            {/* ═══ CRYSTAL HEADER (Ultra-Compacted) ═══ */}
            <header className="flex justify-between items-center gap-4 shrink-0 relative z-20 bg-white/60 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/80 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-[0.8rem] flex items-center justify-center text-white shadow-lg">
                        <ShieldCheck size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-tight italic">
                            {profile?.name?.split(' ')[0] || 'USER'} PORTAL
                        </h1>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-1.5 mt-0.5">
                            <Calendar size={9} className="text-emerald-500" />
                            {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenCheckIn}
                        className="h-9 px-4 rounded-xl bg-slate-900 text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2.5 group"
                    >
                        <BrainCircuit size={14} className="text-emerald-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest">{t.check_symptoms || 'Run Triage'}</span>
                    </button>

                    <button
                        onClick={onRefresh}
                        className="w-9 h-9 rounded-xl bg-white text-slate-900 border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all group"
                    >
                        <RefreshCcw size={16} className={isOrchestrating ? 'animate-spin text-emerald-500' : 'group-hover:rotate-180 transition-transform duration-700'} strokeWidth={3} />
                    </button>
                </div>
            </header>

            {/* ═══ ANALYTIC CORE (One-Screen Fit) ═══ */}
            <main className="flex-1 grid grid-cols-12 gap-4 relative z-10 min-h-0">

                {/* BIO-READINESS (LEFT - Compacted) */}
                <section className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-[1.8rem] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 opacity-20" />
                        <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Readiness Status</h3>

                        <div className="relative w-32 h-32 xl:w-40 xl:h-40 p-3 rounded-full border-4 border-slate-50 bg-white flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="44" fill="none" stroke="#F8FAFC" strokeWidth="5" />
                                <circle cx="50" cy="50" r="44" fill="none"
                                    stroke={healthScoreVal > 75 ? '#10B981' : healthScoreVal > 40 ? '#F59E0B' : '#EF4444'}
                                    strokeWidth="7" strokeLinecap="round"
                                    strokeDasharray={`${healthScoreVal * 2.76} 276`}
                                    className="transition-all duration-[2000ms]"
                                />
                            </svg>
                            <div className="relative z-10 flex flex-col items-center">
                                <span className={`text-4xl font-black italic tracking-tighter tabular-nums leading-none ${healthScoreVal > 75 ? 'text-slate-900' : healthScoreVal > 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {healthScoreVal}
                                </span>
                                <span className="text-[7px] font-black uppercase text-slate-300 mt-1 tracking-widest">Score</span>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className={`px-3 py-1 rounded-full border text-[7px] font-black uppercase tracking-widest ${healthScoreVal > 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    healthScoreVal > 40 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                {healthScoreVal > 75 ? 'Optimal Sync' : healthScoreVal > 40 ? 'Caution' : 'Critical Assist'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="bg-slate-900 rounded-[1.2rem] p-4 flex flex-col justify-between aspect-square lg:aspect-auto">
                            <ActivitySquare size={16} className="text-emerald-400" />
                            <div className="mt-2 text-left">
                                <p className="text-xl font-black italic text-white leading-none">{totalCal}<span className="text-[8px] ml-1 text-slate-400">kcal</span></p>
                                <p className="text-[6px] font-black uppercase tracking-widest text-slate-500 mt-1 italic">Intake Registry</p>
                            </div>
                        </div>
                        <div
                            onClick={onOpenMeds}
                            className="bg-white rounded-[1.2rem] p-4 border border-slate-100 shadow-sm flex flex-col justify-between aspect-square lg:aspect-auto cursor-pointer hover:bg-slate-50 transition-all"
                        >
                            <Pill size={16} className="text-rose-500" />
                            <div className="mt-2 text-left">
                                <p className="text-xl font-black italic text-slate-900 leading-none">{medications.length}<span className="text-[8px] ml-1 text-slate-300">rems</span></p>
                                <p className="text-[6px] font-black uppercase tracking-widest text-slate-400 mt-1 italic">Pharmacy Node</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ACTIVITY FEED (RIGHT - Internal Scroll Only) */}
                <section className="col-span-12 lg:col-span-8 bg-white rounded-[1.8rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative min-h-0">
                    <header className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20 shrink-0">
                        <div className="flex items-center gap-3">
                            <Activity size={16} className="text-slate-900" />
                            <h3 className="text-xs font-black uppercase tracking-tight italic">Protocol Activity Feed</h3>
                        </div>
                        <button
                            onClick={onOpenFoodLog}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-4 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <span>+ LOG INTAKE</span>
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
                        {activities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Layout size={28} className="mb-3 text-slate-300" />
                                <p className="text-[8px] font-black uppercase tracking-[0.4em] italic">Registry Empty</p>
                            </div>
                        ) : (
                            activities.map((act, i) => (
                                <div key={i} className="group flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-300 shadow-none hover:shadow-sm">
                                    <div className={`w-8 h-8 rounded-lg bg-white border border-${act.color}-100 flex items-center justify-center text-${act.color}-600 shadow-sm shrink-0`}>
                                        <act.icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-900 uppercase truncate">{act.title}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tabular-nums">
                                                {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            <span className={`text-${act.color}-600`}>{act.detail}</span> • BIOMETRIC VERIFIED
                                        </p>
                                    </div>
                                    <ChevronRight size={12} className="text-slate-200" />
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>

            {/* ORGAN MATRIX (BOTTOM - Super Compact, Fixed Grid) */}
            <section className="shrink-0 flex flex-col gap-4 relative z-10 pb-2">
                <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Organ Grid (First 3) */}
                    {[
                        { label: 'Liver', score: riskScores?.liver || 0, color: 'emerald', icon: Heart },
                        { label: 'Renal', score: riskScores?.kidney || 0, color: 'blue', icon: ActivitySquare },
                        { label: 'Cardiac', score: riskScores?.heart || 0, color: 'rose', icon: Heart }
                    ].map(organ => (
                        <div key={organ.label} className="bg-white rounded-[1.2rem] p-4 border border-slate-100 shadow-sm flex flex-col justify-between group">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`w-7 h-7 rounded-lg bg-${organ.color}-50 text-${organ.color}-600 flex items-center justify-center border border-${organ.color}-100/30`}>
                                    <organ.icon size={14} />
                                </div>
                                <span className="text-sm font-black italic tabular-nums leading-none tracking-tighter">{100 - organ.score}%</span>
                            </div>
                            <div className="space-y-2">
                                <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-${organ.color}-500 transition-all duration-1000`}
                                        style={{ width: `${100 - organ.score}%` }}
                                    />
                                </div>
                                <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest truncate">{organ.label} NODE</p>
                            </div>
                        </div>
                    ))}

                    {/* Forecast Card (Spans remaining on large, own row on small) */}
                    <div className="bg-slate-900 rounded-[1.2rem] p-4 flex flex-col justify-between text-white relative overflow-hidden group col-span-1 lg:col-span-2 shadow-xl">
                        <div className="flex justify-between items-center relative z-10">
                            <Target size={14} className="text-emerald-400" />
                            <span className="text-[6px] font-black uppercase tracking-widest text-slate-500 italic">7D Bio-Forecast</span>
                        </div>
                        <div className="relative z-10 mt-2">
                            <p className="text-2xl font-black italic">{(riskScores?.projection7Day || 0)}%<span className="text-[8px] ml-2 text-rose-400">Risk</span></p>
                            <p className="text-[6px] font-black uppercase tracking-[0.3em] text-slate-600 mt-0.5">SENTINEL ACTIVE</p>
                        </div>
                    </div>
                </div>

                {/* Disclaimer Footer (Slim) */}
                <footer className="bg-white/70 backdrop-blur-xl rounded-xl p-3 border border-white/80 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-slate-900 shrink-0" />
                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wide italic truncate">
                            LIFESHIELD PROTOCOL: AI ANALYSIS FOR SUPPORT. NOT A REPLACEMENT FOR PROFESSIONAL MEDICAL ADVICE.
                        </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-slate-900 text-white shrink-0 shadow-lg">
                        <span className="text-[8px] font-black italic tabular-nums tracking-tighter">LONGEVITY: +{riskScores?.longevityAge || 0.0}y</span>
                    </div>
                </footer>
            </section>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Dashboard;
