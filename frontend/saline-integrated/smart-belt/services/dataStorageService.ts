import { supabase } from '../../services/supabaseClient';
import { SmartBeltTelemetry } from '../types';

export interface StoredPrediction {
    patient_id: number;
    heatstroke_risk: number;
    seizure_risk: number;
    cardiac_risk: number;
    overall_risk: number;
    confidence: number;
    trend: 'improving' | 'stable' | 'worsening';
    ai_reasoning?: string;
}

export interface HistoricalDataPoint {
    timestamp: string;
    bpm: number;
    spo2: number;
    temperature: number;
    activity_index: number;
    risk_score: number;
    heatstroke_risk?: number;
    seizure_risk?: number;
}

/**
 * Service for storing ALL sensor data and predictions continuously
 * Stores normal and abnormal readings for complete historical analysis
 */
export class DataStorageService {
    private static batchQueue: any[] = [];
    private static batchTimer: NodeJS.Timeout | null = null;
    private static readonly BATCH_SIZE = 10;
    private static readonly BATCH_DELAY_MS = 5000; // 5 seconds

    /**
     * Store telemetry data to Supabase
     * Stores ALL readings (normal + abnormal) for complete history
     */
    static async storeTelemetry(
        patientId: number,
        deviceId: string,
        data: SmartBeltTelemetry,
        analysis?: any
    ): Promise<void> {
        try {
            const record = {
                patient_id: patientId,
                device_id: deviceId,

                // Vital Signs
                heart_rate: data.bpm,
                spo2: data.spo2,
                temperature: data.temperature,
                ecg_value: data.ecg,

                // Motion Data
                accel_x: data.ax,
                accel_y: data.ay,
                accel_z: data.az,
                motion_activity_index: data.activity_index,

                // Status
                wearing_status: data.wearing_status,
                leads_ok: data.ecg_leads_connected || false,

                // Analysis (store for ALL readings)
                anomaly_detected: analysis?.status === 'critical' || analysis?.status === 'warning',
                anomaly_type: analysis?.riskType || null,
                risk_score: analysis?.score || 0,

                timestamp: new Date(data.timestamp).toISOString()
            };

            // Add to batch queue
            this.batchQueue.push(record);

            // Process batch if size reached
            if (this.batchQueue.length >= this.BATCH_SIZE) {
                await this.flushBatch();
            } else {
                // Set timer to flush after delay
                this.scheduleBatchFlush();
            }

        } catch (error) {
            console.error('Error storing telemetry:', error);
        }
    }

    /**
     * Store prediction results to history
     * Stores ALL predictions (not just high-risk ones)
     */
    static async storePrediction(prediction: StoredPrediction): Promise<void> {
        try {
            const { error } = await supabase
                .from('prediction_history')
                .insert({
                    patient_id: prediction.patient_id,
                    heatstroke_risk: prediction.heatstroke_risk,
                    seizure_risk: prediction.seizure_risk,
                    cardiac_risk: prediction.cardiac_risk,
                    overall_risk: prediction.overall_risk,
                    confidence: prediction.confidence,
                    trend: prediction.trend,
                    ai_reasoning: prediction.ai_reasoning,
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('Error storing prediction:', error);
            }
        } catch (error) {
            console.error('Error storing prediction:', error);
        }
    }

    /**
     * Get historical sensor data for a patient
     */
    static async getHistoricalData(
        patientId: number,
        hours: number = 24
    ): Promise<HistoricalDataPoint[]> {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('smart_belt_sensor_data')
                .select('*')
                .eq('patient_id', patientId)
                .gte('timestamp', since)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching historical data:', error);
                return [];
            }

            return (data || []).map(d => ({
                timestamp: d.timestamp,
                bpm: d.heart_rate,
                spo2: d.spo2,
                temperature: d.temperature,
                activity_index: d.motion_activity_index,
                risk_score: d.risk_score
            }));
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    /**
     * Get prediction timeline for a patient
     */
    static async getPredictionTimeline(
        patientId: number,
        hours: number = 24
    ): Promise<any[]> {
        try {
            const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('prediction_history')
                .select('*')
                .eq('patient_id', patientId)
                .gte('timestamp', since)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching prediction timeline:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching prediction timeline:', error);
            return [];
        }
    }

    /**
     * Get data storage statistics
     */
    static async getStorageStats(patientId: number): Promise<{
        total_readings_today: number;
        total_predictions_today: number;
        data_quality: 'good' | 'fair' | 'poor';
        last_reading: string | null;
    }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Count readings today
            const { count: readingsCount } = await supabase
                .from('smart_belt_sensor_data')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId)
                .gte('timestamp', today.toISOString());

            // Count predictions today
            const { count: predictionsCount } = await supabase
                .from('prediction_history')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', patientId)
                .gte('timestamp', today.toISOString());

            // Get last reading
            const { data: lastReading } = await supabase
                .from('smart_belt_sensor_data')
                .select('timestamp')
                .eq('patient_id', patientId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            // Determine data quality based on reading frequency
            const expectedReadings = (Date.now() - today.getTime()) / 2000; // Every 2 seconds
            const actualReadings = readingsCount || 0;
            const quality = actualReadings > expectedReadings * 0.8 ? 'good' :
                actualReadings > expectedReadings * 0.5 ? 'fair' : 'poor';

            return {
                total_readings_today: readingsCount || 0,
                total_predictions_today: predictionsCount || 0,
                data_quality: quality,
                last_reading: lastReading?.timestamp || null
            };
        } catch (error) {
            console.error('Error fetching storage stats:', error);
            return {
                total_readings_today: 0,
                total_predictions_today: 0,
                data_quality: 'poor',
                last_reading: null
            };
        }
    }

    /**
     * Schedule batch flush
     */
    private static scheduleBatchFlush(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            this.flushBatch();
        }, this.BATCH_DELAY_MS);
    }

    /**
     * Flush batch queue to database
     */
    private static async flushBatch(): Promise<void> {
        if (this.batchQueue.length === 0) return;

        const batch = [...this.batchQueue];
        this.batchQueue = [];

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        try {
            const { error } = await supabase
                .from('smart_belt_sensor_data')
                .insert(batch);

            if (error) {
                console.error('Error flushing batch:', error);
                // Re-add to queue on failure
                this.batchQueue.unshift(...batch);
            } else {
                console.log(`✅ Stored ${batch.length} sensor readings`);
            }
        } catch (error) {
            console.error('Error flushing batch:', error);
        }
    }

    /**
     * Clean up old data (30 days retention)
     */
    static async cleanupOldData(): Promise<void> {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            // Delete old sensor data
            await supabase
                .from('smart_belt_sensor_data')
                .delete()
                .lt('timestamp', thirtyDaysAgo);

            // Delete old predictions
            await supabase
                .from('prediction_history')
                .delete()
                .lt('timestamp', thirtyDaysAgo);

            console.log('✅ Cleaned up data older than 30 days');
        } catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
}
