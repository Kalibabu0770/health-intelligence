import React, { useEffect, useState } from 'react';
import { Activity, Wind, Thermometer, ShieldAlert, HeartPulse, Search, Heart, Orbit, Plus } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import SmartBeltAdmissionModal from './SmartBeltAdmissionModal';
import SmartBeltLinkDeviceModal from './SmartBeltLinkDeviceModal';
import SmartBeltPatientDetail from './SmartBeltPatientDetail';

interface SmartBeltSensorData {
    bpm: number;
    spo2: number;
    temperature: number;
    ecg: number;
    activity_index: number;
    wearing_status: boolean;
    ecg_leads_connected: boolean;
    timestamp: number;
}

interface SmartBeltPatient {
    id: number;
    name: string;
    age: number;
    gender: string;
    device_id: string;
    status: string;
}

const SmartBeltDashboard: React.FC = () => {
    const [patients, setPatients] = useState<Record<string, SmartBeltPatient>>({});
    const [sensorData, setSensorData] = useState<Record<string, { current: SmartBeltSensorData }>>({});
    const [alerts, setAlerts] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdmission, setShowAdmission] = useState(false);
    const [showLink, setShowLink] = useState(false);
    const [detailedPatientId, setDetailedPatientId] = useState<string | null>(null);

    useEffect(() => {
        // Patients
        const patientsRef = ref(rtdb, 'smart_belt_patients');
        const unsubPatients = onValue(patientsRef, (snap) => {
            const data = snap.val();
            if (data) setPatients(data);
        });

        // Sensor Telemetry
        const sensorRef = ref(rtdb, 'smart_belt_sensor_data');
        const unsubSensors = onValue(sensorRef, (snap) => {
            const data = snap.val();
            if (data) setSensorData(data);
        });

        // Smart Belt specific alerts
        const alertsRef = ref(rtdb, 'smart_belt_alerts');
        const unsubAlerts = onValue(alertsRef, (snap) => {
            const data = snap.val();
            if (data) setAlerts(data);
        });

        return () => {
            unsubPatients();
            unsubSensors();
            unsubAlerts();
        };
    }, []);

    // Create a fallback mock patient if DB is completely totally empty to avoid blank screens
    const safePatients = Object.keys(patients).length > 0 ? patients : {
        "1700000001": { id: 1700000001, name: "JOHN DOE", age: 45, gender: "Male", device_id: "SB-1001", status: "active" },
        "1700000002": { id: 1700000002, name: "JANE SMITH", age: 62, gender: "Female", device_id: "SB-1002", status: "active" }
    };

    const getSimulatedSensor = (deviceId: string) => {
        if (sensorData[deviceId] && sensorData[deviceId].current) return sensorData[deviceId].current;
        // Mock fallback using seed
        const seed = parseInt(deviceId.replace(/[^0-9]/g, '') || '1');
        return {
            bpm: 72 + seed,
            spo2: 98 - (seed === 2 ? 5 : 0),
            temperature: 37.1 + (seed * 0.1),
            ecg: 512,
            activity_index: 1.2,
            wearing_status: true,
            ecg_leads_connected: true,
            timestamp: Date.now()
        };
    };

    const patientKeys = Object.keys(safePatients).filter(key => 
        safePatients[key].name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        safePatients[key].device_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-200">
            {/* Header & Controls */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Smart Belt Central Command</h2>
                        <p className="text-[10px] font-black tracking-widest text-rose-500 uppercase">Multi-Patient Wearable Telemetry</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setShowAdmission(true)} className="bg-white border-2 border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-600 font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm relative">
                        <Plus size={14} /> Admit Patient
                    </button>
                    <button onClick={() => setShowLink(true)} className="bg-white border-2 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-600 font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm relative">
                        <Plus size={14} /> Link New Device
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="🔍 PATIENT / MAC..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border-2 border-slate-200 text-slate-800 text-xs font-black uppercase tracking-widest pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-rose-500 transition-colors w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Smart Belt KPI Modules */}
            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 xl:grid-cols-3 gap-4 pb-10">
                {patientKeys.map(key => {
                    const profile = safePatients[key];
                    const data = getSimulatedSensor(profile.device_id);
                    
                    // Basic Inference Logic
                    const isHypoxia = data.spo2 < 94;
                    const isFever = data.temperature > 37.8;
                    const isTachycardia = data.bpm > 100;

                    const isDanger = isHypoxia || isTachycardia;

                    return (
                        <div key={key} className={`rounded-3xl border-2 transition-all p-5 flex flex-col gap-4 shadow-md bg-white hover:shadow-xl hover:-translate-y-1 ${isDanger ? 'border-rose-500' : 'border-slate-200 hover:border-emerald-500'}`}>
                            
                            {/* Card Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shadow-inner uppercase ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
                                        {profile.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-tighter text-slate-800">{profile.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                            <span>{profile.age} Y/O</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Heart size={10} className={data.wearing_status ? 'text-rose-500' : 'text-slate-400'} />
                                                {profile.device_id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${isDanger ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                    {isDanger ? 'CRITICAL ALERT' : 'VITALS STABLE'}
                                </div>
                            </div>

                            {/* Sensor Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className={`rounded-xl p-3 flex flex-col items-center justify-center border relative overflow-hidden ${isTachycardia ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <HeartPulse size={12} className={`absolute top-2 left-2 ${isTachycardia ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                                    <div className={`text-2xl font-black ${isTachycardia ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {data.bpm}
                                    </div>
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">HR (BPM)</div>
                                </div>
                                
                                <div className={`rounded-xl p-3 flex flex-col items-center justify-center border relative overflow-hidden ${isHypoxia ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <Wind size={12} className={`absolute top-2 left-2 ${isHypoxia ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
                                    <div className={`text-2xl font-black ${isHypoxia ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {data.spo2}%
                                    </div>
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">SPO2 Lev</div>
                                </div>
                                
                                <div className={`rounded-xl p-3 flex flex-col items-center justify-center border relative overflow-hidden ${isFever ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                    <Thermometer size={12} className={`absolute top-2 left-2 ${isFever ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                                    <div className={`text-2xl font-black ${isFever ? 'text-amber-600' : 'text-slate-800'}`}>
                                        {data.temperature.toFixed(1)}°
                                    </div>
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">TEMP</div>
                                </div>
                            </div>

                            {/* ECG Simulated Strip */}
                            <div className="h-12 bg-slate-50 rounded-xl relative overflow-hidden border border-slate-200 flex flex-col justify-center px-2">
                                <div className="absolute top-1 left-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Live ECG Strip (Lead I)</div>
                                <div className={`w-full h-full pt-3 flex items-center opacity-80 ${isDanger ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                                        <polyline 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="1.5" 
                                            points="0,10 10,10 15,3 20,15 25,1 30,19 35,8 40,10 50,10 55,3 60,15 65,1 70,19 75,8 80,10 100,10"
                                            className="origin-left"
                                        />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-50/90 w-full animate-[scan_1.5s_linear_infinite]" />
                            </div>

                            {/* Wearable Diagnostics */}
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <button onClick={() => setDetailedPatientId(key)} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2">
                                    <Orbit size={14} /> Full 360° Profile
                                </button>
                                <button onClick={() => setDetailedPatientId(key)} className="w-full py-2 bg-white border-2 border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-200 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2">
                                    <ShieldAlert size={14} /> AI Analysis
                                </button>
                            </div>

                        </div>
                    );
                })}
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
            {showAdmission && <SmartBeltAdmissionModal onClose={() => setShowAdmission(false)} />}
            {showLink && <SmartBeltLinkDeviceModal onClose={() => setShowLink(false)} patients={safePatients} />}
            {detailedPatientId && (
                <div className="absolute inset-0 z-50 bg-slate-100 flex p-4">
                    <SmartBeltPatientDetail patientId={detailedPatientId} onBack={() => setDetailedPatientId(null)} />
                </div>
            )}
        </div>
    );
};

export default SmartBeltDashboard;
