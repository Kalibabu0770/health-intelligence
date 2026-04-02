/**
 * AI Signal Cleaner
 * Responsibility: Remove high-frequency noise and baseline wander from raw streams.
 */

export const cleanSignal = (value: number, buffer: number[]): number => {
    // Simple Moving Average (SMA) for smoothing
    const windowSize = 5;
    if (buffer.length >= windowSize) buffer.shift();
    buffer.push(value);

    const sum = buffer.reduce((a, b) => a + b, 0);
    return sum / buffer.length;
};

export const removeBaselineWander = (ecgSample: number, dcBuffer: number[]): number => {
    // Very simple DC removal: y[n] = x[n] - mean(x)
    // In real-time, we often use a high-pass filter. 
    // Here we use a running average as the "DC" component.
    const alpha = 0.05; // Learning rate for DC
    const currentDC = dcBuffer[0] || ecgSample;
    const newDC = currentDC * (1 - alpha) + ecgSample * alpha;
    dcBuffer[0] = newDC;

    return ecgSample - newDC;
};
