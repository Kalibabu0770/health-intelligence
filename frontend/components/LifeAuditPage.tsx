import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Activity, Apple, Dumbbell, Wind, Zap, TrendingUp, X,
    Plus, Mic, Camera, Upload, TrendingDown, Clock, Brain,
    ChevronRight, CheckCircle2, AlertTriangle, Flame, Droplet, ClipboardList, Loader2, Play, Square, Timer
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    CartesianGrid, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { usePatientContext } from '../core/patientContext/patientStore';
import { analyzeNutritionDeficiencies, getComprehensiveHealthAnalysis, analyzeFoodImage } from '../services/ai';

const LifeAuditPage: React.FC<{ embedded?: boolean, onBack?: () => void }> = ({ embedded, onBack }) => {
    const {
        nutritionLogs, activityLogs, meditationLogs, profile, riskScores,
        language, t, logFood, logMeditation, triggerAlert
    } = usePatientContext();

    const [mainTab, setMainTab] = useState<'registry' | 'analysis'>('registry');
    const [auditTab, setAuditTab] = useState<'overview' | 'nutrition' | 'vitality' | 'mind'>('overview');

    // States for Analysis
    const [nutriAnalysis, setNutriAnalysis] = useState<any>(null);
    const [compAnalysis, setCompAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCompAnalyzing, setIsCompAnalyzing] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // States for Entry
    const [mealDescription, setMealDescription] = useState('');
    const [isProcessingVision, setIsProcessingVision] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── NEURAL FOCUS TIMER STATES ──
    const [focusMinutes, setFocusMinutes] = useState('10');
    const [timeLeft, setTimeLeft] = useState(600);
    const [isActive, setIsActive] = useState(false);
    const [totalDuration, setTotalDuration] = useState(600);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sound logic using AudioContext (Clinical Ping)
    const playCompletionSound = useCallback(() => {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();

            const playNote = (freq: number, startTime: number, duration: number) => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            // Double chime
            playNote(880, audioCtx.currentTime, 1.5);
            playNote(1108.73, audioCtx.currentTime + 0.2, 1.5);
        } catch (e) {
            console.warn("Sound play failed", e);
        }
    }, []);

    // Timer Effect
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            setIsActive(false);
            playCompletionSound();
            triggerAlert('info', 'NEURAL FOCUS COMPLETE: Bio-sync established.');
            // Automatically log to registry
            logMeditation({
                id: Math.random().toString(36).substr(2, 9),
                duration: Math.round(totalDuration / 60),
                type: 'Mindfulness',
                timestamp: new Date().toISOString()
            } as any);
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, playCompletionSound, triggerAlert, logMeditation, totalDuration]);

    const handleInitializeFocus = () => {
        if (!isActive) {
            const mins = parseFloat(focusMinutes);
            if (isNaN(mins) || mins <= 0) {
                triggerAlert('warning', 'Please enter a valid duration.');
                return;
            }
            const seconds = Math.floor(mins * 60);
            setTimeLeft(seconds);
            setTotalDuration(seconds);
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Calculate stroke dash based on timeLeft
    const dashRatio = totalDuration > 0 ? timeLeft / totalDuration : 0;
    const strokeDash = 282 * dashRatio;

    useEffect(() => {
        if (auditTab === 'nutrition' && profile && nutritionLogs) {
            triggerNutritionAnalysis();
        }
    }, [auditTab, profile, nutritionLogs]);

    useEffect(() => {
        if (mainTab === 'analysis' && profile && riskScores && !compAnalysis) {
            triggerComprehensiveAnalysis();
        }
    }, [mainTab, profile, riskScores]);

    const triggerNutritionAnalysis = async () => {
        if (!profile) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeNutritionDeficiencies(profile, todayFood, language);
            setNutriAnalysis(result);
        } catch (e) {
            console.error("Nutrition analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerComprehensiveAnalysis = async () => {
        setIsCompAnalyzing(true);
        try {
            const context = { profile, nutritionLogs, activityLogs, meditationLogs, riskScores, language } as any;
            const result = await getComprehensiveHealthAnalysis(context);
            setCompAnalysis(result);
        } catch (e) {
            console.error("Comprehensive analysis failed", e);
        } finally {
            setIsCompAnalyzing(false);
        }
    };

    const handleLogEntry = () => {
        if (!mealDescription.trim()) {
            triggerAlert('warning', 'Please enter meal details.');
            return;
        }

        const entry = {
            id: Math.random().toString(36).substr(2, 9),
            description: mealDescription,
            calories: 300,
            protein: 10,
            carbs: 40,
            fat: 8,
            timestamp: new Date().toISOString()
        };

        logFood(entry as any);
        setMealDescription('');
        triggerAlert('info', 'Intake logged successfully.');
    };

    const handleVisionAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingVision(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                const result = await analyzeFoodImage(base64, language);

                if (result) {
                    const entry = {
                        id: Math.random().toString(36).substr(2, 9),
                        description: result.description || 'Analyzed Meal',
                        calories: result.calories || 300,
                        protein: result.protein || 10,
                        carbs: result.carbs || 40,
                        fat: result.fat || 8,
                        timestamp: new Date().toISOString()
                    };
                    logFood(entry as any);
                    triggerAlert('info', `Vision identified: ${entry.description}`);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Vision AI error:", error);
            triggerAlert('danger', 'Vision analysis failed.');
        } finally {
            setIsProcessingVision(false);
        }
    };

    // Data Aggregation
    const today = new Date().toDateString();
    const todayFood = (nutritionLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);
    const todayWorkout = (activityLogs || []).filter((l: any) => new Date(l.timestamp || l.date).toDateString() === today);
    const todayMed = (meditationLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);

    const totalCals = todayFood.reduce((s, l) => s + (l.calories || 0), 0);
    const totalProt = todayFood.reduce((s, l) => s + (l.protein || 0), 0);
    const workoutMins = todayWorkout.reduce((s, l) => s + (l.duration || l.minutes || 0), 0);
    const mindMins = todayMed.reduce((s, l) => s + (l.duration || l.minutes || 0), 0);

    const goals = { cals: 2200, mins: 45, mind: 20 };

    const tabs = [
        { id: 'overview', label: t.summary || 'Summary', icon: Activity, color: 'emerald' },
        { id: 'nutrition', label: t.nutrition || 'Nutrition', icon: Apple, color: 'orange' },
        { id: 'vitality', label: t.vitality || 'Vitality', icon: Dumbbell, color: 'blue' },
        { id: 'mind', label: t.mind_mood || 'Mind & Mood', icon: Wind, color: 'teal' },
    ] as const;

    // --- RENDER REGISTRY TRACK ---
    const renderRegistry = () => {
        switch (auditTab) {
            case 'overview':
                return (
                    <div className="h-full w-full grid grid-cols-12 gap-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="col-span-12 space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 italic">{t.daily_registry || 'Daily Registry Logs'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { label: t.metabolic_fuel || 'Metabolic Fuel', val: totalCals, goal: goals.cals, unit: 'kcal', color: 'orange', icon: Flame },
                                    { label: t.kinetic_output || 'Kinetic Output', val: workoutMins, goal: goals.mins, unit: 'min', color: 'blue', icon: Zap },
                                    { label: t.neural_recovery || 'Neural Recovery', val: mindMins, goal: goals.mind, unit: 'min', color: 'teal', icon: Wind }
                                ].map((card, i) => (
                                    <div key={i} className="bg-white p-7 rounded-xl border border-slate-100 shadow-sm space-y-4 group transition-all">
                                        <div className="flex justify-between items-center">
                                            <div className={`p-3.5 rounded-xl bg-${card.color}-50 text-${card.color}-600 border border-${card.color}-100`}><card.icon size={22} /></div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{Math.round((card.val / card.goal) * 100)}%</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{card.label}</p>
                                            <p className="text-3xl font-black text-slate-900 italic">{card.val}<span className="text-xs font-bold ml-2 opacity-30">{card.unit}</span></p>
                                        </div>
                                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                            <div className={`h-full bg-${card.color}-500 transition-all duration-1000`} style={{ width: `${Math.min(100, (card.val / card.goal) * 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white p-10 rounded-xl border border-slate-50 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-500 text-slate-900 rounded-xl flex items-center justify-center shadow-lg"><ClipboardList size={26} /></div>
                                <h4 className="text-xl font-black uppercase text-slate-900 italic tracking-tight">{t.maintenance_console || 'Precision Monitor Console'}</h4>
                                <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed italic max-w-sm">
                                    {t.maintenance_console_desc || 'Document your metabolic intake, kinetic output, and neural rest phases to strengthen your bio-profile.'}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'nutrition':
                return (
                    <div className="h-full w-full grid grid-cols-12 gap-6 animate-in slide-in-from-right duration-500">
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">{t.meal_registration || 'In-take Entry'}</h3>
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">Vision Node Active</p>
                                    </div>
                                    <div className="bg-orange-50 text-orange-500 p-3 rounded-xl border border-orange-100">
                                        {isProcessingVision ? <Loader2 size={24} className="animate-spin" /> : <Apple size={24} />}
                                    </div>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={mealDescription}
                                        onChange={(e) => setMealDescription(e.target.value)}
                                        placeholder={t.type_meal_details || "Type meal details..."}
                                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (isListening) return;
                                            setIsListening(true);
                                            startListening(language, text => setMealDescription(text), () => setIsListening(false));
                                        }}
                                        className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all active:scale-95 ${isListening ? 'text-rose-500 animate-pulse' : 'text-orange-400 hover:text-orange-600'}`}
                                    >
                                        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={20} /></span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        disabled={isProcessingVision}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 bg-orange-600 text-slate-900 font-black uppercase text-[10px] tracking-widest py-5 rounded-xl active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                                    >
                                        <Camera size={16} /> {isProcessingVision ? 'Scanning...' : (t.vision_ai || 'Vision AI')}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleVisionAI}
                                    />
                                    <button
                                        onClick={handleLogEntry}
                                        className="flex items-center justify-center gap-2 bg-emerald-100 border-2 border-emerald-500 text-slate-900 font-black uppercase text-[9px] tracking-widest py-4 rounded-xl active:scale-95 transition-all"
                                    >
                                        <Plus size={14} /> {t.log_entry || 'Log Entry'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-white rounded-xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">{t.daily_intake_log || 'Intake History'}</p>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {todayFood.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 opacity-20">
                                            <ClipboardList size={32} />
                                            <p className="text-[8px] font-black uppercase mt-2">No entries today</p>
                                        </div>
                                    ) : (
                                        todayFood.map((food, i) => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-white">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{food.description}</p>
                                                    <p className="text-[7px] font-black text-slate-400 uppercase mt-1">{new Date(food.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                <p className="text-[10px] font-black text-orange-600 tabular-nums italic">{food.calories} KC</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                            <div className="bg-white/60  rounded-xl p-8 border border-white/80 shadow-sm flex-1 flex flex-col gap-6 overflow-hidden">
                                <div className="flex justify-between items-center shrink-0">
                                    <div>
                                        <h4 className="text-lg font-black uppercase text-slate-900 italic tracking-tight">{t.bio_fuel_protocol || 'Bio-Fuel Recommendations'}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Calibrated for {profile?.location || 'Your Region'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-orange-500 animate-pulse' : 'bg-emerald-100'}`} />
                                        <span className="text-[7px] font-black uppercase text-slate-400">{isAnalyzing ? 'Syncing...' : 'Stable'}</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                                    {(isAnalyzing && !nutriAnalysis) ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                                            <Loader2 size={40} className="text-orange-500 animate-spin opacity-40" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 italic">Synchronizing Bio-Link...</p>
                                                <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Compiling regional health markers</p>
                                            </div>
                                        </div>
                                    ) : (nutriAnalysis?.recommendations || nutriAnalysis?.suggestions) ? (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest">{t.regional_veg || 'Regional Veg'}</h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(nutriAnalysis.recommendations?.vegetarian || nutriAnalysis.suggestions?.vegetarian)?.map((item: any, i: number) => (
                                                            <div key={i} className="bg-white/60 border border-slate-100 p-4 rounded-xl hover:border-orange-200 transition-colors">
                                                                <span className="text-[10px] font-black text-slate-900 uppercase italic">{item.food}</span>
                                                                <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 leading-tight">{item.reason}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <div className="w-1 h-4 bg-rose-500 rounded-full" />
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest">{t.regional_nonveg || 'Regional Non-Veg'}</h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(nutriAnalysis.recommendations?.nonVegetarian || nutriAnalysis.suggestions?.nonVegetarian)?.map((item: any, i: number) => (
                                                            <div key={i} className="bg-white/60 border border-slate-100 p-4 rounded-xl hover:border-rose-200 transition-colors">
                                                                <span className="text-[10px] font-black text-slate-900 uppercase italic">{item.food}</span>
                                                                <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 leading-tight">{item.reason}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-100 border-2 border-emerald-500 rounded-xl p-5 text-slate-900 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={32} /></div>
                                                <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Diagnostic Insight</p>
                                                <p className="text-[10px] font-medium leading-relaxed uppercase italic opacity-90">
                                                    {nutriAnalysis.instruction || "Select any 2-3 items from these lists to restore biological balance and metabolic readiness."}
                                                </p>
                                            </div>

                                            <button
                                                onClick={triggerNutritionAnalysis}
                                                className="w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-[7px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 hover:bg-white transition-all"
                                            >
                                                {isAnalyzing ? "Recalibrating..." : "Recalibrate Nutrition Protocol"}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-30 py-10">
                                            <Apple size={40} className="text-orange-500 opacity-60" />
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em]">Awaiting Bio-Link...</p>
                                                <button
                                                    onClick={triggerNutritionAnalysis}
                                                    className="mt-3 px-6 py-2 bg-emerald-100 border-2 border-emerald-500 text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest"
                                                >
                                                    Tap to Sync
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-emerald-100 border-2 border-emerald-500 p-7 rounded-xl border border-slate-100 flex justify-between items-center group shadow-2xl">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-orange-500 transition-transform group-hover:scale-110"><TrendingUp size={24} /></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.metabolic_efficiency || 'Metabolic Sync'}</p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mt-0.5 italic">Real-time Analysis active</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-400 tabular-nums">+15%</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'vitality':
                return (
                    <div className="h-full w-full grid grid-cols-12 gap-6 animate-in slide-in-from-right duration-500">
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm space-y-5">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 italic">{t.kinetic_registration || 'Kinetic Registry'}</h3>
                                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">Stress Node v2.1</p>
                                    </div>
                                    <div className="bg-emerald-50 text-blue-500 p-2.5 rounded-xl border border-blue-100"><Dumbbell size={20} /></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <input type="text" id="activity-input" placeholder={t.activity_placeholder || "Activity type..."} className="w-full bg-slate-50 border border-slate-200 p-4 pr-12 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 transition-all" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (isListening) return;
                                                setIsListening(true);
                                                const el = document.getElementById('activity-input') as HTMLInputElement;
                                                startListening(language, text => { if (el) el.value = text; }, () => setIsListening(false));
                                            }}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all active:scale-90 ${isListening ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}
                                        >
                                            <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={16} /></span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input type="number" id="duration-input" placeholder={t.duration_placeholder || "Duration (min)..."} className="w-full bg-slate-50 border border-slate-200 p-4 pr-12 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 transition-all" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (isListening) return;
                                                setIsListening(true);
                                                const el = document.getElementById('duration-input') as HTMLInputElement;
                                                startListening(language, text => { if (el) el.value = text.replace(/\D/g, ''); }, () => setIsListening(false));
                                            }}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all active:scale-90 ${isListening ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}
                                        >
                                            <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={16} /></span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const act = (document.getElementById('activity-input') as HTMLInputElement)?.value;
                                            const dur = (document.getElementById('duration-input') as HTMLInputElement)?.value;
                                            if (act && dur) {
                                                // Handle logging
                                                triggerAlert('info', 'Kinetic Phase Registered');
                                                (document.getElementById('activity-input') as HTMLInputElement).value = '';
                                                (document.getElementById('duration-input') as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="w-full bg-blue-600 text-slate-900 font-black uppercase text-[9px] tracking-widest py-4 rounded-xl active:scale-[0.98] transition-all"
                                    >
                                        {t.log_movement || 'Log Kinetic Phase'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-white rounded-xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t.daily_movement_cycle || 'Movement Timeline'}</p>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {todayWorkout.map((w, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-white">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-emerald-600 flex items-center justify-center font-black text-[10px] italic shadow-sm">{Math.round(w.duration || w.minutes || 0)}</div>
                                                <p className="text-[10px] font-black uppercase text-slate-900">{(w.activity || w.description || 'Workout')}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-7 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center p-10">
                            <Dumbbell size={40} className="text-blue-500 mb-5 opacity-10" />
                            <h4 className="text-lg font-black uppercase text-slate-900 italic tracking-tight">{t.kinetic_maintenance || 'Kinetic Maintenance'}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic max-sm:max-w-xs max-w-sm">
                                Register your physical exertion nodes to visualize power pulses and cardiac resilience in the analysis track.
                            </p>
                        </div>
                    </div>
                );
            case 'mind':
                return (
                    <div className="h-full w-full grid grid-cols-12 gap-6 animate-in slide-in-from-right duration-500">
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="bg-teal-50 text-teal-600 p-4 rounded-xl border border-teal-100"><Wind size={32} /></div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 italic">{t.focus_node || 'Neural Focus Node'}</h3>

                                {/* Custom Time Input (Professional Styled) */}
                                {!isActive && (
                                    <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-1">
                                        {['5', '10', '20', '30'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setFocusMinutes(m)}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${focusMinutes === m ? 'bg-teal-600 text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {m}m
                                            </button>
                                        ))}
                                        <div className="w-[1px] bg-slate-200 mx-1" />
                                        <input
                                            type="number"
                                            value={focusMinutes}
                                            onChange={(e) => setFocusMinutes(e.target.value)}
                                            className="w-12 bg-transparent text-[9px] font-black uppercase text-center outline-none text-slate-900"
                                            placeholder="..."
                                        />
                                    </div>
                                )}

                                <div className="relative w-44 h-44 flex items-center justify-center">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                                        <circle
                                            cx="50" cy="50" r="45" fill="none"
                                            stroke="#14b8a6" strokeWidth="6"
                                            strokeLinecap="round"
                                            strokeDasharray="282.7"
                                            strokeDashoffset={282.7 - (dashRatio * 282.7)}
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <p className={`absolute text-3xl font-black tabular-nums italic ${isActive ? 'text-teal-600' : 'text-slate-900'}`}>
                                        {formatTime(timeLeft)}
                                    </p>
                                </div>
                                <button
                                    onClick={handleInitializeFocus}
                                    className={`w-full font-black uppercase text-[10px] tracking-widest py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isActive ? 'bg-rose-500 text-slate-900 shadow-rose-100' : 'bg-teal-600 text-slate-900 shadow-teal-100'
                                        }`}
                                >
                                    {isActive ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    {isActive ? 'Terminate Connection' : (t.init_mind_link || 'Initialize Focus')}
                                </button>
                            </div>
                        </div>
                        <div className="col-span-12 lg:col-span-7 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center p-10">
                            <Wind size={40} className="text-teal-500 mb-5 opacity-10" />
                            <h4 className="text-lg font-black uppercase text-slate-900 italic tracking-tight">{t.neural_maintenance || 'Neural Recovery'}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic max-w-sm">
                                Duration calibrated. A clinical notification sound will signal completion. Log your de-stress sessions to unlock trend mapping.
                            </p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    // --- RENDER ANALYSIS TRACK ---
    const renderAnalysis = () => (
        <div className="h-full w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 min-h-0 pb-1">
            <div className="flex-[1.2] min-h-0 bg-white rounded-xl border border-slate-50 p-6 flex flex-col shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-colors">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-6 transition-transform duration-1000"><TrendingUp size={100} /></div>
                <div className="flex justify-between items-start mb-3 shrink-0">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 italic leading-none">{t.holistic_perf_radar || 'Bio-Resilience Trend'}</h2>
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 italic">METABOLIC & KINETIC SYNC RATIO</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border border-emerald-100 shadow-sm">{t.live_resilience || 'Live'}: 84%</div>
                </div>
                <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendDataMock} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.2} />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 900, fill: '#94a3b8' }} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }} />
                            <Area type="monotone" dataKey="vitality" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVit)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-slate-50 p-6 shadow-sm flex flex-col justify-center">
                    <h3 className="text-[8px] font-black uppercase tracking-[0.2em] mb-4 opacity-40 text-slate-500 italic">Molecular Component Analytics</h3>
                    <div className="flex items-center gap-6 flex-1 min-h-0">
                        <div className="h-full aspect-square flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Prot', value: totalProt || 20 }, { name: 'Carb', value: 40 }, { name: 'Fat', value: 15 }]} cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" stroke="none">
                                        {[0, 1, 2].map((i) => <Cell key={i} fill={['#3b82f6', '#10b981', '#ef4444'][i]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-3">
                            {[
                                { label: t.fiber_density || 'Fiber', val: 12, goal: 30, color: 'emerald' },
                                { label: t.hydration_link || 'Hydration', val: 65, goal: 100, color: 'blue' },
                                { label: t.sugar_bio_load || 'Sugar', val: 80, goal: 100, color: 'rose' }
                            ].map((g, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[7px] font-black uppercase italic">
                                        <span className="text-slate-400">{g.label}</span>
                                        <span className="text-slate-900 group-hover:text-emerald-600 transition-colors">{g.val}<span className="text-slate-200">/</span>{g.goal}</span>
                                    </div>
                                    <div className="h-1 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                        <div className={`h-full bg-${g.color}-500 transition-all duration-1000`} style={{ width: `${(g.val / g.goal) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-5 bg-indigo-600 rounded-xl p-6 text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Brain size={120} /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-slate-100"><Zap size={20} className="text-indigo-200" /></div>
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-300 italic">Advisor Bio-Sync</span>
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight italic leading-none mb-3">{t.neural_advisor_node || 'Neural Advisor'}</h4>
                        <div className="max-h-[80px] overflow-y-auto custom-thin-scrollbar pr-2 leading-snug">
                            <p className="text-[10px] font-bold uppercase italic opacity-90 tracking-tight">
                                {compAnalysis?.summary || (isCompAnalyzing ? "Synthesizing health-stack data..." : t.init_biometric_analysis || "Initialize biometric analysis for strategic insights.")}
                            </p>
                        </div>
                    </div>
                    <button onClick={triggerComprehensiveAnalysis} className="relative z-10 w-full bg-white text-emerald-600 font-black py-3.5 rounded-xl text-[8px] uppercase tracking-widest mt-4 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20">
                        {isCompAnalyzing ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Recalibrate Advisor'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`h-full w-full flex flex-col overflow-hidden bg-white text-slate-900 font-sans`}>
            <div className="bg-white border-b border-slate-50 px-8 py-4 flex flex-col lg:flex-row justify-between items-center shrink-0 gap-4">
                <div className="flex items-center gap-5">
                    <div className="w-11 h-11 bg-emerald-100 border-2 border-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-200 transition-transform hover:scale-105">
                        <Activity size={22} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.4em] leading-none mb-1.5">{t.bio_monitor || 'Integrated Bio-Monitor'}</p>
                        <h1 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none italic">{t.life_audit_hub || 'Life Audit Hub'}</h1>
                    </div>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                    <button onClick={() => setMainTab('registry')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${mainTab === 'registry' ? `bg-white shadow-sm text-slate-900 border border-slate-200/50` : 'text-slate-400 hover:text-slate-600'}`}>
                        <ClipboardList size={12} /> <span>{t.registry_logs || 'Logs'}</span>
                    </button>
                    <button onClick={() => setMainTab('analysis')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${mainTab === 'analysis' ? `bg-white shadow-sm text-slate-900 border border-slate-200/50` : 'text-slate-400 hover:text-slate-600'}`}>
                        <Zap size={12} /> <span>{t.biometric_analysis || 'Analysis'}</span>
                    </button>
                </div>

                <div className="flex gap-3">
                    {mainTab === 'registry' && (
                        <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 shadow-sm">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setAuditTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[7px] font-black uppercase transition-all ${auditTab === tab.id ? `bg-white shadow-sm text-slate-900 border border-slate-200/30` : 'text-slate-400 hover:text-slate-500'}`}>
                                    <tab.icon size={10} /> <span className="hidden xl:inline">{tab.label.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {onBack && <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-100 transition-all active:scale-90"><X size={16} /></button>}
                </div>
            </div>

            <div className="flex-1 p-5 overflow-hidden min-h-0 bg-transparent relative z-10">
                <div className="max-w-7xl mx-auto h-full w-full">
                    {mainTab === 'registry' ? (
                        <div className="h-full overflow-y-auto custom-scrollbar pr-1 pb-4">
                            {renderRegistry()}
                        </div>
                    ) : renderAnalysis()}
                </div>
            </div>

            <div className="shrink-0 h-10 bg-white border-t border-slate-50 px-8 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 shadow-sm"><Zap size={8} /></div>
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em]">REAL-TIME BIOLINK <span className="text-slate-900 ml-2">v2.4.0</span></p>
                </div>
                <p className="text-[7px] font-black text-slate-200 uppercase tracking-[0.4em] italic pointer-events-none">{t.protocol_alpha || 'HEALTH INTELLIGENCE HUB ©2026'}</p>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; } .custom-thin-scrollbar::-webkit-scrollbar { width: 2px; } .custom-thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }`}</style>
        </div>
    );
};

const trendDataMock = [
    { time: '08:00', vitality: 65 }, { time: '10:00', vitality: 72 }, { time: '12:00', vitality: 68 },
    { time: '14:00', vitality: 85 }, { time: '16:00', vitality: 78 }, { time: '18:00', vitality: 90 }, { time: '20:00', vitality: 84 },
];

export default LifeAuditPage;
