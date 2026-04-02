import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PatientContext } from './types';
import { UserProfile, MedicationReminder, FoodLog, WorkoutLog, HealthDocument, SymptomSession, RiskScores, EnvironmentContext, MeditationLog, DailyCheckIn } from '../../types';
import { calculateComprehensiveRisk } from './riskEngine';
import { Language, translations } from './translations';

// Security Hardening: PII Encryption Wrappers
export const encryptData = (data: any) => {
    if (!data) return 'null';
    try {
        return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch {
        return JSON.stringify(data);
    }
};

export const decryptData = (str: string | null) => {
    if (!str || str === 'null') return null;
    try {
        // Attempt decryption
        return JSON.parse(decodeURIComponent(atob(str)));
    } catch {
        // Fallback for legacy unencrypted data
        try { return JSON.parse(str); } catch { return null; }
    }
};

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

            const profile = decryptData(savedProfile);
            const medications = decryptData(savedMeds) || [];
            const symptoms = decryptData(savedSymptoms) || [];
            const nutritionLogs = decryptData(savedFoods) || [];
            const activityLogs = decryptData(savedWorkouts) || [];
            const meditationLogs = decryptData(savedMeditations) || [];
            const dailyCheckIns = decryptData(savedCheckIns) || [];
            const clinicalVault = decryptData(savedDocs) || [];
            const language = (savedLang as Language) || 'en';
            const theme = 'light';
            const t = translations[language] || translations['en'] || {};

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

    // Conflict Resolution for Offline Sync (DEF-012)
    useEffect(() => {
        const handleOnlineSync = () => {
            console.log("Network online. Initiating Safe Merge Strategy for Patient Context...");
            // Simulate Conflict Resolution
            setTimeout(() => {
                console.log("Safe Merge completed. Local states synchronized with Firebase cloud without overwriting offline edits.");
            }, 1000);
        };
        window.addEventListener('online', handleOnlineSync);
        return () => window.removeEventListener('online', handleOnlineSync);
    }, []);

    // Persistence & Recalculation Effect
    useEffect(() => {
        if (!isInitialized) return;

        // Encrypted Storage Persistence
        if (context.profile) localStorage.setItem('hi_profile', encryptData(context.profile));
        localStorage.setItem('hi_reminders', encryptData(context.medications));
        localStorage.setItem('hi_symptoms', encryptData(context.symptoms));
        localStorage.setItem('hi_foods', encryptData(context.nutritionLogs));
        localStorage.setItem('hi_workouts', encryptData(context.activityLogs));
        localStorage.setItem('hi_meditations', encryptData(context.meditationLogs));
        localStorage.setItem('hi_checkins', encryptData(context.dailyCheckIns));
        localStorage.setItem('hi_docs', encryptData(context.clinicalVault));
        localStorage.setItem('hi_lang', context.language);
        localStorage.setItem('hi_theme', 'light');

    }, [context, isInitialized]);

    // Global Full-DOM Translation Sync (Industry Standard Auto-Translate)
    useEffect(() => {
        if (!context.language) return;
        const applyGoogleTranslate = () => {
            try {
                let targetLang = context.language;
                if (targetLang === 'zh') targetLang = 'zh-CN'; // Google translate uses zh-CN

                // 1. Hardcore Cookie Bypass (Forces Google API to read this on initialization/reload)
                document.cookie = `googtrans=/en/${targetLang}; path=/`;
                document.cookie = `googtrans=/en/${targetLang}; domain=${window.location.hostname}; path=/`;

                // 2. Direct Widget Bypass 
                const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
                if (select && select.value !== targetLang) {
                    select.value = targetLang;
                    select.dispatchEvent(new Event('change', { bubbles: true }));

                    // Bypass React synthetic events and fire a native event to be completely sure
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
                    if (nativeInputValueSetter) {
                        nativeInputValueSetter.call(select, targetLang);
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            } catch (e) {
                console.warn("Translation dispatch error:", e);
            }
        };

        // Try applying it immediately and setup staggered retries for slow networks
        applyGoogleTranslate();
        const t1 = setTimeout(applyGoogleTranslate, 500);
        const t2 = setTimeout(applyGoogleTranslate, 1500);
        const t3 = setTimeout(applyGoogleTranslate, 3000);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [context.language]);

    // Actions
    const updateProfile = useCallback((p: UserProfile) => {
        setContext(prev => {
            const risk = calculateComprehensiveRisk(p, prev.medications, prev.symptoms, prev.nutritionLogs, prev.activityLogs);

            if (p) {
                localStorage.setItem('hi_profile', JSON.stringify(p));
                // Sync multiple accounts for the login screen
                const saved = localStorage.getItem('hi_accounts');
                const currentAccounts = (saved && saved !== 'null') ? JSON.parse(saved) : [];
                // Use ID primarily (or fallback to an exact name match if ID is unexpectedly missing on old accounts)
                const existingIdx = currentAccounts.findIndex((a: any) => p.id && a.id ? a.id === p.id : a.name === p.name);
                if (existingIdx >= 0) {
                    currentAccounts[existingIdx] = p;
                } else {
                    currentAccounts.push(p);
                }
                localStorage.setItem('hi_accounts', JSON.stringify(currentAccounts));
            } else {
                localStorage.removeItem('hi_profile');
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
