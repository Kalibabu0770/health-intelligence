import React, { useState } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import { addPatient } from '../services/dataService';
import { Patient } from '../types/types';

interface AdmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AdmissionModal: React.FC<AdmissionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        doctor_name: '',
        diagnosis: '',
        bed_number: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        await addPatient({
            name: formData.name,
            age: parseInt(formData.age),
            doctor_name: formData.doctor_name,
            diagnosis: formData.diagnosis,
            bed_number: formData.bed_number,
            status: 'admitted',
            device_id: null
        } as any); // Type cast as any to flexible for now, or match Patient type strictly

        setIsSubmitting(false);
        onSuccess();
        onClose();
        setFormData({ name: '', age: '', doctor_name: '', diagnosis: '', bed_number: '' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <UserPlus size={20} className="text-indigo-600" />
                        New Admission
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    placeholder="32"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bed Number</label>
                                <input
                                    type="text"
                                    value={formData.bed_number}
                                    onChange={e => setFormData({ ...formData, bed_number: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    placeholder="302-A"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Attending Doctor</label>
                            <input
                                required
                                type="text"
                                value={formData.doctor_name}
                                onChange={e => setFormData({ ...formData, doctor_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="Dr. Smith"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Diagnosis</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.diagnosis}
                                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                placeholder="Brief clinical notes..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? 'Admitting...' : (<><Save size={16} /> Admit Patient</>)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdmissionModal;
