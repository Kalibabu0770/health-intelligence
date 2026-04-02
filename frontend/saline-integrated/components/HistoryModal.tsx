import React from 'react';
import { X, Clock, Droplets, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Patient } from '../types/types';

interface HistoryModalProps {
    isOpen: boolean;
    patient: Patient | null;
    onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, patient, onClose }) => {
    if (!isOpen || !patient) return null;

    // Dynamic History Data
    const historyEvents: any[] = [];

    // 1. Admission
    if (patient.admission_date) {
        historyEvents.push({
            time: new Date(patient.admission_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(patient.admission_date).toLocaleDateString(),
            title: 'Patient Admitted',
            desc: `Admitted for ${patient.diagnosis || 'Observation'} by Dr. ${patient.doctor_name || 'Staff'}.`,
            type: 'start'
        });
    } else {
        historyEvents.push({
            time: 'Recently',
            title: 'Patient Admitted',
            desc: `Admitted for ${patient.diagnosis || 'Observation'}.`,
            type: 'start'
        });
    }

    // 2. Device Link (if active)
    if (patient.device_id) {
        // We don't have exact link *date* in Patient unless we store it. 
        // But we can show it as "Active". If Device has start_time, use that.
        // Note: Device start_time is usually when infusion started.
        // For this demo, let's assume device.start_time is link time.
        // We need to fetch this device from devices prop?
        // HistoryModal doesn't have devices prop. We might need to pass it or mock it.
        // For now, let's just show "Sensor Linked" entry generic or inferred.
        const linkTime = patient.device_link_time
            ? new Date(patient.device_link_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Active Now';

        const linkDate = patient.device_link_time
            ? new Date(patient.device_link_time).toLocaleDateString()
            : '';

        historyEvents.unshift({
            time: linkTime,
            date: linkDate,
            title: 'Sensor Linked',
            desc: `Monitoring via device ${patient.device_id}.`,
            type: 'normal'
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Clock size={20} className="text-indigo-600" />
                            Patient History
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Timeline for {patient.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Timeline */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="relative pl-4 border-l-2 border-indigo-50 space-y-8">
                        {historyEvents.map((event, index) => (
                            <div key={index} className="relative pl-6">
                                {/* Dot */}
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm
                     ${event.type === 'start' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>

                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.time} {event.date && <span className="text-slate-300">| {event.date}</span>}</span>
                                <h4 className={`text-sm font-bold mt-0.5 text-slate-800`}>
                                    {event.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">{event.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <button onClick={onClose} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Close Timeline</button>
                </div>

            </div>
        </div>
    );
};

export default HistoryModal;
