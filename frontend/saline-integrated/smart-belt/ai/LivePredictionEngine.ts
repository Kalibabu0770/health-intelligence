// ================================================================
// LIVE PREDICTION ENGINE
// ================================================================
// Calculates real-time risk predictions for stroke, seizure, cardiac failure, and oxygen crash
// Updates predictions continuously based on incoming sensor data and patient health profile

import { supabase } from '../../services/supabaseClient';
import {
    SmartBeltPatient,
    SmartBeltTelemetry,
    SmartBeltPrediction,
    SmartBeltSensorData,
    RiskSeverity
} from '../types';
import { GeminiService } from '../services/geminiService';

// ================================================================
// PREDICTION MODELS
// ================================================================

interface PredictionFactors {
    age_factor: number;
    history_factor: number;
    vitals_factor: number;
    trend_factor: number;
    anomaly_factor: number;
}

/**
 * Calculate stroke risk prediction
 */
export function calculateStrokeRisk(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry,
    recent_data: SmartBeltSensorData[],
    anomaly_count: number
): { now: number; h24: number; h48: number; severity: RiskSeverity; factors: string[] } {
    let risk_now = 0;
    const factors: string[] = [];

    // ===  AGE FACTOR ===
    if (patient.age > 75) {
        risk_now += 25;
        factors.push('Advanced age (>75 years)');
    } else if (patient.age > 65) {
        risk_now += 18;
        factors.push('Elevated age risk (65-75 years)');
    } else if (patient.age > 55) {
        risk_now += 10;
        factors.push('Moderate age risk (55-65 years)');
    }

    // === MEDICAL HISTORY FACTOR ===
    if (patient.stroke_history) {
        risk_now += 35;
        factors.push('Previous stroke history');
    }
    if (patient.heart_disease_history) {
        risk_now += 20;
        factors.push('Heart disease history');
    }
    if (patient.hypertension) {
        risk_now += 15;
        factors.push('Hypertension');
    }
    if (patient.diabetes) {
        risk_now += 12;
        factors.push('Diabetes ');
    }

    // === CURRENT VITALS FACTOR ===
    // High heart rate
    if (current_vitals.bpm > 100) {
        const deviation = current_vitals.bpm - 100;
        risk_now += Math.min(deviation / 2, 15);
        factors.push(`Elevated heart rate (${current_vitals.bpm} bpm)`);
    }

    // Low SpO2
    if (current_vitals.spo2 < 92) {
        risk_now += (92 - current_vitals.spo2) * 2;
        factors.push(`Low oxygen saturation (${current_vitals.spo2}%)`);
    }

    // === TREND ANALYSIS ===
    if (recent_data.length >= 10) {
        const hr_trend = analyzeHRTrend(recent_data);
        if (hr_trend === 'increasing') {
            risk_now += 10;
            factors.push('Rising heart rate trend');
        }

        const spo2_trend = analyzeSpO2Trend(recent_data);
        if (spo2_trend === 'decreasing') {
            risk_now += 12;
            factors.push('Declining oxygen trend');
        }
    }

    // === ANOMALY FACTOR ===
    if (anomaly_count > 5) {
        risk_now += Math.min(anomaly_count * 2, 20);
        factors.push(`Multiple anomalies detected (${anomaly_count} events)`);
    }

    // Cap at 100
    risk_now = Math.min(risk_now, 100);

    // Project 24h and 48h risks
    const h24 = Math.min(risk_now * 0.85, 100); // Slightly lower for 24h
    const h48 = Math.min(risk_now * 0.75, 100); // Even lower for 48h

    // Determine severity
    let severity: RiskSeverity;
    if (risk_now >= 75) severity = 'critical';
    else if (risk_now >= 50) severity = 'high';
    else if (risk_now >= 30) severity = 'medium';
    else severity = 'low';

    return {
        now: Math.round(risk_now),
        h24: Math.round(h24),
        h48: Math.round(h48),
        severity,
        factors
    };
}

/**
 * Calculate seizure risk prediction
 */
export function calculateSeizureRisk(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry,
    recent_data: SmartBeltSensorData[],
    anomaly_count: number
): { now: number; h24: number; h48: number; severity: RiskSeverity; factors: string[] } {
    let risk_now = 0;
    const factors: string[] = [];

    // === SEIZURE HISTORY FACTOR ===
    if (patient.seizure_history) {
        risk_now += 40;
        factors.push('Previous seizure/fits history');
    }

    // === MOTION ANALYSIS ===
    // Check recent sensor data for seizure-like motion patterns
    const seizure_motion_count = recent_data.filter(d => d.anomaly_type === 'seizure_motion').length;
    if (seizure_motion_count > 2) {
        risk_now += Math.min(seizure_motion_count * 10, 30);
        factors.push(`Seizure-like motion detected (${seizure_motion_count} events)`);
    }

    // High activity index (rapid movement)
    if (current_vitals.activity_index > 5) {
        risk_now += 15;
        factors.push('High motion activity detected');
    }

    // === VITAL SIGNS INSTABILITY ===
    // Heart rate spikes can precede seizures
    const hr_spikes = recent_data.filter(d => d.anomaly_type === 'hr_spike').length;
    if (hr_spikes > 3) {
        risk_now += 12;
        factors.push(`Multiple heart rate spikes (${hr_spikes} events)`);
    }

    // === TEMPERATURE ===
    // Fever can trigger seizures in susceptible patients
    if (current_vitals.temperature > 100.4) {
        risk_now += 18;
        factors.push(`Elevated temperature (${current_vitals.temperature.toFixed(1)}°F)`);
    }

    // === ANOMALY FACTOR ===
    if (anomaly_count > 8) {
        risk_now += 15;
        factors.push(`High anomaly rate (${anomaly_count} events)`);
    }

    risk_now = Math.min(risk_now, 100);

    const h24 = Math.min(risk_now * 0.9, 100);
    const h48 = Math.min(risk_now * 0.8, 100);

    let severity: RiskSeverity;
    if (risk_now >= 80) severity = 'critical';
    else if (risk_now >= 55) severity = 'high';
    else if (risk_now >= 35) severity = 'medium';
    else severity = 'low';

    return {
        now: Math.round(risk_now),
        h24: Math.round(h24),
        h48: Math.round(h48),
        severity,
        factors
    };
}

/**
 * Calculate cardiac failure risk prediction
 */
export function calculateCardiacRisk(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry,
    recent_data: SmartBeltSensorData[],
    anomaly_count: number
): { now: number; h24: number; h48: number; severity: RiskSeverity; factors: string[] } {
    let risk_now = 0;
    const factors: string[] = [];

    // === CARDIAC HISTORY ===
    if (patient.heart_disease_history) {
        risk_now += 30;
        factors.push('Heart disease history');
    }
    if (patient.hypertension) {
        risk_now += 15;
        factors.push('Hypertension');
    }

    // === AGE FACTOR ===
    if (patient.age > 70) {
        risk_now += 15;
        factors.push('Advanced age cardiac risk');
    }

    // === ECG IRREGULARITIES ===
    const ecg_irregular_count = recent_data.filter(d => d.anomaly_type === 'ecg_irregular').length;
    if (ecg_irregular_count > 2) {
        risk_now += Math.min(ecg_irregular_count * 8, 25);
        factors.push(`ECG irregularities detected (${ecg_irregular_count} events)`);
    }

    // === HEART RATE VARIABILITY ===
    if (recent_data.length >= 10) {
        const hr_values = recent_data.slice(-10).map(d => d.heart_rate || 0);
        const hrv = calculateVariance(hr_values);

        // High HRV = instability
        if (hrv > 200) {
            risk_now += 20;
            factors.push('High heart rate variability (unstable rhythm)');
        }
        // Low HRV = poor cardiac health
        else if (hrv < 10) {
            risk_now += 15;
            factors.push('Low heart rate variability (poor cardiac adaptation)');
        }
    }

    // === OXYGEN SATURATION ===
    if (current_vitals.spo2 < 90) {
        risk_now += 18;
        factors.push(`Low oxygen saturation (${current_vitals.spo2}%)`);
    }

    // === HEART RATE EXTREMES ===
    if (current_vitals.bpm < 50) {
        risk_now += 15;
        factors.push(`Bradycardia (${current_vitals.bpm} bpm)`);
    } else if (current_vitals.bpm > 120) {
        risk_now += 18;
        factors.push(`Severe tachycardia (${current_vitals.bpm} bpm)`);
    }

    // === TREND ANALYSIS ===
    if (recent_data.length >= 10) {
        const hr_trend = analyzeHRTrend(recent_data);
        const spo2_trend = analyzeSpO2Trend(recent_data);

        if (hr_trend === 'increasing' && spo2_trend === 'decreasing') {
            risk_now += 12;
            factors.push('Concerning vital signs divergence (↑HR, ↓SpO2)');
        }
    }

    risk_now = Math.min(risk_now, 100);

    const h24 = Math.min(risk_now * 0.88, 100);
    const h48 = Math.min(risk_now * 0.77, 100);

    let severity: RiskSeverity;
    if (risk_now >= 75) severity = 'critical';
    else if (risk_now >= 55) severity = 'high';
    else if (risk_now >= 35) severity = 'medium';
    else severity = 'low';

    return {
        now: Math.round(risk_now),
        h24: Math.round(h24),
        h48: Math.round(h48),
        severity,
        factors
    };
}

/**
 * Calculate oxygen crash risk
 */
export function calculateOxygenCrashRisk(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry,
    recent_data: SmartBeltSensorData[]
): number {
    let risk = 0;

    // Current SpO2 level
    if (current_vitals.spo2 < 88) risk += 50;
    else if (current_vitals.spo2 < 92) risk += 30;
    else if (current_vitals.spo2 < 95) risk += 15;

    // SpO2 drop trend
    const spo2_drops = recent_data.filter(d => d.anomaly_type === 'spo2_drop').length;
    if (spo2_drops > 3) {
        risk += Math.min(spo2_drops * 5, 25);
    }

    // Medical history
    if (patient.heart_disease_history || patient.diabetes) {
        risk += 10;
    }

    return Math.min(Math.round(risk), 100);
}

// ================================================================
// UPDATE PREDICTIONS IN DATABASE
// ================================================================

/**
 * Update patient predictions in database
 */
export async function updatePatientPredictions(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry
): Promise<void> {
    // Fetch recent sensor data (last hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recent_data } = await supabase
        .from('smart_belt_sensor_data')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('timestamp', oneHourAgo)
        .order('timestamp', { ascending: false })
        .limit(100);

    if (!recent_data) return;

    const anomaly_count = recent_data.filter(d => d.anomaly_detected).length;

    // Calculate all risk predictions
    const stroke_risk = calculateStrokeRisk(patient, current_vitals, recent_data, anomaly_count);
    const seizure_risk = calculateSeizureRisk(patient, current_vitals, recent_data, anomaly_count);
    const cardiac_risk = calculateCardiacRisk(patient, current_vitals, recent_data, anomaly_count);
    const oxygen_risk = calculateOxygenCrashRisk(patient, current_vitals, recent_data);

    // Combine all risk factors
    const all_factors = [
        ...stroke_risk.factors,
        ...seizure_risk.factors,
        ...cardiac_risk.factors
    ];
    const unique_factors = Array.from(new Set(all_factors));

    // Calculate prediction confidence based on data availability
    const confidence = Math.min(recent_data.length / 50, 1); // More data = more confidence

    // Trigger Gemini deep analysis asynchronously
    // We don't await it to avoid blocking the main prediction loop
    GeminiService.analyzeHealthData(
        current_vitals,
        patient,
        recent_data.filter(d => d.anomaly_detected)
    ).then(geminiResult => {
        if (geminiResult && (geminiResult.pre_heartstroke_risk > 0 || geminiResult.pre_fits_risk > 0)) {
            supabase
                .from('smart_belt_predictions')
                .update({
                    pre_heartstroke_risk: geminiResult.pre_heartstroke_risk,
                    pre_fits_risk: geminiResult.pre_fits_risk,
                    ai_reasoning: geminiResult.reasoning,
                    risk_factors: Array.from(new Set([...unique_factors, ...geminiResult.recommendations]))
                })
                .eq('patient_id', patient.id)
                .then(({ error }) => {
                    if (error) console.error('Error updating Gemini insights:', error);
                });
        }
    });

    // Update predictions in database
    const { error } = await supabase
        .from('smart_belt_predictions')
        .upsert({
            patient_id: patient.id,
            stroke_risk_now: stroke_risk.now,
            stroke_risk_24h: stroke_risk.h24,
            stroke_risk_48h: stroke_risk.h48,
            stroke_severity: stroke_risk.severity,
            seizure_risk_now: seizure_risk.now,
            seizure_risk_24h: seizure_risk.h24,
            seizure_risk_48h: seizure_risk.h48,
            seizure_severity: seizure_risk.severity,
            cardiac_risk_now: cardiac_risk.now,
            cardiac_risk_24h: cardiac_risk.h24,
            cardiac_risk_48h: cardiac_risk.h48,
            cardiac_severity: cardiac_risk.severity,
            oxygen_crash_risk: oxygen_risk,
            risk_factors: unique_factors,
            prediction_confidence: confidence,
            last_updated: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating predictions:', error);
    }

    // Update analysis metadata
    await supabase
        .from('smart_belt_analysis_metadata')
        .update({
            last_prediction_update: new Date().toISOString()
        })
        .eq('patient_id', patient.id);
}

// ================================================================
// TREND ANALYSIS HELPERS
// ================================================================

function analyzeHRTrend(data: SmartBeltSensorData[]): 'increasing' | 'stable' | 'decreasing' {
    if (data.length < 5) return 'stable';

    const recent = data.slice(-10).map(d => d.heart_rate || 0);
    const firstHalf = recent.slice(0, recent.length / 2);
    const secondHalf = recent.slice(recent.length / 2);

    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    const change = avgSecond - avgFirst;
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
}

function analyzeSpO2Trend(data: SmartBeltSensorData[]): 'increasing' | 'stable' | 'decreasing' {
    if (data.length < 5) return 'stable';

    const recent = data.slice(-10).map(d => d.spo2 || 0);
    const firstHalf = recent.slice(0, recent.length / 2);
    const secondHalf = recent.slice(recent.length / 2);

    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    const change = avgSecond - avgFirst;
    if (change > 2) return 'increasing';
    if (change < -2) return 'decreasing';
    return 'stable';
}

function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => (val - mean) ** 2);
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

// ================================================================
// GET PREDICTIONS
// ================================================================

/**
 * Get current predictions for a patient
 */
export async function getPatientPredictions(patientId: number): Promise<SmartBeltPrediction | null> {
    const { data, error } = await supabase
        .from('smart_belt_predictions')
        .select('*')
        .eq('patient_id', patientId)
        .single();

    if (error) {
        console.error('Error fetching predictions:', error);
        return null;
    }

    return data;
}
