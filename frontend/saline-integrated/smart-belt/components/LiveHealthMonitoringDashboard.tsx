import React, { useState, useEffect } from 'react';
import { SmartBeltPatient, SmartBeltTelemetry, SmartBeltPrediction } from '../types';
import { getSmartBeltPatientById } from '../services/smartBeltPatientService';
import { getPatientPredictions } from '../ai/LivePredictionEngine';
import { getUnacknowledgedAlerts } from '../ai/EmergencyAlertTrigger';
import LiveRiskPredictionPanel from './LiveRiskPredictionPanel';
import EmergencyAlertsCenter from './EmergencyAlertsCenter';
import {
    Heart,
    Activity,
    Droplet,
    Thermometer,
    Zap,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Wifi,
    WifiOff,
    User,
    Phone,
    Clock
} from 'lucide-react';

interface LiveHealthMonitoringDashboardProps {
    patientId: number;
    onClose?: () => void;
}

const LiveHealthMonitoringDashboard: React.FC<LiveHealthMonitoringDashboardProps> = ({
    patientId,
    onClose
}) => {
    const [patient, setPatient] = useState<SmartBeltPatient | null>(null);
    const [telemetry, setTelemetry] = useState<SmartBeltTelemetry | null>(null);
    const [predictions, setPredictions] = useState<SmartBeltPrediction | null>(null);
    const [alertCount, setAlertCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        loadPatientData();
        const interval = setInterval(loadPatientData, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, [patientId]);

    const loadPatientData = async () => {
        try {
            const patientData = await getSmartBeltPatientById(patientId);
            if (patientData) {
                setPatient(patientData);

                // Load predictions
                const preds = await getPatientPredictions(patientId);
                setPredictions(preds);

                // Load alert count
                const alerts = await getUnacknowledgedAlerts(patientId);
                setAlertCount(alerts.length);

                // TODO: Load real-time telemetry from Firebase/Supabase
                // For now, simulate with dummy data
                simulateTelemetry(patientData);
            }
        } catch (error) {
            console.error('Error loading patient data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Temporary simulation - Replace with real Firebase/Supabase realtime subscription
    const simulateTelemetry = (patient: SmartBeltPatient) => {
        if (patient.device_id) {
            setIsOnline(true);
            setTelemetry({
                device_id: patient.device_id,
                timestamp: Date.now(),
                bpm: patient.baseline_hr || 72,
                ir_val: 15000,
                spo2: patient.baseline_spo2 || 98,
                temperature: patient.baseline_temp || 98.6,
                ecg: 512,
                ax: 0.1,
                ay: 0.1,
                az: 1.0,
                activity_index: 1.2,
                wearing_status: true,
                leads_ok: true,
                status: 'online'
            });
        } else {
            setIsOnline(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading patient data...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Patient not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                                <StatusBadge
                                    status={isOnline ? 'online' : 'offline'}
                                    wearingStatus={telemetry?.wearing_status}
                                />
                                {alertCount > 0 && (
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        {alertCount} Alert{alertCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{patient.age} years • {patient.gender}</span>
                                {patient.device_id && (
                                    <span className="flex items-center gap-1">
                                        <Activity className="w-4 h-4" />
                                        Device: {patient.device_id}
                                    </span>
                                )}
                            </div>
                            {patient.emergency_contact_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                    <Phone className="w-4 h-4" />
                                    Emergency: {patient.emergency_contact_name} ({patient.emergency_contact_phone})
                                </div>
                            )}
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>

                {/* Medical History Summary */}
                {(patient.stroke_history || patient.heart_disease_history || patient.seizure_history || patient.diabetes || patient.hypertension) && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Critical History:</p>
                        <div className="flex flex-wrap gap-2">
                            {patient.stroke_history && <HistoryBadge label="Stroke" />}
                            {patient.heart_disease_history && <HistoryBadge label="Heart Disease" />}
                            {patient.seizure_history && <HistoryBadge label="Seizure" />}
                            {patient.diabetes && <HistoryBadge label="Diabetes" />}
                            {patient.hypertension && <HistoryBadge label="Hypertension" />}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Live Vitals */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Real-Time Vitals Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <VitalCard
                            icon={<Heart className="w-6 h-6" />}
                            label="Heart Rate"
                            value={telemetry?.bpm || '--'}
                            unit="bpm"
                            status={getHeartRateStatus(telemetry?.bpm || 0, patient.baseline_hr)}
                            baseline={patient.baseline_hr}
                        />
                        <VitalCard
                            icon={<Droplet className="w-6 h-6" />}
                            label="Blood Oxygen"
                            value={telemetry?.spo2 || '--'}
                            unit="%"
                            status={getSpO2Status(telemetry?.spo2 || 0)}
                            baseline={patient.baseline_spo2}
                        />
                        <VitalCard
                            icon={<Thermometer className="w-6 h-6" />}
                            label="Temperature"
                            value={telemetry?.temperature ? telemetry.temperature.toFixed(1) : '--'}
                            unit="°F"
                            status={getTemperatureStatus(telemetry?.temperature || 0)}
                            baseline={patient.baseline_temp}
                        />
                        <VitalCard
                            icon={<Activity className="w-6 h-6" />}
                            label="ECG Signal"
                            value={telemetry?.ecg || '--'}
                            unit="mV"
                            status={telemetry?.leads_ok ? 'normal' : 'warning'}
                            showTrend={false}
                        />
                    </div>

                    {/* Activity & Motion */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Activity & Motion
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Activity Index</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {telemetry?.activity_index.toFixed(1) || '--'}
                                </p>
                                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                                        style={{ width: `${Math.min((telemetry?.activity_index || 0) * 20, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Acceleration</p>
                                <div className="space-y-1">
                                    <p className="text-sm">X: {telemetry?.ax.toFixed(2) || '--'}g</p>
                                    <p className="text-sm">Y: {telemetry?.ay.toFixed(2) || '--'}g</p>
                                    <p className="text-sm">Z: {telemetry?.az.toFixed(2) || '--'}g</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alerts Section */}
                    <EmergencyAlertsCenter patientId={patientId} />
                </div>

                {/* Right Column - Predictions */}
                <div className="space-y-6">
                    <LiveRiskPredictionPanel predictions={predictions} />

                    {/* Quick Stats */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <StatRow label="Status" value={patient.status} />
                            <StatRow label="Admitted" value={new Date(patient.admitted_at).toLocaleDateString()} />
                            {patient.medications && patient.medications.length > 0 && (
                                <StatRow label="Medications" value={`${patient.medications.length} active`} />
                            )}
                            <StatRow
                                label="Last Update"
                                value={telemetry ? new Date(telemetry.timestamp).toLocaleTimeString() : 'N/A'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// HELPER COMPONENTS
// ================================================================

interface StatusBadgeProps {
    status: 'online' | 'offline';
    wearingStatus?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, wearingStatus }) => {
    if (status === 'offline') {
        return (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1">
                <WifiOff className="w-4 h-4" />
                Offline
            </span>
        );
    }

    if (!wearingStatus) {
        return (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Belt Removed
            </span>
        );
    }

    return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
            <Wifi className="w-4 h-4" />
            Live Monitoring
        </span>
    );
};

const HistoryBadge: React.FC<{ label: string }> = ({ label }) => (
    <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
        {label}
    </span>
);

interface VitalCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    unit: string;
    status: 'normal' | 'warning' | 'critical';
    baseline?: number;
    showTrend?: boolean;
}

const VitalCard: React.FC<VitalCardProps> = ({
    icon,
    label,
    value,
    unit,
    status,
    baseline,
    showTrend = true
}) => {
    const statusConfig = {
        normal: { bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', border: 'border-green-200' },
        warning: { bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', border: 'border-yellow-200' },
        critical: { bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600', border: 'border-red-200' }
    };

    const config = statusConfig[status];
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    const trend = baseline && !isNaN(numValue) ? (numValue > baseline ? 'up' : numValue < baseline ? 'down' : null) : null;

    return (
        <div className={`${config.bg} border ${config.border} rounded-xl p-4`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 ${config.iconBg} rounded-lg`}>
                    {React.cloneElement(icon as React.ReactElement, { className: config.iconColor })}
                </div>
                {showTrend && trend && (
                    <div className={trend === 'up' ? 'text-red-600' : 'text-green-600'}>
                        {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-600">{unit}</p>
            </div>
            {baseline && (
                <p className="text-xs text-gray-500 mt-1">Baseline: {baseline}{unit}</p>
            )}
        </div>
    );
};

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
    </div>
);

// ================================================================
// STATUS HELPERS
// ================================================================

function getHeartRateStatus(hr: number, baseline?: number): 'normal' | 'warning' | 'critical' {
    if (hr < 50 || hr > 120) return 'critical';
    if (hr < 60 || hr > 100) return 'warning';
    return 'normal';
}

function getSpO2Status(spo2: number): 'normal' | 'warning' | 'critical' {
    if (spo2 < 88) return 'critical';
    if (spo2 < 92) return 'warning';
    return 'normal';
}

function getTemperatureStatus(temp: number): 'normal' | 'warning' | 'critical' {
    if (temp >= 103 || temp < 95) return 'critical';
    if (temp >= 99.5 || temp < 96) return 'warning';
    return 'normal';
}

export default LiveHealthMonitoringDashboard;
