/**
 * Risk Predictor
 * Responsibility: Forecast risk based on trends.
 */

export interface RiskAssessment {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    contributingFactors: string[];
}

export const predictRisk = (
    bpmHistory: number[],
    spo2History: number[],
    seizureEvents: number
): RiskAssessment => {
    const factors: string[] = [];
    let score = 0;

    // 1. HR Trend
    if (bpmHistory.length > 5) {
        // Check for sudden spikes
        const recent = bpmHistory.slice(-5);
        const avgRaw = recent.reduce((a, b) => a + b, 0) / recent.length;
        if (avgRaw > 120) {
            score += 2;
            factors.push('Sustained Tachycardia');
        }
    }

    // 2. SpO2 Trend
    if (spo2History.length > 5) {
        const recentSpo2 = spo2History[spo2History.length - 1];
        if (recentSpo2 < 90) {
            score += 3;
            factors.push('Hypoxia Detected');
        }
    }

    // 3. Seizure Activity
    if (seizureEvents > 0) {
        score += 5;
        factors.push('Seizure Motion Pattern');
    }

    // Logic
    if (score >= 5) return { riskLevel: 'HIGH', contributingFactors: factors };
    if (score >= 2) return { riskLevel: 'MEDIUM', contributingFactors: factors };
    return { riskLevel: 'LOW', contributingFactors: [] };
};
