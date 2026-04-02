/**
 * SpO2 Processor
 * Implements the required algorithm:
 * 1. DC Removal
 * 2. AC Peak Detection
 * 3. Ratio Calculation = (Red_AC/Red_DC) / (IR_AC/IR_DC)
 * 4. SpO2 = 110 - 25 * Ratio
 * 5. Moving Average
 */

export class SpO2Processor {
    private redBuffer: number[] = [];
    private irBuffer: number[] = [];
    private spo2History: number[] = [];
    private readonly BUFFER_SIZE = 100;

    process(red: number, ir: number): number {
        // Buffer management
        this.redBuffer.push(red);
        this.irBuffer.push(ir);
        if (this.redBuffer.length > this.BUFFER_SIZE) this.redBuffer.shift();
        if (this.irBuffer.length > this.BUFFER_SIZE) this.irBuffer.shift();

        if (this.redBuffer.length < 50) return 0; // Assessing...

        // 1. DC Removal (Mean)
        const redDC = this.redBuffer.reduce((a, b) => a + b, 0) / this.redBuffer.length;
        const irDC = this.irBuffer.reduce((a, b) => a + b, 0) / this.irBuffer.length;

        // 2. AC Peak Detection (Max - Min approximation for robustness)
        const getAC = (arr: number[]) => Math.max(...arr) - Math.min(...arr);
        const redAC = getAC(this.redBuffer);
        const irAC = getAC(this.irBuffer);

        if (redDC === 0 || irDC === 0) return 0;

        // 3. Ratio Calculation
        const ratio = (redAC / redDC) / (irAC / irDC);

        // 4. Formula: 110 - 25 * Ratio
        let spo2 = 110 - 25 * ratio;

        // 5. Moving Average Smoothing
        this.spo2History.push(spo2);
        if (this.spo2History.length > 10) this.spo2History.shift();

        const avgSpO2 = this.spo2History.reduce((a, b) => a + b, 0) / this.spo2History.length;

        // Clamping
        return Math.max(0, Math.min(100, Math.round(avgSpO2)));
    }
}
