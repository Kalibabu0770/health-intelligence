// ================================================================
// EMERGENCY ALERT TRIGGER SYSTEM
// ================================================================
// Monitors real-time predictions and anomalies to trigger emergency alerts
// Sends instant notifications when critical conditions are detected

import { supabase } from '../../services/supabaseClient';
import {
    SmartBeltPatient,
    SmartBeltTelemetry,
    SmartBeltPrediction,
    EmergencyAlert,
    EmergencyAlertType,
    AlertSeverity
} from '../types';
import { AnomalyResult } from './RealtimeAnalysisEngine';

// ================================================================
// ALERT TRIGGER THRESHOLDS
// ================================================================

interface AlertThresholds {
    stroke_risk_critical: number; // Trigger STROKE_CRITICAL alert
    stroke_risk_warning: number; // Trigger STROKE_WARNING alert

    seizure_risk_critical: number; // Trigger SEIZURE_DETECTED alert

    cardiac_risk_critical: number; // Trigger CARDIAC_CRITICAL alert
    cardiac_risk_high: number; // Trigger CARDIAC_ARRHYTHMIA alert

    oxygen_critical: number; // SpO2 below this = OXYGEN_CRITICAL
    temperature_critical: number; // Temp above this = TEMPERATURE_CRITICAL
}

const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
    stroke_risk_critical: 70,
    stroke_risk_warning: 50,
    seizure_risk_critical: 75,
    cardiac_risk_critical: 75,
    cardiac_risk_high: 55,
    oxygen_critical: 88,
    temperature_critical: 103.0
};

// ================================================================
// ALERT TRIGGER LOGIC
// ================================================================

/**
 * Check if emergency alerts should be triggered based on predictions and vitals
 */
export async function checkAndTriggerAlerts(
    patient: SmartBeltPatient,
    current_vitals: SmartBeltTelemetry,
    predictions: SmartBeltPrediction,
    anomalies: AnomalyResult[],
    thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): Promise<EmergencyAlert[]> {
    const alerts: EmergencyAlert[] = [];

    // === STROKE ALERTS ===
    if (predictions.stroke_risk_now >= thresholds.stroke_risk_critical) {
        const alert = await createEmergencyAlert(
            patient.id,
            'STROKE_CRITICAL',
            'critical',
            `Critical stroke risk detected: ${predictions.stroke_risk_now}% probability. Immediate medical attention required.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    } else if (predictions.stroke_risk_now >= thresholds.stroke_risk_warning) {
        const alert = await createEmergencyAlert(
            patient.id,
            'STROKE_WARNING',
            'warning',
            `Elevated stroke risk: ${predictions.stroke_risk_now}% probability. Monitor closely.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    // === SEIZURE ALERTS ===
    if (predictions.seizure_risk_now >= thresholds.seizure_risk_critical) {
        const alert = await createEmergencyAlert(
            patient.id,
            'SEIZURE_DETECTED',
            'critical',
            `High seizure risk: ${predictions.seizure_risk_now}% probability. Seizure-like activity may be imminent.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    // Check for seizure motion anomalies
    const seizure_motion = anomalies.find(a => a.type === 'seizure_motion');
    if (seizure_motion) {
        const alert = await createEmergencyAlert(
            patient.id,
            'SEIZURE_DETECTED',
            'critical',
            `Seizure-like motion pattern detected: ${seizure_motion.message}`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    // === CARDIAC ALERTS ===
    if (predictions.cardiac_risk_now >= thresholds.cardiac_risk_critical) {
        const alert = await createEmergencyAlert(
            patient.id,
            'CARDIAC_CRITICAL',
            'critical',
            `Critical cardiac risk: ${predictions.cardiac_risk_now}% probability. Severe cardiac event possible.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    } else if (predictions.cardiac_risk_now >= thresholds.cardiac_risk_high) {
        // Check for ECG irregularities
        const ecg_irregular = anomalies.find(a => a.type === 'ecg_irregular');
        if (ecg_irregular) {
            const alert = await createEmergencyAlert(
                patient.id,
                'CARDIAC_ARRHYTHMIA',
                'high',
                `Cardiac arrhythmia detected: ${ecg_irregular.message}`,
                current_vitals,
                {
                    stroke: predictions.stroke_risk_now,
                    seizure: predictions.seizure_risk_now,
                    cardiac: predictions.cardiac_risk_now
                }
            );
            if (alert) alerts.push(alert);
        }
    }

    // === FALL DETECTION ALERT ===
    const fall_detected = anomalies.find(a => a.type === 'fall_detected');
    if (fall_detected) {
        const alert = await createEmergencyAlert(
            patient.id,
            'FALL_DETECTED',
            'critical',
            `Fall detected: ${fall_detected.message}. Patient may be injured.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    // === OXYGEN CRITICAL ALERT ===
    if (current_vitals.spo2 < thresholds.oxygen_critical) {
        const alert = await createEmergencyAlert(
            patient.id,
            'OXYGEN_CRITICAL',
            'critical',
            `Critical oxygen desaturation: SpO₂ ${current_vitals.spo2}%. Patient requires immediate oxygen support.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    // === TEMPERATURE CRITICAL ALERT ===
    if (current_vitals.temperature >= thresholds.temperature_critical) {
        const alert = await createEmergencyAlert(
            patient.id,
            'TEMPERATURE_CRITICAL',
            'critical',
            `Critical fever: ${current_vitals.temperature.toFixed(1)}°F. Immediate intervention required.`,
            current_vitals,
            {
                stroke: predictions.stroke_risk_now,
                seizure: predictions.seizure_risk_now,
                cardiac: predictions.cardiac_risk_now
            }
        );
        if (alert) alerts.push(alert);
    }

    return alerts;
}

// ================================================================
// ALERT CREATION & MANAGEMENT
// ================================================================

/**
 * Create an emergency alert in the database
 * Checks for duplicate recent alerts to avoid spam
 */
async function createEmergencyAlert(
    patient_id: number,
    alert_type: EmergencyAlertType,
    severity: AlertSeverity,
    message: string,
    vitals: SmartBeltTelemetry,
    risk_scores: { stroke: number; seizure: number; cardiac: number }
): Promise<EmergencyAlert | null> {
    // Check for duplicate alert in last 5 minutes (avoid spam)
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const { data: recent_alerts } = await supabase
        .from('smart_belt_emergency_alerts')
        .select('id')
        .eq('patient_id', patient_id)
        .eq('alert_type', alert_type)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);

    if (recent_alerts && recent_alerts.length > 0) {
        // Alert already triggered recently, skip
        console.log(`Skipping duplicate ${alert_type} alert for patient ${patient_id}`);
        return null;
    }

    // Create vitals snapshot
    const vitals_snapshot = {
        hr: vitals.bpm,
        spo2: vitals.spo2,
        temp: vitals.temperature,
        ecg: vitals.ecg,
        motion: [vitals.ax, vitals.ay, vitals.az] as [number, number, number],
        timestamp: new Date(vitals.timestamp).toISOString()
    };

    // Insert alert
    const { data: alert, error } = await supabase
        .from('smart_belt_emergency_alerts')
        .insert({
            patient_id,
            alert_type,
            severity,
            message,
            vitals_snapshot,
            risk_scores,
            acknowledged: false,
            resolved: false
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating emergency alert:', error);
        return null;
    }

    // Update analysis metadata
    await supabase
        .from('smart_belt_analysis_metadata')
        .update({
            total_alerts_today: supabase.rpc('increment', { row_id: patient_id, column_name: 'total_alerts_today' })
        })
        .eq('patient_id', patient_id);

    console.log(`🚨 EMERGENCY ALERT TRIGGERED: ${alert_type} for patient ${patient_id}`);

    return alert;
}

/**
 * Acknowledge an emergency alert
 */
export async function acknowledgeAlert(
    alert_id: number,
    acknowledged_by: string
): Promise<void> {
    const { error } = await supabase
        .from('smart_belt_emergency_alerts')
        .update({
            acknowledged: true,
            acknowledged_by,
            acknowledged_at: new Date().toISOString()
        })
        .eq('id', alert_id);

    if (error) {
        console.error('Error acknowledging alert:', error);
        throw error;
    }
}

/**
 * Resolve an emergency alert
 */
export async function resolveAlert(
    alert_id: number,
    resolved_by: string,
    resolution_notes?: string
): Promise<void> {
    const { error } = await supabase
        .from('smart_belt_emergency_alerts')
        .update({
            resolved: true,
            resolved_by,
            resolved_at: new Date().toISOString(),
            resolution_notes,
            acknowledged: true, // Auto-acknowledge when resolving
            acknowledged_by: resolved_by,
            acknowledged_at: new Date().toISOString()
        })
        .eq('id', alert_id);

    if (error) {
        console.error('Error resolving alert:', error);
        throw error;
    }
}

/**
 * Get unacknowledged alerts for a patient
 */
export async function getUnacknowledgedAlerts(patient_id: number): Promise<EmergencyAlert[]> {
    const { data, error } = await supabase
        .from('smart_belt_emergency_alerts')
        .select('*')
        .eq('patient_id', patient_id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching unacknowledged alerts:', error);
        return [];
    }

    return data || [];
}

/**
 * Get all active alerts across all patients
 */
export async function getAllActiveAlerts(): Promise<EmergencyAlert[]> {
    const { data, error } = await supabase
        .from('smart_belt_emergency_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching active alerts:', error);
        return [];
    }

    return data || [];
}

/**
 * Get alert history for a patient
 */
export async function getPatientAlertHistory(
    patient_id: number,
    limit: number = 50
): Promise<EmergencyAlert[]> {
    const { data, error } = await supabase
        .from('smart_belt_emergency_alerts')
        .select('*')
        .eq('patient_id', patient_id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching alert history:', error);
        return [];
    }

    return data || [];
}

// ================================================================
// REAL-TIME ALERT SUBSCRIPTIONS
// ================================================================

/**
 * Subscribe to new emergency alerts
 */
export function subscribeToEmergencyAlerts(
    callback: (alert: EmergencyAlert) => void
): { unsubscribe: () => void } {
    const channel = supabase
        .channel('emergency_alerts_channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'smart_belt_emergency_alerts'
            },
            (payload) => {
                callback(payload.new as EmergencyAlert);
            }
        )
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}

/**
 * Subscribe to alert acknowledgements and resolutions
 */
export function subscribeToAlertUpdates(
    callback: (alert: EmergencyAlert) => void
): { unsubscribe: () => void } {
    const channel = supabase
        .channel('alert_updates_channel')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'smart_belt_emergency_alerts'
            },
            (payload) => {
                callback(payload.new as EmergencyAlert);
            }
        )
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}

// ================================================================
// ALERT STATISTICS
// ================================================================

/**
 * Get alert statistics for dashboard
 */
export async function getAlertStatistics() {
    const today = new Date().toISOString().split('T')[0];

    const [unacknowledged, todayAlerts, criticalAlerts] = await Promise.all([
        supabase
            .from('smart_belt_emergency_alerts')
            .select('id', { count: 'exact' })
            .eq('acknowledged', false),

        supabase
            .from('smart_belt_emergency_alerts')
            .select('id', { count: 'exact' })
            .gte('created_at', today),

        supabase
            .from('smart_belt_emergency_alerts')
            .select('id', { count: 'exact' })
            .eq('severity', 'critical')
            .eq('acknowledged', false)
    ]);

    return {
        unacknowledged_count: unacknowledged.count || 0,
        today_count: todayAlerts.count || 0,
        critical_count: criticalAlerts.count || 0
    };
}
