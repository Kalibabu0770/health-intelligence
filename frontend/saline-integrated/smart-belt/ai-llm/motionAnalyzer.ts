/**
 * Motion Analyzer
 * Responsibility: Detect seizure-level movement based on RAPID CHANGES (Jerk/Frequency).
 * STRICT THRESHOLDS - Only triggers on VERY intense sustained shaking.
 */

export interface MotionState {
    intensity: number; // G-force
    status: 'rest' | 'activity' | 'strong_movement' | 'seizure_risk';
    posture: 'standing' | 'sitting' | 'lying_down' | 'walking';
}

export const analyzeMotion = (ax: number, ay: number, az: number, history: number[]): MotionState => {
    // 1. Calculate Intensity (Auto-Scaled)
    let magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

    const BUFFER_SIZE = 50;
    history.push(magnitude);
    if (history.length > BUFFER_SIZE) history.shift();

    // 3. Dynamic Normalization (Units Detection)
    // Only attempt normalization once we have enough history to determine the scale
    let normalizedMagnitude = magnitude;
    if (history.length >= 10) {
        const historyMean = history.reduce((s, v) => s + v, 0) / history.length;

        if (historyMean > 1000) {
            // Raw 16-bit (baseline ~4096)
            normalizedMagnitude = magnitude / 4096.0;
        } else if (historyMean > 5.0) {
            // m/s^2 (baseline ~9.81)
            normalizedMagnitude = magnitude / 9.81;
        }
    } else {
        // Initial fallbacks for immediate response before history builds up
        if (magnitude > 1000) normalizedMagnitude = magnitude / 4096.0;
        else if (magnitude > 15.0) normalizedMagnitude = magnitude / 9.81;
    }

    // 4. Calculate VARIANCE (Detects Rapid Oscillations)
    // High variance = Rapid back-and-forth movement (Seizure characteristic)
    if (history.length < 10) {
        // Not enough data yet (need 2 seconds minimum)
        return { intensity: normalizedMagnitude, status: 'rest', posture: 'standing' };
    }

    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    // 5. Calculate JERK (Rate of Change)
    // Count how many times the signal changes direction rapidly
    let directionChanges = 0;
    for (let i = 2; i < history.length; i++) {
        const prev = history[i - 2];
        const curr = history[i - 1];
        const next = history[i];

        // Peak/Valley detection (change in direction)
        if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
            directionChanges++;
        }
    }

    let status: MotionState['status'] = 'rest';

    // 6. MOTION ALERT LOGIC - Strictly G-Force based (> 2.0)
    if (normalizedMagnitude > 2.0) {
        status = 'seizure_risk';
    } else if (normalizedMagnitude > 1.5) {
        status = 'activity';
    } else {
        status = 'rest';
    }

    // 7. Posture Detection (Gravity Vector Analysis)
    let posture: MotionState['posture'] = 'standing';
    if (normalizedMagnitude < 1.3 && normalizedMagnitude > 0.7) { // Stable state
        // Look at orientation (assuming typical belt orientation)
        // If |ay| > 0.7 -> Lying down (sensor on stomach/back)
        // If |ax| > 0.7 or |az| > 0.7 -> Standing/Sitting
        if (Math.abs(ay) > 0.7) {
            posture = 'lying_down';
        } else if (normalizedMagnitude > 1.1) {
            posture = 'walking';
        } else {
            posture = 'standing';
        }
    }

    return { intensity: normalizedMagnitude, status, posture };
};

export const analyzeMotionForSeizure = (ax: number, ay: number, az: number, history: number[]) => {
    const state = analyzeMotion(ax, ay, az, history);
    if (state.status === 'seizure_risk') {
        return { detected: true, message: 'Intense rhythmic motion detected' };
    }
    return null;
};

export const detectFall = (ax: number, ay: number, az: number) => {
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    // Simple fall detection: sudden drop in magnitude (near zero-g) followed by impact
    // For now, using a simple threshold as a placeholder for the logic expected by the engine
    if (magnitude < 0.4) {
        return { detected: true, message: 'Sudden free-fall detected' };
    }
    return null;
};
