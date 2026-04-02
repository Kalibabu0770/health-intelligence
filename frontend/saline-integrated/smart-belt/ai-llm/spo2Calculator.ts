/**
 * SpO2 Calculator (MAX30102 Logic)
 * Responsibility: Compute SpO2 from Red/IR Ratio.
 */

export const calculateSpO2 = (
    redBuffer: number[],
    irBuffer: number[]
): number => {
    // Need at least a small buffer to calculate AC/DC components
    if (redBuffer.length < 50 || irBuffer.length < 50) return 0; // Not enough data yet

    // 1. Extract AC/DC
    // DC = Average of signal
    // AC = Max - Min (Peak-to-Peak) roughly, or RMS

    // Simple helper
    const getStats = (arr: number[]) => {
        let min = Infinity, max = -Infinity, sum = 0;
        for (let v of arr) {
            if (v < min) min = v;
            if (v > max) max = v;
            sum += v;
        }
        return { dc: sum / arr.length, ac: max - min };
    };

    const redStats = getStats(redBuffer);
    const irStats = getStats(irBuffer);

    // Prevent divide by zero
    if (redStats.dc === 0 || irStats.dc === 0) return 0;

    // 2. Calculate R Ratio
    // R = (AC_red / DC_red) / (AC_ir / DC_ir)
    const R = (redStats.ac / redStats.dc) / (irStats.ac / irStats.dc);

    // 3. Apply Calibration Curve (Standard MAX30102 approximation)
    // SpO2 = -45.060*R*R + 30.354*R + 94.845
    // or linear approx: 104 - 17*R
    let spo2 = 104 - 17 * R;

    // 4. Clamp & Smooth
    if (spo2 > 100) spo2 = 100;
    if (spo2 < 80) spo2 = 80; // Clamp lower realistic bound for now to avoid panic on noise

    return Math.round(spo2);
};
