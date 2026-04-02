/**
 * Alert Decision Engine
 * Responsibility: Gating alerts to prevent false positives.
 */

import { RiskAssessment } from "./riskPredictor";

export const decideAlert = (
    risk: RiskAssessment,
    motionStatus: string,
    biometricStatus: string
): { shouldAlert: boolean; message: string; priority: 'info' | 'warning' | 'critical' } => {

    // GATE 1: Seizure
    // Must have High Intensity Motion AND High Risk Score (or specific pattern)
    if (motionStatus === 'seizure_risk') {
        // We trust the motion detector's 6g threshold for now, but in real life
        // we'd check duration.
        return {
            shouldAlert: true,
            message: 'SEIZURE DETECTED: High-G Motion',
            priority: 'critical'
        };
    }

    // GATE 2: Vitals
    if (risk.riskLevel === 'HIGH') {
        return {
            shouldAlert: true,
            message: `CRITICAL VITALS: ${risk.contributingFactors.join(', ')}`,
            priority: 'critical'
        };
    }

    if (risk.riskLevel === 'MEDIUM') {
        return {
            shouldAlert: true,
            message: `Warning: ${risk.contributingFactors.join(', ')}`,
            priority: 'warning'
        };
    }

    return { shouldAlert: false, message: '', priority: 'info' };
};
