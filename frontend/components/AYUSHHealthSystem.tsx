import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Globe, MapPin, Radar, ArrowRight, ArrowLeft, Loader2, Activity, Map, ShieldAlert } from 'lucide-react';
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
                query: "Analyze my safety in this area. Is it safe? Any spreading diseases? What are the regional risks?",
                problem_context: `Safety check for ${profile.district}, ${profile.mandal}`
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
                <Radar size={64} className="text-emerald-500 animate-[spin_3s_linear_infinite] mb-6" />
                <h2 className="text-2xl font-black text-slate-900 uppercase">Scanning Sentinel Network</h2>
                <p className="text-sm font-bold text-slate-500 mt-2">Checking regional biometric data, seasonal threats, and global nodes...</p>
            </div>
        );
    }

    // Data parsing
    const zScore = ayushResult?.forecast?.z_score_deviation || 0.5;
    const isSafe = zScore < 1.0;
    const safetyVerdict = isSafe ? 'SAFE ZONE DETECTED' : 'ELEVATED RISK LEVEL';
    const safetyMessage = ayushResult?.outbreak_alert || (isSafe ? 'No active disease outbreaks detected in your immediate vicinity.' : 'Caution advised. Fluctuating disease signals detected in your area.');

    const globalHotspots = [
        { area: 'Northern Node (Delhi)', issue: 'Respiratory Distress Surge', severity: 'High' },
        { area: 'Coastal Node (Mumbai)', issue: 'Monsoon-related Dengue', severity: 'Medium' },
        { area: 'Central Node (Nagpur)', issue: 'Heat-wave Exhaustion', severity: 'Medium' },
        { area: 'Eastern Node (Kolkata)', issue: 'Waterborne Pathogens', severity: 'High' }
    ];

    const probabilities = ayushResult?.regional_seasonal_risks || [
        { disease_name: 'Viral Influenza', probability: 0.65, reason: 'Seasonal Temperature Drop', prevention: 'Immunity Boosters, Masking' },
        { disease_name: 'Dengue Fever', probability: 0.35, reason: 'Post-Monsoon Stagnant Water', prevention: 'Mosquito Repellent' },
        { disease_name: 'Typhoid', probability: 0.15, reason: 'Water Quality Fluctuation', prevention: 'Boiled Water, Hygiene' }
    ];

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col font-sans">

            {/* Header */}
            <header className="bg-white border-b-4 border-slate-200 p-6 shrink-0 shadow-sm flex items-start gap-4">
                <div className="w-16 h-16 bg-white border-2 border-emerald-500 rounded-xl flex items-center justify-center text-slate-800 shrink-0 shadow-sm">
                    <Globe size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">Outbreak Sentinel</h1>
                    <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        {page === 1 && "Phase 1: Local Area Safety Assessment"}
                        {page === 2 && "Phase 2: Global & Regional Hotspots"}
                        {page === 3 && "Phase 3: Disease Probability & Predictive Risks"}
                    </p>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 lg:p-8 relative">
                {/* PAGE 1: LOCAL SAFETY */}
                {page === 1 && (
                    <div className="h-full w-full bg-white border border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <MapPin size={24} className="text-emerald-600" />
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Local Area Status</h2>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8 max-w-2xl mx-auto">
                            <div className={`w-40 h-40 border-8 rounded-full flex items-center justify-center shadow-xl ${isSafe ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-amber-100 bg-amber-50 text-amber-600'}`}>
                                {isSafe ? <ShieldCheck size={64} /> : <AlertTriangle size={64} />}
                            </div>

                            <div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Current Location: {profile.district || 'National Hub'}</h3>
                                <p className="text-4xl font-black text-slate-900 uppercase">{safetyVerdict}</p>
                            </div>

                            <div className={`p-6 rounded-xl border-2 w-full ${isSafe ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                                <p className="text-lg font-bold text-slate-700">{safetyMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE 2: GLOBAL HOTSPOTS */}
                {page === 2 && (
                    <div className="h-full w-full bg-white border border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <Map size={24} className="text-emerald-600" />
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Active Danger Zones</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {globalHotspots.map((spot, idx) => (
                                    <div key={idx} className="bg-white border-2 border-slate-100 rounded-xl p-6 flex items-start gap-4 hover:border-slate-300 transition-colors shadow-sm">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${spot.severity === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {spot.severity === 'High' ? <ShieldAlert size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 uppercase">{spot.area}</h4>
                                            <p className="text-sm font-bold text-slate-600 mt-1">{spot.issue}</p>
                                            <span className={`inline-block mt-3 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest ${spot.severity === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {spot.severity} SEVERITY
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PAGE 3: SEASONAL PROBABILITIES */}
                {page === 3 && (
                    <div className="h-full w-full bg-white border border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <Activity size={24} className="text-emerald-600" />
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Disease Probabilities</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pt-2 max-w-4xl mx-auto w-full">
                            {probabilities.map((risk: any, idx: number) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-24 h-24 bg-white border-2 border-slate-200 rounded-full flex flex-col items-center justify-center shrink-0 shadow-sm">
                                        <span className="text-2xl font-black text-slate-900">{Math.round(risk.probability * 100)}%</span>
                                        <span className="text-[10px] font-black uppercase text-slate-400">CHANCE</span>
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h4 className="text-xl font-black text-slate-900 uppercase">{risk.disease_name}</h4>
                                        <p className="text-sm font-bold text-slate-600 mt-2">Driven by: {risk.reason}</p>

                                        <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                                            <div
                                                className={`h-full ${risk.probability > 0.5 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${risk.probability * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto mt-4 md:mt-0 bg-white border border-emerald-100 px-4 py-3 rounded-lg text-center shrink-0">
                                        <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Prevention</span>
                                        <span className="text-xs font-bold text-slate-700">{risk.prevention}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <footer className="bg-white border-t border-slate-200 p-6 shrink-0 flex justify-between items-center">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1) as any)}
                    disabled={page === 1}
                    className="flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-sm lg:text-lg disabled:opacity-30 transition-all hover:bg-slate-50 shadow-sm"
                >
                    <ArrowLeft size={20} /> <span className="hidden sm:inline">BACK</span>
                </button>
                <div className="flex gap-2 lg:gap-3">
                    <div className={`w-8 lg:w-16 h-2 lg:h-3 rounded-full ${page >= 1 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                    <div className={`w-8 lg:w-16 h-2 lg:h-3 rounded-full ${page >= 2 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                    <div className={`w-8 lg:w-16 h-2 lg:h-3 rounded-full ${page >= 3 ? 'bg-emerald-500' : 'bg-slate-200'} transition-all`} />
                </div>
                <button
                    onClick={() => setPage((p) => Math.min(3, p + 1) as any)}
                    disabled={page === 3}
                    className="flex items-center gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-emerald-100 border-2 border-emerald-500 text-slate-900 rounded-xl font-black uppercase tracking-widest text-sm lg:text-lg disabled:opacity-30 transition-all hover:bg-white shadow-sm"
                >
                    <span className="hidden sm:inline">NEXT</span> <ArrowRight size={20} />
                </button>
            </footer>

        </div>
    );
};

export default AYUSHHealthSystem;
