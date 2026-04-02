import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Activity, Heart, Thermometer, Brain, FileText,
    Zap, ShieldCheck, Download, Droplet, AlertTriangle
} from 'lucide-react';
import { SmartBeltPatient, SmartBeltTelemetry, AIAnalysisReport, DailyHealthReport } from '../types';
import { database } from '../../services/firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { subscribeToBelt, getDailyReports, generateMockReports, resetSaline } from '../services/healthDataService';
import { InferenceEngine } from '../ai/InferenceEngine';
import VitalCard from './VitalCard';
import ECGVisualizer from './ECGVisualizer';
import RiskGauge from './RiskGauge';
import InsightsDashboard from './InsightsDashboard';
import ForecastingDashboard from './ForecastingDashboard';
import { ReportGenerator } from '../utils/reportGenerator';

const TabBtn: React.FC<{ label: string, active: boolean, onClick: () => void, icon: any }> = ({ label, active, onClick, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 pb-4 px-2 transition-all border-b-2 font-bold text-sm ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
        <Icon size={16} />
        {label}
    </button>
);

interface Props {
    patient: SmartBeltPatient; // Changed from Patient
    onBack: () => void;
}

const SmartBeltPatientDetail: React.FC<Props> = ({ patient, onBack }) => {
    const [activeTab, setActiveTab] = useState<'live' | 'ai' | 'prediction' | 'reports'>('live');
    const deviceId = patient.device_id || ''; // Changed from smart_belt_id
    const [telemetry, setTelemetry] = useState<SmartBeltTelemetry | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [patientHistory, setPatientHistory] = useState<DailyHealthReport[]>([]);
    const lastAlertTime = React.useRef<number>(0);

    useEffect(() => {
        let reports = getDailyReports(patient.id.toString());
        if (reports.length === 0) {
            generateMockReports(patient.id.toString());
            reports = getDailyReports(patient.id.toString());
        }
        setPatientHistory(reports);
    }, [patient.id]); // Use patient.id to avoid unnecessary refreshes

    useEffect(() => {
        if (!deviceId) {
            setTelemetry(null);
            setAnalysis(null);
            return;
        }

        const unsubscribeTelemetry = subscribeToBelt(deviceId, (data) => {
            if (data) {
                setTelemetry(data);
                // Trigger global alert if critical
                const localAnalysis = InferenceEngine.analyzeStream(data);

                // FORCE: Update local analysis state immediately for dashboards
                setAnalysis(localAnalysis);

                // CONTINUOUS DATA STORAGE - Store ALL readings (normal + abnormal)
                import('../services/dataStorageService').then(({ DataStorageService }) => {
                    DataStorageService.storeTelemetry(
                        patient.id,
                        deviceId,
                        data,
                        localAnalysis
                    ).catch(err => console.warn('Storage error:', err));
                });

                // Check for critical status
                if (localAnalysis.status === 'critical' && (window as any).triggerHealthAlert) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(patient.name, localAnalysis.risks[0], 'critical');
                        lastAlertTime.current = now;
                    }
                }

                // NEW: Check for pre-heatstroke risk
                if (localAnalysis.pre_heartstroke_risk && localAnalysis.pre_heartstroke_risk > 60) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(
                            patient.name,
                            `⚠️ PRE-HEATSTROKE WARNING: ${localAnalysis.pre_heartstroke_risk}% risk detected. Temperature: ${data.temperature}°C`,
                            'warning'
                        );
                        lastAlertTime.current = now;
                    }
                }

                // NEW: Check for pre-seizure (fits) risk
                if (localAnalysis.pre_fits_risk && localAnalysis.pre_fits_risk > 60) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(
                            patient.name,
                            `⚠️ PRE-SEIZURE WARNING: ${localAnalysis.pre_fits_risk}% risk detected. High motion activity.`,
                            'warning'
                        );
                        lastAlertTime.current = now;
                    }
                }

                // REAL-TIME GEMINI AI ANALYSIS - Trigger every 30 seconds
                const lastGeminiCall = (window as any).lastGeminiAnalysisTime || 0;
                const now = Date.now();
                if (now - lastGeminiCall > 30000) { // Every 30 seconds
                    (window as any).lastGeminiAnalysisTime = now;

                    console.log('🤖 Triggering Gemini AI analysis...');

                    // Import and call GeminiService
                    import('../services/geminiService').then(({ GeminiService }) => {
                        GeminiService.analyzeHealthData(
                            data,
                            patient,
                            [] // Recent anomalies - could be enhanced
                        ).then(geminiResult => {
                            console.log('✅ Gemini AI Result:', geminiResult);

                            // Calculate trend based on previous predictions
                            const previousRisk = (window as any).lastPredictionRisk || 0;
                            const currentRisk = Math.max(
                                geminiResult.pre_heartstroke_risk,
                                geminiResult.pre_fits_risk
                            );
                            const trend = currentRisk > previousRisk + 10 ? 'worsening' :
                                currentRisk < previousRisk - 10 ? 'improving' : 'stable';
                            (window as any).lastPredictionRisk = currentRisk;

                            // Merge Gemini results into current analysis
                            setAnalysis(prev => ({
                                ...prev,
                                ...localAnalysis,
                                pre_heartstroke_risk: geminiResult.pre_heartstroke_risk,
                                pre_fits_risk: geminiResult.pre_fits_risk,
                                ai_reasoning: geminiResult.reasoning,
                                arrhythmia_analysis: geminiResult.arrhythmia_analysis,
                                sleep_apnea_analysis: geminiResult.sleep_apnea_analysis,
                                respiratory_status: geminiResult.respiratory_status,
                                posture_trend: geminiResult.posture_trend
                            }));

                            // STORE PREDICTION HISTORY - Store ALL predictions (even 0%)
                            import('../services/dataStorageService').then(({ DataStorageService }) => {
                                DataStorageService.storePrediction({
                                    patient_id: patient.id,
                                    heatstroke_risk: geminiResult.pre_heartstroke_risk,
                                    seizure_risk: geminiResult.pre_fits_risk,
                                    cardiac_risk: localAnalysis.score || 0,
                                    overall_risk: localAnalysis.score || 0,
                                    confidence: localAnalysis.confidence || 60,
                                    trend: trend,
                                    ai_reasoning: geminiResult.reasoning
                                }).catch(err => console.warn('Prediction storage error:', err));
                            });
                        }).catch(err => {
                            console.warn('⚠️ Gemini AI analysis failed:', err);
                        });
                    });
                }
            }
        });

        const analysisRef = ref(database, `live/devices/${deviceId}/analysis`);
        const unsubscribeAnalysis = onValue(analysisRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setAnalysis(val);

                // Check for critical AI analysis
                if (val.status === 'critical' && (window as any).triggerHealthAlert) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(patient.name, val.risks?.[0] || 'AI Risk Alert', 'critical');
                        lastAlertTime.current = now;
                    }
                }

                // NEW: Check AI-detected heatstroke risk
                if (val.pre_heartstroke_risk && val.pre_heartstroke_risk > 60) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(
                            patient.name,
                            `🔥 AI HEATSTROKE ALERT: ${val.pre_heartstroke_risk}% risk - ${val.ai_reasoning || 'Immediate attention required'}`,
                            'warning'
                        );
                        lastAlertTime.current = now;
                    }
                }

                // NEW: Check AI-detected seizure risk
                if (val.pre_fits_risk && val.pre_fits_risk > 60) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) {
                        (window as any).triggerHealthAlert(
                            patient.name,
                            `⚡ AI SEIZURE ALERT: ${val.pre_fits_risk}% risk - ${val.ai_reasoning || 'Monitor patient closely'}`,
                            'warning'
                        );
                        lastAlertTime.current = now;
                    }
                }
            }
        });

        return () => {
            unsubscribeTelemetry();
            off(analysisRef, 'value', unsubscribeAnalysis);
        };
    }, [deviceId, patient.name]);

    const report: AIAnalysisReport | null = analysis ? {
        timestamp: analysis.timestamp || new Date().toISOString(),
        riskScore: analysis.score || analysis.riskScore || 0,
        anomalies: analysis.risks || analysis.anomalies || [],
        trends: analysis.trends || [],
        recommendation: analysis.explanation || analysis.recommendation || "Observation required.",
        forecast: analysis.forecast,
        // Include Gemini AI predictions
        pre_heartstroke_risk: analysis.pre_heartstroke_risk || 0,
        pre_fits_risk: analysis.pre_fits_risk || 0,
        ai_reasoning: analysis.ai_reasoning || null,

        // Expansion fields
        arrhythmia_analysis: analysis.arrhythmia_analysis,
        arrhythmia_status: analysis.arrhythmia_status,
        sleep_apnea_analysis: analysis.sleep_apnea_analysis,
        respiratory_status: analysis.respiratory_status,
        posture_trend: analysis.posture_trend,
    } : null;

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen">
            {/* Cleaner Header Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900">{patient.name}</h1>
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">Bed {patient.bed_number || '-'}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm font-medium text-slate-400">
                                <span className="flex items-center gap-1.5"><Heart size={14} className="text-rose-500" /> {patient.age}Y • {patient.gender}</span>
                                <span className="flex items-center gap-1.5"><Brain size={14} className="text-purple-500" /> {patient.medical_problem || 'General Observation'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${telemetry?.wearing_status ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${telemetry?.wearing_status ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <span className="text-xs font-bold uppercase tracking-widest">{telemetry?.wearing_status ? 'Belt Active' : 'Waiting for Device'}</span>
                        </div>
                        <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl flex items-center gap-2 text-xs font-bold font-mono">
                            <Zap size={14} className="text-amber-400" /> {deviceId || 'UNLINKED'}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto w-full mt-6 flex items-center gap-8 border-t border-slate-50 pt-4">
                    <TabBtn label="Live Monitor" active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={Activity} />
                    <TabBtn label="AI Insights" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={Brain} />
                    <TabBtn label="Forecasting" active={activeTab === 'prediction'} onClick={() => setActiveTab('prediction')} icon={Zap} />
                    <TabBtn label="History" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={FileText} />
                </div>
            </div>

            {/* ECG Leads Disconnected Warning - Full Width Alert */}
            {telemetry && telemetry.ecg_leads_connected === false && (
                <div className="bg-gradient-to-r from-orange-600 to-rose-600 text-white px-8 py-4 border-t border-orange-700/20">
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                            <AlertTriangle size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="text-base font-black uppercase tracking-wide">⚠️ ECG ELECTRODES NOT PROPERLY CONNECTED</div>
                            <div className="text-sm opacity-90 mt-1">
                                The ECG monitoring pads are not detecting skin contact. Please check and reattach the electrodes to ensure accurate heart monitoring. Other vitals (BPM, SpO2, temp, motion) continue to be monitored.
                            </div>
                        </div>
                        <div className="text-xs bg-white/20 px-4 py-2 rounded-lg font-mono font-bold">
                            LEADS: DISCONNECTED
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'live' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <header className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="text-indigo-600" /> Real-time Vitals
                            </h2>
                        </header>

                        {telemetry ? (

                            <div className="animate-in fade-in duration-700 space-y-6">
                                {/* Warning Banner Removed */}

                                {/* Saline Monitor Section */}
                                {telemetry.saline && (
                                    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm mb-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                <Droplet size={20} />
                                            </div>
                                            IV Infusion Monitor
                                            {telemetry.saline.status === 'flowing' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full animate-pulse">Flowing</span>}
                                            {telemetry.saline.status === 'paused' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Paused</span>}
                                            <button
                                                onClick={() => resetSaline(deviceId, 500)}
                                                className="ml-auto text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 transition-all font-bold flex items-center gap-1"
                                            >
                                                <Droplet size={12} /> Refill (500ml)
                                            </button>
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                            <div>
                                                <div className="text-4xl font-black text-slate-800 tracking-tight">
                                                    {telemetry.saline.vol_ml}
                                                    <span className="text-base text-slate-400 font-bold ml-1">ml</span>
                                                </div>
                                                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mt-1">Volume Remaining</div>
                                                {/* Visual Bar */}
                                                <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min((telemetry.saline.vol_ml / 500) * 100, 100)}%` }}></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-4xl font-black text-slate-800 tracking-tight">
                                                    {telemetry.saline.time_left >= 0 ? telemetry.saline.time_left : '--'}
                                                    <span className="text-base text-slate-400 font-bold ml-1">min</span>
                                                </div>
                                                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mt-1">Time Remaining</div>
                                            </div>

                                            <div>
                                                <div className="text-4xl font-black text-slate-800 tracking-tight">
                                                    {telemetry.saline.flow_rate}
                                                    <span className="text-base text-slate-400 font-bold ml-1">ml/h</span>
                                                </div>
                                                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mt-1">Flow Rate</div>
                                            </div>
                                        </div>

                                        {telemetry.saline.is_empty && (
                                            <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-4 animate-pulse">
                                                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">!</div>
                                                <div>
                                                    <h4 className="text-rose-700 font-black uppercase text-sm">Infusion Empty</h4>
                                                    <p className="text-rose-600/80 text-xs font-bold">Please replace the saline bag immediately.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <VitalCard title="Heart Rate" value={telemetry.bpm} unit="BPM" icon={Heart} colorClass="text-rose-500" status={telemetry.bpm > 120 ? 'warning' : 'normal'} />
                                    <VitalCard title="Temp" value={telemetry.temperature} unit="°C" icon={Thermometer} colorClass="text-amber-500" status={telemetry.temperature > 38 ? 'warning' : 'normal'} />

                                    {/* Calculated G-Force (Ground Force) */}
                                    <VitalCard
                                        title="G-Force"
                                        value={(telemetry.activity_index || 0).toFixed(2)}
                                        unit="G"
                                        icon={Zap}
                                        colorClass="text-purple-500"
                                        status={telemetry.status === 'critical' ? 'critical' : (telemetry.status === 'warning' ? 'warning' : 'normal')}
                                    />
                                </div>
                                <ECGVisualizer
                                    dataPoint={telemetry.ecg}
                                    leadsConnected={telemetry.ecg_leads_connected}
                                />
                                <div className="flex justify-center mt-6">
                                    <div className="w-full max-w-md">
                                        <RiskGauge status={analysis?.status || 'safe'} risks={analysis?.risks || []} score={analysis?.score || 0} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                )
                }

                {
                    activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {report ? (
                                <InsightsDashboard report={report} telemetry={telemetry} patientId={patient.id} />
                            ) : (
                                <EmptyState />
                            )}
                        </div>
                    )
                }

                {
                    activeTab === 'prediction' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {report && report.forecast ? (
                                <ForecastingDashboard report={report} />
                            ) : (
                                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                                    <Activity className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="text-slate-400 font-bold">Waiting for AI Baseline... Baseline collection in progress.</p>
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeTab === 'reports' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <header className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <FileText className="text-blue-600" /> Daily Health Records
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => ReportGenerator.downloadCSV(patient.name, patientHistory)}
                                        className="text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-600 hover:text-blue-600 flex items-center gap-2"
                                    >
                                        <Download size={16} /> Export CSV
                                    </button>
                                </div>
                            </header>

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Avg HR</th>
                                            <th className="p-4">Events</th>
                                            <th className="p-4">Activity</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {patientHistory.map((h, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-bold text-slate-700">{h.date}</td>
                                                <td className="p-4 font-mono">{h.metrics.avgHeartRate} bpm</td>
                                                <td className="p-4">
                                                    {h.incidents.length > 0 ? (
                                                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">{h.incidents.length} Alerts</span>
                                                    ) : <span className="text-slate-400">None</span>}
                                                </td>
                                                <td className="p-4 capitalize text-slate-600">{h.metrics.activityLevel}</td>
                                                <td className="p-4"><CheckCircle /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

const EmptyState = () => (
    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-sm">
        <Activity size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-500">No Telemetry Signal</h3>
        <p className="text-slate-400">Link a smart belt device to begin monitoring.</p>
    </div>
);

const CheckCircle = () => <ShieldCheck className="text-emerald-500" size={18} />;

export default SmartBeltPatientDetail;
