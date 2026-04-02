import React, { useState, useEffect } from 'react';
import {
    Heart,
    Activity,
    Thermometer,
    Zap,
    Settings,
    Link as LinkIcon,
    Edit2,
    Eye,
    AlertTriangle,
    ArrowRight,
    Trash2
} from 'lucide-react';
import { SmartBeltPatient, SmartBeltTelemetry, RiskAnalysisResult } from '../types';
import { subscribeToBelt } from '../services/healthDataService';
import { database } from '../../services/firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { InferenceEngine } from '../ai/InferenceEngine';

interface Props {
    patient: SmartBeltPatient; // Changed from Patient
    onLink: (patient: SmartBeltPatient) => void;
    onEdit: (patient: SmartBeltPatient) => void;
    onViewDetail: (patient: SmartBeltPatient) => void;
    onEmergency: (patient: SmartBeltPatient) => void;
    onDelete: (patient: SmartBeltPatient) => void;
}

const SmartBeltPatientCard: React.FC<Props> = ({
    patient,
    onLink,
    onEdit,
    onViewDetail,
    onEmergency,
    onDelete
}) => {
    const [telemetry, setTelemetry] = useState<SmartBeltTelemetry | null>(null);
    const [analysis, setAnalysis] = useState<RiskAnalysisResult | null>(null);
    const [status, setStatus] = useState<'online' | 'offline' | 'unlinked'>('unlinked');
    const lastAlertTime = React.useRef<number>(0);

    const beltId = patient.device_id; // Changed from smart_belt_id

    useEffect(() => {
        if (!beltId) {
            setStatus('unlinked');
            setTelemetry(null);
            setAnalysis(null);
            return;
        }

        const unsubscribeTelemetry = subscribeToBelt(beltId, (data) => {
            if (data) {
                setTelemetry(data);
                setStatus('online');

                // Local Fallback Analysis
                const localAnalysis = InferenceEngine.analyzeStream(data);

                // If local detects critical, trigger immediate alert (Real-time Safety)
                if (localAnalysis.status === 'critical' && (window as any).triggerHealthAlert) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) { // 30s cooldown
                        (window as any).triggerHealthAlert(patient.name, localAnalysis.risks[0], 'critical');
                        lastAlertTime.current = now;
                    }
                }
            } else {
                setStatus('offline');
            }
        });

        // Subscribe to AI Analysis written by the server
        const analysisRef = ref(database, `live/devices/${beltId}/analysis`);
        const unsubscribeAnalysis = onValue(analysisRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setAnalysis(val);
                // Trigger alert if AI server detects critical
                if (val.status === 'critical' && (window as any).triggerHealthAlert) {
                    const now = Date.now();
                    if (now - lastAlertTime.current > 30000) { // 30s cooldown
                        (window as any).triggerHealthAlert(patient.name, val.risks?.[0] || 'AI Risk Alert', 'critical');
                        lastAlertTime.current = now;
                    }
                }
            }
        });

        return () => {
            unsubscribeTelemetry();
            off(analysisRef, 'value', unsubscribeAnalysis);
        };
    }, [beltId, patient.name]);

    // Check for critical status from BOTH AI analysis AND motion detection
    // NEW: Heartbeat Check - If data is older than 10s, clear critical status
    const telemetryAge = Date.now() - (telemetry?.timestamp || 0);
    const isDataFresh = telemetryAge < 10000; // 10 second timeout
    const isCritical = isDataFresh && (analysis?.status === 'critical' || telemetry?.status === 'critical');
    const isWarning = isDataFresh && (analysis?.status === 'warning' || telemetry?.status === 'warning');

    const cardBorderClass = isCritical
        ? 'border-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.15)] ring-1 ring-rose-100'
        : isWarning
            ? 'border-amber-200 shadow-sm hover:border-amber-300'
            : 'border-slate-100 shadow-sm hover:border-indigo-100';

    return (
        <div className={`bg-white rounded-2xl border transition-all duration-300 hover-card-lift flex flex-col overflow-hidden ${cardBorderClass}`}>
            {/* Alert Banner */}
            {isCritical && (
                <div className="bg-rose-500 text-white text-[10px] font-bold px-4 py-1.5 flex items-center justify-between animate-pulse">
                    <span className="flex items-center gap-1"><AlertTriangle size={12} /> CRITICAL ALERT</span>
                    <span>
                        {telemetry?.status === 'critical' ? 'SEIZURE RISK - HIGH MOTION DETECTED' : (analysis?.risks[0] || 'CHECK PATIENT')}
                    </span>
                </div>
            )}
            {isWarning && !isCritical && (
                <div className="bg-amber-500 text-white text-[10px] font-bold px-4 py-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1"><AlertTriangle size={12} /> WARNING</span>
                    <span>MODERATE RISK</span>
                </div>
            )}

            {/* ECG Leads Disconnected Warning Banner */}
            {beltId && telemetry && telemetry.ecg_leads_connected === false && (
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[11px] font-bold px-4 py-2 flex items-center gap-2 animate-pulse">
                    <AlertTriangle size={14} className="flex-shrink-0" />
                    <div className="flex-1">
                        <div className="font-black">ECG ELECTRODES NOT CONNECTED</div>
                        <div className="text-[9px] opacity-90 mt-0.5">Please ensure ECG pads are properly attached to patient's skin</div>
                    </div>
                </div>
            )}

            <div className="p-5 flex-1 flex flex-col relative">
                {/* View Details Button */}
                <button
                    onClick={() => onViewDetail(patient)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-colors z-10"
                    title="View Monitor"
                >
                    <Eye size={18} />
                </button>

                {/* Header: Avatar + Name */}
                <div className="flex items-center gap-3 mb-4 pr-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm transition-colors
                        ${isCritical ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-600'}`}>
                        {patient?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-800 leading-tight">{patient?.name || 'Unknown Patient'}</h3>
                        <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Bed {patient?.bed_number || '--'}</span>

                            {/* ECG Leads Connection Status */}
                            {beltId && (
                                <span className={`flex items-center gap-1 font-bold ${telemetry?.wearing_status
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                    }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${telemetry?.wearing_status
                                        ? 'bg-emerald-500 animate-pulse'
                                        : 'bg-rose-500 animate-pulse'
                                        }`} />
                                    {telemetry?.wearing_status ? 'ECG LEADS OK' : 'ECG LEADS OFF'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Vitals Grid / Status Panel */}
                <div className="flex-1 mb-4">
                    {beltId ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            {/* Always show grid if linked, defaulting to 0 if no data yet */}
                            <div className="grid grid-cols-2 gap-2">
                                <VitalItem
                                    icon={<Heart size={10} />}
                                    label="BPM"
                                    value={telemetry?.bpm || 0}
                                    color={telemetry && (telemetry.bpm > 110 || telemetry.bpm < 60) ? 'rose' : 'emerald'}
                                />
                                {/* SpO2 Removed */}
                                <VitalItem
                                    icon={<Thermometer size={10} />}
                                    label="TEMP"
                                    value={`${telemetry?.temperature || 0}°C`}
                                    color={telemetry && telemetry.temperature > 38 ? 'rose' : 'amber'}
                                />
                                <VitalItem
                                    icon={<Zap size={10} />}
                                    label="AI SCORE"
                                    value={`${analysis?.score || 0}%`}
                                    color={analysis?.score && analysis.score > 70 ? 'rose' : 'purple'}
                                />
                            </div>

                            {/* AI Reasoning Panel */}
                            {analysis?.risks && analysis.risks.length > 0 && (
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">AI Insights</div>
                                    <div className="text-[10px] text-slate-600 font-medium line-clamp-2">
                                        {analysis.risks.join(' • ')}
                                    </div>
                                </div>
                            )}

                            {/* Live ECG Preview with Connection Status */}
                            <div className="relative h-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                                {telemetry?.ecg_leads_connected ? (
                                    // Show live waveform when ECG leads are connected
                                    <div className="absolute inset-0 flex items-center">
                                        <svg className="w-full h-full" viewBox="0 0 100 40">
                                            <path
                                                d={`M0 20 L5 20 L8 ${20 - ((telemetry.ecg - 512) / 30)} L12 ${20 + ((telemetry.ecg - 512) / 30)} L15 20 L100 20`}
                                                fill="none"
                                                stroke={isCritical ? '#f43f5e' : '#10b981'}
                                                strokeWidth="1.5"
                                            />
                                        </svg>
                                        <div className="absolute bottom-1 right-2 text-[8px] text-emerald-400 font-mono font-bold">
                                            ECG: {telemetry.ecg}
                                        </div>
                                    </div>
                                ) : (
                                    // Show flat line with warning when ECG leads are disconnected
                                    <div className="absolute inset-0">
                                        <svg className="w-full h-full" viewBox="0 0 100 40">
                                            <path
                                                d="M0 20 L100 20"
                                                fill="none"
                                                stroke="#64748b"
                                                strokeWidth="1"
                                                strokeDasharray="2,2"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-[10px] text-rose-400 font-bold backdrop-blur-sm animate-pulse">
                                            ⚠ ECG LEADS NOT CONNECTED
                                        </div>
                                    </div>
                                )}
                                {/* Show initialization message if no data yet */}
                                {!telemetry && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-[10px] text-white font-bold backdrop-blur-sm">
                                        INITIALIZING...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 px-4 text-center">
                            <div className="text-slate-400 text-xs font-semibold mb-3">
                                Not Linked
                            </div>
                            <button
                                onClick={() => onLink(patient)}
                                className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 hover:border-indigo-600 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                <LinkIcon size={14} className="group-hover:text-white transition-colors" />
                                <span>Link Belt</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                <button
                    onClick={() => onEdit(patient)}
                    className="py-3 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Edit2 size={14} />
                    Edit
                </button>

                <button
                    onClick={() => onLink(patient)}
                    className={`py-3 text-[10px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-2 ${beltId
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                    title={beltId ? `Device: ${beltId}` : 'Link a device'}
                >
                    <LinkIcon size={14} />
                    {beltId ? 'Linked' : 'Link'}
                </button>

                <button
                    onClick={() => onDelete(patient)}
                    className="py-3 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Trash2 size={14} />
                    Delete
                </button>
            </div>

            {/* Emergency Trigger */}
            {status === 'online' && (
                <div className="bg-slate-50/50 border-t border-slate-100 p-2 text-center">
                    <button
                        onClick={() => onEmergency(patient)}
                        className="w-full py-1.5 text-[10px] font-bold rounded border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Zap size={12} />
                        Trigger Code Emergency
                    </button>
                </div>
            )}
        </div>
    );
};

const VitalItem: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' }> = ({ icon, label, value, color }) => {
    const bgColors: any = { emerald: 'bg-emerald-50', rose: 'bg-rose-50', amber: 'bg-amber-50', blue: 'bg-blue-50', purple: 'bg-purple-50' };
    const textColors: any = { emerald: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600', blue: 'text-blue-600', purple: 'text-purple-600' };

    const bgColor = bgColors[color] || bgColors.blue;
    const textColor = textColors[color] || textColors.blue;

    return (
        <div className={`${bgColor} rounded-xl p-2 border border-slate-100/50`}>
            <div className={`text-[8px] font-bold ${textColor} uppercase tracking-wider mb-0.5 flex items-center gap-1`}>
                {icon} {label}
            </div>
            <div className={`text-xs font-bold ${textColor.replace('600', '900')}`}>{value}</div>
        </div>
    );
};

export default SmartBeltPatientCard;
