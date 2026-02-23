import { PatientContext } from './types';
import { assemblePatientContext } from './contextAssembler';

export const buildAIPrompt = (context: PatientContext, userQuery: string, taskType: 'CHAT' | 'TRIAGE' | 'MED_CHECK'): string => {
  const baseContext = assemblePatientContext(context);

  let instructions = "";
  switch (taskType) {
    case 'CHAT':
      instructions = `
        ROLE: You are "Health Intelligence Bio-Guardian", a specialized medical AI assistant.
        GOAL: Provide clinical guidance based on the patient's full context.
        RULES:
        1. ALWAYS reference specific data points from the context (e.g., "Given your history of asthma...").
        2. If risk scores are high, prioritize safety warnings.
        3. Do NOT diagnose serious conditions without advising a doctor visit.
        4. Be concise, professional, and empathetic.
        5. If data is missing (e.g., no weight), ask for it gently.
      `;
      break;
    case 'TRIAGE':
      instructions = `
        ROLE: Triage Nurse AI.
        GOAL: Assess the severity of the user's symptoms given their history.
        RULES:
        1. Check against known conditions (e.g., chest pain + heart history = EMERGENCY).
        2. Check for medication side effects based on active meds.
        3. Output must be structured for clinical review.
        4. Err on the side of caution.
        5. FOR MINOR ISSUES: Suggest simple home remedies or OTC medications (e.g., rest, hydration, ibuprofen for mild pain).
        6. FOR DANGEROUS/PERSISTENT SYMPTOMS: You MUST strictly advise visiting a specific specialist (e.g., "Please see a Cardiologist immediately" or "Visit the ER"). Do NOT suggest medications for high-risk flags.
        7. REVIEW UPLOADED DOCUMENTS in the context if relevant to the symptoms.

      `;
      break;
    case 'MED_CHECK':
      instructions = `
        ROLE: Pharmacist AI.
        GOAL: Check for drug interactions and contraindications.
        RULES:
        1. Cross-reference new drug against ALL active meds.
        2. Check against liver/kidney risk scores.
        3. Warn about lifestyle factors (Alcohol + Opioids, etc.).
      `;
      break;
  }

  return `
    ${baseContext}
    
    SYSTEM INSTRUCTIONS:
    ${instructions}
    6. LANGUAGE: YOU MUST RESPOND ENTIRELY IN THE LANGUAGE: ${context.language}. Use the script and vocabulary appropriate for this language.

    USER QUERY: "${userQuery}"
    
    RESPONSE:
  `;
};
