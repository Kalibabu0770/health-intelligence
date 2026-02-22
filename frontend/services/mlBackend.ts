/**
 * ML Backend Service — Health Intelligence AI
 * Connects to deployed FastAPI backend on Render
 * 
 * Backend: https://lifeshield-backend.onrender.com
 * Endpoints: POST /predict, GET /health
 */

// ============================================================
// CONFIGURATION
// ============================================================

const ML_API_BASE = 'https://health-intelligence-backend.onrender.com';
const PREDICT_URL = `${ML_API_BASE}/predict`;
const HEALTH_URL = `${ML_API_BASE}/health`;


// ============================================================
// TYPES
// ============================================================

/** Request payload — matches backend's HealthFeatures Pydantic model */
export interface MLFeatures {
    age: number;
    gender: number;       // 1 = Male, 0 = Female
    bmi: number;
    genhlth: number;      // 1 (Excellent) to 5 (Poor)
    smoker: number;       // 0 = No, 1 = Yes
    income: number;       // default: 50000
    physhlth: number;     // default: 0
    menthlth: number;     // default: 0
}

/** Response from /predict — matches backend's PredictionResponse */
export interface MLPredictionResponse {
    risk_probability: number;
    risk_level: 'Low' | 'Moderate' | 'High';
    confidence: number;
    vitality_score: number;
    recommendation: string;
}

/** Health check response from /health */
export interface MLHealthResponse {
    status: string;
    artifacts_loaded: boolean;
}

/** Standardized error wrapper */
export interface MLError {
    message: string;
    status?: number;
    detail?: string;
}

// ============================================================
// HELPER: Profile → Features Mapper
// ============================================================

/**
 * Maps a UserProfile to the ML backend's expected feature format.
 * Derives BMI from weight & age (approximate), maps gender/smoker to numeric.
 */
export const mapProfileToFeatures = (profile: {
    age: number;
    gender: string;
    weight: number;
    smoking: boolean;
    hasHeartDisease?: boolean;
    hasDiabetes?: boolean;
    hasHighBP?: boolean;
    conditions?: { name: string }[];
}): MLFeatures => {
    // Approximate BMI: weight(kg) / height(m)². 
    // Since we don't have height, estimate using WHO average height by gender
    const avgHeight = profile.gender === 'female' ? 1.58 : 1.70; // meters
    const bmi = profile.weight > 0
        ? Math.round((profile.weight / (avgHeight * avgHeight)) * 10) / 10
        : 22.0; // default healthy BMI

    // General health rating: 1=Excellent, 5=Poor
    // Derive from number of conditions
    const conditionCount = (profile.conditions?.length || 0)
        + (profile.hasHeartDisease ? 1 : 0)
        + (profile.hasDiabetes ? 1 : 0)
        + (profile.hasHighBP ? 1 : 0);

    let genhlth = 1; // Excellent by default
    if (conditionCount >= 4) genhlth = 5;
    else if (conditionCount >= 3) genhlth = 4;
    else if (conditionCount >= 2) genhlth = 3;
    else if (conditionCount >= 1) genhlth = 2;

    return {
        age: Math.max(1, Math.min(120, profile.age || 30)),
        gender: profile.gender === 'female' ? 0 : 1,
        bmi: Math.max(10, Math.min(60, bmi)),
        genhlth,
        smoker: profile.smoking ? 1 : 0,
        income: 50000,    // default — not collected in frontend
        physhlth: 0,      // default — not collected in frontend
        menthlth: 0,      // default — not collected in frontend
    };
};

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Check if the ML backend is online and healthy
 */
export const checkMLHealth = async (): Promise<{ online: boolean; artifactsLoaded: boolean }> => {
    try {
        console.log('[ML] Checking backend health...');
        const response = await fetch(HEALTH_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            console.warn('[ML] Health check returned non-OK:', response.status);
            return { online: false, artifactsLoaded: false };
        }

        const data: MLHealthResponse = await response.json();
        console.log('[ML] Health check OK:', data);
        return {
            online: true,
            artifactsLoaded: data.artifacts_loaded,
        };
    } catch (err) {
        console.error('[ML] Health check failed:', err);
        return { online: false, artifactsLoaded: false };
    }
};

/**
 * Send health features to the ML backend and get a risk prediction.
 * 
 * @param features - The health features matching backend schema
 * @returns Prediction response or throws MLError
 */
export const predictHealthRisk = async (features: MLFeatures): Promise<MLPredictionResponse> => {
    // Validate required fields before sending
    if (!features.age || features.age <= 0) {
        throw { message: 'Age is required and must be positive', status: 400 } as MLError;
    }
    if (features.bmi <= 0) {
        throw { message: 'BMI must be positive', status: 400 } as MLError;
    }

    // Build the request payload — backend expects { features: {...} }
    const payload = {
        features: {
            age: Number(features.age),
            gender: Number(features.gender),
            bmi: Number(features.bmi),
            genhlth: Number(features.genhlth),
            smoker: Number(features.smoker),
            income: Number(features.income),
            physhlth: Number(features.physhlth),
            menthlth: Number(features.menthlth),
        },
    };

    console.log('[ML] Sending prediction request:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(PREDICT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Handle HTTP errors
        if (!response.ok) {
            let errorDetail = `HTTP ${response.status}`;
            try {
                const errorBody = await response.json();
                errorDetail = errorBody.detail || errorDetail;
            } catch {
                // Could not parse error body, use status text
                errorDetail = response.statusText || errorDetail;
            }

            console.error('[ML] Prediction API error:', errorDetail);
            throw {
                message: `Prediction failed: ${errorDetail}`,
                status: response.status,
                detail: errorDetail,
            } as MLError;
        }

        // Parse response
        const data: MLPredictionResponse = await response.json();

        // Validate response structure
        if (
            typeof data.risk_probability !== 'number' ||
            typeof data.risk_level !== 'string' ||
            typeof data.confidence !== 'number' ||
            typeof data.vitality_score !== 'number'
        ) {
            console.error('[ML] Invalid response structure:', data);
            throw { message: 'Invalid response from ML backend', status: 500 } as MLError;
        }

        console.log('[ML] Prediction received:', {
            risk_level: data.risk_level,
            risk_probability: data.risk_probability,
            vitality_score: data.vitality_score,
            confidence: data.confidence,
        });

        return data;
    } catch (err: any) {
        // Re-throw MLError as-is
        if (err.status) throw err;

        // Network / CORS / other error
        console.error('[ML] Network error:', err);
        throw {
            message: 'Could not connect to ML backend. The server may be starting up (cold start takes ~30s on free tier).',
            detail: err.message,
        } as MLError;
    }
};
