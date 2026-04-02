import React, { useState, useEffect } from 'react';
import { HeartPulse, Droplets, Activity, AlertCircle, CheckCircle, Search, Users, ShieldAlert, Bot, ArrowLeft, ArrowRight, Wind, Droplet, Thermometer, Orbit } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { rtdb } from '../services/firebase';
import { ref, onValue, set, update } from 'firebase/database';

import SmartBeltDashboard from './SmartBeltDashboard';
import SalineDashboard from './SalineDashboard';

// Helper function to synthesize speech
const speakAlert = (text: string) => {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech to prioritize the current alert
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        // Optionally set voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English'));
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }
        window.speechSynthesis.speak(utterance);
    }
};

const NurseDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { profile } = usePatientContext();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'overview' | 'belt' | 'saline'>('overview');
    const [salineData, setSalineData] = useState<any>({});
    const [beltData, setBeltData] = useState<any>({});
    const [alerts, setAlerts] = useState<any[]>([]);
    
    // Audio Context state
    const [isMuted, setIsMuted] = useState(false);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const oscillatorRef = React.useRef<OscillatorNode | null>(null);
    const gainNodeRef = React.useRef<GainNode | null>(null);

    // Initialize or resume audio context logic
    const initAudio = () => {
        if (!audioContextRef.current) {
            const ctx = new window.AudioContext();
            audioContextRef.current = ctx;
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    // Siren Generator
    const startSiren = React.useCallback(() => {
        if (isMuted) return;
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (!oscillatorRef.current && ctx.state === 'running') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            // Classic two-tone siren
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(800, ctx.currentTime + 0.5);
            
            // Loop the siren frequencies
            setInterval(() => {
                if (oscillatorRef.current) {
                   const currTime = audioContextRef.current!.currentTime;
                   osc.frequency.setValueAtTime(600, currTime);
                   osc.frequency.setValueAtTime(800, currTime + 0.5);
                }
            }, 1000);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            oscillatorRef.current = osc;
            gainNodeRef.current = gain;
        }
    }, [isMuted]);

    const stopSiren = React.useCallback(() => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
            oscillatorRef.current = null;
        }
        if (gainNodeRef.current) {
            gainNodeRef.current.disconnect();
            gainNodeRef.current = null;
        }
    }, []);

    // Check critical state across all beds
    useEffect(() => {
        let isAnyCritical = false;
        let ttsAnnounced = false;

        // Check Smart Belt Alerts array
        const unacknowledgedBeltAlerts = alerts.filter(a => !a.acknowledged);
        if (unacknowledgedBeltAlerts.length > 0) {
            isAnyCritical = true;
            if (!ttsAnnounced && !isMuted) {
                const criticalAlert = unacknowledgedBeltAlerts[0];
                speakAlert(`Emergency alert. Patient ${criticalAlert.patient_id}. ${criticalAlert.message}`);
                ttsAnnounced = true;
            }
        }

        // Check Saline Status
        Object.keys(salineData).forEach(bed => {
            if (salineData[bed]?.is_empty) {
                isAnyCritical = true;
                if (!ttsAnnounced && !isMuted) {
                    speakAlert(`Saline alert. Patient ${bed}. IV Bag is empty and clamped.`);
                    ttsAnnounced = true;
                }
            }
        });

        if (isAnyCritical && !isMuted) {
            startSiren();
        } else {
            stopSiren();
        }

        return () => { stopSiren(); };
    }, [alerts, salineData, isMuted, startSiren, stopSiren]);

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Firebase Listeners for Saline & Belt (Simulation fallback if no data)
    useEffect(() => {
        // Listen to Saline Status
        const salineRef = ref(rtdb, 'saline_status');
        const unsubSaline = onValue(salineRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setSalineData(data);
        });

        // Listen to Smart Belt Data
        const beltRef = ref(rtdb, 'smart_belt_sensor_data');
        const unsubBelt = onValue(beltRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setBeltData(data);
        });

        // Deep Predictive Alerts
        const alertsRef = ref(rtdb, 'smart_belt_alerts');
        const unsubAlerts = onValue(alertsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array and sort
                const alertsArray = Object.values(data).sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setAlerts(alertsArray);
            }
        });

        return () => {
            unsubSaline();
            unsubBelt();
            unsubAlerts();
        };
    }, []);

    const acknowledgeAlert = (alertId: string) => {
        const alertRef = ref(rtdb, `smart_belt_alerts/${alertId}`);
        update(alertRef, { acknowledged: true, acknowledged_at: new Date().toISOString() });
        // Ensure audio resumes context on user interaction
        initAudio();
    };

    // Simulated local data for visual representation if Firebase is empty
    const activeBeds = Object.keys(salineData).length > 0 ? Object.keys(salineData) : ['BED-01', 'BED-02', 'BED-03'];

    const getSimulatedVitals = (bed: string) => {
        if (beltData[bed]) return beltData[bed];
        // Fallback simulation
        const seed = parseInt(bed.replace(/\D/g, '') || '1');
        return {
            heart_rate: 75 + (seed * 2) + Math.floor(Math.random() * 5 - 2),
            spo2: 98 - (seed === 2 ? Math.floor(Math.random() * 4) : 0), // Bed 2 has slight drops
            temperature: 36.5 + (seed * 0.2),
            risk_score: seed === 3 ? 45 : 12,
            anomaly_detected: seed === 3
        };
    };

    const getSalineStatus = (bed: string) => {
        if (salineData[bed]) return salineData[bed];
        // Fallback simulation
        const isBed3 = bed === 'BED-03';
        return {
            is_empty: isBed3,
            vol_ml: isBed3 ? 0 : 350,
            flow_rate: isBed3 ? 0 : 45
        };
    };

    return (
        <div className="h-screen w-screen bg-slate-50 overflow-hidden flex flex-col font-sans text-slate-900 border-4 border-emerald-600 box-border p-2">
            
            {/* ICU Top Navigation / Header */}
            <div className="bg-white rounded-xl p-4 flex justify-between items-center shadow-xl mb-2 border border-slate-200">
                <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <HeartPulse size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 italic">Health Intelligence <span className="text-emerald-500">AI</span></h1>
                        <p className="text-[10px] font-black tracking-[0.3em] text-emerald-600">ICU NURSE COMMAND PROTOCOL</p>
                    </div>
                </div>

                {/* Patient/Nurse Info Context */}
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setIsMuted(!isMuted)} 
                        className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors ${isMuted ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-transparent'}`}
                    >
                        {isMuted ? 'Siren Muted' : 'Mute Sirens'}
                    </button>
                    <div className="text-right">
                        <div className="text-sm font-black text-slate-800">{currentTime.toLocaleTimeString()}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentTime.toLocaleDateString()}</div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Nurse: {profile?.name || 'Authorized RN'}</h3>
                            <button onClick={onLogout} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600">Secure Logout</button>
                        </div>
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 border border-slate-200">
                            {profile?.name?.charAt(0) || 'RN'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main ICU Dashboard Area */}
            {/* Module Tabs */}
            <div className="flex gap-4 mb-2">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-emerald-600'}`}
                >
                    <Orbit size={18} /> Central Overview
                </button>
                <button 
                    onClick={() => setActiveTab('belt')}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'belt' ? 'bg-rose-500 text-white shadow-lg scale-[1.02]' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-rose-500'}`}
                >
                    <Activity size={18} /> Smart Belt Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('saline')}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'saline' ? 'bg-blue-500 text-white shadow-lg scale-[1.02]' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-blue-500'}`}
                >
                    <Droplets size={18} /> Saline Dashboard
                </button>
            </div>

            <div className="flex-1 flex gap-2 overflow-hidden">
                
                {/* Active Floor Overview */}
                <div className="flex-1 flex flex-col gap-2">
                    {/* Live Alert Ticker */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm shrink-0">
                        <AlertCircle className="text-amber-500 animate-pulse" size={18} />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">System Status:</span>
                        <div className="flex-1 overflow-hidden relative h-4">
                            <div className="absolute whitespace-nowrap text-[10px] font-bold text-slate-600 animate-[marquee_15s_linear_infinite]">
                                ALL NODE METRICS STABLE • AWAITING ANOMALY DETECTION • SALINE CLAMPING SYSTEMS ONLINE
                            </div>
                        </div>
                    </div>

                    {/* Main UI Body switching logic */}
                    {activeTab === 'overview' && (
                       <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                        {activeBeds.map(bed => {
                            const vitals = getSimulatedVitals(bed);
                            const saline = getSalineStatus(bed);
                            const isCritical = (activeTab !== 'saline' && vitals.anomaly_detected) || (activeTab !== 'belt' && saline.is_empty);

                            return (
                                <div key={bed} className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden group ${isCritical ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.15)] bg-rose-50' : 'border-slate-200 hover:border-emerald-500'}`}>
                                    
                                    {isCritical && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse" />
                                    )}

                                    {/* Bed Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-sm border ${isCritical ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                {bed.replace('BED-', '')}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-tighter text-slate-800">Patient {bed}</h3>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeTab === 'saline' ? (saline.is_empty ? 'bg-rose-500 animate-pulse' : 'bg-blue-500') : (vitals.anomaly_detected ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500')}`} />
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                        {activeTab === 'saline' ? 'Saline Monitored' : 'Smart Belt Active'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {activeTab !== 'saline' && (
                                            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${vitals.risk_score > 40 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                Risk: {vitals.risk_score}%
                                            </div>
                                        )}
                                        {activeTab === 'saline' && (
                                            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${saline.is_empty ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                                Status: {saline.is_empty ? 'CRITICAL' : 'OK'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Smart Belt Vitals */}
                                    {activeTab !== 'saline' && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
                                                    <HeartPulse size={12} className="absolute top-2 left-2 text-rose-400" />
                                                    <div className="text-xl font-black text-slate-800">{vitals.heart_rate}</div>
                                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">BPM</div>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
                                                    <Wind size={12} className="absolute top-2 left-2 text-blue-400" />
                                                    <div className="text-xl font-black text-slate-800">{vitals.spo2}%</div>
                                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">SpO2</div>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
                                                    <Thermometer size={12} className="absolute top-2 left-2 text-amber-500" />
                                                    <div className="text-xl font-black text-slate-800">{vitals.temperature.toFixed(1)}</div>
                                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">°C</div>
                                                </div>
                                            </div>

                                            {/* ECG Simulation Wave */}
                                            <div className="h-10 bg-slate-50 rounded-lg relative overflow-hidden border border-slate-200 flex items-center px-1">
                                                <div className={`w-full h-full flex items-center opacity-70 ${isCritical ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                                                        <polyline 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            strokeWidth="1.5" 
                                                            points="0,10 15,10 20,5 25,15 30,2 35,18 40,8 45,10 60,10 65,5 70,15 75,2 80,18 85,8 90,10 100,10"
                                                            className="origin-left"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-50/90 w-full animate-[scan_2s_linear_infinite]" />
                                            </div>
                                            
                                            {/* Expanded Belt Details */}
                                            {activeTab === 'belt' && (
                                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex justify-between items-center text-xs font-black uppercase text-rose-600 mt-2">
                                                    <span className="flex items-center gap-2"><Activity size={14} /> Motion: STABLE</span>
                                                    <span className="flex items-center gap-2"><Orbit size={14} /> Posture: SUPINE</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Saline IV System Module */}
                                    {activeTab !== 'belt' && (
                                        <>
                                            <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${saline.is_empty ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${saline.is_empty ? 'bg-rose-100 text-rose-500' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
                                                        <Droplet size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">IV Saline Link</div>
                                                        <div className={`text-xs font-black uppercase tracking-tight ${saline.is_empty ? 'text-rose-600' : 'text-slate-800'}`}>
                                                            {saline.is_empty ? 'DEPLETED & CLAMPED' : `${saline.vol_ml}ml REMAINING`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!saline.is_empty && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black text-slate-500 block uppercase">Flow Limit</span>
                                                        <span className="text-xs font-black text-emerald-600">{saline.flow_rate} d/m</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Saline Details */}
                                            {activeTab === 'saline' && (
                                                <div className={`flex-1 flex flex-col gap-3 justify-center items-center mt-2 p-6 rounded-xl border transition-colors ${saline.is_empty ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                    <Orbit size={40} className={`${!saline.is_empty ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                                                    <span className="text-sm font-black uppercase tracking-widest text-center mt-2">
                                                        {saline.is_empty ? 'VALVE SECURED\nREQUIRE RN ASSIST' : 'SYSTEM AUTO-REGULATING FLOW'}
                                                    </span>
                                                    {!saline.is_empty && (
                                                        <div className="w-full bg-blue-200/50 rounded-full h-1 mt-2 overflow-hidden relative">
                                                            <div className="absolute inset-0 bg-blue-500 w-1/2 animate-[scan_2s_ease-in-out_infinite]" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                </div>
                            );
                        })}
                       </div>
                    )}
                    {activeTab === 'belt' && <SmartBeltDashboard />}
                    {activeTab === 'saline' && <SalineDashboard />}
                </div>

                {/* Right Alert Sidebar */}
                <div className="w-80 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-sm">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h2 className="text-sm font-black uppercase text-slate-800 tracking-tighter">Emergency Alert Log</h2>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Awaiting Resolution</p>
                        </div>
                        <ShieldAlert size={18} className="text-rose-500" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {/* Example critical unacknowledged alert */}
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-widest">CRITICAL - STROKE</span>
                                <span className="text-[9px] text-slate-500 uppercase font-bold text-right pt-0.5">2 Mins Ago</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">BED-03: High Stroke Probability</h4>
                            <p className="text-[10px] text-slate-600 font-medium leading-relaxed mb-3">AI Multiplier activated due to severe SpO2 drop paired with erratic MPU6050 motion.</p>
                            
                            <button className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                <CheckCircle size={14} /> Acknowledge Alert
                            </button>
                        </div>

                         {/* Example Saline Alert */}
                         <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase tracking-widest">FLOW BLOCKED</span>
                                <span className="text-[9px] text-slate-500 uppercase font-bold text-right pt-0.5">14 Mins Ago</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">BED-02: IV Bag Depleted</h4>
                            <p className="text-[10px] text-slate-600 font-medium leading-relaxed mb-3">XKC-Y25 non-contact sensor triggered. Auto-clamp initiated immediately.</p>
                            
                            <button className="w-full py-2 border border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                Log & Dismiss
                            </button>
                        </div>

                        {alerts.length === 0 && (
                            <div className="p-8 flex flex-col items-center justify-center text-center opacity-75">
                                <CheckCircle size={32} className="text-emerald-500 mb-3" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">No Active Alerts</span>
                            </div>
                        )}
                        
                        {alerts.map((alert: any, idx: number) => (
                             <div key={idx} className={`rounded-xl p-4 shadow-sm border ${!alert.acknowledged ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 text-white rounded text-[8px] font-black uppercase tracking-widest ${!alert.acknowledged ? 'bg-rose-500' : 'bg-slate-400'}`}>
                                        {alert.alert_type}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Patient {alert.patient_id}</h4>
                                <p className="text-[10px] text-slate-600 font-medium leading-relaxed mb-3">{alert.message}</p>
                                
                                {!alert.acknowledged && (
                                    <button onClick={() => acknowledgeAlert(alert.alertKey)} className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                        <CheckCircle size={14} /> Acknowledge Alert
                                    </button>
                                )}
                             </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Aesthetics Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }

                @keyframes scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default NurseDashboard;
