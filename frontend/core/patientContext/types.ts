import { UserProfile, MedicationReminder, HealthDocument, WorkoutLog, FoodLog, RiskScores, SymptomSession, MeditationLog, DailyCheckIn } from '../../types';
import { Language } from './translations';

export interface Alert {
    id: string;
    type: 'info' | 'warning' | 'danger';
    message: string;
    timestamp: number;
    acknowledged: boolean;
}

export interface PatientContext {
    profile: UserProfile | null;
    medications: MedicationReminder[];
    symptoms: SymptomSession[];
    nutritionLogs: FoodLog[];
    activityLogs: WorkoutLog[];
    meditationLogs: MeditationLog[];
    dailyCheckIns: DailyCheckIn[];
    clinicalVault: HealthDocument[];
    riskScores: RiskScores | null;
    historicalPatterns: string[]; // e.g. "Frequent high fat intake", "Inconsistent medication"
    alerts: Alert[];
    language: Language;
    theme: 'light' | 'dark';
}
