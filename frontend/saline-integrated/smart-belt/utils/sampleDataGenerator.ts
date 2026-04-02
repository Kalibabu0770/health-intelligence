// ================================================================
// SAMPLE DATA GENERATOR FOR SMART BELT TESTING
// ================================================================
// This utility generates realistic AI prediction data for testing
// Run this to populate Firebase with sample predictions
// ================================================================

import { database } from '../../services/firebaseConfig';
import { ref, set, get } from 'firebase/database';

// ================================================================
// GENERATE REALISTIC AI PREDICTIONS
// ================================================================

function generateRealisticRisk(baseline: number, variance: number): number {
    const risk = baseline + (Math.random() - 0.5) * variance;
    return Math.max(0, Math.min(100, Math.round(risk)));
}

function getRiskSeverity(risk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (risk >= 80) return 'critical';
    if (risk >= 60) return 'high';
    if (risk >= 35) return 'medium';
    return 'low';
}

function generateRiskFactors(patient: any, strokeRisk: number, seizureRisk: number, cardiacRisk: number): string[] {
    const factors: string[] = [];

    if (patient.stroke_history) factors.push('Previous stroke history');
    if (patient.heart_disease_history) factors.push('Known heart disease');
    if (patient.seizure_history) factors.push('Previous seizure episodes');
    if (patient.diabetes) factors.push('Diabetic patient');
    if (patient.hypertension) factors.push('Hypertension detected');

    if (strokeRisk > 50) {
        factors.push('Elevated baseline HR (+12% over 6h)');
        factors.push('ECG irregularities detected (3 events)');
    }

    if (seizureRisk > 40) {
        factors.push('Unusual motor activity patterns');
        factors.push('Temperature fluctuations');
    }

    if (cardiacRisk > 50) {
        factors.push('Heart rate variability below normal');
        factors.push('Arrhythmia patterns detected');
    }

    if (factors.length === 0) {
        factors.push('Stable vitals, no significant risk factors');
    }

    return factors;
}

/**
 * Generate realistic AI predictions for a patient
 */
export async function generateSamplePredictionsForPatient(patientKey: string) {
    try {
        // Get patient data
        const patientRef = ref(database, `smart_belt_patients/${patientKey}`);
        const snapshot = await get(patientRef);

        if (!snapshot.exists()) {
            console.error('Patient not found:', patientKey);
            return;
        }

        const patient = snapshot.val();

        // Generate realistic risks based on patient profile
        let strokeBase = 15;
        let seizureBase = 10;
        let cardiacBase = 20;

        if (patient.stroke_history) strokeBase += 30;
        if (patient.heart_disease_history) cardiacBase += 25;
        if (patient.seizure_history) seizureBase += 35;
        if (patient.diabetes) strokeBase += 15;
        if (patient.hypertension) {
            strokeBase += 10;
            cardiacBase += 15;
        }

        const strokeRiskNow = generateRealisticRisk(strokeBase, 20);
        const strokeRisk24h = generateRealisticRisk(strokeRiskNow, 15);
        const strokeRisk48h = generateRealisticRisk(strokeRisk24h, 10);

        const seizureRiskNow = generateRealisticRisk(seizureBase, 15);
        const seizureRisk24h = generateRealisticRisk(seizureRiskNow, 12);
        const seizureRisk48h = generateRealisticRisk(seizureRisk24h, 10);

        const cardiacRiskNow = generateRealisticRisk(cardiacBase, 18);
        const cardiacRisk24h = generateRealisticRisk(cardiacRiskNow, 15);
        const cardiacRisk48h = generateRealisticRisk(cardiacRisk24h, 12);

        const oxygenCrashRisk = generateRealisticRisk(8, 10);

        const predictions = {
            patient_id: patient.id,
            stroke_risk_now: strokeRiskNow,
            stroke_risk_24h: strokeRisk24h,
            stroke_risk_48h: strokeRisk48h,
            stroke_severity: getRiskSeverity(strokeRiskNow),
            seizure_risk_now: seizureRiskNow,
            seizure_risk_24h: seizureRisk24h,
            seizure_risk_48h: seizureRisk48h,
            seizure_severity: getRiskSeverity(seizureRiskNow),
            cardiac_risk_now: cardiacRiskNow,
            cardiac_risk_24h: cardiacRisk24h,
            cardiac_risk_48h: cardiacRisk48h,
            cardiac_severity: getRiskSeverity(cardiacRiskNow),
            oxygen_crash_risk: oxygenCrashRisk,
            risk_factors: generateRiskFactors(patient, strokeRiskNow, seizureRiskNow, cardiacRiskNow),
            prediction_confidence: 0.75 + Math.random() * 0.2,
            last_updated: new Date().toISOString()
        };

        // Save predictions
        await set(ref(database, `smart_belt_predictions/${patientKey}`), predictions);

        console.log(`✅ Generated predictions for patient: ${patient.name}`);
        console.log(`   Stroke Risk: ${strokeRiskNow}% (${predictions.stroke_severity})`);
        console.log(`   Seizure Risk: ${seizureRiskNow}% (${predictions.seizure_severity})`);
        console.log(`   Cardiac Risk: ${cardiacRiskNow}% (${predictions.cardiac_severity})`);

        return predictions;
    } catch (error) {
        console.error('Error generating predictions:', error);
        throw error;
    }
}

/**
 * Generate sample predictions for ALL active patients
 */
export async function generateSamplePredictionsForAllPatients() {
    try {
        const patientsRef = ref(database, 'smart_belt_patients');
        const snapshot = await get(patientsRef);

        if (!snapshot.exists()) {
            console.log('No patients found');
            return;
        }

        console.log('🔄 Generating AI predictions for all patients...\n');

        const promises: Promise<any>[] = [];
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            const key = childSnapshot.key;

            if (patient.status === 'active' && key) {
                promises.push(generateSamplePredictionsForPatient(key));
            }
        });

        await Promise.all(promises);

        console.log(`\n✅ Generated predictions for ${promises.length} patients!`);
        console.log('💡 Refresh your Smart Belt dashboard to see the predictions');
    } catch (error) {
        console.error('Error generating predictions for all patients:', error);
        throw error;
    }
}

/**
 * Generate a sample emergency alert
 */
export async function generateSampleAlert(patientKey: string, alertType: string = 'STROKE_WARNING') {
    try {
        const patientRef = ref(database, `smart_belt_patients/${patientKey}`);
        const snapshot = await get(patientRef);

        if (!snapshot.exists()) {
            console.error('Patient not found:', patientKey);
            return;
        }

        const patient = snapshot.val();

        const alertsRef = ref(database, 'smart_belt_alerts');
        const newAlertRef = ref(database, `smart_belt_alerts/${Date.now()}`);

        const severityMap: any = {
            'STROKE_WARNING': 'warning',
            'STROKE_CRITICAL': 'critical',
            'SEIZURE_DETECTED': 'critical',
            'CARDIAC_ARRHYTHMIA': 'high',
            'CARDIAC_CRITICAL': 'critical',
            'FALL_DETECTED': 'high',
            'OXYGEN_CRITICAL': 'critical',
            'TEMPERATURE_CRITICAL': 'high'
        };

        const alert = {
            patient_id: patient.id,
            alert_type: alertType,
            severity: severityMap[alertType] || 'warning',
            vitals_snapshot: {
                heart_rate: 85 + Math.floor(Math.random() * 40),
                spo2: 92 + Math.floor(Math.random() * 6),
                temperature: 98.0 + Math.random() * 2,
                ecg_value: 500 + Math.random() * 100
            },
            risk_scores: {
                stroke: 45 + Math.floor(Math.random() * 40),
                seizure: 30 + Math.floor(Math.random() * 30),
                cardiac: 40 + Math.floor(Math.random() * 35)
            },
            message: `${alertType.replace(/_/g, ' ')}: Automated detection triggered for ${patient.name}`,
            acknowledged: false,
            resolved: false,
            created_at: new Date().toISOString()
        };

        await set(newAlertRef, alert);

        console.log(`🚨 Generated ${alertType} alert for: ${patient.name}`);

        return alert;
    } catch (error) {
        console.error('Error generating alert:', error);
        throw error;
    }
}

/**
 * Generate sample sensor data (for testing real-time updates)
 */
export async function generateSampleSensorData(deviceId: string, patientId: number) {
    try {
        const sensorData = {
            patient_id: patientId,
            ecg_value: 480 + Math.random() * 80,
            heart_rate: 60 + Math.floor(Math.random() * 40),
            spo2: 95 + Math.floor(Math.random() * 5),
            temperature: 97.5 + Math.random() * 1.5,
            accel_x: (Math.random() - 0.5) * 2,
            accel_y: (Math.random() - 0.5) * 2,
            accel_z: 9.8 + (Math.random() - 0.5) * 0.5,
            motion_activity_index: Math.random() * 3,
            wearing_status: true,
            leads_ok: true,
            anomaly_detected: Math.random() < 0.1,
            risk_score: Math.floor(Math.random() * 30),
            timestamp: new Date().toISOString()
        };

        await set(ref(database, `smart_belt_sensor_data/${deviceId}/current`), sensorData);

        console.log(`📊 Generated sensor data for device: ${deviceId}`);

        return sensorData;
    } catch (error) {
        console.error('Error generating sensor data:', error);
        throw error;
    }
}

// ================================================================
// BROWSER CONSOLE HELPERS
// ================================================================

// Expose functions to window for easy testing in browser console
if (typeof window !== 'undefined') {
    (window as any).generateSamplePredictions = generateSamplePredictionsForAllPatients;
    (window as any).generateSamplePredictionsForPatient = (patientKey: string) => generateSamplePredictionsForPatient(patientKey);
    (window as any).generateSampleAlert = generateSampleAlert;
    (window as any).generateSampleSensorData = generateSampleSensorData;
}

export default {
    generateSamplePredictionsForPatient,
    generateSamplePredictionsForAllPatients,
    generateSampleAlert,
    generateSampleSensorData
};
