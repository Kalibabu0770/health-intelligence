
import { SmartBeltTelemetry, RiskAnalysisResult, AIAnalysisReport, RiskForecast } from '../types';
import { DailyHealthReport } from '../types';
import { getThresholds } from '../services/healthDataService';

const AI_SERVER_URL = 'http://localhost:5001/ai';

export interface EnhancedRiskResult extends RiskAnalysisResult {
    riskType: 'cardiac' | 'seizure' | 'general' | 'normal';
    confidence: number;
    pre_heartstroke_risk?: number;  // Heatstroke prediction percentage
    pre_fits_risk?: number;          // Seizure/fits prediction percentage
}

export class InferenceEngine {
    private static SEIZURE_DURATION_MS = 3000;

    // State for temporal analysis
    private static seizureStartTime: number | null = null;

    public static analyzeStream(data: SmartBeltTelemetry): EnhancedRiskResult {
        const config = getThresholds();
        const risks: string[] = [];
        let status: 'safe' | 'warning' | 'critical' = 'safe';
        let score = 0;
        let riskType: EnhancedRiskResult['riskType'] = 'normal';

        // 1. Wearing Status Check (Rule 0)
        if (!data.wearing_status) {
            return {
                status: 'safe',
                risks: ['Device Not Worn'],
                score: 0,
                riskType: 'normal',
                confidence: 100,
                timestamp: new Date().toISOString()
            };
        }

        // 2. Motion Analysis - Check status from Motion Analyzer
        // motionAnalyzer.ts sets status to 'critical' when seizure detected
        if (data.status === 'critical' && data.activity_index > 2.0) {
            console.log('[INFERENCE] SEIZURE ALERT TRIGGERED!', { status: data.status, activity: data.activity_index });
            risks.push("CRITICAL: SEIZURE ACTIVITY DETECTED");
            status = 'critical';
            riskType = 'seizure';
            score = 95;
        } else if (data.status === 'warning' || data.activity_index > 1.5) {
            risks.push("High Motion Activity Detected");
            status = 'warning';
            score = Math.max(score, 40);
        }

        // 3. Cardiac Analysis
        if (data.bpm > config.heartRateRange.max) {
            risks.push(`Tachycardia: ${data.bpm} BPM`);
            status = 'critical';
            riskType = 'cardiac';
            score = Math.max(score, 85);
        } else if (data.bpm < config.heartRateRange.min && data.bpm > 0) {
            risks.push(`Bradycardia: ${data.bpm} BPM`);
            status = 'critical';
            riskType = 'cardiac';
            score = Math.max(score, 85);
        }

        // 4. Oxygen Analysis
        if (data.spo2 < config.spo2Min && data.spo2 > 0) {
            risks.push(`Low SpO2: ${data.spo2}%`);
            status = 'critical';
            riskType = 'cardiac';
            score = Math.max(score, 90);
        }

        // 5. Thermal Analysis
        if (data.temperature > config.tempRange.max) {
            risks.push(`Fever: ${data.temperature.toFixed(1)}°C`);
            if (status !== 'critical') status = 'warning';
            score = Math.max(score, 60);
        }

        // 6. Unconsciousness Detection (Strict gating)
        // Only trigger if virtually no motion (near 1.0G baseline) AND another critical vital is failing
        const isDeadStill = Math.abs(data.activity_index - 1.0) < 0.05;
        if (isDeadStill && data.wearing_status && status === 'critical') {
            risks.push("Suspected Unconsciousness (No Movement)");
            score = Math.max(score, 99);
        }

        // 7. Calculate Pre-Heatstroke Risk
        let heatstrokeRisk = 0;
        if (data.temperature > 37.5) heatstrokeRisk += 20;
        if (data.temperature > 38.0) heatstrokeRisk += 30;
        if (data.temperature > 39.0) heatstrokeRisk += 40;
        if (data.bpm > 100) heatstrokeRisk += 15;  // Elevated HR with high temp
        if (data.spo2 < 95) heatstrokeRisk += 10;  // Low oxygen with high temp

        // 8. Calculate Pre-Seizure (Fits) Risk
        let seizureRisk = 0;
        if (data.activity_index > 2.0) seizureRisk += 50;
        if (data.activity_index > 3.0) seizureRisk += 30;
        if (data.status === 'critical') seizureRisk += 15;
        if (data.temperature > 38.5) seizureRisk += 10;  // Fever can trigger seizures

        return {
            status,
            risks,
            score,
            riskType,
            confidence: score > 80 ? 95 : 60,
            timestamp: new Date().toISOString(),
            pre_heartstroke_risk: Math.min(heatstrokeRisk, 99),
            pre_fits_risk: Math.min(seizureRisk, 99)
        };
    }

    // New Async Local AI Integration
    public static async analyzeWithAI(data: SmartBeltTelemetry, patientProfile?: string): Promise<{
        status: 'safe' | 'warning' | 'critical';
        risks: string[];
        score: number;
        confidence: number;
        reasoning: string;
        recommendations?: string[];
    }> {
        try {
            const response = await fetch(`${AI_SERVER_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bpm: data.bpm,
                    spo2: data.spo2,
                    temp: data.temperature,
                    activity: data.activity_index,
                    wearing: data.wearing_status,
                    profile: patientProfile
                })
            });
            if (!response.ok) throw new Error('AI Server offline');
            return await response.json();
        } catch (error) {
            console.warn('Local AI analysis failed, falling back to rule-engine:', error);
            const ruleResult = this.analyzeStream(data);
            return {
                status: ruleResult.status,
                risks: ruleResult.risks,
                score: ruleResult.score,
                reasoning: "Clinical rule-engine fallback (Local AI Offline)",
                confidence: ruleResult.confidence,
                recommendations: ruleResult.status === 'safe' ? ["Continue routine monitoring"] : ["Immediate clinical evaluation required"]
            };
        }
    }

    public static generateFullReport(current: SmartBeltTelemetry, history: DailyHealthReport[]): AIAnalysisReport {
        const liveAnalysis = this.analyzeStream(current);

        const report: AIAnalysisReport = {
            timestamp: new Date().toISOString(),
            riskScore: liveAnalysis.score,
            anomalies: [...liveAnalysis.risks],
            trends: [],
            recommendation: liveAnalysis.status === 'safe'
                ? "Continue standard monitoring."
                : liveAnalysis.status === 'warning'
                    ? "Check patient condition."
                    : "IMMEDIATE INTERVENTION REQUIRED."
        };

        report.forecast = this.generateRiskForecast(current, history);
        return report;
    }

    private static generateRiskForecast(current: SmartBeltTelemetry, history: DailyHealthReport[]): RiskForecast {
        let cardiacRisk = 10;
        let seizureRisk = 5;
        let strokeRisk = 8;
        let oxygenRisk = 5;

        // 1. Cardiac Risk Calculation
        if (current.bpm > 100) cardiacRisk += 40;
        if (current.bpm > 120) cardiacRisk += 20;
        if (current.spo2 < 92) cardiacRisk += 30;

        // 2. Seizure Risk Calculation (Fits)
        if (current.activity_index > 2.0) seizureRisk += 70;
        if (current.status === 'critical') seizureRisk += 10;

        // 3. Stroke Risk Calculation (Heartstroke)
        // High BP + Irregular HR + Temp + History
        if (current.bpm > 110) strokeRisk += 25;
        if (current.temperature > 38.0) strokeRisk += 15;
        if (current.spo2 < 94) strokeRisk += 10;
        // Age and History factors would be added here if patient profile was available

        // 4. Oxygen Crash Risk
        if (current.spo2 < 95) oxygenRisk += 30;
        if (current.spo2 < 92) oxygenRisk += 40;

        const factors: string[] = [];

        // Risk Factor Generation
        if (cardiacRisk > 50) factors.push("Unstable Vitals Detected");
        else factors.push("Baseline within limits");

        if (current.spo2 > 95) factors.push("Optimal Oxygen Recovery");
        else if (current.spo2 < 92) factors.push("Critical Hypoxia Risk");

        if (current.bpm >= 60 && current.bpm <= 100) factors.push("Stable Cardiac Rhythm");
        else if (current.bpm > 120) factors.push("Severe Tachycardia");

        if (current.temperature > 37.5) factors.push("Elevated Thermal Trend");
        if (current.activity_index > 2.0) factors.push("High Jerk Motion Detected");

        if (strokeRisk > 40) factors.push("Potential Cardiovascular Event Risk");

        return {
            horizon: "Next 24 Hours",
            cardiacRisk: Math.min(cardiacRisk, 99),
            seizureRisk: Math.min(seizureRisk, 99),
            strokeRisk: Math.min(strokeRisk, 99),
            oxygenRisk: Math.min(oxygenRisk, 99),
            factors: factors
        };
    }
}
