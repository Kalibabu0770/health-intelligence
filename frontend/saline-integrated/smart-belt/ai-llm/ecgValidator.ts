/**
 * ECG Validator
 * Responsibility: Ensure waveform is only shown when contact is good.
 */

export interface ECGState {
    isValid: boolean;
    reason: 'ok' | 'no_contact' | 'noise' | 'weak_signal';
    filteredValue: number;
}

export const validateECG = (
    rawECG: number,
    irValue: number,
    bpm: number,
    variance: number
): ECGState => {
    // 1. Contact Check (Primary Gate)
    // IR sensor reflection > threshold implies skin contact.
    const CONTACT_THRESHOLD = 10000; // Adjusted based on MAX30102 typicals
    if (irValue < CONTACT_THRESHOLD) {
        return { isValid: false, reason: 'no_contact', filteredValue: 512 }; // Flatline center
    }

    // 2. HR Existence Check
    // If no heart rate detected, the ECG is likely just noise.
    if (bpm < 30 || bpm > 220) {
        return { isValid: false, reason: 'weak_signal', filteredValue: 512 };
    }

    // 3. Noise/Variance Check
    // Ultra-high variance implies motion artifact or loose sensor.
    // Low variance (< 20) implies flatline/disconnected lead even if IR says yes.
    if (variance < 5) {
        // Suspiciously flat
        return { isValid: false, reason: 'weak_signal', filteredValue: 512 };
    }

    // Pass
    return { isValid: true, reason: 'ok', filteredValue: rawECG };
};
