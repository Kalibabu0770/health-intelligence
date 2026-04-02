// ================================================================
// REAL-TIME AI ANALYSIS ENGINE
// ================================================================
// Continuously processes incoming sensor data and detects anomalies
// This is the core of the Smart Belt AI healthcare intelligence system

import { supabase } from '../../services/supabaseClient';
import {
    SmartBeltTelemetry,
    SmartBeltPatient,
    SmartBeltSensorData
} from '../types';
import { ECGSignalFilter } from '../ai-llm/ecgSignalFilter';
import { SpO2Processor } from '../ai-llm/spo2Processor';
import { analyzeMotionForSeizure, detectFall } from '../ai-llm/motionAnalyzer';

// ================================================================
// ANALYSIS THRESHOLDS & CONFIGURATION
// ================================================================

export interface AnalysisThresholds {
    // Heart Rate Thresholds
    hr_min_normal: number; // Below this = bradycardia
    hr_max_normal: number; // Above this = tachycardia
    hr_spike_threshold: number; // Sudden increase threshold (bpm)

    // SpO2 Thresholds
    spo2_critical: number; // Below this = critical oxygen level
    spo2_warning: number; // Below this = warning
    spo2_drop_threshold: number; // Sudden drop threshold (%)

    // Temperature Thresholds
    temp_min_normal: number; // Below this = hypothermia
    temp_max_normal: number; // Above this = fever
    temp_critical: number; // Above this = critical fever

    // ECG Thresholds
    ecg_variance_threshold: number; // High variance = irregularity
    ecg_flatline_threshold: number; // Near-zero = leads disconnected

    // Motion Thresholds
    fall_acceleration_threshold: number; // G-force for fall detection
    seizure_motion_threshold: number; // Rapid oscillation threshold
}

const DEFAULT_THRESHOLDS: AnalysisThresholds = {
    hr_min_normal: 50,
    hr_max_normal: 100,
    hr_spike_threshold: 30,

    spo2_critical: 88,
    spo2_warning: 92,
    spo2_drop_threshold: 5,

    temp_min_normal: 96.0,
    temp_max_normal: 99.5,
    temp_critical: 103.0,

    ecg_variance_threshold: 100,
    ecg_flatline_threshold: 10,

    fall_acceleration_threshold: 0.5,
    seizure_motion_threshold: 2.0
};

// ================================================================
// PATIENT BASELINE TRACKING
// ================================================================

interface PatientBaseline {
    patient_id: number;
    baseline_hr: number;
    baseline_spo2: number;
    baseline_temp: number;

    // Recent readings buffer (for trend detection)
    recent_hr: number[];
    recent_spo2: number[];
    recent_temp: number[];
    recent_ecg: number[];

    // Last readings
    last_hr?: number;
    last_spo2?: number;
    last_temp?: number;
}

// In-memory cache of patient baselines
const patientBaselines = new Map<number, PatientBaseline>();

/**
 * Load patient baseline values
 */
async function loadPatientBaseline(patient: SmartBeltPatient): Promise<PatientBaseline> {
    const existing = patientBaselines.get(patient.id);
    if (existing) return existing;

    const baseline: PatientBaseline = {
        patient_id: patient.id,
        baseline_hr: patient.baseline_hr || 70,
        baseline_spo2: patient.baseline_spo2 || 98,
        baseline_temp: patient.baseline_temp || 98.6,
        recent_hr: [],
        recent_spo2: [],
        recent_temp: [],
        recent_ecg: []
    };

    patientBaselines.set(patient.id, baseline);
    return baseline;
}

/**
 * Update patient baseline with new reading
 */
function updatePatientBaseline(baseline: PatientBaseline, telemetry: SmartBeltTelemetry) {
    // Update recent buffers (ke last 30 readings)
    baseline.recent_hr.push(telemetry.bpm);
    baseline.recent_spo2.push(telemetry.spo2);
    baseline.recent_temp.push(telemetry.temperature);
    baseline.recent_ecg.push(telemetry.ecg);

    if (baseline.recent_hr.length > 30) baseline.recent_hr.shift();
    if (baseline.recent_spo2.length > 30) baseline.recent_spo2.shift();
    if (baseline.recent_temp.length > 30) baseline.recent_temp.shift();
    if (baseline.recent_ecg.length > 30) baseline.recent_ecg.shift();

    // Update last readings
    baseline.last_hr = telemetry.bpm;
    baseline.last_spo2 = telemetry.spo2;
    baseline.last_temp = telemetry.temperature;
}

// ================================================================
// ANOMALY DETECTION ALGORITHMS
// ================================================================

export interface AnomalyResult {
    detected: boolean;
    type?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    risk_score: number; // 0-100
}

/**
 * Analyze Heart Rate for anomalies
 */
function analyzeHeartRate(
    hr: number,
    baseline: PatientBaseline,
    thresholds: AnalysisThresholds
): AnomalyResult | null {
    // Bradycardia (too slow)
    if (hr < thresholds.hr_min_normal) {
        const deviation = thresholds.hr_min_normal - hr;
        return {
            detected: true,
            type: 'hr_drop',
            severity: deviation > 20 ? 'critical' : deviation > 10 ? 'high' : 'medium',
            message: `Bradycardia detected: Heart rate ${hr} bpm (below normal ${thresholds.hr_min_normal})`,
            risk_score: Math.min(50 + deviation * 2, 100)
        };
    }

    // Tachycardia (too fast)
    if (hr > thresholds.hr_max_normal) {
        const deviation = hr - thresholds.hr_max_normal;
        return {
            detected: true,
            type: 'hr_spike',
            severity: deviation > 50 ? 'critical' : deviation > 30 ? 'high' : 'medium',
            message: `Tachycardia detected: Heart rate ${hr} bpm (above normal ${thresholds.hr_max_normal})`,
            risk_score: Math.min(40 + deviation, 100)
        };
    }

    // Sudden spike from previous reading
    if (baseline.last_hr && Math.abs(hr - baseline.last_hr) > thresholds.hr_spike_threshold) {
        return {
            detected: true,
            type: 'hr_spike',
            severity: 'high',
            message: `Sudden heart rate change: ${baseline.last_hr} → ${hr} bpm`,
            risk_score: 60
        };
    }

    return null;
}

/**
 * Analyze SpO2 (blood oxygen) for anomalies
 */
function analyzeSpO2(
    spo2: number,
    baseline: PatientBaseline,
    thresholds: AnalysisThresholds
): AnomalyResult | null {
    // Critical oxygen level
    if (spo2 < thresholds.spo2_critical) {
        return {
            detected: true,
            type: 'spo2_drop',
            severity: 'critical',
            message: `Critical oxygen desaturation: SpO₂ ${spo2}% (critical below ${thresholds.spo2_critical}%)`,
            risk_score: 95
        };
    }

    // Warning oxygen level
    if (spo2 < thresholds.spo2_warning) {
        return {
            detected: true,
            type: 'spo2_drop',
            severity: 'high',
            message: `Low oxygen level: SpO₂ ${spo2}% (warning below ${thresholds.spo2_warning}%)`,
            risk_score: 70
        };
    }

    // Sudden drop from previous reading
    if (baseline.last_spo2 && (baseline.last_spo2 - spo2) > thresholds.spo2_drop_threshold) {
        return {
            detected: true,
            type: 'spo2_drop',
            severity: 'high',
            message: `Sudden SpO₂ drop: ${baseline.last_spo2}% → ${spo2}%`,
            risk_score: 65
        };
    }

    return null;
}

/**
 * Analyze Temperature for anomalies
 */
function analyzeTemperature(
    temp: number,
    baseline: PatientBaseline,
    thresholds: AnalysisThresholds
): AnomalyResult | null {
    // Critical fever
    if (temp >= thresholds.temp_critical) {
        return {
            detected: true,
            type: 'temp_spike',
            severity: 'critical',
            message: `Critical fever detected: ${temp.toFixed(1)}°F (critical above ${thresholds.temp_critical}°F)`,
            risk_score: 85
        };
    }

    // Fever
    if (temp >= thresholds.temp_max_normal) {
        const deviation = temp - thresholds.temp_max_normal;
        return {
            detected: true,
            type: 'temp_spike',
            severity: deviation > 2 ? 'high' : 'medium',
            message: `Elevated temperature: ${temp.toFixed(1)}°F (normal up to ${thresholds.temp_max_normal}°F)`,
            risk_score: Math.min(40 + deviation * 10, 80)
        };
    }

    // Hypothermia
    if (temp < thresholds.temp_min_normal) {
        const deviation = thresholds.temp_min_normal - temp;
        return {
            detected: true,
            type: 'temp_spike',
            severity: deviation > 2 ? 'high' : 'medium',
            message: `Low temperature detected: ${temp.toFixed(1)}°F (below normal ${thresholds.temp_min_normal}°F)`,
            risk_score: Math.min(40 + deviation * 10, 75)
        };
    }

    return null;
}

/**
 * Analyze ECG for irregularities
 */
function analyzeECG(
    ecg: number,
    baseline: PatientBaseline,
    thresholds: AnalysisThresholds
): AnomalyResult | null {
    // Flatline detection (leads disconnected or critical)
    if (Math.abs(ecg) < thresholds.ecg_flatline_threshold) {
        return {
            detected: true,
            type: 'ecg_irregular',
            severity: 'high',
            message: 'ECG leads may be disconnected or no cardiac activity detected',
            risk_score: 90
        };
    }

    // High variance detection (arrhythmia)
    if (baseline.recent_ecg.length >= 10) {
        const variance = calculateVariance(baseline.recent_ecg);
        if (variance > thresholds.ecg_variance_threshold) {
            return {
                detected: true,
                type: 'ecg_irregular',
                severity: 'high',
                message: `Irregular ECG pattern detected (variance: ${variance.toFixed(2)})`,
                risk_score: 75
            };
        }
    }

    return null;
}

/**
 * Analyze Motion for fall or seizure
 */
function analyzeMotion(
    accel_x: number,
    accel_y: number,
    accel_z: number,
    baseline: PatientBaseline,
    thresholds: AnalysisThresholds
): AnomalyResult | null {
    // Calculate total acceleration magnitude
    const magnitude = Math.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2);

    // Fall detection (sudden drop in acceleration)
    if (magnitude < thresholds.fall_acceleration_threshold) {
        return {
            detected: true,
            type: 'fall_detected',
            severity: 'critical',
            message: `Possible fall detected (acceleration drop to ${magnitude.toFixed(2)}G)`,
            risk_score: 85
        };
    }

    // Seizure-like motion detection (rapid oscillation)
    if (magnitude > thresholds.seizure_motion_threshold) {
        return {
            detected: true,
            type: 'seizure_motion',
            severity: 'critical',
            message: `Seizure-like motion detected (high acceleration: ${magnitude.toFixed(2)}G)`,
            risk_score: 90
        };
    }

    return null;
}

// ================================================================
// MAIN ANALYSIS FUNCTION
// ================================================================

/**
 * Analyze a single telemetry reading in real-time
 * Returns array of detected anomalies
 */
export async function analyzeRealtimeTelemetry(
    telemetry: SmartBeltTelemetry,
    patient: SmartBeltPatient,
    thresholds: AnalysisThresholds = DEFAULT_THRESHOLDS
): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    // Load patient baseline
    const baseline = await loadPatientBaseline(patient);

    // Analyze Heart Rate
    const hrAnomaly = analyzeHeartRate(telemetry.bpm, baseline, thresholds);
    if (hrAnomaly) anomalies.push(hrAnomaly);

    // Analyze SpO2
    const spo2Anomaly = analyzeSpO2(telemetry.spo2, baseline, thresholds);
    if (spo2Anomaly) anomalies.push(spo2Anomaly);

    // Analyze Temperature
    const tempAnomaly = analyzeTemperature(telemetry.temperature, baseline, thresholds);
    if (tempAnomaly) anomalies.push(tempAnomaly);

    // Analyze ECG
    const ecgAnomaly = analyzeECG(telemetry.ecg, baseline, thresholds);
    if (ecgAnomaly) anomalies.push(ecgAnomaly);

    // Analyze Motion
    const motionAnomaly = analyzeMotion(telemetry.ax, telemetry.ay, telemetry.az, baseline, thresholds);
    if (motionAnomaly) anomalies.push(motionAnomaly);

    // Update baseline with this reading
    updatePatientBaseline(baseline, telemetry);

    return anomalies;
}

/**
 * Store analyzed sensor data in database
 */
export async function storeSensorDataWithAnalysis(
    telemetry: SmartBeltTelemetry,
    patient: SmartBeltPatient,
    anomalies: AnomalyResult[]
): Promise<void> {
    const hasAnomaly = anomalies.length > 0;
    const mostSevereAnomaly = anomalies.reduce((max, a) =>
        a.risk_score > max.risk_score ? a : max,
        anomalies[0]
    );

    const sensorData: Partial<SmartBeltSensorData> = {
        patient_id: patient.id,
        device_id: telemetry.device_id,
        ecg_value: telemetry.ecg,
        heart_rate: telemetry.bpm,
        spo2: telemetry.spo2,
        temperature: telemetry.temperature,
        accel_x: telemetry.ax,
        accel_y: telemetry.ay,
        accel_z: telemetry.az,
        motion_activity_index: telemetry.activity_index,
        wearing_status: telemetry.wearing_status,
        leads_ok: telemetry.leads_ok ?? true,
        anomaly_detected: hasAnomaly,
        anomaly_type: mostSevereAnomaly?.type as any,
        risk_score: mostSevereAnomaly?.risk_score || 0,
        timestamp: new Date(telemetry.timestamp).toISOString()
    };

    const { error } = await supabase
        .from('smart_belt_sensor_data')
        .insert(sensorData);

    if (error) {
        console.error('Error storing sensor data:', error);
    }

    // Update analysis metadata
    await supabase
        .from('smart_belt_analysis_metadata')
        .update({
            last_realtime_analysis: new Date().toISOString(),
            total_data_points_today: supabase.rpc('increment', { row_id: patient.id, column_name: 'total_data_points_today' }),
            total_anomalies_today: hasAnomaly ? supabase.rpc('increment', { row_id: patient.id, column_name: 'total_anomalies_today' }) : undefined
        })
        .eq('patient_id', patient.id);
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => (val - mean) ** 2);
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

export function getDefaultThresholds(): AnalysisThresholds {
    return { ...DEFAULT_THRESHOLDS };
}

export function clearPatientBaseline(patientId: number): void {
    patientBaselines.delete(patientId);
}
