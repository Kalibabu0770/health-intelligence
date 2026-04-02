/**
 * Contact Validator
 * Gates signals based on thresholds.
 */

export const validateContact = (irValue: number, bpm: number, ecgVariance: number, rawECG: number): boolean => {
    // User Request: "Remove belt detection system"
    // We strictly return TRUE to disable any connection warnings.
    // The system will assume the belt is always worn.
    return true;
};
