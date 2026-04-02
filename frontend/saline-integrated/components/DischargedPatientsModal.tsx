import React, { useEffect, useState } from 'react';

import { X, Calendar, User, Trash2, Clock, Search } from 'lucide-react';
import { Patient } from '../types/types';
import { fetchDischargedPatients, permanentlyDeletePatient } from '../services/dataService';
import PatientDetailsModal from './PatientDetailsModal';

interface DischargedPatientsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DischargedPatientsModal: React.FC<DischargedPatientsModalProps> = ({ isOpen, onClose }) => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const loadDischarged = async () => {
        setLoading(true);
        const { data } = await fetchDischargedPatients();
        if (data) setPatients(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadDischarged();
        }
    }, [isOpen]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to permanently delete this record? This cannot be undone.')) {
            await permanentlyDeletePatient(id);
            loadDischarged();
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Calendar size={20} className="text-indigo-600" />
                            Discharge History
                        </h3>
                        <p className="text-xs text-slate-500">Records of previous visits</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 w-64"
                            />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? (
                        <div className="flex justify-center py-10 text-slate-400">Loading records...</div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p>No discharged records found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredPatients.map(patient => (
                                <div key={patient.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                            {patient.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{patient.name}</h4>
                                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <User size={12} /> ID: #{patient.id}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> Admitted: {patient.admission_date ? new Date(patient.admission_date).toLocaleString() : 'N/A'}
                                                </span>
                                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                    <Clock size={12} /> Discharged: {patient.discharge_date ? new Date(patient.discharge_date).toLocaleString() : 'N/A'}
                                                </span>
                                            </div>
                                            {patient.diagnosis && <p className="text-xs text-slate-600 mt-1 italic">{patient.diagnosis}</p>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedPatient(patient)}
                                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(patient.id); }}
                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Nested Details Modal */}
                {selectedPatient && (
                    <PatientDetailsModal
                        isOpen={!!selectedPatient}
                        patient={selectedPatient}
                        devices={{}}
                        usedDeviceIds={[]}
                        onClose={() => setSelectedPatient(null)}
                        onSuccess={loadDischarged}
                    />
                )}
            </div>
        </div>
    );
};

export default DischargedPatientsModal;
