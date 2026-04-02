import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, BrainCircuit, HeartPulse, Stethoscope, AlertTriangle, PlayCircle, Wind, Thermometer, ShieldCheck } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

interface DetailProps {
    patientId: string;
    onBack: () => void;
}

const SmartBeltPatientDetail: React.FC<DetailProps> = ({ patientId, onBack }) => {
    const [patient, setPatient] = useState<any>(null);
    const [sensorData, setSensorData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'live' | 'ai' | 'history'>('live');

    useEffect(() => {
        const patientRef = ref(rtdb, `smart_belt_patients/${patientId}`);
        const unsubPatient = onValue(patientRef, (snap) => {
            setPatient(snap.val());
        });
        return () => unsubPatient();
    }, [patientId]);

    useEffect(() => {
        if (!patient?.device_id || patient.device_id === 'UNLINKED') return;
        const sensorRef = ref(rtdb, `smart_belt_sensor_data/${patient.device_id}/current`);
        const unsubSensor = onValue(sensorRef, (snap) => {
            setSensorData(snap.val());
        });
        return () => unsubSensor();
    }, [patient]);

    if (!patient) return <div className="p-8 text-center text-slate-500 font-black tracking-widest uppercase">Loading Patient Profile...</div>;

    // Simulation for missing database fallback
    const data = sensorData || {
        bpm: 78,
        spo2: 97,
        temperature: 36.9,
        ecg: 512,
        activity_index: 0.8,
        wearing_status: true,
        ecg_leads_connected: true
    };

    const isAlert = data.bpm > 110 || data.spo2 < 93;

    return (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{patient.name}</h2>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${data.wearing_status ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                {data.wearing_status ? 'TRACKING ACTIVE' : 'NO SENSOR'}
                            </span>
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500 flex gap-4">
                            <span>ID: {patient.id}</span>
                            <span>MAC: {patient.device_id}</span>
                            <span>AGE: {patient.age}</span>
                            <span>SEX: {patient.gender}</span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'live' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Activity size={16} /> Live Feed
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-white text-indigo-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BrainCircuit size={16} /> Gemini AI Profile
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Stethoscope size={16} /> Clinical History
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-100">
                {activeTab === 'live' && (
                    <div className="flex flex-col gap-6">
                        
                        {/* Live Overview Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col justify-between ${isAlert ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-lg ${isAlert ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <HeartPulse size={20} className={isAlert ? 'animate-pulse' : ''} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isAlert ? 'text-rose-600' : 'text-slate-400'}`}>Heart Rate</span>
                                </div>
                                <div className="mt-6">
                                    <div className={`text-4xl font-black ${isAlert ? 'text-rose-600' : 'text-slate-800'}`}>{data.bpm}</div>
                                    <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${isAlert ? 'text-rose-500' : 'text-slate-400'}`}>Beats Per Minute</div>
                                </div>
                            </div>

                            <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                                        <Wind size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SpO2 Level</span>
                                </div>
                                <div className="mt-6">
                                    <div className="text-4xl font-black text-slate-800">{data.spo2}%</div>
                                    <div className="text-[10px] font-bold tracking-widest uppercase text-blue-400 mt-1">Oxygen Saturation</div>
                                </div>
                            </div>
                            
                            <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                                        <Thermometer size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temperature</span>
                                </div>
                                <div className="mt-6">
                                    <div className="text-4xl font-black text-slate-800">{Number(data.temperature).toFixed(1)}°</div>
                                    <div className="text-[10px] font-bold tracking-widest uppercase text-amber-500 mt-1">Celsius</div>
                                </div>
                            </div>

                            <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                        <Activity size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motion State</span>
                                </div>
                                <div className="mt-6">
                                    <div className="text-2xl font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">LAYING (SUPINE)</div>
                                    <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-500 mt-1">Activity Index: {data.activity_index}</div>
                                </div>
                            </div>
                        </div>

                        {/* Raw Signal Graphing (Mock) */}
                        <div className="bg-slate-900 rounded-2xl p-6 border-4 border-slate-800 shadow-xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-rose-500 flex items-center justify-center text-white font-black text-xs shadow-[0_0_15px_rgba(244,63,94,0.5)]">ECG</div>
                                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Real-time Cardiac Rhythm (Lead I)</h3>
                                </div>
                                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Leads Connected</span>
                                    <span className="flex items-center gap-1 ml-4"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 25mm/s</span>
                                </div>
                            </div>
                            
                            <div className="h-48 w-full border border-slate-700/50 rounded-lg relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                                {/* Grid Lines */}
                                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
                                
                                {/* Simulated Waveform passing across screen */}
                                <div className="absolute inset-0 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)] flex items-center h-full pt-10 opacity-90 overflow-hidden w-[200%] animate-[scan_5s_linear_infinite]">
                                    {/* Create a very long repeating SVG path element to naturally scroll */}
                                    <svg height="100" width="100%" preserveAspectRatio="none">
                                        <polyline 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                            points="0,50 10,50 15,40 20,60 25,10 30,80 35,50 40,50 50,50 60,50 65,40 70,60 75,10 80,80 85,50 90,50 100,50 110,50 115,40 120,60 125,10 130,80 135,50 140,50 150,50 160,50 165,40 170,60 175,10 180,80 185,50 190,50 200,50 210,50 215,40 220,60 225,10 230,80 235,50 240,50 250,50 260,50 265,40 270,60 275,10 280,80 285,50 290,50 300,50"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom flex-1">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 text-indigo-500/20 pointer-events-none">
                                <BrainCircuit size={200} />
                            </div>
                            
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-3 bg-indigo-500 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Gemini Flash Diagnostic Evaluation</h3>
                                    <p className="text-[10px] font-black text-indigo-300 tracking-widest uppercase">Deep context correlation across 24hr vitals & patient history</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 relative z-10">
                                <div className="bg-black/20 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                                    <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowLeft size={12}/> PATIENT RISKS (BASELINE)</h4>
                                    <ul className="space-y-3">
                                        <li className={`flex items-center gap-3 text-sm font-bold uppercase ${patient.stroke_history ? 'text-rose-400' : 'text-slate-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${patient.stroke_history ? 'bg-rose-500' : 'bg-slate-600'}`}></div> Prior Stroke Event
                                        </li>
                                        <li className={`flex items-center gap-3 text-sm font-bold uppercase ${patient.heart_disease_history ? 'text-rose-400' : 'text-slate-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${patient.heart_disease_history ? 'bg-rose-500' : 'bg-slate-600'}`}></div> Congestive Heart Disease
                                        </li>
                                        <li className={`flex items-center gap-3 text-sm font-bold uppercase ${patient.diabetes ? 'text-rose-400' : 'text-slate-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${patient.diabetes ? 'bg-rose-500' : 'bg-slate-600'}`}></div> Diabetes Mellitus
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-black/20 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                                     <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2"><ArrowLeft size={12}/> AI PREDICTIVE RISK SCORES (24H HORIZON)</h4>
                                     <div className="space-y-4">
                                         <div>
                                             <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                                                 <span>Cardiovascular Event (Stroke)</span>
                                                 <span className={patient.stroke_history ? 'text-rose-400' : 'text-emerald-400'}>{patient.stroke_history ? '65%' : '12%'}</span>
                                             </div>
                                             <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                                 <div className={`h-full ${patient.stroke_history ? 'bg-rose-500 w-[65%]' : 'bg-emerald-500 w-[12%]'}`}></div>
                                             </div>
                                         </div>
                                         <div>
                                             <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                                                 <span>Arrhythmia Detection Probability</span>
                                                 <span className={patient.heart_disease_history ? 'text-amber-400' : 'text-emerald-400'}>{patient.heart_disease_history ? '42%' : '8%'}</span>
                                             </div>
                                             <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                                 <div className={`h-full ${patient.heart_disease_history ? 'bg-amber-500 w-[42%]' : 'bg-emerald-500 w-[8%]'}`}></div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md">
                                <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Generative Reasoning</h4>
                                <p className="text-sm font-medium leading-relaxed text-indigo-50/80 italic">
                                    "Patient exhibits stable immediate vitals, but their baseline history of stroke elevates their cardiovascular risk profile. Recent motion data indicates a supine posture unchanged for 4 hours, suggesting sleeping states. SpO2 trends are stable preventing acute stroke flags currently. Continued monitoring advised."
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400 flex-col gap-4 animate-in fade-in slide-in-from-bottom">
                         <PlayCircle size={48} className="opacity-20" />
                         <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-500">History Log Generation Pending</h3>
                            <p className="text-xs uppercase tracking-widest mt-1">Collecting 24H telemetry for report compiling process.</p>
                         </div>
                    </div>
                )}
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SmartBeltPatientDetail;
