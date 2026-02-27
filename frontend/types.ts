
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
