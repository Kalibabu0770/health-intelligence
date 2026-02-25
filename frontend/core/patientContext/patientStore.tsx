import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PatientContext } from './types';
import { UserProfile, MedicationReminder, FoodLog, WorkoutLog, HealthDocument, SymptomSession, RiskScores, EnvironmentContext, MeditationLog, DailyCheckIn } from '../../types';
import { calculateComprehensiveRisk } from './riskEngine';
import { Language, translations } from './translations';

const INITIAL_CONTEXT: PatientContext = {
    profile: null,
    medications: [],
    symptoms: [],
    nutritionLogs: [],
    activityLogs: [],
    meditationLogs: [],
    dailyCheckIns: [],
    clinicalVault: [],
    riskScores: null,
    historicalPatterns: [],
    alerts: [],
    language: 'en',
    theme: 'light'
};

interface PatientStoreMethods {
    updateProfile: (p: UserProfile) => void;
    addMedication: (m: MedicationReminder) => void;
    removeMedication: (id: string) => void;
    logSymptom: (s: SymptomSession) => void;
    logFood: (f: FoodLog) => void;
    logWorkout: (w: WorkoutLog) => void;
    logMeditation: (m: MeditationLog) => void;
    logDailyCheckIn: (c: DailyCheckIn) => void;
    addDocument: (d: HealthDocument) => void;
    removeDocument: (id: string) => void;
    resetVault: () => void;
    setLanguage: (lang: Language) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    triggerAlert: (type: 'info' | 'warning' | 'danger', message: string) => void;
    acknowledgeAlert: (id: string) => void;
    t: any;
}

const PatientContextReact = createContext<(PatientContext & PatientStoreMethods) | null>(null);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [context, setContext] = useState<PatientContext>(INITIAL_CONTEXT);
    const [isInitialized, setIsInitialized] = useState(false);

    // Mock environment context
    const MOCK_ENVIRONMENT: EnvironmentContext = {
        temp: 24,
        humidity: 65,
        seasonalRisk: 'Moderate Flu Activity',
        airQuality: 'Good (42 AQI)'
    };

    const generateTrends = (currentScore: number) => {
        const trends = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trends.push({
                date: d.toLocaleDateString([], { weekday: 'short' }),
                score: Math.max(0, Math.min(100, currentScore + (Math.random() * 10 - 5)))
            });
        }
        return trends;
    };

    // Load from LocalStorage on mount
    useEffect(() => {
        try {
            const savedProfile = localStorage.getItem('hi_profile');
            const savedMeds = localStorage.getItem('hi_reminders');
            const savedSymptoms = localStorage.getItem('hi_symptoms');
            const savedFoods = localStorage.getItem('hi_foods');
            const savedWorkouts = localStorage.getItem('hi_workouts');
            const savedMeditations = localStorage.getItem('hi_meditations');
            const savedCheckIns = localStorage.getItem('hi_checkins');
            const savedDocs = localStorage.getItem('hi_docs');
            const savedLang = localStorage.getItem('hi_lang');

            const profile = savedProfile ? JSON.parse(savedProfile) : null;
            const medications = savedMeds ? JSON.parse(savedMeds) : [];
            const symptoms = savedSymptoms ? JSON.parse(savedSymptoms) : [];
            const nutritionLogs = savedFoods ? JSON.parse(savedFoods) : [];
            const activityLogs = savedWorkouts ? JSON.parse(savedWorkouts) : [];
            const meditationLogs = savedMeditations ? JSON.parse(savedMeditations) : [];
            const dailyCheckIns = savedCheckIns ? JSON.parse(savedCheckIns) : [];
            const clinicalVault = savedDocs ? JSON.parse(savedDocs) : [];
            const language = (savedLang as Language) || 'en';
            const theme = 'light';

            // Calculate initial risk
            const riskAnalysis = calculateComprehensiveRisk(profile, medications, symptoms, nutritionLogs, activityLogs);

            const riskScores: RiskScores = {
                liver: riskAnalysis.liver.score,
                kidney: riskAnalysis.kidney.score,
                heart: riskAnalysis.heart.score,
                stomach: riskAnalysis.stomach.score,
                breathing: riskAnalysis.breathing.score,
                addiction: 0,
                overall: riskAnalysis.overall,
                healthScore: riskAnalysis.healthScore,
                projection7Day: riskAnalysis.projection7Day,
                longevityAge: riskAnalysis.longevityAge,
                stressContributors: riskAnalysis.stressContributors,
                trends: generateTrends(riskAnalysis.healthScore),
                environment: MOCK_ENVIRONMENT
            };

            setContext({
                profile,
                medications,
                symptoms,
                nutritionLogs,
                activityLogs,
                meditationLogs,
                dailyCheckIns,
                clinicalVault,
                riskScores,
                historicalPatterns: [],
                alerts: [],
                language,
                theme
            });
            setIsInitialized(true);
        } catch (e) {
            console.error("Failed to load patient context", e);
        }
    }, []);

    // Persistence & Recalculation Effect
    useEffect(() => {
        if (!isInitialized) return;

        if (context.profile) localStorage.setItem('hi_profile', JSON.stringify(context.profile));
        localStorage.setItem('hi_reminders', JSON.stringify(context.medications));
        localStorage.setItem('hi_symptoms', JSON.stringify(context.symptoms));
        localStorage.setItem('hi_foods', JSON.stringify(context.nutritionLogs));
        localStorage.setItem('hi_workouts', JSON.stringify(context.activityLogs));
        localStorage.setItem('hi_meditations', JSON.stringify(context.meditationLogs));
        localStorage.setItem('hi_checkins', JSON.stringify(context.dailyCheckIns));
        localStorage.setItem('hi_docs', JSON.stringify(context.clinicalVault));
        localStorage.setItem('hi_lang', context.language);
        localStorage.setItem('hi_theme', 'light');

    }, [context, isInitialized]);

    // Actions
    const updateProfile = useCallback((p: UserProfile) => {
        setContext(prev => {
            const risk = calculateComprehensiveRisk(p, prev.medications, prev.symptoms, prev.nutritionLogs, prev.activityLogs);

            if (p) {
                // Sync multiple accounts for the login screen
                const currentAccounts = JSON.parse(localStorage.getItem('hi_accounts') || '[]');
                const existingIdx = currentAccounts.findIndex((a: any) => a.name === p.name);
                if (existingIdx >= 0) {
                    currentAccounts[existingIdx] = p;
                } else {
                    currentAccounts.push(p);
                }
                localStorage.setItem('hi_accounts', JSON.stringify(currentAccounts));
            }

            return {
                ...prev,
                profile: p,
                riskScores: {
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    addiction: 0,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                }
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const addMedication = useCallback((m: MedicationReminder) => {
        setContext(prev => {
            const newMeds = [...prev.medications, m];
            const risk = calculateComprehensiveRisk(prev.profile, newMeds, prev.symptoms, prev.nutritionLogs, prev.activityLogs);
            return {
                ...prev,
                medications: newMeds,
                riskScores: {
                    ...prev.riskScores,
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                } as RiskScores
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const removeMedication = useCallback((id: string) => {
        setContext(prev => {
            const newMeds = prev.medications.filter(m => m.id !== id);
            const risk = calculateComprehensiveRisk(prev.profile, newMeds, prev.symptoms, prev.nutritionLogs, prev.activityLogs);
            return {
                ...prev,
                medications: newMeds,
                riskScores: {
                    ...prev.riskScores,
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                } as RiskScores
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const logFood = useCallback((f: FoodLog) => {
        setContext(prev => {
            const newFoods = [f, ...prev.nutritionLogs];
            const risk = calculateComprehensiveRisk(prev.profile, prev.medications, prev.symptoms, newFoods, prev.activityLogs);
            return {
                ...prev,
                nutritionLogs: newFoods,
                riskScores: {
                    ...prev.riskScores,
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                } as RiskScores
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const logWorkout = useCallback((w: WorkoutLog) => {
        setContext(prev => {
            const newWorkouts = [w, ...prev.activityLogs];
            const risk = calculateComprehensiveRisk(prev.profile, prev.medications, prev.symptoms, prev.nutritionLogs, newWorkouts);
            return {
                ...prev,
                activityLogs: newWorkouts,
                riskScores: {
                    ...prev.riskScores,
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                } as RiskScores
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const logSymptom = useCallback((s: SymptomSession) => {
        setContext(prev => {
            const newSymptoms = [...prev.symptoms, s];
            const risk = calculateComprehensiveRisk(prev.profile, prev.medications, newSymptoms, prev.nutritionLogs, prev.activityLogs);
            return {
                ...prev,
                symptoms: newSymptoms,
                riskScores: {
                    ...prev.riskScores,
                    liver: risk.liver.score,
                    kidney: risk.kidney.score,
                    heart: risk.heart.score,
                    stomach: risk.stomach.score,
                    breathing: risk.breathing.score,
                    overall: risk.overall,
                    healthScore: risk.healthScore,
                    projection7Day: risk.projection7Day,
                    longevityAge: risk.longevityAge,
                    stressContributors: risk.stressContributors,
                    trends: generateTrends(risk.healthScore),
                    environment: prev.riskScores?.environment || MOCK_ENVIRONMENT
                } as RiskScores
            };
        });
    }, [MOCK_ENVIRONMENT]);

    const logMeditation = useCallback((m: MeditationLog) => {
        setContext(prev => ({ ...prev, meditationLogs: [m, ...(prev.meditationLogs || [])] }));
    }, []);

    const logDailyCheckIn = useCallback((c: DailyCheckIn) => {
        setContext(prev => ({ ...prev, dailyCheckIns: [c, ...(prev.dailyCheckIns || [])] }));
    }, []);

    const addDocument = useCallback((d: HealthDocument) => {
        setContext(prev => {
            const newDocs = [d, ...prev.clinicalVault];
            return { ...prev, clinicalVault: newDocs };
        });
    }, []);

    const removeDocument = useCallback((id: string) => {
        setContext(prev => ({ ...prev, clinicalVault: prev.clinicalVault.filter(d => d.id !== id) }));
    }, []);

    const resetVault = useCallback(() => {
        localStorage.clear();
        setContext(INITIAL_CONTEXT);
        location.reload();
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setContext(prev => ({ ...prev, language: lang }));
    }, []);

    const setTheme = useCallback((theme: 'light' | 'dark') => {
        setContext(prev => ({ ...prev, theme: 'light' }));
    }, []);

    const toggleTheme = useCallback(() => {
        setContext(prev => {
            const nextTheme = prev.theme === 'light' ? 'dark' : 'light';
            return { ...prev, theme: 'light' }; // Force light for now as per design
        });
    }, []);

    const triggerAlert = useCallback((type: 'info' | 'warning' | 'danger', message: string) => {
        setContext(prev => ({
            ...prev,
            alerts: [{
                id: Math.random().toString(36).substr(2, 9),
                type,
                message,
                timestamp: Date.now(),
                acknowledged: false
            }, ...prev.alerts].slice(0, 10) // Keep last 10
        }));
    }, []);

    const acknowledgeAlert = useCallback((id: string) => {
        setContext(prev => ({
            ...prev,
            alerts: prev.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a)
        }));
    }, []);

    return (
        <PatientContextReact.Provider value={{
            ...context,
            updateProfile,
            addMedication,
            removeMedication,
            logFood,
            logWorkout,
            logMeditation,
            logDailyCheckIn,
            logSymptom,
            addDocument,
            removeDocument,
            resetVault,
            setLanguage,
            setTheme,
            toggleTheme,
            triggerAlert,
            acknowledgeAlert,
            t: { ...translations['en'], ...translations[context.language] }
        }}>
            {children}
        </PatientContextReact.Provider>
    );
};

export const usePatientContext = () => {
    const context = useContext(PatientContextReact);
    if (!context) throw new Error("usePatientContext must be used within a PatientProvider");
    return context;
};
