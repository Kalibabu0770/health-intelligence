import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Save } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, set } from 'firebase/database';

interface AdmissionProps {
    onClose: () => void;
}

const SmartBeltAdmissionModal: React.FC<AdmissionProps> = ({ onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        stroke_history: false,
        heart_disease_history: false,
        diabetes: false,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const id = Date.now();
            const patientRef = ref(rtdb, `smart_belt_patients/${id}`);
            await set(patientRef, {
                id,
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                device_id: "UNLINKED",
                admitted_at: new Date().toISOString(),
                status: "active",
                stroke_history: formData.stroke_history,
                heart_disease_history: formData.heart_disease_history,
                diabetes: formData.diabetes
            });
            onClose();
        } catch (error) {
            console.error("Error admitting patient:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">Admit New Patient</h2>
                            <p className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Smart Belt Telemetry Registration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Full Legal Name</label>
                            <input 
                                required
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-black uppercase tracking-wide px-4 py-3 rounded-xl focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Age</label>
                            <input 
                                required
                                type="number" 
                                min="1"
                                max="120"
                                value={formData.age}
                                onChange={e => setFormData({...formData, age: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-black uppercase tracking-wide px-4 py-3 rounded-xl focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Sex (Biological)</label>
                            <select 
                                value={formData.gender}
                                onChange={e => setFormData({...formData, gender: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-800 text-sm font-black uppercase tracking-wide px-4 py-3 rounded-xl focus:border-emerald-500 outline-none transition-colors appearance-none"
                            >
                                <option value="Male">MALE</option>
                                <option value="Female">FEMALE</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                         <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={14} className="text-amber-500" />
                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Medical History Context (For AI Baseline)</h4>
                         </div>
                         <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={formData.stroke_history} onChange={e => setFormData({...formData, stroke_history: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
                                <span className="text-xs font-black text-slate-700 uppercase">Prior Stroke History</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={formData.heart_disease_history} onChange={e => setFormData({...formData, heart_disease_history: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
                                <span className="text-xs font-black text-slate-700 uppercase">Congestive Heart Failure / Disease</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={formData.diabetes} onChange={e => setFormData({...formData, diabetes: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
                                <span className="text-xs font-black text-slate-700 uppercase">Type 1 / Type 2 Diabetes</span>
                            </label>
                         </div>
                    </div>

                    <button 
                        disabled={loading}
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
                    >
                        {loading ? 'ADMITTING...' : <><Save size={16} /> CONFIRM ADMISSION</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SmartBeltAdmissionModal;
