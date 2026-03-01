
export enum RiskLevel {
  SAFE = 'SAFE',
  CAUTION = 'CAUTION',
  DANGER = 'DANGER'
}

export interface HealthCondition {
  category: string;
  name: string;
}

export interface UserHabit {
  name: string;
  frequency: 'none' | 'occasionally' | 'daily';
}

export interface UserProfile {
  id?: string;
  name: string;
  password?: string;
  language?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  conditions: HealthCondition[];
  customConditions: string[];
  surgeries: string[];
  familyHistory: string[];
  alcoholUsage: string;
  smoking: boolean;
  habits: UserHabit[];
  currentMedications: string[];
  allergies: string[];
  hasLiverDisease: boolean;
  hasKidneyDisease: boolean;
  hasDiabetes: boolean;
  hasHighBP: boolean;
  hasHeartDisease: boolean;
  hasAsthma: boolean;
  hasThyroid: boolean;
  hasGastric: boolean;
  hasBonePain: boolean;
  hasVisionIssues: boolean;
  isTribal: boolean;
  isPregnant: boolean;
  location: string;
  foodPreferences: string[];
  profession: string;
  workHoursPerDay: number;
  workIntensity: 'low' | 'moderate' | 'high' | 'very_high';
  // Follow-up specific data
  diabetesDetails?: string;
  hypertensionDetails?: string;
  heartDetails?: string;
  asthmaDetails?: string;
  thyroidDetails?: string;
  gastricDetails?: string;
  boneDetails?: string;
  // Lifestyle & Environment
  sleepHours?: number;
  stressLevel?: 'low' | 'moderate' | 'high';
  waterSource?: 'tap' | 'well' | 'bottled' | 'river';
  tobaccoFrequency?: string;
  alcoholFrequency?: string;
  role: 'citizen' | 'officer' | 'doctor';
  district?: string;
  mandal?: string;
  village?: string;
  patientId?: string;
}

export interface MedicationReminder {
  id: string;
  drugName: string;
  dosage: string;
  times: string[];
  days: string[];
  foodInstruction: 'none' | 'before' | 'with' | 'after';
  isActive: boolean;
  color?: string;
}

export interface FoodLog {
  id: string;
  description: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  timestamp: number;
  imageUrl?: string;
}

export interface WorkoutLog {
  id: string;
  type: string;
  durationMinutes: number;
  intensity: 'low' | 'medium' | 'high';
  timestamp: number;
  steps?: number;
}

export interface HealthDocument {
  id: string;
  name: string;
  type: string;
  date: number | string;
  size?: string;
  summary?: string;
  keyMetrics?: Record<string, string>;
  riskLevel?: string;
  recommendations?: string[];
  riskMarkers?: string[];
  title?: string;
  url?: string;
}

export interface SymptomSession {
  id: string;
  timestamp: number;
  complaint: string;
  aiAnalysis: string;
  questions?: { qId: string; question: string; answer: string }[];
  recommendation?: string;
}

export interface Drug {
  id: string;
  name: string;
  maxDailyDoseMg: number;
  liverWarning: string;
  kidneyWarning: string;
  alcoholInteraction: boolean;
  elderlyCaution: boolean;
  longTermRiskFlag: boolean;
  class: string;
}

export interface RiskScores {
  liver: number;
  kidney: number;
  heart: number;
  stomach: number;
  breathing: number;
  addiction: number;
  overall: RiskLevel;
  healthScore: number;
  projection7Day: number;
  longevityAge: number;
  stressContributors: Record<string, string[]>;
  trends: { date: string; score: number }[];
  environment: EnvironmentContext;
}

export interface EnvironmentContext {
  temp: number;
  humidity: number;
  seasonalRisk: string;
  airQuality: string;
}

export interface MeditationLog {
  id: string;
  durationMinutes: number;
  timestamp: number;
}

export interface DailyCheckIn {
  id: string;
  timestamp: number;
  mood: string;
  energyLevel: number;
  symptoms: string[];
  note?: string;
}

// --- Longitudinal Clinical Master Health Document (LCMHD) ---

export interface PatientMasterProfile {
  patient_global_id: string;
  demographic_information: {
    full_name: string;
    age: number;
    gender: string;
    date_of_birth: string;
    blood_group: string;
    phone_number: string;
    address: string;
    pincode: string;
    district: string;
    state: string;
    tribal_status: boolean;
  };
  professional_details: {
    occupation: string;
    work_type: string;
    stress_level: string;
  };
  biometric_profile: {
    height_cm: number;
    weight_kg: number;
    bmi: number;
    sleep_hours: number;
  };
}

export interface ChronicConditionEntry {
  disease_name: string;
  duration: string;
  current_status: string;
}

export interface SurgeryEntry {
  surgery_name: string;
  year: number;
  complications: string;
}

export interface AllergyEntry {
  allergy_type: string;
  severity: string;
  reaction_description: string;
}

export interface FamilyHistoryEntry {
  disease_name: string;
  relation: string;
}

export interface MedicalHistory {
  patient_global_id: string;
  chronic_conditions: ChronicConditionEntry[];
  past_surgeries: SurgeryEntry[];
  allergies: AllergyEntry[];
  family_history: FamilyHistoryEntry[];
  lifestyle_risks: {
    smoking: boolean;
    alcohol: boolean;
    tobacco: boolean;
    betel_nut: boolean;
  };
}

export interface ClinicalEncounter {
  encounter_id: string;
  patient_global_id: string;
  doctor_id: string;
  visit_date: string;
  visit_type: string;
  chief_complaint: string;
  history_of_present_illness: string;
  vitals: {
    blood_pressure: string;
    pulse: number;
    temperature: number;
    oxygen_saturation: number;
    weight: number;
  };
  physical_examination: string;
  ayush_assessment: {
    prakriti_type: string;
    vata_score: number;
    pitta_score: number;
    kapha_score: number;
  };
  diagnosis: {
    primary_diagnosis: string;
    secondary_diagnosis: string;
    icd_code: string;
  };
  treatment_plan: {
    herbal_prescription: { name: string; dosage: string; rationale: string }[];
    diet_plan: string[];
    yoga_recommendation: string[];
    lifestyle_advice: string;
  };
  follow_up_date: string;
  doctor_notes: string;
}

export interface PatientMasterHealthDocument {
  patient_global_id: string;
  version_number: number;
  last_updated_timestamp: string;
  profile: PatientMasterProfile;
  history: MedicalHistory;
  encounters: ClinicalEncounter[];
  ai_risk_analysis: {
    disease_risk_scores: Record<string, number>;
    organ_stress_index: number;
    complication_probability: number;
    confidence_score: number;
  };
}
