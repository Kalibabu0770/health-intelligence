import { database } from '../../services/firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { SmartBeltTelemetry, DailyHealthReport } from '../types';
import { updatePatient } from '../../services/dataService';

// --- FIREBASE REAL-TIME TELEMETRY BUS ---

// --- AI MODULES ---
import { SpO2Processor } from '../ai-llm/spo2Processor';
import { ECGSignalFilter } from '../ai-llm/ecgSignalFilter';
import { validateContact } from '../ai-llm/contactValidator';
import { analyzeMotion } from '../ai-llm/motionAnalyzer';

// Per-Device Processing State
const deviceProcessors: Record<string, {
    spo2: SpO2Processor;
    ecg: ECGSignalFilter;
    ecgVarianceBuffer: number[];
    motionBuffer: number[]; // Added for sustained analysis
}> = {};

export const subscribeToBelt = (deviceId: string, callback: (data: SmartBeltTelemetry | null) => void) => {
    if (!deviceId) return () => { };

    if (!deviceProcessors[deviceId]) {
        deviceProcessors[deviceId] = {
            spo2: new SpO2Processor(),
            ecg: new ECGSignalFilter(),
            ecgVarianceBuffer: [],
            motionBuffer: [] // Init
        };
    }

    console.log(`Subscribing (Signal-Processed) to: /smart_belt_telemetry/${deviceId}`);
    const deviceRef = ref(database, `smart_belt_telemetry/${deviceId}`);

    const listener = onValue(deviceRef, (snapshot) => {
        let data = snapshot.val();
        if (!data) { callback(null); return; }

        if (data.live) data = data.live;

        const proc = deviceProcessors[deviceId];

        // 1. Raw Inputs
        const rawECG = data.ecg_val || data.ecg || 512;
        const ir = data.ir_val || data.irValue || 0;
        const red = data.red_val || data.red || data.redValue || 0;
        const bpm = data.bpm || 0;
        const ax = data.ax || 0; const ay = data.ay || 0; const az = data.az || 0;

        // ... DEBUG ... (Optional: Keep or remove)
        // console.log(`[DEBUG] AI Input for ${deviceId}: IR=${ir}, RED=${red}, BPM=${bpm}`);

        // 2. Process SpO2 (Mandatory Pipeline)
        const spo2 = proc.spo2.process(red, ir);

        // 3. Process ECG (Mandatory Pipeline)
        // Maintain variance buffer for contact check
        proc.ecgVarianceBuffer.push(rawECG);
        if (proc.ecgVarianceBuffer.length > 20) proc.ecgVarianceBuffer.shift();
        const variance = Math.max(...proc.ecgVarianceBuffer) - Math.min(...proc.ecgVarianceBuffer);

        const cleanedECG = proc.ecg.process(rawECG);

        // 4. Use Hardware's ECG Leads Detection (TRUST THE HARDWARE!)
        // The hardware has LO+ and LO- pins that detect if ECG electrodes are touching skin
        const ecgLeadsConnected = data.leads_ok !== undefined ? data.leads_ok : false;

        // Finger detection for SpO2 (separate from ECG)
        const isFingerDetected = ir > 500;

        // Belt wearing status: Device is worn if it's sending data (independent of ECG leads)
        // This allows BPM, SpO2, temp, motion monitoring to continue even if ECG pads are off
        const isBeltWorn = bpm > 0 || ir > 100; // Device is worn if sensors detect something

        // 5. Motion Analysis (Sustained)
        const motionState = analyzeMotion(ax, ay, az, proc.motionBuffer);

        // Debug: Log when high motion is detected
        if (motionState.intensity > 2.0 || motionState.status === 'seizure_risk') {
            console.log('[Motion Detection]', {
                gForce: motionState.intensity.toFixed(2),
                status: motionState.status,
                ax, ay, az
            });
        }

        // 6. UI Output Normalization
        const telemetry: SmartBeltTelemetry = {
            device_id: deviceId,
            timestamp: Date.now(),

            // Gated Vitals
            bpm: bpm, // Always show BPM (from MAX30105, not ECG)
            spo2: isFingerDetected ? spo2 : 0, // Show SpO2 if finger is present
            ir_val: ir,
            temperature: data.temp || data.temperature || 0, // Always show temperature

            // ECG: Show only if leads are properly connected (trust hardware)
            ecg: ecgLeadsConnected ? cleanedECG : 512,

            // NEW: Separate ECG leads status from overall wearing status
            ecg_leads_connected: ecgLeadsConnected,

            ax: ax, ay: ay, az: az,
            activity_index: motionState.intensity,
            posture: motionState.posture,

            // Estimate Respiration (Placeholder for hardware derived RR)
            respiration_rate: 12 + Math.random() * 4,

            // Wearing status: Belt is worn (allows all monitoring except ECG waveform)
            wearing_status: isBeltWorn,

            status: motionState.status === 'seizure_risk' ? 'critical' : (motionState.status === 'activity' ? 'warning' : 'online'),

            saline: data.saline ? {
                vol_ml: data.saline.vol_ml || 0,
                flow_rate: data.saline.flow_rate || 0,
                time_left: data.saline.time_left || -1,
                is_empty: data.saline.is_empty || false,
                status: data.saline.status || 'unknown'
            } : undefined
        };

        callback(telemetry);
    }, (error) => {
        console.error("Firebase Subscription Error:", error);
        callback(null);
    });

    return () => {
        console.log(`Unsubscribing from /smart_belt_telemetry/${deviceId}`);
        off(deviceRef, 'value', listener);
    };
};

// --- CONTROL COMMANDS ---
export const resetSaline = async (deviceId: string, volumeMl: number) => {
    if (!deviceId) return;
    const ctrlRef = ref(database, `smart_belt_ctrl/${deviceId}`);
    // Write command
    const { set } = await import('firebase/database'); // Dynamic import or use existing ref
    set(ctrlRef, {
        cmd: 'RESET',
        vol: volumeMl,
        ts: Date.now()
    });
};

// ... Mock Data Logic ...
const REPORTS_STORAGE_KEY = 'sb_daily_reports';

export const saveDailyReport = (report: DailyHealthReport) => {
    const existing = localStorage.getItem(REPORTS_STORAGE_KEY);
    const reports: DailyHealthReport[] = existing ? JSON.parse(existing) : [];
    reports.push(report);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
};

export const getDailyReports = (pid: string): DailyHealthReport[] => {
    const existing = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!existing) return [];
    const reports: DailyHealthReport[] = JSON.parse(existing);
    return reports.filter(r => String(r.patient_id) === String(pid));
};

export const generateMockReports = (pid: string) => {
    const mockReports: DailyHealthReport[] = [
        {
            date: '2026-01-29',
            patient_id: Number(pid),
            metrics: {
                hr: { avg: 72, max: 98, min: 60 },
                spo2: { avg: 98, min: 96 },
                temp: { avg: 36.8, max: 37.2 },
                activityLevel: 'active'
            },
            incidents: [],
            id: Date.now(),
            report_date: '2026-01-29',
            avg_heart_rate: 72,
            max_heart_rate: 98,
            min_heart_rate: 60,
            avg_spo2: 98,
            min_spo2: 96,
            avg_temperature: 36.8,
            max_temperature: 37.2,
            activity_level: 'active',
            stability_score: 95,
            anomaly_count: 0,
            critical_incidents: [],
            stroke_risk_trend: 'stable',
            seizure_risk_trend: 'stable',
            cardiac_risk_trend: 'stable',
            avg_stroke_risk: 0,
            avg_seizure_risk: 0,
            avg_cardiac_risk: 0,
            ai_summary: '',
            recommendations: '',
            created_at: new Date().toISOString()
        } as any,
        {
            date: '2016-01-28',
            patient_id: Number(pid),
            metrics: {
                hr: { avg: 85, max: 115, min: 60 },
                spo2: { avg: 95, min: 92 },
                temp: { avg: 37.2, max: 38.5 },
                activityLevel: 'volatile'
            },
            incidents: [
                {
                    timestamp: '2026-01-28T14:30:00Z',
                    type: 'FEVER_ALERT',
                    severity: 'high',
                    vitals_snapshot: {
                        device_id: 'DEV-001',
                        timestamp: Date.now(),
                        bpm: 110,
                        spo2: 96,
                        temperature: 38.5,
                        ecg: 512,
                        ax: 0,
                        ay: 0,
                        az: 0,
                        activity_index: 10,
                        ir_val: 35000,
                        wearing_status: true
                    }
                }
            ],
            id: Date.now() + 1,
            report_date: '2026-01-28',
            avg_heart_rate: 85,
            max_heart_rate: 115,
            min_heart_rate: 60,
            avg_spo2: 95,
            min_spo2: 92,
            avg_temperature: 37.2,
            max_temperature: 38.5,
            activity_level: 'volatile',
            stability_score: 80,
            anomaly_count: 1,
            critical_incidents: [],
            stroke_risk_trend: 'increasing',
            seizure_risk_trend: 'stable',
            cardiac_risk_trend: 'stable',
            avg_stroke_risk: 0,
            avg_seizure_risk: 0,
            avg_cardiac_risk: 0,
            ai_summary: '',
            recommendations: '',
            created_at: new Date().toISOString()
        } as any
    ];
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(mockReports));
};

export const getBeltStatusSummary = (patients: any[], devices: any[]) => {
    const monitoringCount = patients.filter(p => p.smart_belt_id).length;
    // In a real app, logic for critical alerts would come from a combined state or DB
    // For now, we stub it based on available data
    return {
        totalPatients: patients.length,
        activeBelts: monitoringCount,
        criticalAlerts: 0, // Should be dynamic
        onlineDevices: monitoringCount, // Usually 1:1 if linked
        aiRiskLevel: 'LOW'
    };
};

// ... Linking (Temporary Hybrid) ...
export const linkBeltPatient = async (patientId: number, deviceId: string) => {
    await updatePatient(patientId, { smart_belt_id: deviceId });
};

export const getBeltIdForPatient = (patientId: number): string | null => {
    const raw = localStorage.getItem('saline_patients_v1');
    if (!raw) return null;
    const patients = JSON.parse(raw);
    const p = patients.find((x: any) => x.id === patientId);
    return p ? p.smart_belt_id : null;
};

export const unlinkBeltPatient = async (patientId: number) => {
    await updatePatient(patientId, { smart_belt_id: null });
};

export const dischargeBeltPatient = async (patientId: number) => {
    await updatePatient(patientId, {
        status: 'discharged',
        discharge_date: new Date().toISOString(),
        smart_belt_id: null
    });
};

export const getThresholds = () => {
    return {
        seizureSensitivity: 'medium',
        heartRateRange: { min: 60, max: 100 },
        tempRange: { min: 36.5, max: 37.5 },
        spo2Min: 95
    };
};

export const saveThresholds = (config: any) => {
    localStorage.setItem('sb_thresholds', JSON.stringify(config));
};

// Export configuration type for other components
export interface SmartBeltConfig {
    alert_bpm_min: number;
    alert_bpm_max: number;
    alert_temp_max: number;
    alert_spo2_min: number;
    analysis_enabled: boolean;
    alerts_enabled: boolean;
}

export interface PatientDailySummary {
    date: string;
    avgHeartRate: number;
    maxHeartRate: number;
    avgTemp: number;
    activityLevel: string;
    incidentsCount: number;
}
