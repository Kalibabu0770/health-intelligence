// ================================================================
// DAILY AI REPORT GENERATOR & DATA CLEANUP SERVICE
// ================================================================
// Runs daily at midnight to:
// 1. Compile full-day analyzed data
// 2. Generate AI health intelligence report
// 3. Delete raw sensor data older than 24 hours
// 4. Store only AI summaries and insights

import { supabase } from '../../services/supabaseClient';
import {
    SmartBeltPatient,
    SmartBeltSensorData,
    DailyHealthReport,
    ActivityLevel,
    TrendDirection,
    CriticalIncident
} from '../types';
import { getActiveSmartBeltPatients } from '../services/smartBeltPatientService';

// ================================================================
// DAILY REPORT GENERATION
// ================================================================

/**
 * Generate daily report for a single patient
 */
export async function generateDailyReportForPatient(
    patient: SmartBeltPatient,
    reportDate: string // YYYY-MM-DD
): Promise<DailyHealthReport | null> {
    console.log(`📊 Generating daily report for patient ${patient.id} (${patient.name}) - ${reportDate}`);

    // Fetch all sensor data for the report date
    const startOfDay = `${reportDate}T00:00:00Z`;
    const endOfDay = `${reportDate}T23:59:59Z`;

    const { data: sensorData, error } = await supabase
        .from('smart_belt_sensor_data')
        .select('*')
        .eq('patient_id', patient.id)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching sensor data for report:', error);
        return null;
    }

    if (!sensorData || sensorData.length === 0) {
        console.log(`No sensor data found for patient ${patient.id} on ${reportDate}`);
        return null;
    }

    console.log(`Found ${sensorData.length} sensor readings for ${reportDate}`);

    // === CALCULATE SUMMARY METRICS ===
    const heartRates = sensorData.map(d => d.heart_rate).filter(hr => hr != null && hr > 0) as number[];
    const spo2Values = sensorData.map(d => d.spo2).filter(s => s != null && s > 0) as number[];
    const tempValues = sensorData.map(d => d.temperature).filter(t => t != null && t > 90) as number[];

    const avg_heart_rate = calculateAverage(heartRates);
    const max_heart_rate = Math.max(...heartRates);
    const min_heart_rate = Math.min(...heartRates);

    const avg_spo2 = calculateAverage(spo2Values);
    const min_spo2 = Math.min(...spo2Values);

    const avg_temperature = calculateAverage(tempValues);
    const max_temperature = Math.max(...tempValues);

    // === ACTIVITY LEVEL ANALYSIS ===
    const activity_level = determineActivityLevel(sensorData);

    // === ANOMALY ANALYSIS ===
    const anomalies = sensorData.filter(d => d.anomaly_detected);
    const anomaly_count = anomalies.length;

    // === CRITICAL INCIDENTS ===
    const critical_incidents: CriticalIncident[] = anomalies
        .filter(a => a.risk_score && a.risk_score > 70)
        .map(a => ({
            timestamp: a.timestamp,
            type: a.anomaly_type || 'unknown',
            severity: a.risk_score! > 90 ? 'critical' : a.risk_score! > 80 ? 'high' : 'warning',
            vitals_snapshot: {
                hr: a.heart_rate,
                spo2: a.spo2,
                temp: a.temperature,
                ecg: a.ecg_value,
                motion: [a.accel_x, a.accel_y, a.accel_z]
            }
        }));

    // === RISK TREND ANALYSIS ===
    const { data: predictions } = await supabase
        .from('smart_belt_predictions')
        .select('*')
        .eq('patient_id', patient.id)
        .single();

    // Analyze trends by comparing first half vs second half of day
    const midpoint = Math.floor(sensorData.length / 2);
    const firstHalf = sensorData.slice(0, midpoint);
    const secondHalf = sensorData.slice(midpoint);

    const stroke_risk_trend = analyzeTrend(firstHalf, secondHalf, 'stroke');
    const seizure_risk_trend = analyzeTrend(firstHalf, secondHalf, 'seizure');
    const cardiac_risk_trend = analyzeTrend(firstHalf, secondHalf, 'cardiac');

    // === STABILITY SCORE ===
    const stability_score = calculateStabilityScore(sensorData, anomaly_count);

    // === AI SUMMARY GENERATION ===
    const ai_summary = generateAISummary(
        patient,
        sensorData,
        {
            avg_heart_rate,
            max_heart_rate,
            min_heart_rate,
            avg_spo2,
            min_spo2,
            avg_temperature,
            max_temperature,
            activity_level,
            anomaly_count,
            critical_incidents,
            stability_score
        }
    );

    // === RECOMMENDATIONS ===
    const recommendations = generateRecommendations(
        patient,
        {
            avg_heart_rate,
            avg_spo2,
            avg_temperature,
            anomaly_count,
            critical_incidents,
            stability_score,
            stroke_risk_trend,
            seizure_risk_trend,
            cardiac_risk_trend
        }
    );

    // === CREATE REPORT ===
    const report: Partial<DailyHealthReport> = {
        patient_id: patient.id,
        report_date: reportDate,
        avg_heart_rate,
        max_heart_rate,
        min_heart_rate,
        avg_spo2,
        min_spo2,
        avg_temperature,
        max_temperature,
        activity_level,
        stability_score,
        anomaly_count,
        critical_incidents,
        stroke_risk_trend,
        seizure_risk_trend,
        cardiac_risk_trend,
        avg_stroke_risk: predictions?.stroke_risk_now || 0,
        avg_seizure_risk: predictions?.seizure_risk_now || 0,
        avg_cardiac_risk: predictions?.cardiac_risk_now || 0,
        ai_summary,
        recommendations
    };

    // === SAVE REPORT TO DATABASE ===
    const { data: savedReport, error: saveError } = await supabase
        .from('smart_belt_daily_reports')
        .upsert(report)
        .select()
        .single();

    if (saveError) {
        console.error('Error saving daily report:', saveError);
        return null;
    }

    console.log(`✅ Daily report generated for patient ${patient.id}`);

    return savedReport;
}

// ================================================================
// ANALYSIS HELPERS
// ================================================================

function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10;
}

function determineActivityLevel(data: SmartBeltSensorData[]): ActivityLevel {
    const activities = data.map(d => d.motion_activity_index || 0);
    const avgActivity = calculateAverage(activities);
    const variance = calculateVariance(activities);

    if (variance > 5) return 'volatile';
    if (avgActivity > 4) return 'active';
    if (avgActivity > 2) return 'moderate';
    if (avgActivity > 0.5) return 'low';
    return 'rest';
}

function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = calculateAverage(values);
    const squaredDiffs = values.map(val => (val - mean) ** 2);
    return calculateAverage(squaredDiffs);
}

function analyzeTrend(
    firstHalf: SmartBeltSensorData[],
    secondHalf: SmartBeltSensorData[],
    riskType: 'stroke' | 'seizure' | 'cardiac'
): TrendDirection {
    // Analyze based on anomaly patterns and vital trends
    const firstAnomalies = firstHalf.filter(d => d.anomaly_detected).length;
    const secondAnomalies = secondHalf.filter(d => d.anomaly_detected).length;

    const firstHR = calculateAverage(firstHalf.map(d => d.heart_rate || 0).filter(hr => hr > 0));
    const secondHR = calculateAverage(secondHalf.map(d => d.heart_rate || 0).filter(hr => hr > 0));

    const anomalyIncrease = secondAnomalies > firstAnomalies * 1.5;
    const hrIncrease = secondHR > firstHR + 10;

    if (anomalyIncrease || hrIncrease) return 'increasing';
    if (secondAnomalies < firstAnomalies * 0.7 && secondHR < firstHR - 5) return 'decreasing';
    if (Math.abs(secondAnomalies - firstAnomalies) > 5) return 'volatile';
    return 'stable';
}

function calculateStabilityScore(data: SmartBeltSensorData[], anomalyCount: number): number {
    // Score from 0-100, higher = more stable
    let score = 100;

    // Deduct for anomalies
    score -= Math.min(anomalyCount * 2, 40);

    // Deduct for HR variability
    const hrValues = data.map(d => d.heart_rate || 0).filter(hr => hr > 0);
    const hrVariance = calculateVariance(hrValues);
    if (hrVariance > 200) score -= 20;
    else if (hrVariance > 100) score -= 10;

    // Deduct for SpO2 variability
    const spo2Values = data.map(d => d.spo2 || 0).filter(s => s > 0);
    const spo2Variance = calculateVariance(spo2Values);
    if (spo2Variance > 10) score -= 15;
    else if (spo2Variance > 5) score -= 8;

    return Math.max(0, Math.min(100, score));
}

// ================================================================
// AI SUMMARY GENERATION
// ================================================================

function generateAISummary(
    patient: SmartBeltPatient,
    sensorData: SmartBeltSensorData[],
    metrics: any
): string {
    const parts: string[] = [];

    // Overall assessment
    if (metrics.stability_score > 80) {
        parts.push(`Patient ${patient.name} showed excellent vital stability throughout the day.`);
    } else if (metrics.stability_score > 60) {
        parts.push(`Patient ${patient.name} maintained generally stable vitals with minor fluctuations.`);
    } else if (metrics.stability_score > 40) {
        parts.push(`Patient ${patient.name} experienced moderate vital instability requiring attention.`);
    } else {
        parts.push(`Patient ${patient.name} showed concerning vital instability with multiple events.`);
    }

    // Heart rate analysis
    if (metrics.max_heart_rate > 120) {
        parts.push(`Heart rate reached ${metrics.max_heart_rate} bpm (tachycardia), averaging ${metrics.avg_heart_rate.toFixed(1)} bpm.`);
    } else if (metrics.min_heart_rate < 50) {
        parts.push(`Heart rate dropped to ${metrics.min_heart_rate} bpm (bradycardia), averaging ${metrics.avg_heart_rate.toFixed(1)} bpm.`);
    } else {
        parts.push(`Heart rate remained within normal range, averaging ${metrics.avg_heart_rate.toFixed(1)} bpm (range: ${metrics.min_heart_rate}-${metrics.max_heart_rate}).`);
    }

    // SpO2 analysis
    if (metrics.min_spo2 < 90) {
        parts.push(`Critical oxygen desaturation detected with SpO₂ dropping to ${metrics.min_spo2}%.`);
    } else if (metrics.min_spo2 < 94) {
        parts.push(`Mild oxygen desaturation noted with SpO₂ reaching ${metrics.min_spo2}%, averaging ${metrics.avg_spo2.toFixed(1)}%.`);
    } else {
        parts.push(`Oxygen saturation remained excellent, averaging ${metrics.avg_spo2.toFixed(1)}%.`);
    }

    // Temperature analysis
    if (metrics.max_temperature > 100.4) {
        parts.push(`Fever detected with temperature peaking at ${metrics.max_temperature.toFixed(1)}°F.`);
    } else if (metrics.avg_temperature < 97) {
        parts.push(`Lower than normal body temperature observed, averaging ${metrics.avg_temperature.toFixed(1)}°F.`);
    }

    // Anomaly summary
    if (metrics.anomaly_count > 20) {
        parts.push(`High number of anomalies detected (${metrics.anomaly_count} events), indicating heightened monitoring is required.`);
    } else if (metrics.anomaly_count > 10) {
        parts.push(`${metrics.anomaly_count} anomalous events recorded throughout the day.`);
    } else if (metrics.anomaly_count > 0) {
        parts.push(`${metrics.anomaly_count} minor anomalies detected.`);
    } else {
        parts.push(`No significant anomalies detected - excellent day.`);
    }

    // Critical incidents
    if (metrics.critical_incidents.length > 0) {
        parts.push(`${metrics.critical_incidents.length} critical incident(s) requiring immediate attention were logged.`);
    }

    // Activity
    parts.push(`Activity level: ${metrics.activity_level}.`);

    return parts.join(' ');
}

function generateRecommendations(patient: SmartBeltPatient, metrics: any): string {
    const recommendations: string[] = [];

    // Heart rate recommendations
    if (metrics.avg_heart_rate > 100) {
        recommendations.push('Consider evaluating for cardiac stress or anxiety.');
    } else if (metrics.avg_heart_rate < 60 && !patient.heart_disease_history) {
        recommendations.push('Bradycardia observed - assess medication effects.');
    }

    // SpO2 recommendations
    if (metrics.avg_spo2 < 94) {
        recommendations.push('Low oxygen saturation - consider supplemental oxygen or respiratory assessment.');
    }

    // Anomaly recommendations
    if (metrics.anomaly_count > 15) {
        recommendations.push('High anomaly count warrants comprehensive medical review.');
    }

    // Stability recommendations
    if (metrics.stability_score < 50) {
        recommendations.push('Low stability score - increase monitoring frequency and consider ICU transfer.');
    } else if (metrics.stability_score < 70) {
        recommendations.push('Moderate instability - continue close monitoring.');
    }

    // Trend recommendations
    if (metrics.stroke_risk_trend === 'increasing') {
        recommendations.push('Rising stroke risk detected - neurological assessment recommended.');
    }
    if (metrics.cardiac_risk_trend === 'increasing') {
        recommendations.push('Cardiac risk trending upward - cardiology consult advised.');
    }
    if (metrics.seizure_risk_trend === 'increasing') {
        recommendations.push('Seizure risk increasing - review anti-epileptic medications.');
    }

    // Critical incident recommendations
    if (metrics.critical_incidents.length > 3) {
        recommendations.push('Multiple critical incidents - escalate care level immediately.');
    }

    if (recommendations.length === 0) {
        return 'Continue current monitoring protocol. Patient remains stable.';
    }

    return recommendations.join(' ');
}

// ================================================================
// DATA CLEANUP
// ================================================================

/**
 * Delete sensor data older than 24 hours
 */
export async function cleanupOldSensorData(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`🗑️  Deleting sensor data older than ${twentyFourHoursAgo}`);

    const { data, error } = await supabase
        .from('smart_belt_sensor_data')
        .delete()
        .lt('timestamp', twentyFourHoursAgo)
        .select('id');

    if (error) {
        console.error('Error deleting old sensor data:', error);
        return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`✅ Deleted ${deletedCount} old sensor records`);

    return deletedCount;
}

// ================================================================
// DAILY CYCLE AUTOMATION
// ================================================================

/**
 * Main function to run daily at midnight
 * Generates reports for all active patients and cleans up old data
 */
export async function runDailyReportCycle(): Promise<void> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reportDate = yesterday.toISOString().split('T')[0];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌙 DAILY REPORT CYCLE STARTING - ${new Date().toISOString()}`);
    console.log(`📅 Generating reports for: ${reportDate}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        // Get all active patients
        const patients = await getActiveSmartBeltPatients();
        console.log(`Found ${patients.length} active Smart Belt patients`);

        // Generate reports for each patient
        let successCount = 0;
        let failureCount = 0;

        for (const patient of patients) {
            try {
                const report = await generateDailyReportForPatient(patient, reportDate);
                if (report) {
                    successCount++;
                } else {
                    failureCount++;
                }
            } catch (err) {
                console.error(`Error generating report for patient ${patient.id}:`, err);
                failureCount++;
            }
        }

        console.log(`\n📊 Report Generation Summary:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failureCount}`);

        // Cleanup old sensor data
        const deletedCount = await cleanupOldSensorData();

        console.log(`\n🗑️  Data Cleanup Summary:`);
        console.log(`   Deleted ${deletedCount} sensor records older than 24 hours`);

    } catch (error) {
        console.error('Error in daily report cycle:', error);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ DAILY REPORT CYCLE COMPLETED - ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
}

// ================================================================
// REPORT RETRIEVAL
// ================================================================

/**
 * Get daily reports for a patient
 */
export async function getPatientDailyReports(
    patientId: number,
    limit: number = 30
): Promise<DailyHealthReport[]> {
    const { data, error } = await supabase
        .from('smart_belt_daily_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('report_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching daily reports:', error);
        return [];
    }

    return data || [];
}

/**
 * Get daily report for specific date
 */
export async function getDailyReportByDate(
    patientId: number,
    reportDate: string
): Promise<DailyHealthReport | null> {
    const { data, error } = await supabase
        .from('smart_belt_daily_reports')
        .select('*')
        .eq('patient_id', patientId)
        .eq('report_date', reportDate)
        .single();

    if (error) {
        console.error('Error fetching daily report:', error);
        return null;
    }

    return data;
}
