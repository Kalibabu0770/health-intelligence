import React, { useState } from 'react';
import { X, Link, Cpu, QrCode } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, update } from 'firebase/database';

interface SmartBeltPatient {
    id: number;
    name: string;
    age: number;
    device_id?: string;
}

interface LinkProps {
    onClose: () => void;
    patients: Record<string, SmartBeltPatient>;
}

const SmartBeltLinkDeviceModal: React.FC<LinkProps> = ({ onClose, patients }) => {
    const patientsArray = Object.values(patients) as SmartBeltPatient[];
    const unlinkedPatients = patientsArray.filter(p => p.device_id === 'UNLINKED' || !p.device_id);
    
    // Fallback to first available or standard dropdown if DB empty
    const [selectedPatientId, setSelectedPatientId] = useState(unlinkedPatients.length > 0 ? String(unlinkedPatients[0].id) : '');
    const [macAddress, setMacAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!selectedPatientId || !macAddress) return;
            const patientRef = ref(rtdb, `smart_belt_patients/${selectedPatientId}`);
            await update(patientRef, {
                device_id: macAddress.toUpperCase()
            });
            onClose();
        } catch (error) {
            console.error("Error linking device:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md">
                            <Link size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">Device Pairing</h2>
                            <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Attach Wearable to Profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-50">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px]">1</span> 
                            Select Unlinked Patient Profile
                        </label>
                        <select 
                            required
                            value={selectedPatientId}
                            onChange={e => setSelectedPatientId(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-black uppercase tracking-wide px-4 py-3 rounded-xl focus:border-indigo-500 outline-none transition-colors appearance-none"
                        >
                            <option value="" disabled>-- SELECT PATIENT RECORD --</option>
                            {unlinkedPatients.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Age: {p.age})</option>
                            ))}
                            {unlinkedPatients.length === 0 && (
                                <option disabled>NO UNLINKED PATIENTS FOUND</option>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px]">2</span> 
                            Scan or Enter Hardware MAC ID
                        </label>
                        <div className="relative">
                            <Cpu size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                            <input 
                                required
                                type="text"
                                placeholder="E.g., SB-8F:92:00:1A"
                                value={macAddress}
                                onChange={e => setMacAddress(e.target.value.toUpperCase())}
                                className="w-full bg-white border-2 border-indigo-200 text-indigo-900 text-sm font-black uppercase tracking-widest pl-10 pr-10 py-3 rounded-xl focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] outline-none transition-all placeholder:text-indigo-200"
                            />
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-100 transition-colors">
                                <QrCode size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pairing Warning</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                            Once linked, sensor data will immediately begin logging against this patient's medical history for AI review. Ensure correct assignment.
                         </p>
                    </div>

                    <button 
                        disabled={loading || !selectedPatientId || !macAddress}
                        type="submit" 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-[0_10px_20px_rgba(79,70,229,0.25)] transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? 'SECURING LINK...' : <><Link size={16} /> INITIATE TELEMETRY LINK</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SmartBeltLinkDeviceModal;
