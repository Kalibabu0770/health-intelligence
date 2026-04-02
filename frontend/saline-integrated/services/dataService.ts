import { database } from './firebaseConfig';
import { ref, onValue, set, remove } from 'firebase/database';
import { Patient, Device } from '../types/types';
import { getLocalPatients, saveLocalPatient, deleteLocalPatient } from './localDatabase';

console.log("Data Service Initializing... using LocalStorage (Primary) and Firebase (Status)");

// --- PATIENTS (Local Storage) ---

export const fetchAdmittedPatients = async () => {
    const all = getLocalPatients();
    return { data: all.filter(p => !p.status || p.status === 'admitted'), error: null };
};

export const fetchDischargedPatients = async () => {
    const all = getLocalPatients();
    return { data: all.filter(p => p.status === 'discharged'), error: null };
};

export const addPatient = async (patientData: Omit<Patient, 'id'>) => {
    console.log("Adding patient:", patientData);
    try {
        const patientWithDate = { ...patientData, admission_date: new Date().toISOString() };
        const newPatient = saveLocalPatient(patientWithDate);

        // Sync to Firebase Live Bus if smart_belt_id exists
        if (newPatient.smart_belt_id) {
            syncPatientMetadataToFirebase(newPatient);
            // Notify AI Server to monitor
            notifyAIServer(newPatient.smart_belt_id);
        }

        return { data: newPatient, error: null };
    } catch (e: any) {
        console.error("Error adding patient:", e);
        return { data: null, error: { message: "Failed to save patient locally." } };
    }
};

const syncPatientMetadataToFirebase = async (patient: Patient) => {
    if (!patient.smart_belt_id) return;
    try {
        await set(ref(database, `live/devices/${patient.smart_belt_id}/metadata`), {
            name: patient.name,
            age: patient.age,
            medical_problem: patient.medical_problem,
            weight: patient.weight,
            height: patient.height,
            gender: patient.gender,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Metadata Sync Failed:", e);
    }
};

const notifyAIServer = async (deviceId: string) => {
    try {
        await fetch('http://localhost:5001/ai/monitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId })
        });
    } catch (e) {
        console.warn("AI Server notification failed (might be offline):", e);
    }
};

export const updatePatient = async (patientId: number, updates: any) => {
    const patients = getLocalPatients();
    const index = patients.findIndex(p => p.id === patientId);
    if (index >= 0) {
        const updatedPatient = { ...patients[index], ...updates };
        saveLocalPatient(updatedPatient);

        if (updatedPatient.smart_belt_id) {
            syncPatientMetadataToFirebase(updatedPatient);
            notifyAIServer(updatedPatient.smart_belt_id);
        }

        return { data: updatedPatient, error: null };
    }
    return { data: null, error: { message: "Patient not found" } };
};

export const linkDevice = async (patientId: number, deviceId: string, config?: { bottle_ml: number, flow_rate: number }) => {
    // 1. Update Patient Record (Local) - Store infusion config here!
    const updates: any = {
        device_id: deviceId,
        device_link_time: new Date().toISOString()
    };

    // Store infusion details if provided, or reset if not (though usually provided on link)
    if (config) {
        updates.bottle_ml = config.bottle_ml;
        updates.flow_rate = config.flow_rate;
        updates.infusion_start_time = new Date().toISOString();
    }

    await updatePatient(patientId, updates);

    // 2. Update Device Status (Firebase) - Only status flags
    // We do NOT store bottle_ml or flow_rate in Firebase anymore as per user request
    console.log("Linking device", deviceId, "updating Firebase status...");
    try {
        await set(ref(database, 'saline_status/' + deviceId), {
            device_id: deviceId,
            is_empty: false, // Reset empty status on new link
            last_updated: new Date().toISOString(),
            status: 'normal'
            // No PII or infusion data stored here
        });
    } catch (e) {
        console.error("Failed to update Firebase device config", e);
    }

    return { error: null };
};

export const unlinkDevice = async (patientId: number) => {
    const patients = getLocalPatients();
    const patient = patients.find(p => p.id === patientId);

    if (patient && patient.device_id) {
        // Optional: Clean up Firebase status if needed, or leave it as orphan
        // For now, we just unlink the patient locally.
    }

    return updatePatient(patientId, {
        device_id: null,
        infusion_start_time: null,
        bottle_ml: null,
        flow_rate: null
    });
};

// --- DEVICES (Firebase Realtime Database + Local Data Merge) ---

export const fetchDevices = async () => {
    return { data: [], error: null };
};

export const subscribeToDevices = (callback: (devices: Record<string, Device>) => void) => {
    console.log("Initializing Firebase device listener...");
    const devicesRef = ref(database, 'saline_status');

    // Listen to all changes
    const unsubscribe = onValue(devicesRef, (snapshot) => {
        const firebaseData = snapshot.val();
        const currentDevices: Record<string, Device> = {};

        // Get local patients to merge infusion config
        const patients = getLocalPatients();
        const deviceToPatientMap = new Map<string, Patient>();
        patients.forEach(p => {
            if (p.device_id) deviceToPatientMap.set(p.device_id, p);
        });

        if (firebaseData) {
            Object.keys(firebaseData).forEach(key => {
                const deviceData = firebaseData[key];
                const isEmpty = deviceData.is_empty === true;

                // Get config from local patient record
                const linkedPatient = deviceToPatientMap.get(key);

                let flowRate = 0;
                let bottleMl = 0;
                let startTimeStr = '';

                if (linkedPatient) {
                    flowRate = linkedPatient.flow_rate || 0;
                    bottleMl = linkedPatient.bottle_ml || 500;
                    startTimeStr = linkedPatient.infusion_start_time || '';
                } else {
                    // Fallback if no patient linked - maybe display raw data if it existed, or defaults
                    // Since we don't store config in firebase, these will be empty/default.
                    // Use whatever might be lingering or defaults.
                    bottleMl = 500;
                }

                // REAL-TIME ANALYSIS LOGIC
                let timeRemaining = '--';
                let percentage = 100;
                let status: 'normal' | 'empty' | 'low_battery' | 'offline' = isEmpty ? 'empty' : 'normal';
                let calculatedSeconds = 0;

                if (!isEmpty && flowRate > 0 && bottleMl && startTimeStr) {
                    const totalDrops = bottleMl * 20; // Assuming 20 drops/ml
                    const totalMinutes = totalDrops / flowRate; // flow_rate is drops/min ?
                    // Wait, previous code said flow_rate was ml/h?
                    // Let's check: "Rate: 100 d/min" in UI.
                    // If flow_rate is drops/min:
                    // totalMinutes = totalDrops / dropsPermin. Correct.

                    // But in dataService logic (line 187 prev):
                    // const totalMinutes = totalDrops / flowRate; 

                    const startTime = new Date(startTimeStr).getTime();
                    const now = new Date().getTime();
                    const elapsedMinutes = (now - startTime) / (1000 * 60);

                    const remainingMin = Math.max(0, totalMinutes - elapsedMinutes);
                    calculatedSeconds = Math.floor(remainingMin * 60);

                    // Sync to Firebase for Hardware Display (Loop Protection > 60s diff)
                    // We only write if the stored value (deviceData.remaining_seconds) is significantly different
                    const storedSeconds = deviceData.remaining_seconds || 0;
                    if (Math.abs(storedSeconds - calculatedSeconds) > 60) {
                        // Use a timeout to not block the render/calculation loop
                        setTimeout(() => {
                            set(ref(database, `saline_status/${key}/remaining_seconds`), calculatedSeconds).catch(e => console.error(e));
                        }, 100);
                    }

                    // ... UI String Calculation ...
                    let remainingMinutesDisplay = Math.floor(remainingMin);

                    // Calculate Percentage
                    if (totalMinutes > 0) {
                        percentage = Math.max(0, Math.min(100, (remainingMinutesDisplay / totalMinutes) * 100));
                    }

                    if (remainingMinutesDisplay === 0) {
                        timeRemaining = 'Near Empty';
                        percentage = 0;
                    } else {
                        const hours = Math.floor(remainingMinutesDisplay / 60);
                        const minutes = remainingMinutesDisplay % 60;
                        if (hours > 0) timeRemaining = `${hours}h ${minutes}m`;
                        else timeRemaining = `${minutes}m`;
                    }
                } else if (isEmpty) {
                    timeRemaining = 'Empty';
                    flowRate = 0;
                    percentage = 0;
                    calculatedSeconds = 0;
                } else if (!linkedPatient) {
                    timeRemaining = 'Unassigned';
                    percentage = 0;
                    calculatedSeconds = 0;
                }

                // normalize data
                currentDevices[key] = {
                    device_id: deviceData.device_id || key,
                    is_empty: isEmpty,
                    last_updated: deviceData.last_updated || new Date().toISOString(),
                    bottle_ml: bottleMl,
                    flow_rate: flowRate,
                    time_remaining: timeRemaining,
                    percentage: percentage,
                    battery_level: deviceData.battery_level || 100,
                    status: status,
                    start_time: startTimeStr
                };
            });
        }

        callback(currentDevices);
    });

    return unsubscribe;
};


export const subscribeToPatients = (callback: () => void) => {
    // Local storage trigger mock
    return () => { };
};

export const addDevice = async (deviceId: string) => {
    console.log("Adding device to Firebase:", deviceId);
    try {
        await set(ref(database, 'saline_status/' + deviceId), {
            device_id: deviceId,
            is_empty: false,
            last_updated: new Date().toISOString(),
            battery_level: 100,
            status: 'normal'
        });
        return { error: null };
    } catch (e: any) {
        console.error("FAILED to add device to Firebase:", e);
        return { error: e };
    }
};

export const deleteDevice = async (deviceId: string) => {
    try {
        console.log("Deleting device from Firebase:", deviceId);
        await remove(ref(database, 'saline_status/' + deviceId));
        return { error: null };
    } catch (e: any) {
        console.error("Error deleting device:", e);
        return { error: e };
    }
};

export const setDeviceStatus = async (deviceId: string, isEmpty: boolean) => {
    try {
        // Only update status fields
        await set(ref(database, 'saline_status/' + deviceId + '/is_empty'), isEmpty);
        await set(ref(database, 'saline_status/' + deviceId + '/last_updated'), new Date().toISOString());
        return { error: null };
    } catch (e: any) {
        return { error: e };
    }
};

export const dischargePatient = async (id: number) => {
    try {
        await updatePatient(id, {
            status: 'discharged',
            discharge_date: new Date().toISOString(),
            device_id: null,
            infusion_start_time: null
        });
        return { error: null };
    } catch (error) {
        console.error("Error discharging patient:", error);
        return { error };
    }
};

export const permanentlyDeletePatient = async (id: number) => {
    try {
        await deleteLocalPatient(id);
        return { error: null };
    } catch (error) {
        console.error("Error deleting patient:", error);
        return { error };
    }
};

export const readmitPatient = async (id: number) => {
    try {
        await updatePatient(id, {
            status: 'admitted',
            admission_date: new Date().toISOString(),
            discharge_date: null
        });
        return { error: null };
    } catch (error) {
        console.error("Error re-admitting patient:", error);
        return { error };
    }
};

export const removeChannel = (unsubscribe: any) => {
    if (typeof unsubscribe === 'function') {
        unsubscribe();
    }
}
