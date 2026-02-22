import { UserProfile, RiskScores, MedicationReminder, FoodLog, WorkoutLog, HealthDocument } from "../types";
import { PatientContext } from "../core/patientContext/types";
import { buildAIPrompt } from "../core/patientContext/aiContextBuilder";
export { buildAIPrompt };
import { Language, languages } from "../core/patientContext/translations";
import { assemblePatientContext } from "../core/patientContext/contextAssembler";

// ── API URLs — set via Vite define / VITE_ env vars ─────────────────────
// In development: /ollama proxied to localhost:11434 by vite.config.ts
// In production:  Ollama is NOT available (client-side); backend orchestrator is used
const OLLAMA_API_URL = '/ollama/api/chat';
const OLLAMA_TAGS_URL = '/ollama/api/tags';

// Backend orchestrator URL: localhost in dev, Render in production
declare const __BACKEND_URL__: string;
declare const __ML_BACKEND_URL__: string;
const BACKEND_BASE_URL = (typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : 'http://localhost:8000');
const ML_BACKEND_URL = (typeof __ML_BACKEND_URL__ !== 'undefined' ? __ML_BACKEND_URL__ : 'https://lifeshield-backend.onrender.com/predict');

export const AI_CONFIG = {
    textModel: 'llama3.2',
    visionModel: 'llava',
    visionAlternatives: ['llama3.2-vision', 'moondream'],
    orchestratorUrl: `${BACKEND_BASE_URL}/orchestrate`,
    mlBackendUrl: ML_BACKEND_URL,
};

export interface AIStatus {
    isConnected: boolean;
    hasTextModel: boolean;
    hasVisionModel: boolean;
    availableModels: string[];
    error?: string;
}

// Check if Ollama is running and has required models
export const checkAIStatus = async (): Promise<AIStatus> => {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (!response.ok) throw new Error("Ollama not reachable");

        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];

        // Check for exact match or contains (e.g., 'llama3.2:latest')
        const hasText = models.some((m: string) => m.includes(AI_CONFIG.textModel));
        const hasVision = models.some((m: string) =>
            m.includes(AI_CONFIG.visionModel) ||
            AI_CONFIG.visionAlternatives.some(alt => m.includes(alt))
        );

        return {
            isConnected: true,
            hasTextModel: hasText,
            hasVisionModel: hasVision,
            availableModels: models
        };
    } catch (e: any) {
        return {
            isConnected: false,
            hasTextModel: false,
            hasVisionModel: false,
            availableModels: [],
            error: e.message
        };
    }
};

const extractJson = (text: string) => {
    try {
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("JSON parse warning, attempting fallback:", e);
        return null;
    }
};

const getLanguageName = (code: Language) => {
    const names: Record<Language, string> = {
        en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", kn: "Kannada",
        mr: "Marathi", es: "Spanish", fr: "French", de: "German", zh: "Chinese",
        ja: "Japanese", ar: "Arabic", ru: "Russian", pt: "Portuguese"
    };
    return names[code] || "English";
};

const callOllama = async (model: string, messages: any[], format?: string, stream: boolean = false, options: any = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
        console.log(`[AI] Calling Ollama model=${model}, messages=${messages.length}`);
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                format,
                stream,
                options: {
                    temperature: 0.7,
                    num_predict: 1024,
                    ...options
                }
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text().catch(() => 'Unknown');
            console.error(`[AI] Ollama error ${response.status}:`, errText);
            throw new Error(`Ollama API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.message?.content || "";
        console.log(`[AI] Response received (${content.length} chars)`);
        return content;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error("[AI] Request timed out after 2 minutes");
            throw new Error("AI request timed out. The model may be loading. Try again.");
        }
        console.error("[AI] Service Error:", error);
        throw error;
    }
};

export const getComprehensiveHealthAnalysis = async (context: PatientContext): Promise<any> => {
    const { profile, clinicalVault, riskScores, nutritionLogs, activityLogs } = context;
    if (!profile || !riskScores) return { summary: "Insufficient Data", trends: [], clinicalInsights: [], actionableSteps: [], status: "Unknown" };

    const docDetails = clinicalVault.map(d =>
        `- Document: ${d.name} (${new Date(d.date).toLocaleDateString()})
          Analysis Summary: ${d.summary || 'Wait for scan'}
          Clinical Metrics: ${JSON.stringify(d.keyMetrics || {})}
          Risk Level: ${d.riskLevel || 'Unknown'}`
    ).join('\n');

    const foodSummary = nutritionLogs.slice(0, 5).map(f => f.description).join(', ');
    const workoutSummary = activityLogs.slice(0, 5).map(w => `${w.type} (${w.durationMinutes}m)`).join(', ');

    const detailedPrompt = `
    Analyze the health data for ${profile.name} (Age: ${profile.age}, Weight: ${profile.weight}kg).
    Medical Conditions: ${profile.conditions.map(c => c.name).join(', ')}.
    
    Current Metrics:
    - Liver Risk: ${riskScores.liver}%
    - Kidney Risk: ${riskScores.kidney}%
    - Heart Risk: ${riskScores.heart}%
    - Overall Vitality: ${riskScores.healthScore}%
    
    Recent Context:
    - Nutrition: ${foodSummary || 'None'}
    - Activity: ${workoutSummary || 'None'}
    - Clinical Documents Vault Analysis:
    ${docDetails || "No documents uploaded."}
    
    Task:
    1. Analyze the risk scores, logs, and clinical document analysis results.
    2. Identify longitudinal patterns (e.g., if a recent report shows higher glucose than a previous one).
    3. Synthesize the findings into clinical insights and specific actionable steps.
    4. Provide a clear status assessment.

    Return JSON:
    {
      "summary": "...",
      "clinicalInsights": ["..."],
      "actionableSteps": ["..."]
    }
    IMPORTANT: Return ONLY valid JSON.
  `;

    try {
        const responseText = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: detailedPrompt }], 'json');
        const result = extractJson(responseText);
        return result || {
            summary: "Analysis unavailable. Ensure AI service is active.",
            trends: [], clinicalInsights: [], actionableSteps: ["Check connection", "Retry analysis"], status: "Error"
        };
    } catch (e) {
        return { summary: "AI Service Offline", trends: [], clinicalInsights: [], actionableSteps: ["Start Ollama", "Check Model"], status: "Offline" };
    }
};

export const getAIHealthAdvice = async (profile: UserProfile, scores: RiskScores, language: Language = 'en'): Promise<string> => {
    const prompt = `
    Patient: ${profile.name}, Age ${profile.age}.
    Vitals: Liver Risk ${scores.liver}%, Heart Risk ${scores.heart}%.
    Provide a 2-sentence daily health summary acting as a medical guardian.
    IMPORTANT: You MUST respond in ${getLanguageName(language)}.
  `;
    try {
        return await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }]);
    } catch (e) {
        return "System Offline. Monitoring suspended.";
    }
};

export const analyzeFoodImage = async (base64Image: string): Promise<Partial<FoodLog>> => {
    // Check for vision model first
    const status = await checkAIStatus();
    const visionModel = status.availableModels.find(m => m.includes('llava') || m.includes('vision')) || AI_CONFIG.visionModel;

    if (!status.hasVisionModel && !visionModel) {
        console.warn("No vision model found. Attempting text-only fallback (will fail for image content).");
        throw new Error("Vision model (llava) not installed. Run: ollama pull llava");
    }

    // Strip data URI prefix — Ollama expects raw base64
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const prompt = `Analyze this food image. Return a valid JSON object ONLY, with these fields:
    {
      "description": "Short description of food",
      "calories": 500,
      "protein": 20,
      "carbs": 30,
      "fat": 15
    }
    Do not add markdown or conversational text.`;

    try {
        // NOTE: LLaVA sometimes fails with format: 'json', so we use text mode and parse.
        const responseText = await callOllama(visionModel, [
            {
                role: 'user',
                content: prompt,
                images: [cleanBase64]
            }
        ], undefined); // format undefined

        return extractJson(responseText) || { description: "Analysis incomplete - could not parse food data", calories: 0, protein: 0, carbs: 0, fat: 0 };
    } catch (e: any) {
        console.error("Food analysis failed:", e);
        throw new Error(`Visual analysis failed: ${e.message}`);
    }
};

export const analyzeNutritionDeficiencies = async (profile: UserProfile, todayLogs: FoodLog[], language: Language = 'en'): Promise<any> => {
    const totalCals = todayLogs.reduce((acc, l) => acc + l.calories, 0);
    const totalProtein = todayLogs.reduce((acc, l) => acc + (l.protein || 0), 0);
    const totalFat = todayLogs.reduce((acc, l) => acc + (l.fat || 0), 0);
    const totalCarbs = todayLogs.reduce((acc, l) => acc + (l.carbs || 0), 0);
    const foodsEaten = todayLogs.map(f => f.description).join(', ');

    const prompt = `
    Analyze nutrition for ${profile.name} (Age: ${profile.age}, Weight: ${profile.weight}kg, Location: ${profile.location || 'Global'}, Preferences: ${profile.foodPreferences?.join(', ') || 'No restrictions'}, Conditions: ${profile.conditions.map(c => c.name).join(', ')}).
    
    Today's Intake so far:
    - Calories: ${totalCals}
    - Protein: ${totalProtein}g
    - Fat: ${totalFat}g
    - Carbs: ${totalCarbs}g
    - Foods: ${foodsEaten}

    Task:
    1. Identify specific vitamin/mineral deficiencies.
    2. Calculate remaining needs.
    3. Suggest foods in specific categories to fix these gaps.
       - Category 1: Vegetarian Options (3 distinct items)
       - Category 2: Non-Vegetarian Options (3 distinct items) (Provide these unless user is strictly Veg/Vegan)
       - Category 3: Fruits & Natural Snacks (3 distinct items)
    4. Provide a guidance instruction: "Select any 2-3 items from these lists to restore balance."

    Return JSON:
    {
      "deficiencies": ["Low Iron", ...],
      "remainingNeeds": "Summary...",
      "recommendations": {
        "vegetarian": [{ "food": "Spinach Dal", "reason": "High Iron" }, ...],
        "nonVegetarian": [{ "food": "Grilled Chicken", "reason": "High Protein" }, ...],
        "fruits": [{ "food": "Orange", "reason": "Vitamin C" }, ...]
      },
      "instruction": "Select any 2-3 items..."
    }

    IMPORTANT: You MUST respond in ${getLanguageName(language)}. All text in the JSON values must be in ${getLanguageName(language)}.
  `;

    try {
        const res = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }], 'json');
        return extractJson(res) || { deficiencies: [], remainingNeeds: "Balanced", suggestions: [] };
    } catch (e) {
        return { deficiencies: [], remainingNeeds: "Analysis unavailable", suggestions: [] };
    }
};

export const analyzeTabletSafety = async (context: PatientContext, tablets: string[], problemContext: string): Promise<string> => {
    const { profile } = context;
    const patientData = {
        age: profile.age,
        gender: profile.gender,
        isPregnant: profile.isPregnant,
        chronicConditions: [
            profile.hasDiabetes && "Diabetes",
            profile.hasHighBP && "High Blood Pressure",
            profile.hasLiverDisease && "Liver Disease",
            profile.hasKidneyDisease && "Kidney Disease",
            profile.hasHeartDisease && "Heart Disease",
            profile.hasAsthma && "Asthma",
            ...profile.conditions.map(c => c.name)
        ].filter(Boolean)
    };

    const prompt = `
    Analyze Medication Safety for this patient:
    Patient Details: ${JSON.stringify(patientData)}
    New Medications to Check: ${tablets.join(', ')}
    Patient's Current Problem: ${problemContext}
    
    Task:
    1. Determine if this combination is SAFE, CAUTION, or DANGER for THIS specific patient.
    2. Start your response with one of these keywords: [SAFE], [CAUTION], or [DANGER].
    3. Provide a brief medical explanation (max 40 words) about potential interactions or risks given their health conditions.
    
    IMPORTANT: You MUST respond in ${getLanguageName(context.language)}. The keyword [SAFE/CAUTION/DANGER] must remain in English for system parsing.
  `;
    try {
        return await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }]);
    } catch (e) {
        return "[CAUTION] Safety Check Unavailable. Consult a doctor.";
    }
};

export const getDiagnosticQuestions = async (context: PatientContext, complaint: string): Promise<any> => {
    const contextSummary = assemblePatientContext(context);
    const prompt = `
    ${contextSummary}
    
    Current Patient Complaint: "${complaint}"
    Generate 7-10 detailed triage questions to uncover patterns, triggers, and severity.
    IMPORTANT: You MUST respond in ${getLanguageName(context.language)}. The questions and options in the JSON MUST be in ${getLanguageName(context.language)}.
    Guidelines:
    1. Ask deep questions about the nature of the symptom (e.g. "Describe the pain", "Duration", "Triggers").
    2. Provide 3-4 distinct options for each question (Avoid simple Yes/No where possible).
    3. Include questions that invite specific manual details (e.g. "Highest temperature recorded?", "Pain level 1-10?").
    4. Ensure questions cover patient history and potential "patterns" of recurrence.
    {
      "questions": [
        { "id": "q1", "question": "...", "options": ["Sharp", "Dull", "Throbbing"] }
      ]
    }
  `;
    try {
        const res = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }], 'json');
        return extractJson(res) || { questions: [] };
    } catch (e) {
        return { questions: [] };
    }
};

export const getDiagnosticAdvice = async (context: PatientContext, complaint: string, answers: any[]): Promise<any> => {
    const contextSummary = assemblePatientContext(context);
    const answersText = answers.map((a: any) => `Q: ${a.question || a.qId} | A: ${a.answer}`).join('\n');

    const prompt = `You are a clinical diagnostic AI part of the LifeShield Integrated Health System.
    
    ${contextSummary}
    
    CHIEF COMPLAINT: "${complaint}"
    DIAGNOSTIC FOLLOW-UP DATA:
    ${answersText || 'None provided'}

Return ONLY this exact JSON (no markdown, no extra text):
{
  "assessment": "2-3 sentence clinical assessment using the complaint and follow-up answers. Be specific about what the findings suggest.",
  "possibleDiagnoses": [
    { "condition": "Most likely disease/condition name", "likelihood": "High/Moderate/Low" },
    { "condition": "Second possibility", "likelihood": "Moderate/Low" },
    { "condition": "Third possibility", "likelihood": "Low" }
  ],
  "severity": "Low|Moderate|High|Critical",
  "specialistSuggestion": "Specific specialist (e.g. Cardiologist, ENT, Gastroenterologist, or General Physician)",
  "immediateActions": ["Action 1", "Action 2", "Action 3"],
  "preventiveMeasures": ["Measure 1", "Measure 2", "Measure 3"],
  "redFlags": ["Warning sign to watch for", "..."]
}

IMPORTANT: You MUST respond in ${getLanguageName(context.language)}. All JSON values must be in ${getLanguageName(context.language)}.`;

    try {
        const res = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }], 'json');
        const data = extractJson(res);
        return {
            assessment: data?.assessment || `Based on your complaint of "${complaint}" and the follow-up answers provided, a clinical pattern has been identified.`,
            possibleDiagnoses: data?.possibleDiagnoses || [{ condition: 'Requires further evaluation', likelihood: 'Unknown' }],
            severity: data?.severity || 'Moderate',
            specialistSuggestion: data?.specialistSuggestion || 'General Physician',
            immediateActions: data?.immediateActions || ['Rest adequately', 'Stay hydrated', 'Monitor symptoms'],
            preventiveMeasures: data?.preventiveMeasures || ['Maintain healthy lifestyle', 'Regular check-ups', 'Follow prescribed medication'],
            redFlags: data?.redFlags || ['Worsening symptoms', 'High fever', 'Difficulty breathing']
        };
    } catch (e) {
        console.error("[AI] Diagnostic advice failed:", e);
        return {
            assessment: `Analysis of "${complaint}" is temporarily unavailable. Please ensure Ollama is running.`,
            possibleDiagnoses: [{ condition: 'AI Service Offline', likelihood: 'N/A' }],
            severity: 'Moderate',
            specialistSuggestion: 'General Physician',
            immediateActions: ['Start Ollama', 'Check internet connection', 'Retry'],
            preventiveMeasures: ['Consult a doctor in person'],
            redFlags: ['Any sudden worsening of symptoms']
        };
    }
};




export const getAIPersonalAssistantResponse = async (
    context: PatientContext,
    message: string,
    history: { role: 'user' | 'model', text: string }[],
    analysis?: any
): Promise<string> => {
    let systemPrompt = buildAIPrompt(context, "Chat Session", "CHAT");

    if (analysis?.epidemiology) {
        const epiData = analysis.epidemiology;
        const regionSummary = epiData.locationTrends?.map((l: any) =>
            `- Region: ${l.name} | Risk Clusters: ${l.clusters.join(', ')} | Activity: ${l.fever} cases`
        ).join('\n');

        systemPrompt += `
        \n== AP GOVT GEOSPATIAL BIORISK SURVEILLANCE ==
        The following real-time disease clusters are active in Andhra Pradesh jurisdictions:
        ${regionSummary}

        INSTRUCTION: You are operating under the Government of Andhra Pradesh health surveillance protocol. 
        If the user asks about traveling within AP or safety in specific districts/mandals, use this geospatial data. 
        If a region has "COVID-19 Cluster", "Dengue Alert", or "Viral Fever", advise CAUTION or AVOIDANCE based on AP state health guidelines.
        `;
    }

    const messages = [
        { role: 'system', content: systemPrompt + `\nIMPORTANT: You MUST respond in ${getLanguageName(context.language)}.` },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
        { role: 'user', content: message }
    ];

    try {
        return await callOllama(AI_CONFIG.textModel, messages);
    } catch (e) {
        return "I am currently offline. Please check your connection.";
    }
};

export const analyzeMedicalReport = async (base64Image: string, language: Language = 'en'): Promise<HealthDocument | null> => {
    const langName = getLanguageName(language);
    // Strip data URI prefix — Ollama expects raw base64
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const messages = [
        {
            role: 'user',
            content: `Analyze this medical document. Extract key clinical metrics, health risks, and overall status. 
                Return ONLY a valid JSON HealthDocument object. 
                Use ${langName} for descriptions and recommendations. 
                Focus on:
                - summary: A 2-sentence overview of the findings.
                - keyMetrics: Record of items like {"HbA1c": "6.5%", "BP": "130/85"}.
                - riskLevel: "Low", "Moderate", or "High".
                - recommendations: Array of 3 specific health actions.
                Match the HealthDocument interface strictly.`,
            images: [cleanBase64]
        }
    ];

    try {
        const text = await callOllama(AI_CONFIG.visionModel, messages, 'json');
        const data = extractJson(text);
        if (!data) return null;

        return {
            id: Date.now().toString(),
            name: data.name || data.title || 'Parsed Report',
            type: data.type || 'lab',
            date: Date.now(),
            size: 'AI_PARSED',
            summary: data.summary,
            keyMetrics: data.keyMetrics,
            riskLevel: data.riskLevel,
            recommendations: data.recommendations
        } as HealthDocument;
    } catch (e) {
        console.error("Report analysis error:", e);
        return null;
    }
};

export const identifyMedicineFromImage = async (base64Image: string, language: Language = 'en'): Promise<{ name: string, dosage: string } | null> => {
    const langName = getLanguageName(language);
    const messages = [
        {
            role: 'user',
            content: `Identify the medicine shown in this photo. Return ONLY a JSON object with keys "name" and "dosage". Use ${langName} for the name if possible. Format: {"name": "...", "dosage": "..."}`,
            images: [base64Image.split(',')[1] || base64Image]
        }
    ];

    try {
        const text = await callOllama(AI_CONFIG.visionModel, messages, 'json');
        const data = extractJson(text);
        return data || null;
    } catch (e) {
        console.error("Medicine identification error:", e);
        return null;
    }
};

export const parseVoiceCommand = async (context: PatientContext, transcript: string): Promise<{ type: 'ADD_MED' | 'LOG_WORKOUT' | 'LOG_FOOD' | 'UNKNOWN', data: any } | null> => {
    const prompt = `
    Transcript: "${transcript}"
    Patient Current Language: ${getLanguageName(context.language)}
    Task: Parse this therapeutic intent into a structured command.
    Supported Actions:
    - ADD_MED: For adding medications (drugName, dosage, foodInstruction: before/after/with/none)
    - LOG_WORKOUT: For physical activity (type, durationMinutes)
    - LOG_FOOD: For nutrition (description)
    - NAVIGATE: For app navigation (target: Home, Pharmacy/Meds, AYUSH, Symptoms/Triage, BioHub, Profile)
    
    Return ONLY a JSON object: { "type": "ACTION_TYPE", "data": { ... } }.
    If the intent is not clear, use type "UNKNOWN".
    `;

    try {
        const text = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }], 'json');
        return extractJson(text);
    } catch (e) {
        console.error("Voice command parsing error:", e);
        return null;
    }
};

// --- Unified Orchestrator Calling ---
export const orchestrateHealth = async (context: PatientContext, options: {
    query?: string,
    medications?: string[],
    problem_context?: string,
    image_b64?: string
} = {}): Promise<any> => {
    try {
        const profile = context.profile;
        const payload = {
            profile: {
                ...profile,
                profession: (profile as any).profession || "General",
                activity_level: (profile as any).activity_level || "Sedentary"
            },
            query: options.query,
            medications: options.medications,
            problem_context: options.problem_context,
            image_b64: options.image_b64,
            clinical_vault: context.clinicalVault,
            language: context.language
        };

        const response = await fetch(AI_CONFIG.orchestratorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Orchestrator offline");
        return await response.json();
    } catch (e) {
        console.warn("[Orchestrator] Service unavailable, generating local synthesis.", e);
        const { riskScores, profile } = context;
        if (!riskScores || !profile) return null;

        // Create a local fallback structure that matches the UnifiedResponse model
        return {
            bio_risk: {
                risk_probability: (100 - riskScores.healthScore) / 100,
                risk_level: riskScores.healthScore > 80 ? 'Low' : riskScores.healthScore > 50 ? 'Moderate' : 'High',
                vitality_score: riskScores.healthScore,
                projection7Day: riskScores.projection7Day,
                longevityAge: riskScores.longevityAge,
                stressContributors: riskScores.stressContributors,
                organ_stress: {
                    cardio: riskScores.heart / 100,
                    liver: riskScores.liver / 100,
                    kidney: riskScores.kidney / 100,
                    respiratory: riskScores.breathing / 100,
                    stomach: (riskScores as any).stomach / 100
                }
            },
            guardian_summary: await getAIPersonalAssistantResponse(context, "Provide a 1-sentence summary of my current local risk scores and health status.", []),
            language: context.language
        };
    }
};

// --- Translate any text to the user's language using Ollama ---
export const translateText = async (text: string, language: Language): Promise<string> => {
    if (language === 'en' || !text) return text;
    const langName = getLanguageName(language);
    try {
        const translated = await callOllama(AI_CONFIG.textModel, [
            {
                role: 'system',
                content: `You are a medical translator. Translate the text to ${langName}. Preserve medical terminology. Return ONLY the translated string.`
            },
            { role: 'user', content: text }
        ]);
        return translated?.trim()?.replace(/^["']|["']$/g, '') || text;
    } catch (e) {
        console.warn('[AI] Translation failed, using original:', e);
        return text;
    }
};

export const translateClinicalData = async (data: any, language: Language): Promise<any> => {
    if (language === 'en' || !data) return data;
    const langName = getLanguageName(language);
    try {
        const prompt = `Translate the clinical assessment and AYUSH data into ${langName}. 
        Maintain the exact JSON structure. 
        Only translate the values, NOT the keys.
        
        DATA: ${JSON.stringify(data)}`;

        const response = await callOllama(AI_CONFIG.textModel, [
            { role: 'system', content: `You are a medical JSON translator. Translate all values to ${langName}. Return ONLY the valid JSON.` },
            { role: 'user', content: prompt }
        ], 'json');

        return extractJson(response) || data;
    } catch (e) {
        console.error("[AI] Batch translation failed:", e);
        return data;
    }
};

export const translateQuestionsBatch = async (questions: any[], language: Language): Promise<any[]> => {
    if (language === 'en' || !questions || questions.length === 0) return questions;
    const langName = getLanguageName(language);
    try {
        const prompt = `Translate these triage questions and their options into ${langName}. 
        Structure: [{ "id": "...", "question": "...", "options": ["...", "..."] }]
        Maintain IDs. Translate question text and option values only.
        
        QUESTIONS: ${JSON.stringify(questions)}`;

        const response = await callOllama(AI_CONFIG.textModel, [
            { role: 'system', content: `Translate the questions JSON to ${langName}. Return ONLY valid JSON.` },
            { role: 'user', content: prompt }
        ], 'json');

        const translatedData = extractJson(response);
        return translatedData?.questions || translatedData || questions;
    } catch (e) {
        console.error("[AI] Questions translation failed:", e);
        return questions;
    }
};
// --- Scientific Ayurvedic Clinical Strategy ---
export const getAyurvedicClinicalStrategy = async (context: PatientContext, complaint: string, answers: any[]): Promise<any> => {
    const contextSummary = assemblePatientContext(context);
    const answersText = answers.map((a: any) => `Q: ${a.question || a.qId} | A: ${a.answer}`).join('\n');

    const prompt = `You are a Senior Ayurvedic Physician and Clinical Researcher at the LifeShield AYUSH Integrated Node.
    
    PATIENT BIOMETRICS & HISTORY:
    - Age: ${context.profile.age}
    - Conditions: ${context.profile.conditions.map(c => c.name).join(', ')}
    - Risk Scores: Liver ${context.riskScores?.liver}%, Heart ${context.riskScores?.heart}%
    - Contextual Summary: ${contextSummary}
    
    CHIEF COMPLAINT: "${complaint}"
    DIAGNOSTIC DATA:
    ${answersText}

    TASK: Provide a highly specific, scientifically grounded Ayurvedic protocol tailored to THIS specific patient's biometrics and clinical history.
    Avoid generic advice. Use specific herb names, pharmacological preparation methods, and detailed physiological rationales (connecting Ayurvedic concepts like Guna/Virya to modern physiological markers).

    Return ONLY this exact JSON structure (no markdown):
    {
      "aura_system": "Standard Clinical Ayurveda",
      "dosha_insight": "Detailed physiological rationale for Vata/Pitta/Kapha imbalance.",
      "chikitsa": [
        { "NAME": "Herb/Formulation Name", "DOSAGE": "Specific dosage", "PREPARATION": "How to take", "RATIONALE": "Scientific reason" }
      ],
      "ahar": {
        "PATHYA (Inclusions)": [
          { "FOOD_GROUP": "Group Name", "SPECIFIC_FOODS": "List of foods and logic" }
        ],
        "APATHYA (Exclusions)": [
          { "FOOD_GROUP": "Group Name", "SPECIFIC_FOODS": "List of foods to avoid and logic" }
        ]
      },
      "vihaar": [
        { "ASANA": "Asana Name", "BENEFIT": "Physiological benefit" }
      ],
      "satwa": [
        { "PRANAYAMA": "Technique Name", "FREQUENCY": "Duration/Repetition", "BENEFIT": "Scientific benefit" }
      ],
      "referral": "Clinical threshold for physician intervention."
    }

    IMPORTANT: You MUST respond in ${getLanguageName(context.language)}. All values must be in ${getLanguageName(context.language)}. Key names in JSON must remain in English.`;

    try {
        const res = await callOllama(AI_CONFIG.textModel, [{ role: 'user', content: prompt }], 'json');
        return extractJson(res);
    } catch (e) {
        console.error("[AI] Ayurvedic clinical strategy failed:", e);
        return null;
    }
};
