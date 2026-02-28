import React, { useState, useEffect } from 'react';
import { Activity, Leaf, ShieldCheck, Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { orchestrateHealth } from '../services/ai';

const AYUSHHealthSystem: React.FC = () => {
    const context = usePatientContext();
    const { profile, language, t } = context;
    const [page, setPage] = useState<1 | 2 | 3>(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ayushResult, setAyushResult] = useState<any>(null);

    useEffect(() => {
        if (!ayushResult) {
            handleAnalysis();
        }
    }, []);

    const handleAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const res = await orchestrateHealth(context as any, {
                query: "Analyze my dosha and recommend ayush treatments",
                problem_context: `AYUSH full assessment`
            });
            if (res?.ayush) setAyushResult(res.ayush);
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Leaf size={64} className="text-emerald-500 animate-pulse mb-6" />
                <h2 className="text-2xl font-black text-slate-900 uppercase">Consulting Ancient Wisdom</h2>
                <p className="text-sm font-bold text-slate-500 mt-2">Checking your body balance (Prakriti) and finding the best natural remedies...</p>
            </div>
        );
    }

    // Default mock data if API fails to provide structure
    const prakriti = ayushResult?.prakriti || 'VATA (Air & Space)';
    const doshaImbalance = 'Your Vata is slightly high, causing dryness or mild joint pain.';
    const herbs = ayushResult?.dinacharya || ['Ashwagandha: Take 1 spoon with warm milk at night.', 'Triphala: Take before sleep to clean the stomach.'];
    const diet = ayushResult?.ritucharya || ['Eat warm, cooked meals like soups or daal.', 'Avoid very cold drinks or dry snacks.', 'Drink warm ginger water in the morning.'];
    const yoga = ['Surya Namaskar (Sun Salutation) - 5 times.', 'Deep Breathing (Pranayama) for 10 minutes to calm the mind.'];

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans">

            {/* Header / Guidance Box */}
            <header className="bg-white border-b-4 border-emerald-500 p-6 shrink-0 shadow-sm flex items-start gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                    <Leaf size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">Your Natural Health Guide (AYUSH)</h1>
                    <p className="text-sm font-bold text-slate-600 mt-1">
                        {page === 1 && "Page 1 of 3: Let's understand your body type."}
                        {page === 2 && "Page 2 of 3: Here are some natural herbal medicines for you."}
                        {page === 3 && "Page 3 of 3: What to eat and how to exercise."}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-6 relative">
                {/* PAGE 1: PRAKRITI & DOSHA */}
                {page === 1 && (
                    <div className="h-full w-full bg-white border-2 border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in slide-in-from-right-5">
                        <h2 className="text-3xl font-black text-emerald-800 mb-6 uppercase">1. Your Body Type (Prakriti)</h2>
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
                            <div className="w-32 h-32 bg-emerald-50 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 shadow-xl">
                                <Activity size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-500 uppercase tracking-widest">You are primarily:</h3>
                                <p className="text-4xl font-black text-slate-900 mt-2">{prakriti}</p>
                            </div>
                            <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-xl max-w-lg">
                                <p className="text-lg font-bold text-slate-700">{doshaImbalance}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE 2: HERBAL MEDICINE */}
                {page === 2 && (
                    <div className="h-full w-full bg-white border-2 border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in slide-in-from-right-5">
                        <h2 className="text-3xl font-black text-emerald-800 mb-6 uppercase">2. Natural Herbal Medicines</h2>
                        <div className="flex-1 overflow-y-auto space-y-4">
                            <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-xl mb-6">
                                <p className="text-lg font-bold text-slate-700">These herbs are safe and help bring your body back to balance.</p>
                            </div>
                            {herbs.map((herb: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 bg-white border-2 border-slate-200 p-6 rounded-xl shadow-sm">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                        <Leaf size={24} />
                                    </div>
                                    <p className="text-xl font-black text-slate-800">{herb}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PAGE 3: DIET & YOGA */}
                {page === 3 && (
                    <div className="h-full w-full bg-white border-2 border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in slide-in-from-right-5">
                        <h2 className="text-3xl font-black text-emerald-800 mb-6 uppercase">3. Food & Exercise (Yoga)</h2>
                        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-8">
                            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-xl flex flex-col">
                                <h3 className="text-2xl font-black text-amber-800 mb-4 uppercase">What to Eat (Diet)</h3>
                                <ul className="space-y-4 flex-1">
                                    {diet.map((d: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                                            <span className="text-lg font-bold text-slate-700">{d}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl flex flex-col">
                                <h3 className="text-2xl font-black text-blue-800 mb-4 uppercase">How to Exercise (Yoga)</h3>
                                <ul className="space-y-4 flex-1">
                                    {yoga.map((y: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                            <span className="text-lg font-bold text-slate-700">{y}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <footer className="bg-white border-t-2 border-slate-200 p-6 shrink-0 flex justify-between items-center">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1) as any)}
                    disabled={page === 1}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-lg disabled:opacity-30 transition-all hover:bg-slate-200"
                >
                    <ArrowLeft size={24} /> BACK
                </button>
                <div className="flex gap-3">
                    <div className={`w-16 h-4 rounded-full ${page >= 1 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                    <div className={`w-16 h-4 rounded-full ${page >= 2 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                    <div className={`w-16 h-4 rounded-full ${page >= 3 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                </div>
                <button
                    onClick={() => setPage((p) => Math.min(3, p + 1) as any)}
                    disabled={page === 3}
                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-lg disabled:opacity-30 transition-all hover:bg-emerald-700 shadow-md"
                >
                    NEXT <ArrowRight size={24} />
                </button>
            </footer>

        </div>
    );
};

export default AYUSHHealthSystem;
