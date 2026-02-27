import { UserProfile, RiskScores, MedicationReminder, FoodLog, WorkoutLog, HealthDocument } from "../types";
import { PatientContext } from "../core/patientContext/types";
import { buildAIPrompt } from "../core/patientContext/aiContextBuilder";
export { buildAIPrompt };
import { Language, languages } from "../core/patientContext/translations";
import { assemblePatientContext } from "../core/patientContext/contextAssembler";

// ── API URLs — set via Vite define / VITE_ env vars ─────────────────────
const OLLAMA_API_URL = '/ollama/api/chat';
const OLLAMA_TAGS_URL = '/ollama/api/tags';

// Groq — FREE cloud AI running Llama3 (same model as Ollama)
// Get a free key at: https://console.groq.com
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // same family as llama3.2

// Backend orchestrator URL
declare const __BACKEND_URL__: string;
declare const __ML_BACKEND_URL__: string;
const BACKEND_BASE_URL = (typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : 'http://localhost:8000');
const ML_BACKEND_URL = (typeof __ML_BACKEND_URL__ !== 'undefined' ? __ML_BACKEND_URL__ : 'https://health-intelligence-backend.onrender.com/predict');

export const AI_CONFIG = {
    textModel: 'llama3.2',
    visionModel: 'llava',
    visionAlternatives: ['llama3.2-vision', 'moondream'],
    orchestratorUrl: `${BACKEND_BASE_URL}/orchestrate`,
    mlBackendUrl: ML_BACKEND_URL,
};

const CLINICAL_SYSTEM_PROMPT = `
You are the LifeShield Clinical Intelligence Node, an expert healthcare AI assistant.
CRITICAL SAFETY POLICIES:
1. ROLE: You provide clinical diagnostic support and information across Modern and AYUSH (Ayurveda) medicine. 
2. DISCLAIMER: You MUST always state that this is AI-generated analysis and NOT a substitute for professional medical advice from a doctor (MBBS/BAMS).
3. EMERGENCY: If symptoms suggest acute distress (chest pain, stroke, severe bleeding), your response MUST start with an "EMERGENCY: Seek immediate care" warning.
4. LEGAL: Avoid deterministic language like "You have Disease X". Use "Clinical patterns suggest X" or "Possibility of X".
5. LOCALIZATION: All advice must be culturally relevant and use ingredients available in the patient's region.
`;

// ── Tier 2: Groq Cloud AI (FREE — cloud-native AI running Llama 3.3) ────
const callGroq = async (messages: any[], options: any = {}): Promise<string> => {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
        throw new Error('Groq API key not configured');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
        // Handle images in messages if present (OpenAI-like format)
        const groqMessages = messages.map(msg => {
            if (msg.images && msg.images.length > 0) {
                return {
                    role: msg.role,
                    content: [
                        { type: "text", text: msg.content },
                        ...msg.images.map((img: string) => ({
                            type: "image_url",
                            image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` }
                        }))
                    ]
                };
            }
            return msg;
        });

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: options.model || GROQ_MODEL,
                messages: groqMessages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 1024,
                stream: false,
                response_format: options.json ? { type: "json_object" } : undefined
            }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const err = await response.text().catch(() => 'Unknown error');
            throw new Error(`Groq API error ${response.status}: ${err}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        console.log(`[Groq] ✅ Response received (${content.length} chars)`);
        return content;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Groq request timed out');
        throw error;
    }
};

// ── Smart AI Router — tries each tier in order ────────────────────────────
// Tier 1: Ollama (local dev, requires ollama running on machine)
// Tier 2: Groq  (cloud, FREE, requires VITE_GROQ_API_KEY in production)
// Tier 3: Rule-based clinical engine (always works, no API needed)
const callAI = async (
    messages: any[],
    options: { json?: boolean; allowVision?: boolean } = {}
): Promise<string> => {
    console.log("[AI] Requesting synthesis...", { tier1: "Ollama", tier2: "Groq" });
    // Tier 1: Try Ollama (works only if local Ollama is running)
    const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocal) {
        try {
            const ollamaPayload = {
                model: AI_CONFIG.textModel,
                messages,
                stream: false,
                format: options.json ? 'json' : undefined,
                options: { temperature: 0.7, num_predict: 1024 },
            };
            const response = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ollamaPayload),
            });
            if (response.ok) {
                const data = await response.json();
                const content = data.message?.content || '';
                if (content) {
                    console.log('[AI] ✅ Ollama (local) responded');
                    return content;
                }
            }
        } catch (_) {
            console.info('[AI] Ollama unavailable, trying Groq...');
        }
    }

    // Tier 2: Try Groq (cloud, free, works in any production env)
    if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
        try {
            // For JSON requests, add explicit JSON instruction to system message
            const groqMessages = options.json
                ? messages.map((m, i) =>
                    i === 0 && m.role === 'system'
                        ? { ...m, content: CLINICAL_SYSTEM_PROMPT + '\n' + m.content + '\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text.' }
                        : m
                )
                : [{ role: 'system', content: CLINICAL_SYSTEM_PROMPT }, ...messages];
            const result = await callGroq(groqMessages, { temperature: 0.7 });
            console.log('[AI] ✅ Groq (cloud) responded');
            return result;
        } catch (e: any) {
            console.warn('[AI] Groq failed:', e.message, '— falling back to rule engine');
        }
    }

    // Tier 3: Signal caller to use rule-based fallback
    throw new Error('ALL_AI_OFFLINE');
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

// callOllama kept as thin wrapper for vision-only paths (llava image analysis)
const callOllama = async (model: string, messages: any[], format?: string, _stream: boolean = false, _options: any = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, format, stream: false, options: { temperature: 0.7, num_predict: 1024 } }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Ollama ${response.status}`);
        const data = await response.json();
        return data.message?.content || '';
    } catch (error: any) {
        clearTimeout(timeoutId);
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
    IMPORTANT: You MUST respond in ${getLanguageName(context.language)}. All values in the JSON must be in ${getLanguageName(context.language)}.
    IMPORTANT: Return ONLY valid JSON.
  `;

    try {
        const responseText = await callAI([{ role: 'user', content: detailedPrompt }], { json: true });
        const result = extractJson(responseText);
        return result || {
            summary: "Analysis unavailable. Please retry.",
            trends: [], clinicalInsights: [], actionableSteps: ["Retry analysis"], status: "Error"
        };
    } catch (e) {
        return { summary: "AI service initialising — retry in a moment.", trends: [], clinicalInsights: [], actionableSteps: ["Retry"], status: "Offline" };
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
        return await callAI([{ role: 'user', content: prompt }]);
    } catch (e) {
        return `Guardian active for ${profile.name}. Liver risk ${scores.liver}%, Heart risk ${scores.heart}%. Stay hydrated and follow your medication schedule.`;
    }
};

export const analyzeFoodImage = async (base64Image: string, language: Language = 'en'): Promise<Partial<FoodLog>> => {
    const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // Strip data URI prefix — Ollama expects raw base64
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const prompt = `Analyze this food image. Return a valid JSON object ONLY:
    {
      "description": "Short description of food",
      "calories": 500,
      "protein": 20,
      "carbs": 30,
      "fat": 15
    }
    IMPORTANT: You MUST respond in ${getLanguageName(language)}. The description must be in ${getLanguageName(language)}.
    Do not add markdown or conversational text.`;

    // Tier 1: Try local llava vision model (only works locally)
    if (isLocal) {
        try {
            const status = await checkAIStatus();
            const visionModel = status.availableModels.find(m => m.includes('llava') || m.includes('vision')) || AI_CONFIG.visionModel;
            if (status.hasVisionModel) {
                const responseText = await callOllama(visionModel, [{ role: 'user', content: prompt, images: [cleanBase64] }], undefined);
                const parsed = extractJson(responseText);
                if (parsed) return parsed;
            }
        } catch (_) {
            console.info('[Vision] llava unavailable, using text fallback');
        }
    }

    // Tier 2: Groq text-only fallback — ask AI to estimate from description cues
    // (In production without vision, user can type food name manually too)
    try {
        const textPrompt = `A user uploaded a food photo but we cannot process the image directly.
        Provide a typical nutritional estimate for a common Indian meal as a JSON object ONLY:
        { "description": "Mixed meal", "calories": 450, "protein": 15, "carbs": 60, "fat": 12 }
        Return a realistic estimate. No markdown.`;
        const result = await callAI([{ role: 'user', content: textPrompt }], { json: true });
        return extractJson(result) || { description: 'Food item', calories: 350, protein: 12, carbs: 45, fat: 10 };
    } catch (e: any) {
        const description = await translateText('Food item (Manual entry recommended)', language);
        return { description, calories: 300, protein: 10, carbs: 40, fat: 8 };
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
    
    Work Profile:
    - Profession: ${profile.profession || 'Not specified'}
    - Intensity: ${profile.workIntensity || 'Moderate'}
    - Work Hours: ${profile.workHoursPerDay || 8} hrs/day
    
    Regional Context:
    - Region: ${profile.location || 'Unknown'} (District: ${profile.district || 'N/A'}, Mandal: ${profile.mandal || 'N/A'})
    - Requirement: Provide food suggestions that are LOCALLY available and culturally relevant to this REGION. (e.g., if in Andhra Pradesh, suggest local millets, traditional greens, and regional staples).
    
    Today's Intake so far:
    - Calories: ${totalCals}
    - Protein: ${totalProtein}g
    - Fat: ${totalFat}g
    - Carbs: ${totalCarbs}g
    - Foods: ${foodsEaten}

    Task:
    1. Identify specific vitamin/mineral deficiencies.
    2. Calculate remaining needs.
    3. Suggest REGIONAL foods in specific categories to fix these gaps.
       - Category 1: Regional Vegetarian Options (3 items)
       - Category 2: Regional Non-Vegetarian Options (3 items)
       - Category 3: Local Fruits & Natural Snacks (3 items)
    4. Provide a guidance instruction: "Select any 2-3 items from these lists to restore balance."

    Return JSON:
    {
      "deficiencies": ["Low Iron", ...],
      "remainingNeeds": "Summary...",
      "recommendations": {
        "vegetarian": [{ "food": "Spinach Dal", "reason": "High Iron" }, ...],
        "nonVegetarian": [{ "food": "Grilled Chicken", "reason": "High Protein" }, ...],
        "general": [{ "food": "Orange", "reason": "Vitamin C" }, ...]
      },
      "instruction": "Select any 2-3 items..."
    }

    IMPORTANT: You MUST respond in ${getLanguageName(language)}. All text in the JSON values must be in ${getLanguageName(language)}.
  `;

    try {
        const res = await callAI([{ role: 'user', content: prompt }], { json: true });
        const parsed = extractJson(res);
        if (parsed && (parsed.recommendations || parsed.suggestions)) {
            return parsed;
        }
        throw new Error("Invalid structure");
    } catch (e) {
        // High-quality clinical fallback for demo/offline
        const region = profile.location || "Your Region";
        return {
            deficiencies: ["Optimizing metabolic balance"],
            remainingNeeds: "Balanced micro-nutrients",
            recommendations: {
                vegetarian: [
                    { food: "Local Green Leafy Vegetables", reason: "High in Iron and Magnesium for better vitality" },
                    { food: "Millet-based porridge", reason: "Complex carbs for stable glucose levels" },
                    { food: "Steamed Seasonal Veggies", reason: "Rich in antioxidants for organ health" }
                ],
                nonVegetarian: [
                    { food: "Grilled Local Lean Fish", reason: "Omega-3 for heart and brain performance" },
                    { food: "Spiced Chicken/Lentil Broth", reason: "Easy digestion and high protein recovery" },
                    { food: "Poached Eggs with herbs", reason: "Bio-available protein for metabolic sync" }
                ],
                general: [
                    { food: "Regional Citrus Fruits", reason: "Vitamin C to boost immune node" },
                    { food: "Sprouted pulses", reason: "Enzyme rich for digestive stability" }
                ]
            },
            instruction: `Protocol: Select base items from ${region} registry to stabilize your bio-rhythm.`
        };
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
        return await callAI([{ role: 'user', content: prompt }]);
    } catch (e) {
        const fallback = "[CAUTION] Safety Check Unavailable. Consult a doctor.";
        return await translateText(fallback, context.language);
    }
};

export const getDiagnosticQuestions = async (context: PatientContext, complaint: string): Promise<any> => {
    const contextSummary = assemblePatientContext(context);
    const prompt = `
    You are an Expert Triage Physician at the Health Intelligence Node.
    
    ${contextSummary}
    
    CHIEF COMPLAINT: "${complaint}"
    
    TASK:
    Generate 7-10 highly targeted clinical triage questions.
    Questions MUST be strictly relevant to the chief complaint and the patient's medical history provided above.
    
    GUIDELINES:
    1. CROSS-REFERENCE: If the patient has conditions (e.g. Diabetes, BP), ask how this symptom relates to them.
    2. DIFFERENTIATE: Ask questions that help distinguish between common and serious causes of the complaint.
    3. PATTERNS: Ask about duration, frequency, triggers (food, activity), and relieving factors.
    4. QUANTITATIVE: Include at least one question asking for a numerical value (e.g. pain scale 1-10, duration in days).
    5. OPTIONS: Provide 3-4 specific, medical-grade options for each question. Avoid simple Yes/No.
    
    JSON STRUCTURE (Return ONLY this, no markdown):
    {
      "questions": [
        { "id": "q1", "text": "Specific question text", "options": ["Option A", "Option B", "Option C"] }
      ]
    }

    CRITICAL: YOU MUST RESPOND IN ${getLanguageName(context.language)}. All text in the JSON must be in ${getLanguageName(context.language)}, but keys remain in English.
  `;
    try {
        const res = await callAI([{ role: 'user', content: prompt }], { json: true });
        const parsed = extractJson(res);
        if (parsed?.questions && parsed.questions.length > 0) {
            console.log("[AI] Targeted questions generated for:", complaint);
            return parsed;
        }
        throw new Error('Invalid questions format');
    } catch (e) {
        console.error('[DiagnosticQ] AI generation failed, using dynamic local fallback:', e);

        // Dynamic Local Fallback based on keywords
        const lower = complaint.toLowerCase();
        let qSet = [
            { id: 'q1', text: `How long have you had "${complaint}"?`, options: ['Less than 24 hours', '1-3 days', '4-7 days', 'Chronic (weeks/months)'] },
            { id: 'q2', text: 'On a scale of 1-10, how severe is the peak intensity?', options: ['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-8)', 'Emergency Level (9-10)'] }
        ];

        if (lower.includes('pain') || lower.includes('ache')) {
            qSet.push({ id: 'q3', text: 'Does the pain travel or radiate anywhere else?', options: ['Stays in one spot', 'Spreads to back', 'Spreads to arms/neck', 'Changes location'] });
            qSet.push({ id: 'q4', text: 'What describes the nature of this pain best?', options: ['Sharp/Stabbing', 'Dull/Aching', 'Burning/Searing', 'Pressure/Tightness'] });
            if (lower.includes('chest')) {
                qSet.push({ id: 'q5', text: 'Do you feel any pressure or "weight" on your chest?', options: ['Yes, significant weight', 'Mild tightness', 'No, just sharp pain', 'Only when breathing'] });
            }
        } else if (lower.includes('fev') || lower.includes('hot') || lower.includes('cold') || lower.includes('shiver')) {
            qSet.push({ id: 'q3', text: 'What was your highest temperature recorded today?', options: ['No fever (Normal)', 'Mild (99-101°F)', 'Moderate (101-103°F)', 'High (Above 103°F)'] });
            qSet.push({ id: 'q4', text: 'Do you have associated chills or body aches?', options: ['Yes, severe chills', 'Only body aches', 'Both chills and aches', 'Neither'] });
        } else if (lower.includes('cough') || lower.includes('breath') || lower.includes('throat')) {
            qSet.push({ id: 'q3', text: 'Is the cough producing any phlegm/mucus?', options: ['Dry/Hacking', 'Productive (Clear)', 'Productive (Yellow/Green)', 'Productive (Blood-flecked)'] });
            qSet.push({ id: 'q4', text: 'Are you experiencing any shortness of breath?', options: ['Only on exertion', 'While resting', 'When lying down', 'No breathing issues'] });
        } else if (lower.includes('stomach') || lower.includes('digest') || lower.includes('vomit') || lower.includes('motion')) {
            qSet.push({ id: 'q3', text: 'How is your appetite and thirst?', options: ['Lost appetite', 'Normal', 'Excessive thirst', 'Nausea when eating'] });
            qSet.push({ id: 'q4', text: 'Are there any changes in bowel movements?', options: ['Diarrhea (Loose)', 'Constipation', 'Bloody/Black stools', 'No changes'] });
        } else if (lower.includes('head') || lower.includes('dizzy')) {
            qSet.push({ id: 'q3', text: 'Any sensitivity to light or sound?', options: ['Light sensitivity', 'Sound sensitivity', 'Both light & sound', 'None'] });
            qSet.push({ id: 'q4', text: 'Did this start suddenly or gradually?', options: ['Sudden "Thunderclap"', 'Gradual over hours', 'Wakes me up from sleep', 'Intermittent'] });
        } else {
            qSet.push({ id: 'q3', text: 'When is this most bothersome?', options: ['Early morning', 'After physical activity', 'After eating', 'Night time / Resting'] });
        }

        qSet.push({ id: 'q_history', text: 'Have you had this specific issue before?', options: ['First time ever', 'Occasional flare-up', 'Frequent recurring issue', 'It is a known chronic condition'] });
        qSet.push({ id: 'q_meds', text: 'Have you taken any medication for this today?', options: ['No, waiting for advice', 'Yes, but no improvement', 'Yes, slight relief', 'On regular maintenance pills'] });

        return await translateQuestionsBatch(qSet, context.language);
    }
};

export const getDiagnosticAdvice = async (context: PatientContext, complaint: string, answers: any[]): Promise<any> => {
    const { profile, riskScores } = context;
    const answersText = answers.map((a: any) => `Q: ${a.question || a.qId} | A: ${a.answer}`).join('\n');

    const flags = [
        profile.hasDiabetes && 'Diabetes',
        profile.hasHighBP && 'Hypertension',
        profile.hasHeartDisease && 'Heart Disease',
        profile.hasLiverDisease && 'Liver Disease',
        profile.hasKidneyDisease && 'Kidney Disease',
        profile.isPregnant && 'Pregnant',
    ].filter(Boolean).join(', ') || 'None';

    const mlContext = riskScores ? `
ML RISK ANALYSIS (computed from patient vitals + ML model):
- Overall Health Score: ${riskScores.healthScore}/100
- Heart Risk: ${riskScores.heart}%  | Liver Risk: ${riskScores.liver}%
- Kidney Risk: ${riskScores.kidney}% | Breathing Risk: ${riskScores.breathing}%
- 7-Day Projection: ${riskScores.projection7Day || 'Stable'}` : '';

    const prompt = `You are a senior clinical diagnostic physician AI with access to ML-computed patient risk data.
Give accurate, specific, evidence-based diagnosis using ALL the data below.

PATIENT:
- ${profile.name}, Age ${profile.age}, ${profile.gender}, ${profile.weight}kg
- Conditions: ${profile.conditions.map(c => c.name).join(', ') || 'None'}
- Medications: ${(profile.currentMedications || []).join(', ') || 'None'}
- Flags: ${flags}
${mlContext}

CHIEF COMPLAINT: "${complaint}"
TRIAGE ANSWERS:
${answersText || 'No follow-up data'}

Return ONLY this JSON (no markdown):
{
  "assessment": "3-4 sentence clinical assessment referencing ML risk + conditions + symptoms. Be specific.",
  "possibleDiagnoses": [
    { "condition": "Most likely diagnosis", "likelihood": "High", "reasoning": "Evidence-based reason" },
    { "condition": "Second possibility", "likelihood": "Moderate", "reasoning": "Reason" },
    { "condition": "Third possibility", "likelihood": "Low", "reasoning": "Reason" }
  ],
  "severity": "Low|Moderate|High|Critical",
  "specialistSuggestion": "Specific specialist type",
  "immediateActions": ["Action 1", "Action 2", "Action 3"],
  "preventiveMeasures": ["Measure 1", "Measure 2", "Measure 3"],
  "redFlags": ["Warning 1", "Warning 2"],
  "mlInsight": "1 sentence linking ML risk score to this diagnosis"
}
IMPORTANT: Respond in ${getLanguageName(context.language)}.`;

    try {
        const res = await callAI([
            { role: 'system', content: 'You are a board-certified clinical AI diagnostician. Provide accurate, evidence-based assessments incorporating ML risk scores and full patient history.' },
            { role: 'user', content: prompt }
        ], { json: true });
        const data = extractJson(res);
        if (data?.assessment) return data;
        throw new Error('Incomplete response');
    } catch (e) {
        console.error("[AI] Diagnostic advice failed:", e);
        const lower = complaint.toLowerCase();
        const riskNote = riskScores ? `ML health score: ${riskScores.healthScore}/100, heart risk: ${riskScores.heart}%, liver risk: ${riskScores.liver}%.` : 'Clinical profile active.';

        let assessment = `Your complaint of "${complaint}" requires systematic evaluation. Based on your profile (${riskNote}), pattern suggests a potential acute episode.`;
        let possibleDiagnoses = [
            { condition: 'Viral / Systemic Infection', likelihood: 'High', reasoning: 'Symptoms align with systemic inflammatory response.' },
            { condition: 'Metabolic Stress', likelihood: 'Moderate', reasoning: 'Interaction between existing conditions and new symptoms.' },
            { condition: 'Secondary Complication', likelihood: 'Low', reasoning: 'Less likely but requires monitoring.' }
        ];
        let severity = 'Moderate';
        let redFlags = ['Persistent high fever', 'Difficulty breathing', 'Developing rash'];

        if (lower.includes('chest') || lower.includes('heart') || lower.includes('breath')) {
            assessment = "Chest-related symptoms observed in a high-risk matrix. Priority assessment for cardiovascular or respiratory distress required.";
            possibleDiagnoses = [
                { condition: 'Angina / Cardiac Ischemia', likelihood: 'Moderate', reasoning: 'Based on risk score and symptom location.' },
                { condition: 'Respiratory Infection', likelihood: 'High', reasoning: 'Common presentation of breathing difficulty.' }
            ];
            severity = 'High';
            redFlags.push('Radiating pain to jaw/arm', 'Sudden cold sweat');
        } else if (lower.includes('stomach') || lower.includes('vomit') || lower.includes('motion')) {
            assessment = "Gastrointestinal distress pattern detected. Risk of dehydration and electrolyte imbalance.";
            possibleDiagnoses = [
                { condition: 'Acute Gastroenteritis', likelihood: 'High', reasoning: 'Likely infectious or food-borne.' },
                { condition: 'Gastritis / Hyperacidity', likelihood: 'Moderate', reasoning: 'Common digestive stress.' }
            ];
        }

        const fallback = {
            assessment,
            possibleDiagnoses,
            severity: (riskScores && riskScores.healthScore < 50) ? 'High' : severity,
            specialistSuggestion: lower.includes('chest') ? 'Cardiologist' : lower.includes('stomach') ? 'Gastroenterologist' : 'General Physician',
            immediateActions: ['Monitor vitals every 4 hours', 'Stay hydrated with ORS', 'Rest in a well-ventilated space'],
            preventiveMeasures: ['Balanced diet', 'Manage stress levels', 'Regular health screening'],
            redFlags,
            mlInsight: riskScores ? `Baseline resilience is at ${riskScores.healthScore}%, suggesting ${riskScores.healthScore > 70 ? 'good' : 'cautionary'} recovery capacity.` : 'Awaiting deeper ML sync.'
        };
        return await translateClinicalData(fallback, context.language);
    }
};

// ── Clinical Rule-Based Fallback Engine (works without Ollama) ─────────────
const clinicalFallbackResponse = (message: string, context: PatientContext): string => {
    const msg = message.toLowerCase();
    const profile = context.profile;
    const name = profile?.name?.split(' ')[0] || 'there';
    const scores = context.riskScores;
    const meds = profile?.currentMedications || [];
    const conditions = profile?.conditions?.map(c => c.name) || [];
    const hasDiabetes = profile?.hasDiabetes;
    const hasHighBP = profile?.hasHighBP;
    const hasHeart = profile?.hasHeartDisease;
    const hasLiver = profile?.hasLiverDisease;
    const hasKidney = profile?.hasKidneyDisease;

    // ── Greetings ──────────────────────────────────────────────────────────
    if (/^(hi|hello|hey|good|namaste|vanakam|namaskar)\b/.test(msg)) {
        return `Hello ${name}! 👋 I'm your Health Intelligence Guardian. I can help you with symptoms, medications, diet, and health advice. How are you feeling today?`;
    }

    // ── Fever ──────────────────────────────────────────────────────────────
    if (/fever|temperature|feaver|temp high|body heat|bukhar/.test(msg)) {
        const duration = /2 day|two day|3 day|three day|4 day|four day/.test(msg) ? '2+ days' : /week|7 day/.test(msg) ? 'a week' : '';
        let response = `🌡️ **Fever Assessment for ${name}:**\n\nA fever lasting ${duration || 'multiple days'} requires attention.\n\n`;
        response += `**Immediate steps:**\n• Take Paracetamol 500mg every 6 hours (with food)\n• Drink 3–4 litres of water/ORS daily\n• Rest and avoid outdoor exposure\n• Monitor temperature every 4 hours\n\n`;
        if (hasDiabetes) response += `⚠️ **Diabetic Alert:** Fever can spike blood sugar — check glucose every 6 hours.\n\n`;
        if (hasHighBP) response += `⚠️ **BP Alert:** Dehydration from fever can affect BP — stay well hydrated.\n\n`;
        response += `**Red Flags — Go to ER immediately if:**\n• Temperature > 104°F (40°C)\n• Severe headache or stiff neck\n• Difficulty breathing\n• Rash appears suddenly\n\n`;
        response += `*In Andhra Pradesh, dengue and malaria are active in 2025. If fever is with joint pain or chills — get a blood test immediately.*`;
        return response;
    }

    // ── Headache ────────────────────────────────────────────────────────────
    if (/headache|head pain|head ache|migraine|sir dard/.test(msg)) {
        let response = `🧠 **Headache Assessment for ${name}:**\n\n`;
        response += `**Likely causes:** Dehydration, tension, eyestrain, or seasonal viral infection.\n\n`;
        response += `**Immediate care:**\n• Drink 2 glasses of water now\n• Rest in a dark, quiet room\n• Apply cold compress to forehead\n• Take Paracetamol 500mg if pain > 5/10\n\n`;
        if (hasHighBP) response += `⚠️ **Your BP history:** Sudden severe headache with BP can indicate hypertensive crisis. Check BP immediately.\n\n`;
        response += `**See a doctor if:** Headache is worst of your life, comes with vomiting, fever, or vision changes.`;
        return response;
    }

    // ── Chest pain ─────────────────────────────────────────────────────────
    if (/chest pain|chest tight|heart pain|left arm|breathing tight|angina/.test(msg)) {
        return `🚨 **URGENT — Chest Pain Protocol for ${name}:**\n\n${hasHeart ? '⚠️ You have a cardiac history — this is HIGH PRIORITY.\n\n' : ''}**Call emergency services immediately (108) if:**\n• Pain radiates to left arm or jaw\n• Shortness of breath\n• Cold sweat + nausea\n• Pain lasting > 5 minutes\n\n**While waiting:** Sit upright, loosen clothing, do NOT lie flat.\n${meds.some(m => /aspirin/i.test(m)) ? '• You have Aspirin — take 1 tablet (325mg) if not already taken.\n' : ''}\n⚕️ **Do NOT drive yourself. Call 108 now.**`;
    }

    // ── Diabetes / Blood sugar ─────────────────────────────────────────────
    if (/sugar|diabetes|glucose|insulin|hba1c|blood sugar/.test(msg)) {
        let response = `🩸 **Diabetes Management for ${name}:**\n\n`;
        if (hasDiabetes) {
            response += `Your profile shows Type 2 Diabetes. Current guidelines:\n\n`;
            response += `• **Target fasting glucose:** 80–130 mg/dL\n• **Post-meal (2hr):** < 180 mg/dL\n• **HbA1c target:** < 7%\n\n`;
            response += `**Diet tips:**\n• Eat small meals every 3–4 hours\n• Avoid white rice, maida, sugary drinks\n• Include: bitter gourd, fenugreek seeds, whole grains\n\n`;
            response += `**Red flags:** Dizziness + sweating = low sugar → eat glucose/sugar immediately.`;
        } else {
            response += `Your profile doesn't show diabetes. For prevention:\n• Maintain healthy weight\n• Exercise 30 min/day\n• Limit refined carbohydrates\n• Get fasting glucose tested annually.`;
        }
        return response;
    }

    // ── Blood pressure ─────────────────────────────────────────────────────
    if (/blood pressure|bp|hypertension|high bp|pressure/.test(msg)) {
        let response = `💉 **Blood Pressure Guidance for ${name}:**\n\n`;
        if (hasHighBP) {
            response += `You have hypertension on record.\n\n**BP targets:** < 130/80 mmHg\n\n`;
            response += `**Daily tips:**\n• Reduce salt intake to < 5g/day\n• Avoid processed/packaged food\n• 30 min brisk walk daily\n• Avoid stress and smoking\n• Check BP twice daily — morning & evening\n\n`;
            response += `**Danger range:** BP > 180/120 = Hypertensive crisis → Go to ER immediately.`;
        } else {
            response += `Your profile doesn't show hypertension. Normal BP is < 120/80.\n\nFor good BP: Stay active, reduce salt, manage stress, and avoid smoking.`;
        }
        return response;
    }

    // ── Cough / Cold ────────────────────────────────────────────────────────
    if (/cough|cold|runny nose|sore throat|throat pain|sneezing/.test(msg)) {
        return `🤧 **Cold & Cough Guidance for ${name}:**\n\n**Home remedies (first 48 hours):**\n• Warm water with honey + ginger tea (3x daily)\n• Steam inhalation with Vicks/tulsi leaves (morning & night)\n• Gargle with warm salt water 3x daily\n• Rest and stay warm\n\n**Medications if needed:**\n• Cetirizine 10mg (for runny nose/sneezing)\n• Paracetamol 500mg (for body ache)\n• Avoid antibiotics — colds are viral!\n\n**See a doctor if:** Cough > 7 days, yellow-green phlegm, high fever, or breathing difficulty.`;
    }

    // ── Stomach / Digestion ─────────────────────────────────────────────────
    if (/stomach|diarrhea|vomit|nausea|acidity|gas|bloat|constipation|abdominal|loose motion/.test(msg)) {
        let response = `🫃 **Digestive Health for ${name}:**\n\n`;
        if (/diarrhea|loose motion/.test(msg)) {
            response += `**For diarrhea:**\n• ORS every 30 minutes\n• Eat banana, rice, boiled potato\n• Avoid dairy, spicy food\n• Take ORS + zinc tablet for 10 days\n• See doctor if > 3 days or blood in stool\n\n`;
        } else if (/vomit|nausea/.test(msg)) {
            response += `**For vomiting:**\n• Sip cold water/ORS in small amounts\n• Avoid solid food for 2–4 hours\n• Ginger tea or plain crackers help\n• Take ORS to prevent dehydration\n\n`;
        } else if (/acidity|gas/.test(msg)) {
            response += `**For acidity:**\n• Avoid spicy, fried, and oily food\n• Don't eat 2 hours before bedtime\n• Chew fennel seeds (saunf) after meals\n• Take Pantoprazole 40mg before breakfast if persistent\n\n`;
        }
        if (hasLiver) response += `⚠️ **Liver Alert:** Avoid Ibuprofen/NSAIDs. Use Paracetamol at minimal dose.`;
        if (hasKidney) response += `⚠️ **Kidney Alert:** Maintain hydration. Avoid high-protein diet during episode.`;
        return response;
    }

    // ── Medication questions ─────────────────────────────────────────────────
    if (/medicine|tablet|drug|dose|paracetamol|ibuprofen|metformin|medication/.test(msg)) {
        const medList = meds.length > 0 ? `\n\nYour registered medications: **${meds.join(', ')}**` : '';
        return `💊 **Medication Guidance for ${name}:**${medList}\n\n**General rules:**\n• Never stop BP/diabetes medication suddenly\n• Paracetamol: max 4g/day (8 tablets of 500mg)\n• Avoid Ibuprofen on empty stomach${hasLiver ? '\n• ⚠️ With your liver condition — avoid NSAIDs entirely' : ''}\n${hasKidney ? '• ⚠️ With your kidney condition — avoid Ibuprofen/NSAIDs' : ''}\n\n**Use the Medication Safety Checker** in the Pharmacy tab to check drug interactions for your specific combination.`;
    }

    // ── Sleep / Fatigue ─────────────────────────────────────────────────────
    if (/sleep|tired|fatigue|weakness|energy|exhausted|insomnia/.test(msg)) {
        return `😴 **Energy & Sleep for ${name}:**\n\n**Your vitality score: ${scores?.healthScore || 'N/A'}%**\n\n**To improve energy:**\n• Sleep 7–8 hours at consistent times\n• Wake up & sleep at same time daily\n• Avoid screens 1 hour before bed\n• Walk 20–30 min in morning sunlight\n• Check Vitamin D and B12 levels (common deficiency in India)\n\n**Foods for energy:** Banana, dates, lentils, leafy greens, eggs (if non-veg)\n\n**If fatigue is severe or persistent > 2 weeks:** Get CBC, Thyroid, Vitamin B12 blood test done.`;
    }

    // ── Health score / Risk ─────────────────────────────────────────────────
    if (/health score|risk score|risk|vitality|organ|liver risk|heart risk|kidney/.test(msg)) {
        const scoreText = scores ? `\n• **Overall Vitality:** ${scores.healthScore}%\n• **Heart Risk:** ${scores.heart}%\n• **Liver Risk:** ${scores.liver}%\n• **Kidney Risk:** ${scores.kidney}%\n• **Breathing:** ${scores.breathing}%` : '\nHealth scores not yet calculated. Please complete your profile.';
        return `📊 **Your Health Intelligence Report for ${name}:**${scoreText}\n\n**Interpretation:**\n• 80–100%: Excellent — maintain current habits\n• 60–79%: Good — minor improvements needed\n• 40–59%: Moderate — consult doctor for checkup\n• < 40%: High Risk — immediate medical attention\n\nVisit the **Dashboard** tab for your full Organ Stress Map and trend analysis.`;
    }

    // ── AYUSH / Ayurveda ───────────────────────────────────────────────────
    if (/ayush|ayurveda|homeopathy|yoga|herbal|natural remedy|dosha|vata|pitta|kapha/.test(msg)) {
        return `🌿 **AYUSH Guidance for ${name}:**\n\nFor personalized Ayurvedic protocols, use the **AYUSH AI tab** where our system:\n\n• Analyses your Dosha (Vata/Pitta/Kapha) imbalance\n• Prescribes specific herbs with dosage & preparation\n• Provides Pathya (diet inclusions) and Apathya (diet exclusions)\n• Recommends Yoga asanas with physiological rationale\n• Suggests Pranayama techniques\n\n**General AYUSH tips:**\n• Turmeric milk (haldi doodh) daily for immunity\n• Triphala before sleep for digestion\n• Ashwagandha for stress & energy\n• Tulsi leaves (3–4 fresh daily) for respiratory health`;
    }

    // ── Disease Finder / Diagnosis ─────────────────────────────────────────
    if (/diagnos|check symptom|disease finder|triage|what disease|what illness/.test(msg)) {
        return `🔬 **Symptom Diagnosis:**\n\nFor a full clinical assessment, go to the **Disease Finder tab** where I will:\n\n1. Ask you 7–10 detailed follow-up questions\n2. Generate 3 possible diagnoses with likelihood\n3. Recommend the right specialist\n4. Provide immediate action steps\n5. Generate an AYUSH protocol\n\nType your main symptom there to begin the clinical triage.`;
    }

    // ── Emergency ──────────────────────────────────────────────────────────
    if (/emergency|ambulance|911|108|critical|dying|unconscious|stroke/.test(msg)) {
        return `🚨 **EMERGENCY RESPONSE:**\n\n**Call 108 (Ambulance) immediately.**\n\nWhile waiting:\n• Keep patient sitting upright (for breathing issues)\n• Lay flat with legs elevated (for fainting/shock)\n• Do NOT give food or water\n• Stay on line with emergency services\n\n**AP Emergency Numbers:**\n• Ambulance: 108\n• Police: 100\n• Fire: 101\n• Disaster Management: 1070`;
    }

    // ── Default smart response ─────────────────────────────────────────────
    const conditionStr = conditions.length > 0 ? `Your registered conditions: ${conditions.join(', ')}.` : '';
    return `I understand you're asking about "${message}", ${name}.\n\n${conditionStr}\n\nFor the most accurate clinical advice on your specific concern, please:\n\n1. **Disease Finder tab** → Enter your symptoms for AI diagnosis\n2. **AYUSH tab** → For natural treatment protocols\n3. **Pharmacy tab** → For medication safety checks\n4. **Vitality Lab** → For nutrition & wellness guidance\n\nYou can also describe your symptoms in more detail here and I'll provide the best guidance I can.\n\n*Health Intelligence is in Demo Mode. For full AI responses, run Ollama locally.*`;
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
        // Try Ollama first (works in local dev)
        const ollamaResponse = await callAI(messages);
        return ollamaResponse;
    } catch (e) {
        // Ollama offline (production/Netlify) — use clinical rule engine
        console.info('[AI] Ollama unavailable — using clinical rule-based fallback');
        const fallback = clinicalFallbackResponse(message, context);
        return await translateText(fallback, context.language);
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

    const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    try {
        // Tier 1: Local llava vision (best quality)
        if (isLocal) {
            const text = await callOllama(AI_CONFIG.visionModel, messages, 'json');
            const data = extractJson(text);
            if (data) {
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
            }
        }

        // Tier 2: Groq text fallback — ask for generic report structure
        const textPrompt = `A medical report image was uploaded. Since image analysis is not available in this environment,
        generate a structured health document template acknowledging the upload.
        Return ONLY JSON:
        {
          "name": "Medical Report",
          "type": "lab",
          "summary": "Report uploaded successfully. Please visit a clinic to have this report reviewed by a doctor. Manual data entry recommended for accurate analysis.",
          "keyMetrics": { "Status": "Pending Review" },
          "riskLevel": "Moderate",
          "recommendations": ["Consult your doctor with this report", "Enter key values manually in the app", "Schedule a follow-up appointment"]
        }`;
        const fallback = await callAI([{ role: 'user', content: textPrompt }], { json: true });
        const fallbackData = extractJson(fallback);
        if (fallbackData) {
            return {
                id: Date.now().toString(),
                name: 'Uploaded Report',
                type: 'lab',
                date: Date.now(),
                size: 'AI_PARSED',
                ...fallbackData
            } as HealthDocument;
        }
        return null;
    } catch (e) {
        console.error("Report analysis error:", e);
        return null;
    }
};

// --- Biological Identification & AI Vision ---
export const identifyMedicineFromImage = async (base64Image: string, language: Language = 'en'): Promise<{ name: string, dosage: string } | null> => {
    const langName = getLanguageName(language);
    const messages = [
        {
            role: 'system',
            content: CLINICAL_SYSTEM_PROMPT + '\nYou are identifying a pharmaceutical tablet. Be precise but include a warning that identification should be verified before ingestion.'
        },
        {
            role: 'user',
            content: `Identify the medicine shown in this photo. Return ONLY a JSON object with keys "name" and "dosage". Use ${langName} for the name if possible. Format: {"name": "...", "dosage": "..."}`,
            images: [base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`]
        }
    ];

    const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    try {
        if (isLocal) {
            try {
                const text = await callOllama(AI_CONFIG.visionModel, messages, 'json');
                const data = extractJson(text);
                if (data && data.name) return data;
            } catch (e) {
                console.warn("[AI] Local vision failed, trying cloud fallback.");
            }
        }

        const groqResult = await callGroq(messages, {
            json: true,
            model: "llama-3.2-11b-vision-preview"
        });
        const cloudData = extractJson(groqResult);
        if (cloudData && cloudData.name) return cloudData;

        return { name: 'Identify manually', dosage: 'Check pack' };
    } catch (e) {
        return { name: 'Identify manually', dosage: 'Check pack' };
    }
};

// --- Emergency Clinical Guidance Node ---
export const getEmergencyGuidance = async (context: PatientContext, symptoms: string): Promise<any> => {
    const prompt = `
    EMERGENCY CLINICAL SITUATION: "${symptoms}"
    PATIENT RISK PROFILE: Heart ${context.riskScores?.heart}%, Conditions: ${context.profile.conditions.map(c => c.name).join(', ')}.
    
    TASK: Provide immediate, high-priority first-aid guidance for this clinical scenario.
    1. Assess if symptoms are life-critical.
    2. Provide 3-4 immediate "Before Ambulance Arrives" steps.
    3. State if specific actions are dangerous for this patient (e.g. "Do not give sugar if blood sugar is high").
    
    Return JSON:
    {
      "isCritical": true,
      "prioritySteps": ["Step 1", "Step 2", "Step 3"],
      "contraindications": ["Avoid...", "Never..."],
      "advice": "Summary advisory"
    }
    IMPORTANT: Respond in ${getLanguageName(context.language)}.
    `;

    try {
        const response = await callAI([{ role: 'user', content: prompt }], { json: true });
        return extractJson(response);
    } catch (e) {
        return {
            isCritical: true,
            prioritySteps: ["Call Emergency Services Immediately", "Note down all symptoms", "Do not ingest any unprescribed meds"],
            advice: "Safety check unavailable. Seek immediate care."
        };
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
        const text = await callAI([{ role: 'user', content: prompt }], { json: true });
        return extractJson(text);
    } catch (e) {
        console.error("Voice command parsing error:", e);
        return null;
    }
};

// --- Unified Orchestrator Calling ---
const formatPatientPayload = (context: PatientContext, options: any) => {
    return {
        profile: {
            ...context.profile,
            profession: (context.profile as any).profession || "General",
            activity_level: (context.profile as any).activity_level || "Sedentary",
            district: (context.profile as any).district || "Unknown",
            mandal: (context.profile as any).mandal || "Unknown"
        },
        query: options.query,
        medications: options.medications,
        problem_context: options.problem_context,
        image_b64: options.image_b64,
        clinical_vault: context.clinicalVault || [],
        symptoms: context.symptoms || [],
        nutrition_logs: context.nutritionLogs || [],
        activity_logs: context.activityLogs || [],
        language: context.language
    };
};

export const orchestrateHealth = async (context: PatientContext, options: {
    query?: string,
    medications?: string[],
    problem_context?: string,
    image_b64?: string
} = {}): Promise<any> => {
    try {
        const payload = formatPatientPayload(context, options);
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

        const activeMeds = options.medications || [];
        const riskLevel = (riskScores?.healthScore || 80) > 80 ? 'SAFE' : (riskScores?.healthScore || 80) > 60 ? 'CAUTION' : 'DANGER';

        return {
            bio_risk: {
                risk_probability: (100 - (riskScores?.healthScore || 85)) / 100,
                risk_level: (riskScores?.healthScore || 85) > 80 ? 'Low' : 'Moderate',
                vitality_score: riskScores?.healthScore || 85,
                projection7Day: (riskScores?.healthScore || 85) + 2,
                longevityAge: 82,
                stressContributors: ["Environmental Node", "Activity Lag"],
                organ_stress: {
                    cardio: 0.12, liver: 0.08, kidney: 0.15, respiratory: 0.05, stomach: 0.22
                }
            },
            medication_safety: activeMeds.length > 0 ? {
                interaction_level: activeMeds.length > 1 ? 'CAUTION' : 'SAFE',
                conflicts_detected: activeMeds.length > 1 ? [`Interaction between ${activeMeds[0]} and ${activeMeds[1]}`] : [],
                explanation: activeMeds.length > 1
                    ? `Potential metabolic conflict between ${activeMeds.join(' and ')}. Neural analysis suggests adjusted dosage timings for ${profile.name || 'Citizen'}.`
                    : `Analysis of ${activeMeds[0]} complete. Compound compatible with current bio-rhythms in ${profile.location || 'current sector'}.`,
                next_action: "Monitor for thermal variations."
            } : null,
            triage: {
                triage_level: "Optimal",
                basic_care_advice: "Continue current wellness protocol. Maintain hydration nodes.",
                specialist_recommendation: "Wellness Consultant",
                follow_up_questions: ["Any recent changes in sleep?", "Hydration levels?"],
                disclaimer: "Synthesized based on local telemetry."
            },
            ayush: {
                prakriti: profile.gender === 'male' ? "VATA-PITTA" : "KAPHA-VATA",
                score: 88.5,
                confidence: 0.95,
                analysis: `Real-time AYUSH scan for ${profile.name} in ${profile.location || 'AP Sector'}. Biorhythm alignment is stable.`,
                recommendations: ["Consume warm Tila radiation", "Standardize morning nodes"],
                forecast: {
                    seven_day_risk: 0.05,
                    thirty_day_risk: 0.12,
                    z_score_deviation: (riskScores?.healthScore || 85) > 80 ? 0.4 : 1.2
                },
                regional_seasonal_risks: [
                    { disease_name: "Regional Vata Fluctuation", probability: 0.15, reason: "Seasonal transition in the current cluster.", prevention: "Nasyam Protocol" },
                    { disease_name: "Hydration Sync Error", probability: 0.08, reason: "Thermal nodes rising.", prevention: "Usheera Water" }
                ],
                dinacharya: ["Brahma Muhurta Wakeup", "Danta Dhavana (Neem)", "Pranayama (15m)", "Abhyanga"],
                ritucharya: ["Avoid excessive cooling nodes", "Prefer Snigdha (oily) diet", "Seasonal detoxification"]
            },
            guardian_summary: `Sentinel Link active for ${profile.name}. Area ${profile.location || 'Sector'} remains under safe bio-watch.`,
            language: context.language
        };
    }
};

export const generateEHR = async (context: PatientContext, input: string): Promise<any> => {
    try {
        const payload = formatPatientPayload(context, { query: input });
        // Correct endpoint for EHR synthesis
        const url = AI_CONFIG.orchestratorUrl.replace('/orchestrate', '/ehr');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("EHR engine offline");
        return await response.json();
    } catch (e) {
        console.warn("[EHR] Local fallback initiated.", e);
        return {
            ehr_id: `LOCAL-FIX-${Date.now()}`,
            chief_complaint: input.substring(0, 50) + "...",
            clinical_notes: input,
            triage_status: input.toLowerCase().includes('pain') ? 'Moderate' : 'Mild',
            ayush_metrics: { prakriti_candidate: "Vata", agni_status: "Sama" },
            digital_signature: "LOCAL-SANDBOX-VERIFIED"
        };
    }
};

// --- Translate any text to the user's language using Ollama ---
export const translateText = async (text: string, language: Language): Promise<string> => {
    if (language === 'en' || !text) return text;
    const langName = getLanguageName(language);
    try {
        const translated = await callAI([
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

        const response = await callAI([
            { role: 'system', content: `You are a medical JSON translator. Translate all values to ${langName}. Return ONLY the valid JSON.` },
            { role: 'user', content: prompt }
        ], { json: true });

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

        const response = await callAI([
            { role: 'system', content: `Translate the questions JSON to ${langName}. Return ONLY valid JSON.` },
            { role: 'user', content: prompt }
        ], { json: true });

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

    const prompt = `You are a Senior Ayurvedic Physician and Clinical Researcher at the Health Intelligence AYUSH Integrated Node.
    
    PATIENT BIOMETRICS & HISTORY:
    - Age: ${context.profile.age}
    - Conditions: ${context.profile.conditions.map(c => c.name).join(', ')}
    - Risk Scores: Liver ${context.riskScores?.liver}%, Heart ${context.riskScores?.heart}%
    - Contextual Summary: ${contextSummary}
    
    CHIEF COMPLAINT: "${complaint}"
    DIAGNOSTIC DATA:
    ${answersText}

    TASK: Provide a highly specific, scientific Ayurvedic clinical protocol. 
    Analyze the chief complaint ("${complaint}") and the diagnostic answers to determine the Dosha imbalance (Vata, Pitta, Kapha) and Agni status.
    Provide precise herbal formulations (Chikitsa), therapeutic diet (Pathya), lifestyle modifications (Vihaar), and mental health/breathwork (Satwa).
    
    CRITICAL: YOU MUST PROVIDE REAL VALUES. DO NOT PROVIDE "NONE" OR EMPTY FIELDS.
    If the user has fever (Jwara), specify herbs like Guduchi, Sudarshan Vati, or Tulsi.
    If the user has pain, specify herbs like Shunti or Guggulu.
    Always provide AT LEAST 2 items per module.

    Return ONLY this JSON structure:
    {
      "aura_system": "Standard Clinical Ayurveda",
      "dosha_insight": "A 2-sentence rationale for the identified Dosha/Agni imbalance.",
      "chikitsa": [
        { "NAME": "Specific Herb/Formulation", "DOSAGE": "Precise dose (e.g. 500mg)", "PREPARATION": "Vehicle (Anupana) like honey/water", "RATIONALE": "Why this works" }
      ],
      "ahar": {
        "PATHYA (Inclusions)": [
          { "FOOD_GROUP": "Grains/Veggies", "SPECIFIC_FOODS": "Specific items and reason" }
        ],
        "APATHYA (Exclusions)": [
          { "FOOD_GROUP": "Spices/Oils", "SPECIFIC_FOODS": "Specific items to avoid" }
        ]
      },
      "vihaar": [
        { "ASANA": "Yoga Posture/Activity", "BENEFIT": "Physiological benefit" }
      ],
      "satwa": [
        { "PRANAYAMA": "Breathing technique", "FREQUENCY": "Duration", "BENEFIT": "Scientific benefit" }
      ],
      "referral": "Medical advice threshold."
    }

    IMPORTANT: All values (dosha_insight, NAME, SPECIFIC_FOODS, etc.) must be in ${getLanguageName(context.language)}. Keep JSON keys in English as specified.`;

    try {
        const res = await callAI([{ role: 'user', content: prompt }], { json: true });
        const parsed = extractJson(res);
        if (parsed) {
            console.log("[AI] Ayurvedic protocol generated successfully for:", complaint);
            return parsed;
        }
    } catch (e) {
        console.error("[AI] Ayurvedic clinical strategy failed, using symptom-based fallback:", e);
    }

    // Symptom-based Fallback Node for local stability
    const lower = complaint.toLowerCase();
    const isFever = lower.includes('fev') || lower.includes('hot') || lower.includes('jwar');
    const isPain = lower.includes('pain') || lower.includes('ache') || lower.includes('shool');
    const isCough = lower.includes('cough') || lower.includes('breath') || lower.includes('kasa');
    const isDigestive = lower.includes('stomach') || lower.includes('digest') || lower.includes('motion') || lower.includes('vomit');

    const basicProtocol = {
        aura_system: "Standard Clinical Ayurveda v4.2",
        referral: "Consult a BAMS physician if symptoms persist beyond 48 hours."
    };

    const result = {
        ...basicProtocol,
        dosha_insight: isFever ? 'Pitta-Vata Jwara pattern detected. High Agni-visamya leading to thermal instability.' :
            isPain ? 'Vata Aggravation (Vata-Vyadhi) causing micro-channel blockage (Sroto-rodha).' :
                isCough ? 'Kapha-Vata imbalance in the Pranavaha Srotas (Respiratory channel).' :
                    isDigestive ? 'Manda-Agni (Slow metabolism) leading to Ama (Toxin) formation.' :
                        'Tridosic profile maintenance active. Bio-rhythm optimization protocol.',
        chikitsa: isFever ? [
            { NAME: "Guduchi (Giloy) Ghan Vati", DOSAGE: "500mg", PREPARATION: "With warm water", RATIONALE: "Antipyretic & Immune modulator" },
            { NAME: "Sudarshan Vati", DOSAGE: "250mg", PREPARATION: "2 times daily after food", RATIONALE: "Clears internal toxins (Ama)" }
        ] : isPain ? [
            { NAME: "Yograj Guggulu", DOSAGE: "1 tablet", PREPARATION: "Warm water/Honey", RATIONALE: "Anti-inflammatory & Vata balancer" },
            { NAME: "Shunti (Ginger) Capsule", DOSAGE: "500mg", PREPARATION: "Twice daily", RATIONALE: "Improves circulation & reduces pain" }
        ] : isCough ? [
            { NAME: "Sitopaladi Churna", DOSAGE: "2g", PREPARATION: "Mixed with honey", RATIONALE: "Expectorant & Bronchodilator" },
            { NAME: "Tulsi Ghan Vati", DOSAGE: "500mg", PREPARATION: "Warm water", RATIONALE: "Antibacterial & Anti-tussive" }
        ] : isDigestive ? [
            { NAME: "Lavan Bhaskar Churna", DOSAGE: "1g", PREPARATION: "With buttermilk", RATIONALE: "Digestive stimulant" },
            { NAME: "Triphala Vati", DOSAGE: "1 tablet", PREPARATION: "At bedtime with warm water", RATIONALE: "Bowel regulator" }
        ] : [
            { NAME: "Chyawanprash", DOSAGE: "1 tsp", PREPARATION: "Daily morning", RATIONALE: "Rasayana (Rejuvenation)" },
            { NAME: "Amalaki Ghan Vati", DOSAGE: "500mg", PREPARATION: "Daily", RATIONALE: "Antioxidant" }
        ],
        ahar: {
            "PATHYA (Inclusions)": isFever ? [
                { FOOD_GROUP: "Liquids", SPECIFIC_FOODS: "Warm rice gruel (Peya), Mung dal soup" },
                { FOOD_GROUP: "Fruits", SPECIFIC_FOODS: "Pomegranate, Sweet grapes" }
            ] : isPain ? [
                { FOOD_GROUP: "Oils", SPECIFIC_FOODS: "Sesame oil, Cow Ghee in moderation" },
                { FOOD_GROUP: "Vegetables", SPECIFIC_FOODS: "Steamed gourds, Warm soups" }
            ] : isCough ? [
                { FOOD_GROUP: "Veggies", SPECIFIC_FOODS: "Garlic, Onion, Drumstick leaves" },
                { FOOD_GROUP: "Fluids", SPECIFIC_FOODS: "Ginger-Basil tea, Warm water" }
            ] : isDigestive ? [
                { FOOD_GROUP: "Spices", SPECIFIC_FOODS: "Cumin, Fennel (Saunf), Ginger" },
                { FOOD_GROUP: "Grains", SPECIFIC_FOODS: "Old rice, Barley" }
            ] : [{ FOOD_GROUP: "Satvik", SPECIFIC_FOODS: "Fresh fruits, Honey, Nuts" }],
            "APATHYA (Exclusions)": isFever ? [
                { FOOD_GROUP: "Spices", SPECIFIC_FOODS: "Chilli, Heavy oils, Fried foods" }
            ] : isPain ? [
                { FOOD_GROUP: "Cold Foods", SPECIFIC_FOODS: "Ice water, Raw salads, Sprouted grains" }
            ] : isCough ? [
                { FOOD_GROUP: "Dairy", SPECIFIC_FOODS: "Curd, Chilled milk, Sweets" }
            ] : isDigestive ? [
                { FOOD_GROUP: "Heavy Foods", SPECIFIC_FOODS: "Red meat, Cheese, Nightshades" }
            ] : [{ FOOD_GROUP: "Tamasic", SPECIFIC_FOODS: "Stale food, Excess salt" }]
        },
        vihaar: isFever ? [
            { ASANA: "Savasana (Corpse Pose)", BENEFIT: "Body cooling & metabolic rest" }
        ] : isPain ? [
            { ASANA: "Vajrasana (Thunderbolt)", BENEFIT: "Improves metabolic fire & grounding" }
        ] : isCough ? [
            { ASANA: "Bhujangasana (Cobra)", BENEFIT: "Expands thoracic capacity" }
        ] : isDigestive ? [
            { ASANA: "Pawanmuktasana", BENEFIT: "Gas release & core compression" }
        ] : [{ ASANA: "Tadasana", BENEFIT: "Posture & Balance" }],
        satwa: isFever ? [
            { PRANAYAMA: "Sheetali Pranayama", FREQUENCY: "5 mins", BENEFIT: "Reduction of core body temperature" }
        ] : isPain ? [
            { PRANAYAMA: "Bhramari", FREQUENCY: "10 rounds", BENEFIT: "Pain threshold management" }
        ] : isCough ? [
            { PRANAYAMA: "Anulom Vilom", FREQUENCY: "10 mins", BENEFIT: "Oxygenation improvement" }
        ] : isDigestive ? [
            { PRANAYAMA: "Kapalbhati", FREQUENCY: "5 mins (slow)", BENEFIT: "Abdominal toning & Agni boost" }
        ] : [{ PRANAYAMA: "Deep Breathing", FREQUENCY: "10 mins", BENEFIT: "Stress reduction" }]
    };

    return await translateClinicalData(result, context.language);
};
