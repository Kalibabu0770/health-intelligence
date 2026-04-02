import React, { useState } from 'react';
import { X, User, Heart, Pill, Activity, Phone, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { createSmartBeltPatient } from '../services/smartBeltPatientService';
import { CreateSmartBeltPatientInput, MedicalCondition, Medication } from '../types';

interface SmartBeltAdmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPatientCreated: () => void;
    initialData?: any; // For editing existing patients
}

const SmartBeltAdmissionModal: React.FC<SmartBeltAdmissionModalProps> = ({
    isOpen,
    onClose,
    onPatientCreated,
    initialData
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic Information
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

    // Medical Conditions
    const [medicalConditions, setMedicalConditions] = useState<string[]>(['']);
    const [noMedicalConditions, setNoMedicalConditions] = useState(false);

    // Allergies
    const [allergies, setAllergies] = useState<string[]>(['']);
    const [noAllergies, setNoAllergies] = useState(false);

    // Previous Surgeries
    const [surgeries, setSurgeries] = useState<string[]>(['']);
    const [noSurgeries, setNoSurgeries] = useState(false);

    // Critical Health History
    const [strokeHistory, setStrokeHistory] = useState(false);
    const [heartDiseaseHistory, setHeartDiseaseHistory] = useState(false);
    const [seizureHistory, setSeizureHistory] = useState(false);
    const [diabetes, setDiabetes] = useState(false);
    const [hypertension, setHypertension] = useState(false);

    // Chronic Diseases
    const [chronicDiseases, setChronicDiseases] = useState<string[]>(['']);
    const [noChronicDiseases, setNoChronicDiseases] = useState(false);

    // Medications
    const [medications, setMedications] = useState<Medication[]>([
        { name: '', dosage: '', frequency: '' }
    ]);
    const [noMedications, setNoMedications] = useState(false);

    // Family History
    const [familyHistory, setFamilyHistory] = useState<string[]>(['']);
    const [noFamilyHistory, setNoFamilyHistory] = useState(false);

    // Baseline Values
    const [baselineHR, setBaselineHR] = useState('');
    const [baselineSpO2, setBaselineSpO2] = useState('');
    const [baselineTemp, setBaselineTemp] = useState('');

    // Emergency Contact
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

    // ================================================================
    // ARRAY FIELD HANDLERS
    // ================================================================

    const addArrayField = (
        arr: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setter([...arr, '']);
    };

    const updateArrayField = (
        arr: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        index: number,
        value: string
    ) => {
        const newArr = [...arr];
        newArr[index] = value;
        setter(newArr);
    };

    const removeArrayField = (
        arr: string[],
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        index: number
    ) => {
        if (arr.length > 1) {
            setter(arr.filter((_, i) => i !== index));
        }
    };

    // ================================================================
    // MEDICATION HANDLERS
    // ================================================================

    const addMedication = () => {
        setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
    };

    const updateMedication = (index: number, field: keyof Medication, value: string) => {
        const newMeds = [...medications];
        newMeds[index] = { ...newMeds[index], [field]: value };
        setMedications(newMeds);
    };

    const removeMedication = (index: number) => {
        if (medications.length > 1) {
            setMedications(medications.filter((_, i) => i !== index));
        }
    };

    // ================================================================
    // FORM SUBMISSION
    // ================================================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validation
            if (!name || !age) {
                throw new Error('Name and age are required');
            }

            const ageNum = parseInt(age);
            if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
                throw new Error('Please enter a valid age');
            }

            // Build medical history (filter out empty values)
            const medical_history: MedicalCondition[] = noMedicalConditions
                ? []
                : medicalConditions
                    .filter(c => c.trim())
                    .map(condition => ({
                        condition,
                        diagnosed: new Date().toISOString().split('T')[0]
                    }));

            // Build medications list (filter out empty entries)
            const meds: Medication[] = noMedications
                ? []
                : medications.filter(m => m.name.trim());

            // Build patient input
            const patientInput: CreateSmartBeltPatientInput = {
                name,
                age: ageNum,
                gender,
                medical_history,
                allergies: noAllergies ? [] : allergies.filter(a => a.trim()),
                stroke_history: strokeHistory,
                heart_disease_history: heartDiseaseHistory,
                seizure_history: seizureHistory,
                diabetes,
                hypertension,
                medications: meds,
                baseline_hr: baselineHR ? parseInt(baselineHR) : undefined,
                baseline_spo2: baselineSpO2 ? parseInt(baselineSpO2) : undefined,
                baseline_temp: baselineTemp ? parseFloat(baselineTemp) : undefined,
                emergency_contact_name: emergencyContactName || undefined,
                emergency_contact_phone: emergencyContactPhone || undefined
            };

            // Create patient
            await createSmartBeltPatient(patientInput);

            // Success
            onPatientCreated();
            resetForm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create patient');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setAge('');
        setGender('Male');
        setMedicalConditions(['']);
        setNoMedicalConditions(false);
        setAllergies(['']);
        setNoAllergies(false);
        setSurgeries(['']);
        setNoSurgeries(false);
        setStrokeHistory(false);
        setHeartDiseaseHistory(false);
        setSeizureHistory(false);
        setDiabetes(false);
        setHypertension(false);
        setChronicDiseases(['']);
        setNoChronicDiseases(false);
        setMedications([{ name: '', dosage: '', frequency: '' }]);
        setNoMedications(false);
        setFamilyHistory(['']);
        setNoFamilyHistory(false);
        setBaselineHR('');
        setBaselineSpO2('');
        setBaselineTemp('');
        setEmergencyContactName('');
        setEmergencyContactPhone('');
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">New Smart Belt Patient</h2>
                            <p className="text-blue-100 text-sm">Hospital-Grade Health Profile</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Basic Information */}
                    <FormSection
                        icon={<User className="w-5 h-5" />}
                        title="Basic Information"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Age *
                                </label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="1"
                                    max="150"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Gender
                            </label>
                            <div className="flex gap-4">
                                {['Male', 'Female', 'Other'].map((g) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value={g}
                                            checked={gender === g}
                                            onChange={() => setGender(g as any)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-sm text-gray-700">{g}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </FormSection>

                    {/* Critical Health History */}
                    <FormSection
                        icon={<Heart className="w-5 h-5 text-red-500" />}
                        title="Critical Health History"
                        subtitle="Check all that apply"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Previous Stroke', value: strokeHistory, setter: setStrokeHistory },
                                { label: 'Heart Disease', value: heartDiseaseHistory, setter: setHeartDiseaseHistory },
                                { label: 'Seizure/Fits History', value: seizureHistory, setter: setSeizureHistory },
                                { label: 'Diabetes', value: diabetes, setter: setDiabetes },
                                { label: 'Hypertension', value: hypertension, setter: setHypertension }
                            ].map((item) => (
                                <label key={item.label} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={item.value}
                                        onChange={(e) => item.setter(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </FormSection>

                    {/* Medical Conditions */}
                    <MultiEntrySection
                        icon={<Activity className="w-5 h-5 text-green-500" />}
                        title="Medical Conditions"
                        items={medicalConditions}
                        setItems={setMedicalConditions}
                        noItems={noMedicalConditions}
                        setNoItems={setNoMedicalConditions}
                        placeholder="e.g., Asthma, COPD, Arthritis"
                        noneLabel="No medical conditions"
                    />

                    {/* Allergies */}
                    <MultiEntrySection
                        icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
                        title="Allergies"
                        items={allergies}
                        setItems={setAllergies}
                        noItems={noAllergies}
                        setNoItems={setNoAllergies}
                        placeholder="e.g., Penicillin, Peanuts, Latex"
                        noneLabel="No known allergies"
                    />

                    {/* Previous Surgeries */}
                    <MultiEntrySection
                        icon={<Activity className="w-5 h-5 text-purple-500" />}
                        title="Previous Surgeries"
                        items={surgeries}
                        setItems={setSurgeries}
                        noItems={noSurgeries}
                        setNoItems={setNoSurgeries}
                        placeholder="e.g., Appendectomy, Bypass Surgery"
                        noneLabel="No previous surgeries"
                    />

                    {/* Chronic Diseases */}
                    <MultiEntrySection
                        icon={<Heart className="w-5 h-5 text-rose-500" />}
                        title="Chronic Diseases"
                        items={chronicDiseases}
                        setItems={setChronicDiseases}
                        noItems={noChronicDiseases}
                        setNoItems={setNoChronicDiseases}
                        placeholder="e.g., Kidney Disease, Liver Disease"
                        noneLabel="No chronic diseases"
                    />

                    {/* Current Medications */}
                    <FormSection
                        icon={<Pill className="w-5 h-5 text-purple-500" />}
                        title="Current Medications"
                    >
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={noMedications}
                                onChange={(e) => {
                                    setNoMedications(e.target.checked);
                                    if (e.target.checked) {
                                        setMedications([{ name: '', dosage: '', frequency: '' }]);
                                    }
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700 font-medium">Patient not using any medications</span>
                        </label>

                        {!noMedications && (
                            <div className="space-y-3">
                                {medications.map((med, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <div className="grid grid-cols-3 gap-3 mb-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Medicine Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={med.name}
                                                    onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                                                    placeholder="e.g., Aspirin"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Dosage
                                                </label>
                                                <input
                                                    type="text"
                                                    value={med.dosage}
                                                    onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                                                    placeholder="e.g., 75mg"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Frequency
                                                </label>
                                                <input
                                                    type="text"
                                                    value={med.frequency}
                                                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                                                    placeholder="e.g., Once daily"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        {medications.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMedication(idx)}
                                                className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addMedication}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Medication
                                </button>
                            </div>
                        )}
                    </FormSection>

                    {/* Family History */}
                    <MultiEntrySection
                        icon={<User className="w-5 h-5 text-indigo-500" />}
                        title="Family History (Optional)"
                        items={familyHistory}
                        setItems={setFamilyHistory}
                        noItems={noFamilyHistory}
                        setNoItems={setNoFamilyHistory}
                        placeholder="e.g., Father - Heart Disease, Mother - Diabetes"
                        noneLabel="No relevant family history"
                    />

                    {/* Baseline Values */}
                    <FormSection
                        icon={<Activity className="w-5 h-5 text-orange-500" />}
                        title="Baseline Health Values"
                        subtitle="For AI anomaly detection"
                    >
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Normal Heart Rate (bpm)
                                </label>
                                <input
                                    type="number"
                                    value={baselineHR}
                                    onChange={(e) => setBaselineHR(e.target.value)}
                                    placeholder="e.g., 70"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Normal SpO₂ (%)
                                </label>
                                <input
                                    type="number"
                                    value={baselineSpO2}
                                    onChange={(e) => setBaselineSpO2(e.target.value)}
                                    placeholder="e.g., 98"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Normal Temperature (°F)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baselineTemp}
                                    onChange={(e) => setBaselineTemp(e.target.value)}
                                    placeholder="e.g., 98.6"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Emergency Contact */}
                    <FormSection
                        icon={<Phone className="w-5 h-5 text-blue-500" />}
                        title="Emergency Contact"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={emergencyContactName}
                                onChange={(e) => setEmergencyContactName(e.target.value)}
                                placeholder="Contact name"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="tel"
                                value={emergencyContactPhone}
                                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                                placeholder="Phone number"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </FormSection>
                </form>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Creating Patient...' : 'Admit Patient'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// REUSABLE COMPONENTS
// ================================================================

interface FormSectionProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ icon, title, subtitle, children }) => (
    <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
            {icon}
            <div>
                <h3 className="text-gray-700 font-semibold">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

interface MultiEntrySectionProps {
    icon: React.ReactNode;
    title: string;
    items: string[];
    setItems: React.Dispatch<React.SetStateAction<string[]>>;
    noItems: boolean;
    setNoItems: React.Dispatch<React.SetStateAction<boolean>>;
    placeholder: string;
    noneLabel: string;
}

const MultiEntrySection: React.FC<MultiEntrySectionProps> = ({
    icon,
    title,
    items,
    setItems,
    noItems,
    setNoItems,
    placeholder,
    noneLabel
}) => {
    const addItem = () => {
        setItems([...items, '']);
    };

    const updateItem = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    return (
        <FormSection icon={icon} title={title}>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                    type="checkbox"
                    checked={noItems}
                    onChange={(e) => {
                        setNoItems(e.target.checked);
                        if (e.target.checked) {
                            setItems(['']);
                        }
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 font-medium">{noneLabel}</span>
            </label>

            {!noItems && (
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => updateItem(idx, e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Add More
                    </button>
                </div>
            )}
        </FormSection>
    );
};

export default SmartBeltAdmissionModal;
