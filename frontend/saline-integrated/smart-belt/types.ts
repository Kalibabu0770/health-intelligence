// ================================================================
// SMART BELT AI HEALTHCARE INTELLIGENCE SYSTEM - TYPE DEFINITIONS
// ================================================================

// ================================================================
// PATIENT PROFILES
// ================================================================

export interface MedicalCondition {
    condition: string;
    diagnosed?: string; // ISO date
    notes?: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
}

export interface SmartBeltPatient {
    id: number;

    // Basic Information
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';

    // Medical Background
    medical_history: MedicalCondition[];
    allergies: string[];

    // Critical Health History
    stroke_history: boolean;
    heart_disease_history: boolean;
    seizure_history: boolean;
    diabetes: boolean;
    hypertension: boolean;

    // Current Medications
    medications: Medication[];

    // Baseline Health Values (Personalized Normals)
    baseline_hr?: number; // Normal resting heart rate for THIS patient
    baseline_spo2?: number; // Normal oxygen level for THIS patient
    baseline_temp?: number; // Normal body temperature (°C) for THIS patient
    baseline_captured_at?: string; // When baseline was captured
    baseline_status?: 'pending' | 'captured' | 'manual'; // How baseline was set

    // Personalized Alert Thresholds (Auto-calculated from baseline)
    alert_bpm_min?: number;  // Patient-specific low BPM alert
    alert_bpm_max?: number;  // Patient-specific high BPM alert
    alert_temp_max?: number; // Patient-specific high temp alert
    alert_spo2_min?: number; // Patient-specific low SpO2 alert

    // Device Linkage
    device_id?: string;

    // Emergency Contacts
    emergency_contact_name?: string;
    emergency_contact_phone?: string;

    // Status & Metadata
    admitted_at: string;
    discharged_at?: string;
    status: 'active' | 'discharged';
    created_at: string;
    updated_at: string;
}

export interface CreateSmartBeltPatientInput {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    medical_history?: MedicalCondition[];
    allergies?: string[];
    stroke_history?: boolean;
    heart_disease_history?: boolean;
    seizure_history?: boolean;
    diabetes?: boolean;
    hypertension?: boolean;
    medications?: Medication[];
    baseline_hr?: number;
    baseline_spo2?: number;
    baseline_temp?: number;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
}

// ================================================================
// SENSOR DATA & TELEMETRY
// ================================================================

export interface SmartBeltTelemetry {
    device_id: string;
    timestamp: number;

    // Vital Signs
    bpm: number; // Heart rate
    spo2: number; // Blood oxygen
    temperature: number;
    ecg: number; // ECG value

    // Motion Data
    ax: number; // Acceleration X
    ay: number; // Acceleration Y
    az: number; // Acceleration Z
    activity_index: number;

    // Motion sensor readings
    ir_val: number; // IR sensor value

    // Status Flags
    wearing_status: boolean; // Belt is worn (device active)
    ecg_leads_connected?: boolean; // ECG electrodes connected to skin (separate from wearing)
    leads_ok?: boolean; // Legacy field

    // Connection status
    status?: 'online' | 'offline' | 'warning' | 'critical';

    // NEW: Clinical Expansion Fields
    respiration_rate?: number; // Breaths per minute
    posture?: 'standing' | 'sitting' | 'lying_down' | 'walking';
    arrhythmia_status?: 'normal' | 'afib' | 'bradycardia' | 'tachycardia' | 'pvc_detected';
    sleep_apnea_risk?: number; // 0-100%

    // Legacy saline compatibility (if belt has IV monitoring)
    saline?: {
        vol_ml: number;
        flow_rate: number;
        time_left: number;
        is_empty: boolean;
        status: string;
    };
}

export interface SmartBeltSensorData {
    id: number;
    patient_id: number;
    device_id: string;

    // Vital Signs
    ecg_value?: number;
    heart_rate?: number;
    spo2?: number;
    temperature?: number;

    // Motion Data
    accel_x?: number;
    accel_y?: number;
    accel_z?: number;
    motion_activity_index?: number;

    // Status Flags
    wearing_status: boolean;
    leads_ok: boolean;

    // Real-time AI Analysis Results
    anomaly_detected: boolean;
    anomaly_type?: 'ecg_irregular' | 'hr_spike' | 'hr_drop' | 'spo2_drop' | 'temp_spike' | 'fall_detected' | 'seizure_motion';
    risk_score?: number; // 0-100

    timestamp: string;
}

// ================================================================
// PREDICTIONS & RISK ANALYSIS
// ================================================================

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SmartBeltPrediction {
    patient_id: number;

    // Stroke Risk
    stroke_risk_now: number; // 0-100
    stroke_risk_24h: number;
    stroke_risk_48h: number;
    stroke_severity: RiskSeverity;

    // Seizure Risk
    seizure_risk_now: number;
    seizure_risk_24h: number;
    seizure_risk_48h: number;
    seizure_severity: RiskSeverity;

    // Cardiac Risk
    cardiac_risk_now: number;
    cardiac_risk_24h: number;
    cardiac_risk_48h: number;
    cardiac_severity: RiskSeverity;

    // Oxygen Crash Risk
    oxygen_crash_risk: number;

    // Advanced Gemini AI Risk Markers
    pre_heartstroke_risk?: number;
    pre_fits_risk?: number;
    ai_reasoning?: string;

    // Risk Factors
    risk_factors: string[]; // ["Rising Baseline HR (+15% over 6h)", "ECG irregularities (3 events)"]

    // Prediction Confidence
    prediction_confidence: number; // 0-1

    last_updated: string;
}

export interface RiskAnalysisResult {
    status: 'safe' | 'warning' | 'critical';
    risks: string[]; // e.g., ["High Heart Rate", "Seizure Detected"]
    score: number; // 0-100 severity
    timestamp: string;
}

export interface RiskForecast {
    horizon: string; // "now", "24h", "48h"
    cardiacRisk: number; // 0-100 probability
    seizureRisk: number; // 0-100 probability
    strokeRisk: number; // 0-100 probability
    oxygenRisk: number; // 0-100 probability
    factors: string[]; // "Rising Baseline HR", "High HRV Volatility"
}

// ================================================================
// EMERGENCY ALERTS
// ================================================================

export type EmergencyAlertType =
    | 'STROKE_WARNING'
    | 'STROKE_CRITICAL'
    | 'SEIZURE_DETECTED'
    | 'CARDIAC_ARRHYTHMIA'
    | 'CARDIAC_CRITICAL'
    | 'FALL_DETECTED'
    | 'OXYGEN_CRITICAL'
    | 'TEMPERATURE_CRITICAL';

export type AlertSeverity = 'warning' | 'high' | 'critical';

export interface EmergencyAlert {
    id: number;
    patient_id: number;

    // Alert Information
    alert_type: EmergencyAlertType;
    severity: AlertSeverity;

    // Snapshot of vitals at alert time
    vitals_snapshot: {
        hr?: number;
        spo2?: number;
        temp?: number;
        ecg?: number;
        motion?: [number, number, number];
        timestamp: string;
    };

    // Risk scores at time of alert
    risk_scores?: {
        stroke: number;
        seizure: number;
        cardiac: number;
    };

    // Alert message
    message?: string;

    // Alert Status
    acknowledged: boolean;
    acknowledged_by?: string;
    acknowledged_at?: string;

    // Resolution
    resolved: boolean;
    resolved_by?: string;
    resolved_at?: string;
    resolution_notes?: string;

    created_at: string;
}

// ================================================================
// DAILY AI REPORTS
// ================================================================

export type ActivityLevel = 'rest' | 'low' | 'moderate' | 'active' | 'volatile';
export type TrendDirection = 'increasing' | 'stable' | 'decreasing' | 'volatile';

export interface CriticalIncident {
    timestamp: string;
    type: string;
    severity: AlertSeverity;
    vitals_snapshot: any;
}

export interface DailyHealthReport {
    date: string; // For legacy/mock support
    metrics: {
        hr: { avg: number; max: number; min: number };
        spo2: { avg: number; min: number };
        temp: { avg: number; max: number };
        activityLevel?: string;
    };
    incidents: any[];
    id: number;
    patient_id: number;
    report_date: string; // YYYY-MM-DD

    // Summary Metrics
    avg_heart_rate: number;
    max_heart_rate: number;
    min_heart_rate: number;
    avg_spo2: number;
    min_spo2: number;
    avg_temperature: number;
    max_temperature: number;
    activity_level: ActivityLevel;

    // AI Insights
    stability_score: number; // 0-100
    anomaly_count: number;
    critical_incidents: CriticalIncident[];

    // Risk Trends
    stroke_risk_trend: TrendDirection;
    seizure_risk_trend: TrendDirection;
    cardiac_risk_trend: TrendDirection;

    // Daily Risk Averages
    avg_stroke_risk: number;
    avg_seizure_risk: number;
    avg_cardiac_risk: number;

    // AI Summary (Natural Language)
    ai_summary: string;
    recommendations: string;

    created_at: string;
}

// ================================================================
// HEALTH TRENDS & ANALYSIS
// ================================================================

export interface HealthTrend {
    period: string; // e.g. "Last 4 Hours", "Last 24 Hours"
    trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
    confidence: number; // 0-100
    description: string;
}

export interface AIAnalysisReport {
    timestamp: string;
    riskScore: number; // 0-100
    anomalies: string[];
    trends: HealthTrend[];
    recommendation: string;
    pre_heartstroke_risk?: number;
    pre_fits_risk?: number;
    ai_reasoning?: string;

    // NEW: Clinical Expansion Results
    arrhythmia_analysis?: string;
    arrhythmia_status?: string;
    sleep_apnea_analysis?: string;
    respiratory_status?: string;
    posture_trend?: string;

    forecast?: RiskForecast;
}

// ================================================================
// ANALYSIS METADATA
// ================================================================

export interface AnalysisMetadata {
    patient_id: number;

    // Last Analysis Timestamps
    last_realtime_analysis?: string;
    last_prediction_update?: string;
    last_daily_report?: string;

    // Data Statistics
    total_data_points_today: number;
    total_anomalies_today: number;
    total_alerts_today: number;

    // Processing Flags
    analysis_enabled: boolean;
    alerts_enabled: boolean;

    updated_at: string;
}

// ================================================================
// PATIENT WITH EXTENDED DATA (for UI)
// ================================================================

export interface SmartBeltPatientWithData extends SmartBeltPatient {
    // Current vital signs (latest telemetry)
    current_vitals?: SmartBeltTelemetry;

    // Current predictions
    predictions?: SmartBeltPrediction;

    // Unacknowledged alerts count
    unacknowledged_alerts_count?: number;

    // Today's analysis metadata
    analysis_metadata?: AnalysisMetadata;
}

export type SmartBeltDailyReport = DailyHealthReport;

