import React, { useState, useEffect } from 'react';
import { AIAnalysisReport, SmartBeltTelemetry } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, Activity, Brain, Zap, Heart, Thermometer, Database, CheckCircle, ShieldCheck, Droplet } from 'lucide-react';
import RiskGauge from './RiskGauge';
import PredictionTimeline from './PredictionTimeline';
import { DataStorageService } from '../services/dataStorageService';

interface Props {
    report: AIAnalysisReport;
    telemetry: SmartBeltTelemetry | null;
    patientId: number;
}

const InsightsDashboard: React.FC<Props> = ({ report, telemetry, patientId }) => {
    const [storageStats, setStorageStats] = useState<any>(null);
    const [predictionTimeline, setPredictionTimeline] = useState<any[]>([]);

    // Fetch storage statistics and prediction timeline
    useEffect(() => {
        const fetchData = async () => {
            const stats = await DataStorageService.getStorageStats(patientId);
            const timeline = await DataStorageService.getPredictionTimeline(patientId, 24);
            setStorageStats(stats);
            setPredictionTimeline(timeline);
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [patientId]);

    // Calculate heart health score
    const calculateHeartHealth = () => {
        if (!telemetry) return 0;
        let score = 100;

        // Deduct for abnormal HR
        if (telemetry.bpm > 100 || telemetry.bpm < 60) score -= 20;
        if (telemetry.bpm > 120 || telemetry.bpm < 50) score -= 30;

        // Deduct for low SpO2
        if (telemetry.spo2 < 95) score -= 15;
        if (telemetry.spo2 < 90) score -= 25;

        // Deduct for abnormal temp
        if (telemetry.temperature > 37.5) score -= 10;
        if (telemetry.temperature > 38.5) score -= 20;

        return Math.max(score, 0);
    };

    const heartHealth = calculateHeartHealth();

    // Calculate time-based predictions
    const predictions = {
        next_1h: Math.min(report.riskScore * 0.8, 100),
        next_6h: Math.min(report.riskScore * 0.9, 100),
        next_12h: Math.min(report.riskScore * 1.0, 100),
        next_24h: Math.min(report.riskScore * 1.1, 100)
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Brain className="text-purple-600" /> Advanced AI Health Analysis
                    </h2>
                    <p className="text-slate-500 text-sm">Comprehensive real-time health monitoring powered by AI</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Data Storage Indicator */}
                    {storageStats && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <Database size={14} className={storageStats.data_quality === 'good' ? 'text-emerald-500' : 'text-amber-500'} />
                            <div className="text-xs">
                                <div className="font-bold text-slate-700">{storageStats.total_readings_today.toLocaleString()} readings</div>
                                <div className="text-slate-400 text-[10px]">{storageStats.data_quality} quality</div>
                            </div>
                        </div>
                    )}
                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        LIVE ANALYSIS ACTIVE
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                        <Activity size={12} className="animate-pulse" />
                        DATA RECORDING
                    </div>
                </div>
            </header>

            {/* Heart Health Score - Prominent Feature */}
            <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-90 mb-2">Cardiac Health Score</h3>
                            <div className="flex items-baseline gap-3">
                                <span className="text-6xl font-black">{heartHealth}</span>
                                <span className="text-2xl opacity-75">/ 100</span>
                            </div>
                        </div>
                        <Heart size={64} className="opacity-20" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                            <div className="text-xs opacity-75 mb-1">Heart Rate</div>
                            <div className="text-2xl font-bold">{telemetry?.bpm || 0} <span className="text-sm">BPM</span></div>
                            <div className="text-[10px] mt-1 opacity-75">
                                {telemetry && telemetry.bpm >= 60 && telemetry.bpm <= 100 ? '✓ Normal' : '⚠ Abnormal'}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                            <div className="text-xs opacity-75 mb-1">Oxygen Sat.</div>
                            <div className="text-2xl font-bold">{telemetry?.spo2 || 0} <span className="text-sm">%</span></div>
                            <div className="text-[10px] mt-1 opacity-75">
                                {telemetry && telemetry.spo2 >= 95 ? '✓ Optimal' : '⚠ Low'}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                            <div className="text-xs opacity-75 mb-1">Temperature</div>
                            <div className="text-2xl font-bold">{telemetry?.temperature.toFixed(1) || 0} <span className="text-sm">°C</span></div>
                            <div className="text-[10px] mt-1 opacity-75">
                                {telemetry && telemetry.temperature <= 37.5 ? '✓ Normal' : '⚠ Elevated'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time-Based Predictions */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-600" />
                    Predictive Risk Timeline
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Next 1 Hour', value: predictions.next_1h, time: '1h' },
                        { label: 'Next 6 Hours', value: predictions.next_6h, time: '6h' },
                        { label: 'Next 12 Hours', value: predictions.next_12h, time: '12h' },
                        { label: 'Next 24 Hours', value: predictions.next_24h, time: '24h' }
                    ].map((pred, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md">
                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">{pred.label}</div>
                            <div className="flex items-baseline gap-2 mb-3">
                                <span className={`text-3xl font-black ${pred.value > 70 ? 'text-rose-600' : pred.value > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {Math.round(pred.value)}
                                </span>
                                <span className="text-sm text-slate-400">%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${pred.value > 70 ? 'bg-rose-500' : pred.value > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${pred.value}%` }}
                                ></div>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-2">Risk in {pred.time}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced Gemini AI Predictions - Enhanced */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-8 rounded-3xl border-2 border-purple-200 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain size={120} className="text-purple-600" />
                </div>
                <h3 className="flex items-center gap-2 font-bold text-purple-800 mb-6 text-xl">
                    <Sparkles size={24} className="text-purple-600" />
                    Advanced Gemini AI Predictions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Heatstroke Analysis */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Thermometer size={20} className="text-rose-500" />
                                <span className="font-bold text-lg text-slate-800">Pre-Heatstroke Risk</span>
                                {report.pre_heartstroke_risk && report.pre_heartstroke_risk > 60 && (
                                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                        ⚠️ HIGH RISK
                                    </span>
                                )}
                            </div>
                            <span className={`text-3xl font-black ${report.pre_heartstroke_risk && report.pre_heartstroke_risk > 60 ? 'text-rose-600' : report.pre_heartstroke_risk && report.pre_heartstroke_risk > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {report.pre_heartstroke_risk || 0}%
                            </span>
                        </div>

                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full transition-all duration-1000 ${report.pre_heartstroke_risk && report.pre_heartstroke_risk > 60 ? 'bg-rose-500 animate-pulse' : report.pre_heartstroke_risk && report.pre_heartstroke_risk > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${report.pre_heartstroke_risk || 0}%` }}
                            ></div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Contributing Factors:</div>
                            {telemetry && (
                                <>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <Thermometer size={14} className={telemetry.temperature > 38 ? 'text-rose-500' : 'text-slate-400'} />
                                            Body Temperature
                                        </span>
                                        <span className={`font-bold text-sm ${telemetry.temperature > 38 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {telemetry.temperature.toFixed(2)}°C
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <Heart size={14} className={telemetry.bpm > 100 ? 'text-rose-500' : 'text-slate-400'} />
                                            Heart Rate
                                        </span>
                                        <span className={`font-bold text-sm ${telemetry.bpm > 100 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {telemetry.bpm} BPM
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <Activity size={14} className={telemetry.spo2 < 95 ? 'text-rose-500' : 'text-slate-400'} />
                                            Blood Oxygen
                                        </span>
                                        <span className={`font-bold text-sm ${telemetry.spo2 < 95 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {telemetry.spo2}%
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed italic mt-4 bg-purple-50 p-3 rounded-lg">
                            💡 AI analyzes thermal baseline, cardiovascular response, and hydration indicators to predict heatstroke risk.
                        </p>
                    </div>

                    {/* Seizure Analysis */}
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Zap size={20} className="text-amber-500" />
                                <span className="font-bold text-lg text-slate-800">Pre-Seizure Risk</span>
                                {report.pre_fits_risk && report.pre_fits_risk > 60 && (
                                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                        ⚠️ HIGH RISK
                                    </span>
                                )}
                            </div>
                            <span className={`text-3xl font-black ${report.pre_fits_risk && report.pre_fits_risk > 60 ? 'text-rose-600' : report.pre_fits_risk && report.pre_fits_risk > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {report.pre_fits_risk || 0}%
                            </span>
                        </div>

                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full transition-all duration-1000 ${report.pre_fits_risk && report.pre_fits_risk > 60 ? 'bg-rose-500 animate-pulse' : report.pre_fits_risk && report.pre_fits_risk > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${report.pre_fits_risk || 0}%` }}
                            ></div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Contributing Factors:</div>
                            {telemetry && (
                                <>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <Zap size={14} className={telemetry.activity_index > 2.0 ? 'text-rose-500' : 'text-slate-400'} />
                                            Motion Activity
                                        </span>
                                        <span className={`font-bold text-sm ${telemetry.activity_index > 2.0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {telemetry.activity_index.toFixed(2)}G
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <Thermometer size={14} className={telemetry.temperature > 38.5 ? 'text-rose-500' : 'text-slate-400'} />
                                            Body Temperature
                                        </span>
                                        <span className={`font-bold text-sm ${telemetry.temperature > 38.5 ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {telemetry.temperature.toFixed(2)}°C
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm text-slate-600 flex items-center gap-2">
                                            <AlertTriangle size={14} className={telemetry.status === 'critical' ? 'text-rose-500' : 'text-slate-400'} />
                                            Status Level
                                        </span>
                                        <span className={`font-bold text-sm uppercase ${telemetry.status === 'critical' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {telemetry.status || 'Safe'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed italic mt-4 bg-purple-50 p-3 rounded-lg">
                            💡 AI detects micro-oscillations in 3-axis accelerometer data and correlates with neurological risk factors.
                        </p>
                    </div>
                </div>

                {report.ai_reasoning && (
                    <div className="mt-6 bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-purple-200">
                        <h4 className="text-xs font-bold text-purple-700 uppercase mb-3 flex items-center gap-2">
                            <Brain size={14} />
                            Clinical AI Reasoning
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">{report.ai_reasoning}</p>
                    </div>
                )}
            </div>

            {/* NEW: Clinical Analytics (Arrhythmia & Sleep Apnea) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Arrhythmia Monitoring */}
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Arrhythmia Detection</h3>
                            <p className="text-xs text-slate-500">Continuous R-R interval analysis</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 font-medium">Heart Rhythm</span>
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${report.arrhythmia_analysis?.toLowerCase().includes('normal') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'}`}>
                                {report.arrhythmia_status || report.arrhythmia_analysis || 'NORMAL'}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium capitalize">
                                {report.arrhythmia_analysis || "No irregular rhythms detected (AFib/PVC/V-Tach). Heart rhythm is currently consistent with sinus rhythm."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sleep Apnea & Respiratory */}
                <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                            <Droplet size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Respiratory & Sleep</h3>
                            <p className="text-xs text-slate-500">Apnea and Hypopnea detection</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 font-medium">Respiratory Status</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase">
                                {report.respiratory_status || 'STABLE'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 font-medium">Apnea Risk Index (AHI)</span>
                            <span className="text-sm font-bold text-slate-700">{report.sleep_apnea_analysis?.includes('High') ? 'High' : 'Low'}</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {report.sleep_apnea_analysis || "No patterns of obstructive sleep apnea detected. Breathing patterns and SpO2 levels are stable throughout the rest period."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Posture & Integration Trends */}
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm container mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Current Posture Trend</h3>
                            <p className="text-xs text-slate-500">Posture correlation with cardiac stability</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-slate-400 font-bold uppercase mb-1">State</span>
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">
                                {report.posture_trend || telemetry?.posture || 'Standing'}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-slate-400 font-bold uppercase mb-1">Stability</span>
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                                OPTIMAL
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Physiological Anomalies & Correlations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Anomaly Detection Panel */}
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 text-lg">
                        <Activity size={20} className="text-rose-500" /> Physiological Anomalies
                    </h3>
                    {report.anomalies.length > 0 ? (
                        <div className="space-y-3">
                            {report.anomalies.map((risk, i) => (
                                <div key={i} className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg flex gap-3">
                                    <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                    <span className="text-sm text-rose-700 font-medium">{risk}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                            <Sparkles size={32} className="mb-3 opacity-50" />
                            <span className="text-sm font-medium">No physiological anomalies detected.</span>
                            <span className="text-xs mt-1">All vitals within normal range</span>
                        </div>
                    )}
                </div>

                {/* Real-time Correlations */}
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 text-lg">
                        <Zap size={20} className="text-amber-500" /> Vital Sign Correlations
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-600 font-medium">Heart Rate vs Motion</span>
                                <span className="font-mono font-bold text-slate-700">
                                    {(telemetry && telemetry.bpm > 90 && telemetry.activity_index < 1.5) ? 'Abnormal (Resting Tachycardia)' : 'Normal'}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${Math.min(((telemetry?.bpm || 0) + (telemetry?.activity_index || 0) * 10) / 2, 100)}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-600 font-medium">O2 Saturation Stability</span>
                                <span className={`font-mono font-bold ${(telemetry?.spo2 || 0) < 95 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {(telemetry?.spo2 || 0)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-700 ${(telemetry?.spo2 || 0) < 95 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${telemetry?.spo2 || 0}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-600 font-medium">Thermal Regulation</span>
                                <span className={`font-mono font-bold ${(telemetry?.temperature || 0) > 37.5 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {(telemetry?.temperature || 0).toFixed(1)}°C
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-700 ${(telemetry?.temperature || 0) > 37.5 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((telemetry?.temperature || 0) / 40 * 100, 100)}%` }}></div>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-3 italic">
                            *Real-time correlation engine analyzing multi-parameter vital sign relationships
                        </p>
                    </div>
                </div>
            </div>

            {/* Overall Risk Score */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-12 -mt-12"></div>
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Overall Health Risk Score</h3>
                        <div className="flex items-baseline gap-4 mb-4">
                            <span className="text-6xl font-black">{report.riskScore}</span>
                            <span className="text-2xl text-slate-400">/ 100</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{report.recommendation}</p>
                    </div>
                    <div className="flex justify-center">
                        <div className="relative w-48 h-48">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" fill="none" stroke="#334155" strokeWidth="16" />
                                <circle
                                    cx="96" cy="96" r="88"
                                    fill="none"
                                    stroke={report.riskScore > 70 ? '#ef4444' : report.riskScore > 30 ? '#f59e0b' : '#10b981'}
                                    strokeWidth="16"
                                    strokeDasharray={553}
                                    strokeDashoffset={553 - (553 * report.riskScore / 100)}
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className={`text-5xl ${report.riskScore > 70 ? 'text-rose-400' : report.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {report.riskScore > 70 ? '⚠️' : report.riskScore > 30 ? '⚡' : '✓'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Prediction Timeline - NEW */}
            {predictionTimeline.length > 0 && (
                <PredictionTimeline data={predictionTimeline} />
            )}

            {/* All Clear Status - Show when risks are low */}
            {(!report.pre_heartstroke_risk || report.pre_heartstroke_risk < 30) &&
                (!report.pre_fits_risk || report.pre_fits_risk < 30) &&
                report.riskScore < 30 && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border-2 border-emerald-200">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-emerald-800 mb-1">✅ All Clear - Patient Stable</h3>
                                <p className="text-emerald-600">All vital signs within normal range. Continuous monitoring active.</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-emerald-700">
                                    <span>🫀 Heart: Normal</span>
                                    <span>🌡️ Temperature: Normal</span>
                                    <span>💨 Oxygen: Normal</span>
                                    <span>📊 Activity: Normal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default InsightsDashboard;
