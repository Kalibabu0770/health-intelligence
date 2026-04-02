import React from 'react';
import { AIAnalysisReport } from '../types';
import { Zap, Activity, Brain, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface Props {
    report: AIAnalysisReport;
}

const ForecastingDashboard: React.FC<Props> = ({ report }) => {
    if (!report.forecast) return null;
    const { forecast } = report;

    return (
        <div className="space-y-6">
            <header className="">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-amber-500" /> AI Predictive Models
                </h2>
                <p className="text-slate-500 text-sm">Probabilistic forecasting for {forecast.horizon}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cardiac Forecast */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} /></div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cardiac Stability</h3>
                            <div className="text-3xl font-black text-slate-800">{100 - forecast.cardiacRisk}%</div>
                            <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <ArrowUpRight size={12} /> Projected Stability
                            </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${forecast.cardiacRisk > 50 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {forecast.cardiacRisk > 50 ? 'HIGH RISK' : 'STABLE'}
                        </div>
                    </div>

                    {/* Timeline Graph */}
                    <div className="h-32 w-full flex items-end gap-1 relative z-10">
                        {[...Array(24)].map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-sm transition-all duration-300 ${i < 18 ? 'bg-slate-200' : 'bg-rose-200 opacity-60'}`}
                                style={{ height: `${30 + Math.random() * 40 + (i > 18 && forecast.cardiacRisk > 50 ? 20 : 0)}%` }}
                            ></div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2">
                        <span>Now</span>
                        <span>+12h</span>
                        <span>+24h</span>
                    </div>
                </div>

                {/* Neurological Forecast */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Brain size={80} /></div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Seizure Probability</h3>
                            <div className="text-3xl font-black text-slate-800">{forecast.seizureRisk}%</div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                <Minus size={12} /> Baseline
                            </div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${forecast.seizureRisk > 50 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                            {forecast.seizureRisk > 50 ? 'ALERT' : 'LOW'}
                        </div>
                    </div>

                    {/* Timeline Graph */}
                    <div className="h-32 w-full flex items-end gap-1 relative z-10">
                        {[...Array(24)].map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-sm transition-all duration-300 ${i < 18 ? 'bg-slate-200' : 'bg-purple-200 opacity-60'}`}
                                style={{ height: `${10 + Math.random() * (forecast.seizureRisk > 20 ? 40 : 10)}%` }}
                            ></div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2">
                        <span>Now</span>
                        <span>+12h</span>
                        <span>+24h</span>
                    </div>
                </div>
            </div>

            {/* Insights List */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Predictive Factors</h3>
                <div className="flex flex-wrap gap-3">
                    {forecast.factors.map((factor, i) => (
                        <div key={i} className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600">
                            <div className={`w-2 h-2 rounded-full ${factor.includes('Optimal') || factor.includes('Stable') ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                            {factor}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ForecastingDashboard;
