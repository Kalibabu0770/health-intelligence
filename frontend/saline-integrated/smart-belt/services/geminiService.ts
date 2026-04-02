import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GeminiHealthAnalysis {
    pre_heartstroke_risk: number;
    pre_fits_risk: number;
    reasoning: string;
    recommendations: string[];
    arrhythmia_analysis?: string;
    sleep_apnea_analysis?: string;
    respiratory_status?: string;
    posture_trend?: string;
}

export class GeminiService {
    public static async analyzeHealthData(
        vitals: any,
        patientProfile: any,
        recentHistory: any[]
    ): Promise<GeminiHealthAnalysis> {
        if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
            console.warn("Gemini API Key is missing or placeholder. Skipping AI analysis.");
            return this.getFallbackAnalysis();
        }

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

            const prompt = `
                Analyze the following real-time health data for a patient.
                Patient Profile: ${JSON.stringify(patientProfile)}
                Current Vitals: ${JSON.stringify(vitals)}
                Recent History (Anomalies): ${JSON.stringify(recentHistory)}

                Provide a comprehensive clinical analysis focusing on:
                1. "Pre-Heartstroke" detection: High BP correlations, irregular HR, thermal trends.
                2. "Pre-Fits/Seizure": Rapid oscillation patterns in motion + HR instability.
                3. "Arrhythmia Analysis": Identify potential AFib, PVCs, or V-Tach patterns in ECG and BPM history.
                4. "Sleep Apnea Risk": Analyze SpO2 patterns and respiration stability (if trends suggest sleep).
                5. "Respiratory & Posture": Correlate posture (lying down) with breathing regularity.

                Return the result STRICTLY as a JSON object with this structure:
                {
                    "pre_heartstroke_risk": number (0-100),
                    "pre_fits_risk": number (0-100),
                    "reasoning": "brief clinical reasoning",
                    "recommendations": ["list of strings"],
                    "arrhythmia_analysis": "clinical findings or 'Normal'",
                    "sleep_apnea_analysis": "findings or 'Low Risk'",
                    "respiratory_status": "e.g. 'Stable', 'Labored'",
                    "posture_trend": "e.g. 'Supine - Stable'"
                }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from the response text (in case there's markdown formatting)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error("Failed to parse Gemini response");
        } catch (error) {
            console.error("Gemini Analysis Error:", error);
            return this.getFallbackAnalysis();
        }
    }

    private static getFallbackAnalysis(): GeminiHealthAnalysis {
        return {
            pre_heartstroke_risk: 0,
            pre_fits_risk: 0,
            reasoning: "AI analysis unavailable (Fallback mode active)",
            recommendations: ["Ensure stable network connection", "Verify API key configuration"]
        };
    }
}
