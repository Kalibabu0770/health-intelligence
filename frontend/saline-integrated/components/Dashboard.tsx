import React, { useState, useEffect } from 'react';
import {
    Activity,
    Users,
    AlertCircle,
    Wifi,
    Settings,
    Plus,
    Stethoscope,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Edit2,
    Link as LinkIcon,
    Unlink,
    Battery,
    Droplets,
    Timer,
    History,
    Siren,
    Clock,
    ChevronRight,
    Search,
    VolumeX,
    Volume2
} from 'lucide-react';
import { Patient, Device } from '../types/types';
import {
    fetchAdmittedPatients,
    subscribeToDevices,
    setDeviceStatus,
    removeChannel
} from '../services/dataService';
import AdmissionModal from './AdmissionModal';
import PatientDetailsModal from './PatientDetailsModal';
import HistoryModal from './HistoryModal';
import LinkDeviceModal from './LinkDeviceModal';
import SensorManagementModal from './SensorManagementModal';
import DischargedPatientsModal from './DischargedPatientsModal';
import AlarmAudioLock from '../../utils/alarmAudioLock';

const Dashboard: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [devices, setDevices] = useState<Record<string, Device>>({});
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
    const [isSensorManagerOpen, setIsSensorManagerOpen] = useState(false);
    const [isDischargedHistoryOpen, setIsDischargedHistoryOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
    const [linkPatient, setLinkPatient] = useState<Patient | null>(null);

    const loadData = async () => {
        const { data } = await fetchAdmittedPatients();
        if (data) setPatients(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        const unsubscribe = subscribeToDevices((currentDevices) => {
            setDevices(currentDevices);
        });
        return () => removeChannel(unsubscribe);
    }, []);

    // KPIs
    const totalPatients = patients.length;
    const monitoringCount = patients.filter(p => p.device_id).length;
    const criticalPatients = patients.filter(p => {
        if (!p.device_id) return false;
        const device = devices[p.device_id];
        // Alert if sensor says empty OR calculated time is up (Near Empty/Empty)
        return device && (device.is_empty || device.time_remaining === 'Near Empty' || device.time_remaining === 'Empty');
    });
    const criticalCount = criticalPatients.length;
    const criticalNames = criticalPatients.map(p => p.name).join(' and ');
    const sensorCount = Object.keys(devices).length;
    const usedDeviceIds = patients.map(p => p.device_id).filter(Boolean) as string[];

    const [isMuted, setIsMuted] = useState(false);

    // Persistent Alarm is now handled by AlarmAudioLock

    // Text to Speech
    const speakAlert = (text: string) => {
        if (isMuted || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find a natural-sounding Indian Male voice (Mac & Chrome High Quality Voices)
        const voices = window.speechSynthesis.getVoices();
        // Priority 1: Rishi (Mac native Indian Male)
        // Priority 2: Google Telugu (Native Telugu voice, high quality)
        // Priority 3: Any Male Indian English voice
        const preferredVoices = ['Rishi', 'Google Telugu', 'Google Indian English Male', 'Daniel'];
        
        let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
        
        if (!selectedVoice) {
            // Fallback to any Indian voice (te-IN for Telugu, en-IN for Indian English)
            selectedVoice = voices.find(v => v.lang.includes('te-IN') || v.lang.includes('en-IN') && (v.name.includes('Male') || v.name.includes('Rishi')));
        }
        if (!selectedVoice) {
            // Last resort fallback
            selectedVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('Male'));
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            // Force Indian English accent if no specific voice language is bound
            utterance.lang = 'en-IN';
        }

        // Lower pitch for a male voice, slower rate for dramatic, human-like announcement
        utterance.rate = 0.85; 
        utterance.pitch = 0.8; 
        
        window.speechSynthesis.speak(utterance);
    };

    // Alarm Sound Control
    useEffect(() => {
        if (criticalCount > 0 && !isMuted) {
            AlarmAudioLock.play('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', true);
        } else {
            AlarmAudioLock.stop();
        }
    }, [criticalCount, isMuted]);

    // Voice Alert Interval
    useEffect(() => {
        let voiceInterval: any;

        if (criticalCount > 0 && !isMuted && criticalNames) {
            const message = `Saline is empty for ${criticalNames}.`;
            speakAlert(message);
            voiceInterval = setInterval(() => {
                speakAlert(message);
            }, 10000);
        }

        return () => {
            if (voiceInterval) clearInterval(voiceInterval);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, [criticalCount, isMuted, criticalNames]);

    useEffect(() => {
        return () => {
            AlarmAudioLock.stop();
        };
    }, []);

    const handleSimToggle = async (deviceId: string, currentStatus: boolean) => {
        await setDeviceStatus(deviceId, !currentStatus);
    };

    return (
        <div className="flex flex-col min-h-screen font-sans text-slate-800 bg-[#F8FAFC]">

            {/* PREMIUM HEADER */}
            <header className="sticky top-0 z-30 w-full glass border-b border-slate-200/60 shadow-sm transition-all duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Activity size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Nurse Portal</h1>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nurse Login</span>
                        </div>
                    </div>

                    {/* Desktop Status & Actions */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/60">
                            <span className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                ONLINE
                            </span>
                            <span className="h-4 w-[1px] bg-slate-300"></span>
                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                <Wifi size={12} /> Syncing
                            </span>
                        </div>

                        <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>

                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-2 rounded-xl transition-all duration-200 ${isMuted ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        <button
                            onClick={() => setIsSensorManagerOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
                            title="Sensor Settings"
                        >
                            <Settings size={20} />
                        </button>

                        <button
                            onClick={() => setIsDischargedHistoryOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
                            title="Discharged History"
                        >
                            <History size={20} />
                        </button>

                        <button
                            onClick={() => setIsAdmissionOpen(true)}
                            className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-lg shadow-slate-900/10 active:scale-95 hover-card-lift"
                        >
                            <Plus size={16} />
                            <span>Admit Patient</span>
                        </button>

                        {/* Mobile Add Button */}
                        <button
                            onClick={() => setIsAdmissionOpen(true)}
                            className="flex sm:hidden items-center justify-center bg-slate-900 text-white w-8 h-8 rounded-full shadow-lg"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN DASHBOARD */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">

                {/* KPI METRICS */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <PremiumStat label="Total Patients" value={totalPatients} icon={<Users size={18} />} color="indigo" delay={0} />
                    <PremiumStat label="Critical Alerts" value={criticalCount} icon={<AlertCircle size={18} />} color="rose" isCritical={criticalCount > 0} delay={100} />
                    <PremiumStat label="Active Infusions" value={monitoringCount} icon={<Activity size={18} />} color="emerald" delay={200} />
                    <PremiumStat label="Devices Online" value={sensorCount} icon={<Wifi size={18} />} color="blue" delay={300} />
                </section>

                {/* PATIENT LIST HEADER */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Patient Monitoring <span className="text-slate-400 font-medium text-sm">({totalPatients})</span>
                    </h2>
                    {/* Search placeholder */}
                    <div className="flex w-full md:w-auto items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={14} className="text-slate-400" />
                        <input type="text" placeholder="Search patients..." className="text-xs bg-transparent border-none outline-none text-slate-600 placeholder:text-slate-400 w-full md:w-40" />
                    </div>
                </div>

                {/* PATIENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {patients.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400 animate-float">
                                <Stethoscope size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No Patients Found</h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-xs">Start by admitting a new patient to verify the system.</p>
                            <button onClick={() => setIsAdmissionOpen(true)} className="mt-6 text-indigo-600 text-sm font-bold hover:underline">
                                + Admit First Patient
                            </button>
                        </div>
                    ) : (
                        patients.map((patient, index) => {
                            const device = patient.device_id ? devices[patient.device_id] : null;
                            const isCritical = device?.is_empty;
                            const status = device?.status || (patient.device_id ? 'normal' : 'disconnected');
                            // metrics
                            const flowRate = device?.flow_rate || 0;
                            const timeRemaining = device?.time_remaining || '--';

                            // Visual progress
                            // Visual progress
                            const isLow = timeRemaining === 'Near Empty' || timeRemaining === 'Empty';
                            const percentage = device?.percentage !== undefined ? device.percentage : (device ? 100 : 0);
                            const progressWidth = `${percentage}%`;

                            return (
                                <div
                                    key={patient.id}
                                    className={`bg-white rounded-2xl border transition-all duration-300 hover-card-lift flex flex-col overflow-hidden
                                    ${isCritical ? 'border-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.15)] ring-1 ring-rose-100' : 'border-slate-100 shadow-sm hover:border-indigo-100'}`}
                                >
                                    {/* Critical Alert Banner */}
                                    {isCritical && (
                                        <div className="bg-rose-500 text-white text-[10px] font-bold px-4 py-1.5 flex items-center justify-between animate-pulse">
                                            <span className="flex items-center gap-1"><AlertTriangle size={12} /> CRITICAL ALERT</span>
                                            <span>SALINE EMPTY</span>
                                        </div>
                                    )}

                                    <div className="p-5 flex-1 flex flex-col relative">

                                        {/* History Button - Top Right Absolute */}
                                        <button
                                            onClick={() => setHistoryPatient(patient)}
                                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-colors z-10"
                                            title="History Log"
                                        >
                                            <History size={18} />
                                        </button>

                                        {/* Header: Avatar + Name */}
                                        <div className="flex items-center gap-3 mb-4 pr-10">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm transition-colors
                                                ${isCritical ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-600'}`}>
                                                {patient.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-800 leading-tight">{patient.name}</h3>
                                                <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">#{patient.id}</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span>Bed {patient.bed_number || '--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Device Status/Link State */}
                                        <div className="flex-1 mb-4">
                                            {patient.device_id ? (
                                                <div className="space-y-4">
                                                    {/* Vitals Grid */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                <Droplets size={10} /> Rate
                                                            </div>
                                                            <div className="text-sm font-bold text-slate-700">{flowRate} <span className="text-[10px] font-normal text-slate-400">d/min</span></div>
                                                        </div>
                                                        <div className={`rounded-xl p-3 border transition-colors ${isCritical ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${isCritical ? 'text-rose-400' : 'text-indigo-400'}`}>
                                                                <Timer size={10} /> Time Left
                                                            </div>
                                                            <div className={`text-sm font-bold ${isCritical ? 'text-rose-700' : 'text-indigo-700'}`}>
                                                                {timeRemaining}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar (Visual Only) */}
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-medium text-slate-400 mb-1.5">
                                                            <span>Saline Level</span>
                                                            <span className={isCritical ? 'text-rose-500 font-bold' : ''}>{isLow ? 'Low' : 'Normal'}</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-rose-500 w-full animate-pulse' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                                                                style={{ width: isCritical ? '100%' : progressWidth }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                                    <div className="text-slate-400 text-xs font-medium mb-3">No Sensor Linked</div>
                                                    <button
                                                        onClick={() => setLinkPatient(patient)}
                                                        className="group flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 hover:border-indigo-600 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                                                    >
                                                        <LinkIcon size={14} className="group-hover:text-white transition-colors" />
                                                        <span>Link Device</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* EXPLICIT ACTION BUTTONS - SEPARATED */}
                                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                                        <button
                                            onClick={() => setSelectedPatient(patient)}
                                            className="py-3 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit2 size={14} />
                                            Edit Details
                                        </button>

                                        <button
                                            onClick={() => setLinkPatient(patient)}
                                            className={`py-3 text-[10px] sm:text-xs font-bold transition-colors flex items-center justify-center gap-2
                                            ${patient.device_id ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                                        >
                                            {patient.device_id ? <Settings size={14} /> : <LinkIcon size={14} />}
                                            {patient.device_id ? 'Sensor Config' : 'Link Sensor'}
                                        </button>
                                    </div>

                                    {/* Action Footer for Linked Device Only */}
                                    {patient.device_id && (
                                        <div className="bg-slate-50/50 border-t border-slate-100 p-2 text-center">
                                            <button
                                                onClick={() => handleSimToggle(patient.device_id!, devices[patient.device_id!]?.is_empty || false)}
                                                className={`w-full py-1.5 text-[10px] font-bold rounded border transition-all flex items-center justify-center gap-2
                                                ${isCritical ? 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600' : 'bg-amber-50 text-amber-600 border-amber-200/50 hover:bg-amber-100'}`}
                                            >
                                                <AlertTriangle size={12} />
                                                {isCritical ? 'Reset Sensor Status' : 'Simulate Empty Bag'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            </main>

            <AdmissionModal isOpen={isAdmissionOpen} onClose={() => setIsAdmissionOpen(false)} onSuccess={loadData} />
            <PatientDetailsModal isOpen={!!selectedPatient} patient={selectedPatient} devices={devices} usedDeviceIds={usedDeviceIds} onClose={() => setSelectedPatient(null)} onSuccess={loadData} />
            <LinkDeviceModal isOpen={!!linkPatient} patient={linkPatient} devices={devices} usedDeviceIds={usedDeviceIds} onClose={() => setLinkPatient(null)} onSuccess={loadData} />
            <SensorManagementModal isOpen={isSensorManagerOpen} devices={devices} onClose={() => setIsSensorManagerOpen(false)} />
            <HistoryModal isOpen={!!historyPatient} patient={historyPatient} onClose={() => setHistoryPatient(null)} />
            <DischargedPatientsModal isOpen={isDischargedHistoryOpen} onClose={() => setIsDischargedHistoryOpen(false)} />
        </div>
    );
};

// --- Premium Subcomponents ---

const PremiumStat: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; isCritical?: boolean; delay: number }> = ({ label, value, icon, color, isCritical, delay }) => {
    const colors: any = { indigo: 'bg-indigo-500', rose: 'bg-rose-500', emerald: 'bg-emerald-500', blue: 'bg-blue-500' };
    const textColors: any = { indigo: 'text-indigo-600', rose: 'text-rose-600', emerald: 'text-emerald-600', blue: 'text-blue-600' };

    return (
        <div
            className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 flex items-center gap-4 ${isCritical ? 'ring-2 ring-rose-100 border-rose-200' : ''}`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md ${colors[color]} ${isCritical ? 'animate-pulse' : ''}`}>
                {icon}
            </div>
            <div>
                <div className="text-xl font-extrabold text-slate-900 leading-tight">{value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
            </div>
        </div>
    );
};

export default Dashboard;
