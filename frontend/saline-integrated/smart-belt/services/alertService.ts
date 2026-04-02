import { SmartBeltTelemetry } from '../types';

export type AlertLevel = 'watch' | 'pre-alert' | 'high-risk' | 'emergency';
export type RiskType = 'cardiac' | 'seizure' | 'general' | 'fall';

interface AlertPayload {
    patientId: string;
    deviceId: string;
    riskType: RiskType;
    level: AlertLevel;
    message: string;
    timestamp: string;
    location?: { lat: number, lng: number, accuracy: number };
    snapshot?: Partial<SmartBeltTelemetry>;
}

// In-memory log of sent alerts to prevent spamming
const sentAlerts: AlertPayload[] = [];

export const AlertService = {

    async triggerAlert(payload: Omit<AlertPayload, 'timestamp' | 'location'>) {
        // 1. Enrich with Timestamp & Location (if emergency)
        const fullAlert: AlertPayload = {
            ...payload,
            timestamp: new Date().toISOString(),
        };

        if (payload.level === 'emergency' || payload.level === 'high-risk') {
            try {
                const position = await getCurrentLocation();
                fullAlert.location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
            } catch (e) {
                console.warn("Could not fetch location for alert", e);
            }
        }

        // 2. Filter / Debounce logic could go here
        sentAlerts.push(fullAlert);

        // 3. Dispatch (Mocking sending to backend/SMS gateway)
        console.log(`[ALERT SERVICE] 🚨 ${fullAlert.level.toUpperCase()} sent to Caregiver:`, fullAlert);

        // Use browser notification if possible
        if (Notification.permission === 'granted' && payload.level !== 'watch') {
            new Notification(`Smart Belt Alert: ${payload.riskType.toUpperCase()}`, {
                body: payload.message,
                icon: '/vite.svg' // Placeholder
            });
        }

        return fullAlert;
    },

    getRecentAlerts(patientId?: string) {
        if (!patientId) return sentAlerts.slice(-20).reverse();
        return sentAlerts.filter(a => a.patientId === patientId).slice(-10).reverse();
    }
};

const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
};
