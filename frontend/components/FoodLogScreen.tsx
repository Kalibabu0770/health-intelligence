import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft, Camera, Loader2, Upload, Mic, Plus, TrendingUp, Apple, AlertTriangle,
    ShieldCheck, BarChart as BarChartIcon, Pencil
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { usePatientContext } from '../core/patientContext/patientStore';
import { analyzeNutritionDeficiencies, analyzeFoodImage } from '../services/ai';
import { startListening } from '../services/speech';
import { getWorkBasedNutrition } from '../core/patientContext/riskEngine';

const FoodLogScreen: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
    const { nutritionLogs, logFood, profile, language, t } = usePatientContext();
    const lt = t;
    const [analyzing, setAnalyzing] = useState(false);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [deficiencyAnalysis, setDeficiencyAnalysis] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const todayLogs = nutritionLogs.filter(l => {
            const d = new Date(l.timestamp);
            const now = new Date();
            return d.toDateString() === now.toDateString();
        });

        if (profile && todayLogs.length > 0) {
            analyzeNutritionDeficiencies(profile, todayLogs, language).then(setDeficiencyAnalysis);
        }
    }, [nutritionLogs, profile, language]);

    const getChartData = () => {
        const days = viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 1;
        const data = [];
        const now = new Date();

        if (viewMode === 'day') {
            const todayLogs = nutritionLogs.filter(l => new Date(l.timestamp).toDateString() === now.toDateString());
            return todayLogs.map(l => ({
                name: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                calories: l.calories,
                protein: l.protein,
                fat: l.fat,
                carbs: l.carbs
            }));
        }

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const dayEnd = dayStart + 86400000;
            const dayLogs = nutritionLogs.filter(l => l.timestamp >= dayStart && l.timestamp < dayEnd);

            data.push({
                name: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
                calories: dayLogs.reduce((acc, l) => acc + l.calories, 0),
                protein: dayLogs.reduce((acc, l) => acc + (l.protein || 0), 0),
                fat: dayLogs.reduce((acc, l) => acc + (l.fat || 0), 0),
                carbs: dayLogs.reduce((acc, l) => acc + (l.carbs || 0), 0),
            });
        }
        return data;
    };

    const chartData = getChartData();

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);

        try {
            const resizeImage = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_DIM = 640;
                            if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
                            else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
                            canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
                        };
                        img.src = event.target?.result as string;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const base64 = await resizeImage(file);
            const result = await analyzeFoodImage(base64, language);

            logFood({
                id: Date.now().toString(),
                description: result.description || "Unidentified Meal",
                calories: result.calories || 0,
                protein: result.protein || 0,
                carbs: result.carbs || 0,
                fat: result.fat || 0,
                timestamp: Date.now(),
                imageUrl: `data:image/jpeg;base64,${base64}`
            });
        } catch (err: any) {
            alert((t.clinical_analysis_error || "Clinical analysis error: {error}. Ensure Ollama is running with 'llava' model.").replace('{error}', err.message));
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 p-6 overflow-hidden animate-in fade-in duration-500">
            {/* 1. HEADER */}
            {!embedded && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all active:scale-90 border border-slate-100"><ChevronLeft size={20} /></button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{t.nutrition_lab}</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Metabolic Fuel Synthesis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AI Diagnostics Active</span>
                    </div>
                </div>
            )}

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* LEFT: LOGGING LAYER (40%) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
                    {/* MANUAL ENTRY */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Plus size={80} /></div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-orange-50 p-2.5 rounded-xl text-orange-600 border border-orange-100"><Pencil size={18} /></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Log Entry</h4>
                        </div>
                        <div className="relative">
                            <input
                                className="w-full p-5 pr-14 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                                placeholder="E.G. 2 CHAPATIS & DAAL"
                                id="manualFoodInput"
                            />
                            <button
                                onClick={() => startListening(language, text => {
                                    const input = document.getElementById('manualFoodInput') as HTMLInputElement;
                                    if (input) input.value = text;
                                })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-orange-600 active:scale-90 hover:bg-orange-50 rounded-xl transition-all"
                            >
                                <Mic size={22} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const input = document.getElementById('manualFoodInput') as HTMLInputElement;
                                if (input?.value) {
                                    logFood({ id: Date.now().toString(), description: input.value, calories: 150, protein: 5, carbs: 20, fat: 5, timestamp: Date.now() });
                                    input.value = '';
                                }
                            }}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-xl flex justify-center items-center gap-4 active:scale-95 hover:bg-black transition-all"
                        >
                            <Plus size={20} />
                            Execute Intake Log
                        </button>
                    </div>

                    {/* AI SCANNER */}
                    <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center text-center space-y-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
                            {analyzing ? <Loader2 className="animate-spin" size={32} /> : <Camera size={32} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{t.food_scanner}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{t.scanning_safety || "Visual Molecular Analysis"}</p>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={analyzing}
                            className="w-full bg-orange-600 text-white font-black py-6 rounded-[2rem] shadow-xl hover:bg-orange-700 active:scale-95 disabled:opacity-50 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 relative z-10"
                        >
                            {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            {analyzing ? "Synthesizing Data" : "Launch AI Bio-Scanner"}
                        </button>
                        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                    </div>
                </div>

                {/* RIGHT: ANALYTICAL HUB (60%) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 min-h-0 bg-slate-50/50 p-6 rounded-[3rem] border border-slate-100">
                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                        {profile && (
                            <div className="space-y-8">
                                {/* LAB PREDICTOR */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform"><TrendingUp size={120} /></div>
                                    <div className="relative z-10 grid grid-cols-12 gap-8 items-center">
                                        <div className="col-span-12 lg:col-span-5 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><Apple size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{lt.energy_predictor || "Labor Energy Predictor"}</p>
                                                    <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900">{profile.profession || "General Public"}</h3>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner flex flex-col items-center justify-center text-center">
                                                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{t.daily_target}</span>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-4xl font-black text-slate-900">{getWorkBasedNutrition(profile).suggestedCalories}</p>
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Kcal</p>
                                                </div>
                                                <p className="text-[8px] font-black text-emerald-500 uppercase mt-2 tracking-[0.2em]">{t.for_labor.replace('{hours}', (profile.workHoursPerDay || 8).toString())}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-12 lg:col-span-7 space-y-6">
                                            <div className="space-y-4">
                                                {(() => {
                                                    const rec = getWorkBasedNutrition(profile);
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                                                                <span className="text-blue-600">Prot: {rec.macronutrients.protein}</span>
                                                                <span className="text-emerald-600">Carb: {rec.macronutrients.carbs}</span>
                                                                <span className="text-orange-600">Fat: {rec.macronutrients.fat}</span>
                                                            </div>
                                                            <div className="bg-slate-100 h-3 w-full rounded-full overflow-hidden flex shadow-inner">
                                                                <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" style={{ width: rec.macronutrients.protein }}></div>
                                                                <div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: rec.macronutrients.carbs }}></div>
                                                                <div className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]" style={{ width: rec.macronutrients.fat }}></div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {rec.focusFoods.map(f => (
                                                                    <span key={f} className="text-[8px] font-black uppercase px-3 py-1.5 rounded-lg border border-slate-100 bg-white text-slate-600 shadow-sm">{f}</span>
                                                                ))}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DEFICIENCY ANALYSIS */}
                                {deficiencyAnalysis && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] scale-125 rotate-12 text-emerald-500"><ShieldCheck size={120} /></div>
                                        <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
                                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 border border-emerald-100"><ShieldCheck size={24} /></div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t.deficiency_analysis}</h3>
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Metabolic Optimization Protocol</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100/50 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle size={16} className="text-rose-500" />
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t.detected_gaps}</span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {deficiencyAnalysis.deficiencies?.map((d: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-3 text-[11px] font-black text-rose-900 uppercase">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shadow-sm" />
                                                            {d}
                                                        </li>
                                                    )) || <li className="text-[11px] font-black text-slate-400 uppercase italic">Homeostasis Maintained</li>}
                                                </ul>
                                            </div>
                                            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={16} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{t.remaining_needs}</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-blue-900 leading-relaxed italic">"{deficiencyAnalysis.remainingNeeds}"</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* VISUAL TRENDS */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                                    <div className="flex justify-between items-center px-2">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 p-3 rounded-2xl text-slate-500"><BarChartIcon size={20} /></div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{t.micro_trends}</h3>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Macro-Nutrient Synthesis</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                                            {(['day', 'week', 'month'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setViewMode(m)}
                                                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all ${viewMode === m ? 'bg-white shadow-md text-emerald-600 ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {t[m]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-72 w-full px-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                                    labelStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}
                                                    itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', padding: '2px 0' }}
                                                />
                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '30px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                                <Bar dataKey="calories" name={t.cals} fill="#f97316" radius={[6, 6, 0, 0]} barSize={viewMode === 'day' ? 40 : undefined} />
                                                <Bar dataKey="protein" name={t.prot} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="fat" name={t.fat} fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="carbs" name={t.carbs} fill="#10b981" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodLogScreen;
