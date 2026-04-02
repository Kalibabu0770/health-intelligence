import { Patient } from '../types/types';

const STORAGE_KEY = 'saline_patients_v1';

export const getLocalPatients = (): Patient[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load patients from local storage", e);
        return [];
    }
};

export const saveLocalPatient = (patient: Omit<Patient, 'id'> & { id?: number }): Patient => {
    const patients = getLocalPatients();

    // Generate ID if new (simple auto-increment simulation)
    const newPatient = {
        ...patient,
        id: patient.id || (patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1)
    } as Patient;

    // Check if update or insert
    const index = patients.findIndex(p => p.id === newPatient.id);
    if (index >= 0) {
        patients[index] = newPatient;
    } else {
        patients.push(newPatient);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    return newPatient;
};

export const deleteLocalPatient = (id: number) => {
    const patients = getLocalPatients().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
};

export const updatePatient = (id: number, updates: Partial<Patient>): Patient | null => {
    const patients = getLocalPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index >= 0) {
        // Merge existing with updates
        patients[index] = { ...patients[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
        return patients[index];
    }
    return null;
};
