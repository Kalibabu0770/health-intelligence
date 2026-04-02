import React, { useState, useEffect } from 'react';
import { X, Save, Link, Unlink, Trash2, Activity, RefreshCw, Share2 } from 'lucide-react';
import { updatePatient, linkDevice, unlinkDevice, dischargePatient, readmitPatient } from '../services/dataService';
import { Patient, Device } from '../types/types';

interface PatientDetailsModalProps {
    isOpen: boolean;
    patient: Patient | null;
    devices: Record<string, Device>;
    usedDeviceIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
    isOpen,
    patient,
    devices,
    usedDeviceIds,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState<Partial<Patient>>({});
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (patient) {
            setFormData(patient);
            setSelectedDeviceId(patient.device_id || '');
        }
    }, [patient]);

    if (!isOpen || !patient) return null;

    // Calculate available devices: All devices - Used devices + Current patient's device (if any)
    const availableDevices = Object.keys(devices).filter(id =>
        !usedDeviceIds.includes(id) || id === patient.device_id
    );

    const handleUpdate = async () => {
        setIsSubmitting(true);
        await updatePatient(patient.id, formData);
        setIsSubmitting(false);
        onSuccess();
        onClose();
    };

    const handleLink = async () => {
        if (!selectedDeviceId) return;
        setIsSubmitting(true);
        await linkDevice(patient.id, selectedDeviceId);
        setIsSubmitting(false);
        onSuccess();
        onClose();
    };

    const handleUnlink = async () => {
        setIsSubmitting(true);
        await unlinkDevice(patient.id);
        setSelectedDeviceId('');
        setIsSubmitting(false);
        onSuccess();
        onClose();
    };

    const handleDischarge = async () => {
        if (confirm(`Are you sure you want to discharge ${patient.name}?`)) {
            await dischargePatient(patient.id);
            onSuccess();
            onClose();
        }
    };

    const handleReadmit = async () => {
        if (confirm(`Re-admit ${patient.name}? This will start a new admission.`)) {
            await readmitPatient(patient.id);
            onSuccess();
            onClose();
        }
    };

    const handleWhatsAppShare = () => {
        if (!patient) return;

        const deviceStatus = patient.device_id
            ? `Linked to Sensor: ${patient.device_id} (${devices[patient.device_id]?.is_empty ? 'Empty' : 'Normal'})`
            : 'No Sensor Linked';

        const message = `*PATIENT REPORT - Saline 2.0*
        
*Name:* ${patient.name} (Age: ${patient.age})
*Bed:* ${patient.bed_number || 'N/A'}
*Doctor:* ${patient.doctor_name || 'N/A'}
*Diagnosis:* ${patient.diagnosis || 'N/A'}

*Medications:* 
${formData.medication_details || 'No details recorded'}

*Notes:* 
${formData.notes || 'No notes'}

*Status:* ${deviceStatus}
*Time:* ${new Date().toLocaleString()}`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row">

                {/* Left Sidebar: Settings */}
                <div className="w-full md:w-1/3 bg-slate-50 border-r border-gray-100 p-6">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 shadow-md mb-3">
                            {patient.name.charAt(0)}
                        </div>
                        <h3 className="font-bold text-slate-800">{patient.name}</h3>
                        <p className="text-xs text-slate-500">ID: #{patient.id}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Sensor Config</label>

                            {patient.device_id ? (
                                <div className="text-center">
                                    <div className="text-emerald-600 font-bold text-sm mb-2 flex items-center justify-center gap-1">
                                        <Link size={14} /> Linked: {patient.device_id}
                                    </div>
                                    <button
                                        onClick={handleUnlink}
                                        className="w-full py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Unlink size={12} /> Unlink Sensor
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <select
                                            value={selectedDeviceId}
                                            onChange={e => setSelectedDeviceId(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 appearance-none bg-white font-medium text-slate-700"
                                        >
                                            <option value="">Select Available Sensor...</option>
                                            {availableDevices.map(id => (
                                                <option key={id} value={id}>
                                                    {id} {devices[id]?.is_empty ? '(Empty)' : '(Normal)'}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <Activity size={14} />
                                        </div>
                                    </div>

                                    {availableDevices.length === 0 && (
                                        <p className="text-[10px] text-amber-500 text-center font-medium">No free sensors detected.</p>
                                    )}

                                    <button
                                        onClick={handleLink}
                                        disabled={!selectedDeviceId}
                                        className="w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Link Selected Sensor
                                    </button>
                                </div>
                            )}
                        </div>

                        {patient.status === 'discharged' ? (
                            <button
                                onClick={handleReadmit}
                                className="w-full py-2 text-sm font-semibold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-xl transition-colors flex items-center justify-center gap-2 mt-auto"
                            >
                                <Activity size={16} /> Re-admit Patient
                            </button>
                        ) : (
                            <button
                                onClick={handleDischarge}
                                className="w-full py-2 text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-2 mt-auto"
                            >
                                <Trash2 size={16} /> Discharge Patient
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Content: Edit Form */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Activity size={20} className="text-indigo-600" />
                            Edit Details
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Bed Number</label>
                                <input
                                    type="text"
                                    value={formData.bed_number || ''}
                                    onChange={e => setFormData({ ...formData, bed_number: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Doctor</label>
                            <input
                                type="text"
                                value={formData.doctor_name || ''}
                                onChange={e => setFormData({ ...formData, doctor_name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Diagnosis</label>
                            <textarea
                                rows={2}
                                value={formData.diagnosis || ''}
                                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Medication Details</label>
                            <textarea
                                rows={3}
                                value={formData.medication_details || ''}
                                onChange={e => setFormData({ ...formData, medication_details: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700 resize-none"
                                placeholder="List medications, dosage, and frequency..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nurse Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700 resize-none"
                                placeholder="Any additional observations..."
                            />
                        </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            onClick={handleWhatsAppShare}
                            className="mr-auto px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-2"
                            title="Share Report via WhatsApp"
                        >
                            <Share2 size={16} /> Share Report
                        </button>
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                        <button
                            onClick={handleUpdate}
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default PatientDetailsModal;
