/**
 * ECG Signal Filter
 * Implements:
 * 1. Low-pass filter (Simple Moving Average)
 * 2. Baseline Drift Removal (DC subtraction)
 */

export class ECGSignalFilter {
    private buffer: number[] = [];
    private dcOffset = 512; // Start with mid-point
    private readonly WINDOW_SIZE = 5;

    process(rawECG: number): number {
        // 1. Low Pass (Smoothing)
        this.buffer.push(rawECG);
        if (this.buffer.length > this.WINDOW_SIZE) this.buffer.shift();
        const smoothed = this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;

        // 2. Baseline Drift Removal (Simple IIR High Pass equivalent)
        // new_val = old_val * 0.99 + input - old_input... 
        // OR simple DC tracking:
        const alpha = 0.05;
        this.dcOffset = (this.dcOffset * (1 - alpha)) + (smoothed * alpha);

        const filtered = smoothed - this.dcOffset;

        // Return centered around 0 (or add offset for display if chart needs it 512)
        // Let's return centered on 512 for standard 10-bit visualization context
        return filtered + 512;
    }
}
