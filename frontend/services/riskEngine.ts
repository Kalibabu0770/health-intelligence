
import { UserProfile, MedicationLog, SymptomLog, LifestyleLog, RiskScores, RiskLevel, Drug } from '../types';
import { DRUG_DATABASE } from '../constants';

export const calculateRisk = (
  profile: UserProfile,
  medLogs: MedicationLog[],
  symptoms: SymptomLog[],
  lifestyle: LifestyleLog[]
): RiskScores => {
  let liver = 0;
  let kidney = 0;
  let heart = 0;
  let breathing = 0;
  let addiction = 0;

  const today = new Date().setHours(0, 0, 0, 0);
  const todaysLogs = medLogs.filter(log => new Date(log.timestamp).setHours(0, 0, 0, 0) === today);
  const latestLifestyle = lifestyle[lifestyle.length - 1];
  const latestSymptoms = symptoms[symptoms.length - 1];

  // 1. Dose vs Max Limit Calculations
  todaysLogs.forEach(log => {
    const drug = DRUG_DATABASE.find(d => d.id === log.drugId);
    if (!drug) return;

    const totalToday = todaysLogs
      .filter(l => l.drugId === log.drugId)
      .reduce((sum, l) => sum + l.dosageMg, 0);

    const doseRatio = totalToday / drug.maxDailyDoseMg;

    if (doseRatio > 1) {
      liver += 50;
      kidney += 30;
    } else if (doseRatio > 0.8) {
      liver += 20;
    }

    // Specific Class Risks
    if (drug.class === 'NSAID') {
      kidney += 15;
      heart += 10;
      if (profile.hasHighBP) heart += 20;
      if (profile.hasKidneyDisease) kidney += 40;
    }

    if (drug.class === 'Opioid') {
      breathing += 20;
      addiction += 10;
      if (profile.hasAsthma) breathing += 30;
      if (latestLifestyle?.alcoholIntakeUnits > 0) {
        breathing += 40;
        liver += 20;
      }
    }
  });

  // 2. Pre-existing Condition Modifiers
  if (profile.hasLiverDisease) liver += 30;
  if (profile.hasKidneyDisease) kidney += 30;
  if (profile.hasHeartDisease) heart += 25;
  if (profile.age > 60) {
    liver += 10;
    kidney += 15;
    heart += 10;
  }

  // 3. Lifestyle Modifiers
  if (latestLifestyle) {
    if (latestLifestyle.sleepHours < 5) {
      heart += 10;
      liver += 5;
    }
    if (latestLifestyle.alcoholIntakeUnits > 2) {
      liver += 25;
    }
  }

  // 4. Multiple Drug Interactions (NSAID Stacking)
  const uniqueNsaids = new Set(todaysLogs.filter(l => {
    const d = DRUG_DATABASE.find(dr => dr.id === l.drugId);
    return d?.class === 'NSAID';
  }).map(l => l.drugId)).size;
  if (uniqueNsaids > 1) {
    kidney += 30;
    heart += 20;
  }

  // 5. Addiction Trends (Increasing dose or frequency)
  if (medLogs.length > 5) {
    const last3Days = medLogs.slice(-10);
    // Simple logic: if frequency > 4 times a day for opioids
    const opioidFreq = last3Days.filter(l => {
      const d = DRUG_DATABASE.find(dr => dr.id === l.drugId);
      return d?.class === 'Opioid';
    }).length;
    if (opioidFreq > 6) addiction += 40;
  }

  // 6. Symptom Red Flags
  if (latestSymptoms) {
    if (latestSymptoms.yellowEyes) liver += 60;
    if (latestSymptoms.difficultyBreathing) breathing += 70;
    if (latestSymptoms.blackStools) kidney += 40; // Internal bleeding hint
  }

  // Final Overall Score
  const maxScore = Math.max(liver, kidney, heart, breathing);
  let overall = RiskLevel.SAFE;
  if (maxScore > 70) overall = RiskLevel.DANGER;
  else if (maxScore > 35) overall = RiskLevel.CAUTION;

  // Added healthScore property to satisfy the RiskScores interface requirement.
  // This value is placeholder here as it is recalculated in the main App component.
  return {
    liver: Math.min(liver, 100),
    kidney: Math.min(kidney, 100),
    heart: Math.min(heart, 100),
    breathing: Math.min(breathing, 100),
    addiction: Math.min(addiction, 100),
    overall,
    healthScore: 0,
    trends: []
  };
};
