import { PatientContext } from './types';
import { calculateComprehensiveRisk } from './riskEngine';

export const assemblePatientContext = (context: PatientContext): string => {
  const { profile, medications, symptoms, nutritionLogs, activityLogs, clinicalVault } = context;

  if (!profile) return "Patient Context: INCOMPLETE (No Profile)";

  const riskAnalysis = calculateComprehensiveRisk(profile, medications, symptoms, nutritionLogs, activityLogs);

  const medList = medications.map(m => `- ${m.drugName} (${m.dosage}) @ ${m.times.join(', ')}`).join('\n');
  const symptomHistory = symptoms.slice(-5).map(s => `- [${new Date(s.timestamp).toLocaleDateString()}] "${s.userInput}"`).join('\n');
  const nutritionSummary = nutritionLogs.slice(-5).map(f => `- ${f.description} (${f.calories}kcal)`).join('\n');
  // Activity summary
  const activitySummary = activityLogs.slice(-5).map(w => `- ${w.type} (${w.durationMinutes}m)`).join('\n');

  return `
    == PATIENT CONTEXT ==
    IDENTITY: ${profile.name} (Age: ${profile.age}, Weight: ${profile.weight}kg)
    CONDITIONS: ${profile.conditions.map(c => c.name).join(', ')}
    
    MEDICATIONS (Active):
    ${medList || "None"}

    LIFESTYLE HABITS:
    ${profile.habits?.map(h => `- ${h.name} (${h.frequency})`).join('\n') || "None recorded"}

    RECENT SYMPTOMS:
    ${symptomHistory || "None reported"}

    LIFESTYLE SNAPSHOT:
    Recent Nutrition: 
    ${nutritionSummary}
    
    Recent Activity:
    ${activitySummary}

    CLINICAL RISK ANALYSIS (Real-time Engine):
    - Liver Risk: ${riskAnalysis.liver.score}/100 [${riskAnalysis.liver.contributors.join(', ')}]
    - Kidney Risk: ${riskAnalysis.kidney.score}/100 [${riskAnalysis.kidney.contributors.join(', ')}]
    - Heart Risk: ${riskAnalysis.heart.score}/100 [${riskAnalysis.heart.contributors.join(', ')}]
    - Breathing Risk: ${riskAnalysis.breathing.score}/100 [${riskAnalysis.breathing.contributors.join(', ')}]
    - Stomach Risk: ${riskAnalysis.stomach.score}/100
    
    OVERALL SAFETY STATUS: ${riskAnalysis.safetyAnalysis.status}
    CLINICAL ALERT: ${riskAnalysis.safetyAnalysis.explanation}
    CRITICAL FLAGS: ${riskAnalysis.safetyAnalysis.criticalAlerts.join(' | ')}
    
    CLINICAL VAULT (Documents):
    ${clinicalVault.map(d => `- [${d.type}] ${d.name} (${new Date(d.date).toLocaleDateString()})`).join('\n') || "None uploaded"}

    == END CONTEXT ==
  `;
};
