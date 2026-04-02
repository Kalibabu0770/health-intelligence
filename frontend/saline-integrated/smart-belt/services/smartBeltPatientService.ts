// ================================================================
// SMART BELT PATIENT SERVICE - FIREBASE VERSION
// ================================================================
// Manages Smart Belt patient profiles using Firebase Realtime Database
// 100% independent from Saline module
// 
// Firebase Structure:
// /smart_belt_patients/{patientId}/
//   - profile: { name, age, gender, medical_history, etc. }
//   - predictions: { stroke_risk, seizure_risk, cardiac_risk, etc. }
//   - alerts: { alert1, alert2, etc. }
//   - metadata: { analysis_enabled, last_update, etc. }
// ================================================================

import { database } from '../../services/firebaseConfig';
import { ref, set, get, update, remove, push, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import {
    SmartBeltPatient,
    CreateSmartBeltPatientInput,
    SmartBeltPatientWithData,
    SmartBeltPrediction
} from '../types';

// ================================================================
// FIREBASE PATHS (Separate from Saline)
// ================================================================

const PATHS = {
    patients: 'smart_belt_patients',
    predictions: 'smart_belt_predictions',
    alerts: 'smart_belt_alerts',
    metadata: 'smart_belt_metadata',
    sensorData: 'smart_belt_sensor_data',
    dailyReports: 'smart_belt_daily_reports'
};

// ================================================================
// PATIENT CRUD OPERATIONS
// ================================================================

/**
 * Create a new Smart Belt patient with health profile
 */
export async function createSmartBeltPatient(input: CreateSmartBeltPatientInput): Promise<SmartBeltPatient> {
    try {
        // Validate required fields
        if (!input.name || !input.age) {
            throw new Error('Name and age are required fields');
        }

        if (input.age < 1 || input.age > 150) {
            throw new Error('Age must be between 1 and 150');
        }

        // Generate unique patient ID
        const patientsRef = ref(database, PATHS.patients);
        const newPatientRef = push(patientsRef);
        const patientId = newPatientRef.key;

        if (!patientId) {
            throw new Error('Failed to generate patient ID');
        }

        // Create patient object
        const now = new Date().toISOString();
        const patient: SmartBeltPatient = {
            id: parseInt(patientId.replace(/[^0-9]/g, '').slice(0, 10)) || Date.now(), // Convert to number
            name: input.name,
            age: input.age,
            gender: input.gender,
            medical_history: input.medical_history || [],
            allergies: input.allergies || [],
            stroke_history: input.stroke_history || false,
            heart_disease_history: input.heart_disease_history || false,
            seizure_history: input.seizure_history || false,
            diabetes: input.diabetes || false,
            hypertension: input.hypertension || false,
            medications: input.medications || [],
            baseline_hr: input.baseline_hr,
            baseline_spo2: input.baseline_spo2,
            baseline_temp: input.baseline_temp,
            device_id: null, // Initially no device linked
            emergency_contact_name: input.emergency_contact_name,
            emergency_contact_phone: input.emergency_contact_phone,
            admitted_at: now,
            discharged_at: null,
            status: 'active',
            created_at: now,
            updated_at: now
        };

        // Save to Firebase
        await set(ref(database, `${PATHS.patients}/${patientId}`), patient);

        console.log('[Smart Belt] Patient created successfully:', patientId);

        // Initialize predictions
        try {
            const initialPredictions: SmartBeltPrediction = {
                patient_id: patient.id,
                stroke_risk_now: 0,
                stroke_risk_24h: 0,
                stroke_risk_48h: 0,
                stroke_severity: 'low',
                seizure_risk_now: 0,
                seizure_risk_24h: 0,
                seizure_risk_48h: 0,
                seizure_severity: 'low',
                cardiac_risk_now: 0,
                cardiac_risk_24h: 0,
                cardiac_risk_48h: 0,
                cardiac_severity: 'low',
                oxygen_crash_risk: 0,
                risk_factors: [],
                prediction_confidence: 0.5,
                last_updated: now
            };

            await set(ref(database, `${PATHS.predictions}/${patientId}`), initialPredictions);
        } catch (predErr) {
            console.warn('[Smart Belt] Failed to initialize predictions:', predErr);
        }

        // Initialize metadata
        try {
            await set(ref(database, `${PATHS.metadata}/${patientId}`), {
                patient_id: patient.id,
                total_data_points_today: 0,
                total_anomalies_today: 0,
                total_alerts_today: 0,
                analysis_enabled: true,
                alerts_enabled: true,
                last_realtime_analysis: null,
                last_prediction_update: null,
                last_daily_report: null,
                updated_at: now
            });
        } catch (metaErr) {
            console.warn('[Smart Belt] Failed to initialize metadata:', metaErr);
        }

        return patient;
    } catch (error: any) {
        console.error('[Smart Belt] Patient creation failed:', error);
        throw new Error(error.message || 'Failed to create Smart Belt patient');
    }
}

/**
 * Get all active Smart Belt patients
 */
export async function getActiveSmartBeltPatients(): Promise<SmartBeltPatient[]> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        if (!snapshot.exists()) {
            return [];
        }

        const patients: SmartBeltPatient[] = [];
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.status === 'active') {
                patients.push(patient);
            }
        });

        // Sort by admitted_at (most recent first)
        patients.sort((a, b) => new Date(b.admitted_at).getTime() - new Date(a.admitted_at).getTime());

        return patients;
    } catch (error) {
        console.error('[Smart Belt] Error fetching active patients:', error);
        throw error;
    }
}

/**
 * Get a single Smart Belt patient by ID
 */
export async function getSmartBeltPatientById(patientId: number): Promise<SmartBeltPatient | null> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        if (!snapshot.exists()) {
            return null;
        }

        let foundPatient: SmartBeltPatient | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.id === patientId) {
                foundPatient = patient;
            }
        });

        return foundPatient;
    } catch (error) {
        console.error('[Smart Belt] Error fetching patient:', error);
        return null;
    }
}

/**
 * Get patient by device ID
 */
export async function getSmartBeltPatientByDeviceId(deviceId: string): Promise<SmartBeltPatient | null> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        if (!snapshot.exists()) {
            return null;
        }

        let foundPatient: SmartBeltPatient | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.device_id === deviceId && patient.status === 'active') {
                foundPatient = patient;
            }
        });

        return foundPatient;
    } catch (error) {
        console.error('[Smart Belt] Error fetching patient by device ID:', error);
        return null;
    }
}

/**
 * Update Smart Belt patient profile
 */
export async function updateSmartBeltPatient(
    patientId: number,
    updates: Partial<CreateSmartBeltPatientInput>
): Promise<SmartBeltPatient> {
    try {
        // Find patient key
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.id === patientId) {
                patientKey = childSnapshot.key;
            }
        });

        if (!patientKey) {
            throw new Error('Patient not found');
        }

        // Update patient
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        await update(ref(database, `${PATHS.patients}/${patientKey}`), updateData);

        // Get updated patient
        const updatedSnapshot = await get(ref(database, `${PATHS.patients}/${patientKey}`));
        return updatedSnapshot.val();
    } catch (error) {
        console.error('[Smart Belt] Error updating patient:', error);
        throw error;
    }
}

/**
 * Link a Smart Belt device to a patient
 */
export async function linkSmartBeltDevice(patientId: number, deviceId: string): Promise<void> {
    try {
        // First, unlink device from any other patient
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        const updates: any = {};
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            const key = childSnapshot.key;

            if (patient.device_id === deviceId) {
                updates[`${PATHS.patients}/${key}/device_id`] = null;
            }

            if (patient.id === patientId) {
                updates[`${PATHS.patients}/${key}/device_id`] = deviceId;
                updates[`${PATHS.patients}/${key}/updated_at`] = new Date().toISOString();
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }

        console.log('[Smart Belt] Device linked successfully:', deviceId);
    } catch (error) {
        console.error('[Smart Belt] Error linking device:', error);
        throw error;
    }
}

/**
 * Unlink Smart Belt device from patient
 */
export async function unlinkSmartBeltDevice(patientId: number): Promise<void> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.id === patientId) {
                patientKey = childSnapshot.key;
            }
        });

        if (patientKey) {
            await update(ref(database, `${PATHS.patients}/${patientKey}`), {
                device_id: null,
                updated_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[Smart Belt] Error unlinking device:', error);
        throw error;
    }
}

/**
 * Discharge a Smart Belt patient
 */
export async function dischargeSmartBeltPatient(patientId: number): Promise<void> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.id === patientId) {
                patientKey = childSnapshot.key;
            }
        });

        if (patientKey) {
            const now = new Date().toISOString();
            await update(ref(database, `${PATHS.patients}/${patientKey}`), {
                status: 'discharged',
                discharged_at: now,
                device_id: null,
                updated_at: now
            });

            // Disable analysis
            await update(ref(database, `${PATHS.metadata}/${patientKey}`), {
                analysis_enabled: false,
                alerts_enabled: false,
                updated_at: now
            });
        }
    } catch (error) {
        console.error('[Smart Belt] Error discharging patient:', error);
        throw error;
    }
}

// ================================================================
// BASELINE CAPTURE & PERSONALIZED ALERTS
// ================================================================

/**
 * Capture patient baseline vitals and calculate personalized alert thresholds
 * This should be called automatically when the patient's belt is first worn
 */
export async function capturePatientBaseline(
    patientId: number,
    vitalSigns: {
        bpm: number;
        temperature: number;
        spo2: number;
    }
): Promise<void> {
    try {
        console.log('[Smart Belt] Capturing baseline for patient:', patientId);

        // Calculate personalized alert thresholds
        const alertThresholds = {
            baseline_hr: vitalSigns.bpm,
            baseline_temp: vitalSigns.temperature,
            baseline_spo2: vitalSigns.spo2,
            baseline_captured_at: new Date().toISOString(),
            baseline_status: 'captured' as const,

            // Auto-calculate personalized thresholds (±20% for BPM, +1.5°C for temp, -5% for SpO2)
            alert_bpm_min: Math.round(vitalSigns.bpm * 0.8),   // 20% below baseline
            alert_bpm_max: Math.round(vitalSigns.bpm * 1.2),   // 20% above baseline
            alert_temp_max: vitalSigns.temperature + 1.5,       // 1.5°C above baseline
            alert_spo2_min: Math.round(vitalSigns.spo2 * 0.95) // 5% below baseline
        };

        // Find patient in Firebase
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        if (!snapshot.exists()) {
            throw new Error('No patients found');
        }

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val() as SmartBeltPatient;
            if (patient.id === patientId) {
                patientKey = childSnapshot.key;
                return true; // Break loop
            }
        });

        if (!patientKey) {
            throw new Error(`Patient with ID ${patientId} not found`);
        }

        // Update patient with baseline and thresholds
        const patientRef = ref(database, `${PATHS.patients}/${patientKey}`);
        await update(patientRef, {
            ...alertThresholds,
            updated_at: new Date().toISOString()
        });

        console.log('[Smart Belt] Baseline captured successfully:', alertThresholds);
    } catch (error: any) {
        console.error('[Smart Belt] Failed to capture baseline:', error);
        throw new Error(error.message || 'Failed to capture baseline');
    }
}

/**
 * Manually update patient baseline (if initial capture was incorrect or patient condition changed)
 */
export async function updatePatientBaseline(
    patientId: number,
    baseline: {
        bpm?: number;
        temperature?: number;
        spo2?: number;
    }
): Promise<void> {
    try {
        console.log('[Smart Belt] Updating baseline for patient:', patientId);

        // Find current patient data
        const patient = await getSmartBeltPatientById(patientId);
        if (!patient) {
            throw new Error(`Patient with ID ${patientId} not found`);
        }

        // Merge with existing baseline
        const newBaseline = {
            baseline_hr: baseline.bpm ?? patient.baseline_hr,
            baseline_temp: baseline.temperature ?? patient.baseline_temp,
            baseline_spo2: baseline.spo2 ?? patient.baseline_spo2,
            baseline_status: 'manual' as const,
            updated_at: new Date().toISOString()
        };

        // Recalculate alert thresholds
        const alertThresholds: any = {};
        if (newBaseline.baseline_hr) {
            alertThresholds.alert_bpm_min = Math.round(newBaseline.baseline_hr * 0.8);
            alertThresholds.alert_bpm_max = Math.round(newBaseline.baseline_hr * 1.2);
        }
        if (newBaseline.baseline_temp) {
            alertThresholds.alert_temp_max = newBaseline.baseline_temp + 1.5;
        }
        if (newBaseline.baseline_spo2) {
            alertThresholds.alert_spo2_min = Math.round(newBaseline.baseline_spo2 * 0.95);
        }

        // Find patient key
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const p = childSnapshot.val() as SmartBeltPatient;
            if (p.id === patientId) {
                patientKey = childSnapshot.key;
                return true;
            }
        });

        if (!patientKey) {
            throw new Error(`Patient with ID ${patientId} not found`);
        }

        // Update
        const patientRef = ref(database, `${PATHS.patients}/${patientKey}`);
        await update(patientRef, {
            ...newBaseline,
            ...alertThresholds
        });

        console.log('[Smart Belt] Baseline updated successfully');
    } catch (error: any) {
        console.error('[Smart Belt] Failed to update baseline:', error);
        throw new Error(error.message || 'Failed to update baseline');
    }
}

/**
 * Delete a Smart Belt patient (and all associated data)
 */
export async function deleteSmartBeltPatient(patientId: number): Promise<void> {
    try {
        const patientsRef = ref(database, PATHS.patients);
        const snapshot = await get(patientsRef);

        let patientKey: string | null = null;
        snapshot.forEach((childSnapshot) => {
            const patient = childSnapshot.val();
            if (patient.id === patientId) {
                patientKey = childSnapshot.key;
            }
        });

        if (patientKey) {
            // Delete from all Firebase paths
            const updates: any = {};
            updates[`${PATHS.patients}/${patientKey}`] = null;
            updates[`${PATHS.predictions}/${patientKey}`] = null;
            updates[`${PATHS.metadata}/${patientKey}`] = null;
            // Alerts and sensor data would need separate cleanup based on patient_id field

            await update(ref(database), updates);
        }
    } catch (error) {
        console.error('[Smart Belt] Error deleting patient:', error);
        throw error;
    }
}

// ================================================================
// PATIENT WITH EXTENDED DATA (for Dashboard UI)
// ================================================================

/**
 * Get all active patients with their predictions and alert counts
 */
export async function getActivePatientsWithData(): Promise<SmartBeltPatientWithData[]> {
    try {
        const patients = await getActiveSmartBeltPatients();

        // Fetch predictions and metadata for all patients
        const predictionsRef = ref(database, PATHS.predictions);
        const metadataRef = ref(database, PATHS.metadata);
        const alertsRef = ref(database, PATHS.alerts);

        const [predictionsSnapshot, metadataSnapshot, alertsSnapshot] = await Promise.all([
            get(predictionsRef),
            get(metadataRef),
            get(alertsRef)
        ]);

        // Build map of predictions
        const predictionsMap = new Map<number, any>();
        if (predictionsSnapshot.exists()) {
            predictionsSnapshot.forEach((child) => {
                const prediction = child.val();
                predictionsMap.set(prediction.patient_id, prediction);
            });
        }

        // Build map of metadata
        const metadataMap = new Map<number, any>();
        if (metadataSnapshot.exists()) {
            metadataSnapshot.forEach((child) => {
                const meta = child.val();
                metadataMap.set(meta.patient_id, meta);
            });
        }

        // Count unacknowledged alerts per patient
        const alertCountMap = new Map<number, number>();
        if (alertsSnapshot.exists()) {
            alertsSnapshot.forEach((child) => {
                const alert = child.val();
                if (!alert.acknowledged) {
                    const count = alertCountMap.get(alert.patient_id) || 0;
                    alertCountMap.set(alert.patient_id, count + 1);
                }
            });
        }

        // Combine data
        const patientsWithData: SmartBeltPatientWithData[] = patients.map(patient => ({
            ...patient,
            predictions: predictionsMap.get(patient.id),
            unacknowledged_alerts_count: alertCountMap.get(patient.id) || 0,
            analysis_metadata: metadataMap.get(patient.id)
        }));

        return patientsWithData;
    } catch (error) {
        console.error('[Smart Belt] Error fetching patients with data:', error);
        throw error;
    }
}

// ================================================================
// REAL-TIME SUBSCRIPTIONS
// ================================================================

/**
 * Subscribe to changes in Smart Belt patients
 */
export function subscribeToSmartBeltPatients(
    callback: (patients: SmartBeltPatient[]) => void
): { unsubscribe: () => void } {
    const patientsRef = ref(database, PATHS.patients);

    const listener = onValue(patientsRef, (snapshot) => {
        const patients: SmartBeltPatient[] = [];

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const patient = childSnapshot.val();
                if (patient.status === 'active') {
                    patients.push(patient);
                }
            });
        }

        // Sort by admitted_at
        patients.sort((a, b) => new Date(b.admitted_at).getTime() - new Date(a.admitted_at).getTime());

        callback(patients);
    });

    return {
        unsubscribe: () => {
            off(patientsRef, 'value', listener);
        }
    };
}

/**
 * Subscribe to a single patient's data
 */
export function subscribeToPatient(
    patientId: number,
    callback: (patient: SmartBeltPatient | null) => void
): { unsubscribe: () => void } {
    const patientsRef = ref(database, PATHS.patients);

    const listener = onValue(patientsRef, (snapshot) => {
        let foundPatient: SmartBeltPatient | null = null;

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const patient = childSnapshot.val();
                if (patient.id === patientId) {
                    foundPatient = patient;
                }
            });
        }

        callback(foundPatient);
    });

    return {
        unsubscribe: () => {
            off(patientsRef, 'value', listener);
        }
    };
}

// ================================================================
// STATISTICS & DASHBOARD METRICS
// ================================================================

/**
 * Get Smart Belt dashboard statistics
 */
export async function getSmartBeltDashboardStats() {
    try {
        const activePatients = await getActiveSmartBeltPatients();
        const alertsRef = ref(database, PATHS.alerts);
        const alertsSnapshot = await get(alertsRef);

        let criticalAlerts = 0;
        let highAlerts = 0;
        let totalUnacknowledged = 0;

        if (alertsSnapshot.exists()) {
            alertsSnapshot.forEach((child) => {
                const alert = child.val();
                if (!alert.acknowledged) {
                    totalUnacknowledged++;
                    if (alert.severity === 'critical') criticalAlerts++;
                    if (alert.severity === 'high') highAlerts++;
                }
            });
        }

        return {
            total_active_patients: activePatients.length,
            total_unacknowledged_alerts: totalUnacknowledged,
            critical_alerts: criticalAlerts,
            high_alerts: highAlerts,
            patients_with_devices: activePatients.filter(p => p.device_id).length
        };
    } catch (error) {
        console.error('[Smart Belt] Error fetching dashboard stats:', error);
        return {
            total_active_patients: 0,
            total_unacknowledged_alerts: 0,
            critical_alerts: 0,
            high_alerts: 0,
            patients_with_devices: 0
        };
    }
}

export default {
    createSmartBeltPatient,
    getActiveSmartBeltPatients,
    getSmartBeltPatientById,
    getSmartBeltPatientByDeviceId,
    updateSmartBeltPatient,
    linkSmartBeltDevice,
    unlinkSmartBeltDevice,
    dischargeSmartBeltPatient,
    deleteSmartBeltPatient,
    capturePatientBaseline,  // NEW
    updatePatientBaseline,   // NEW
    getActivePatientsWithData,
    subscribeToSmartBeltPatients,
    subscribeToPatient,
    getSmartBeltDashboardStats
};
