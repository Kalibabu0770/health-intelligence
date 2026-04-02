import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity,
    Users,
    AlertCircle,
    Wifi,
    Settings,
    Plus,
    Search,
    ArrowLeft,
    Brain,
    Zap,
    History
} from 'lucide-react';
import SmartBeltPatientDetail from './SmartBeltPatientDetail';
import SmartBeltSettingsModal from './SmartBeltSettingsModal';
import SmartBeltPatientCard from './SmartBeltPatientCard';
import AlertManager from './AlertManager';
import SmartBeltAdmissionModal from './SmartBeltAdmissionModal';
import SmartBeltLinkDeviceModal from './SmartBeltLinkDeviceModal';

// Import Smart Belt Firebase services (NOT Saline services!)
import {
    getActiveSmartBeltPatients,
    deleteSmartBeltPatient,
    subscribeToSmartBeltPatients
} from '../services/smartBeltPatientService';
import { getBeltIdForPatient, getBeltStatusSummary } from '../services/healthDataService';
import { SmartBeltPatient } from '../types';
import { ref, onValue } from 'firebase/database';
import { database } from '../../services/firebaseConfig';

const SmartBeltDashboard: React.FC = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [linkPatient, setLinkPatient] = useState<any | null>(null);
    const [editingPatient, setEditingPatient] = useState<any | null>(null); // State for editing
    const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
    const [patients, setPatients] = useState<SmartBeltPatient[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [aiServerStatus, setAiServerStatus] = useState<'online' | 'offline'>('offline');

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Smart Belt patients from Firebase
            const data = await getActiveSmartBeltPatients();
            setPatients(data);
        } catch (error) {
            console.error('[Smart Belt Dashboard] Error loading patients:', error);
        }
        setLoading(false);
    };

    // Real-time AI Server heartbeat check
    useEffect(() => {
        const statusRef = ref(database, 'server_status/ai');
        const unsubscribe = onValue(statusRef, (snapshot: any) => {
            const val = snapshot.val();
            if (val && val.last_seen && (Date.now() - val.last_seen < 15000)) {
                setAiServerStatus('online');
            } else {
                setAiServerStatus('offline');
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        loadData();

        // Subscribe to real-time Smart Belt patient updates
        const subscription = subscribeToSmartBeltPatients((updatedPatients) => {
            setPatients(updatedPatients);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const filteredPatients = useMemo(() => {
        if (!patients) return [];
        return patients.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.bed_number && p.bed_number.includes(searchQuery))
        );
    }, [patients, searchQuery]);

    const summary = useMemo(() => {
        if (!patients) return { totalPatients: 0, activeBelts: 0, criticalAlerts: 0, onlineDevices: 0, aiRiskLevel: 'LOW' };
        return getBeltStatusSummary(patients || [], []);
    }, [patients]);

    if (viewMode === 'detail' && selectedPatient) {
        return <SmartBeltPatientDetail patient={selectedPatient} onBack={() => { setViewMode('grid'); setSelectedPatient(null); }} />;
    }

    const handleEdit = (patient: any) => {
        setEditingPatient(patient);
        setIsAdmissionOpen(true);
    };

    const handleCloseAdmission = () => {
        setIsAdmissionOpen(false);
        setEditingPatient(null);
    };

    const handleAdmissionSuccess = () => {
        // Patient will be automatically updated via real-time subscription
        // Just reload to be sure
        loadData();
        handleCloseAdmission();
    };

    return (
        <div className="flex flex-col min-h-full font-sans text-slate-800">
            <SmartBeltSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SmartBeltAdmissionModal
                isOpen={isAdmissionOpen}
                onClose={handleCloseAdmission}
                onPatientCreated={handleAdmissionSuccess}
                initialData={editingPatient || undefined}
            />
            <SmartBeltLinkDeviceModal isOpen={!!linkPatient} patient={linkPatient} onClose={() => setLinkPatient(null)} onSuccess={loadData} />
            <AlertManager />

            {/* Dashboard Sub-Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                        Health Monitoring <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-2xl text-xs uppercase tracking-[0.2em] font-black border border-indigo-100/50">Enterprise</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                        {aiServerStatus === 'online' ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-[10px] uppercase">
                                <Activity size={12} className="animate-pulse" /> AI Neural Engine Online
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-rose-500 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 text-[10px] uppercase">
                                <AlertCircle size={12} /> AI Engine Offline
                            </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 italic text-xs">Real-time telemetry stream via Firebase Realtime Bus</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setEditingPatient(null); setIsAdmissionOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> Admit & Link Patient
                    </button>
                </div>
            </div>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">

                {/* KPI METRICS */}
                <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <PremiumStat label="Total Patients" value={summary.totalPatients} icon={<Users size={18} />} color="indigo" delay={0} />
                    <PremiumStat label="Active Belts" value={summary.activeBelts} icon={<Zap size={18} />} color="emerald" delay={100} />
                    <PremiumStat label="Critical Alerts" value={summary.criticalAlerts} icon={<AlertCircle size={18} />} color="rose" isCritical={summary.criticalAlerts > 0} delay={200} />
                    <PremiumStat label="Online Devices" value={summary.onlineDevices} icon={<Wifi size={18} />} color="blue" delay={300} />
                    <PremiumStat label="AI Risk Summary" value={summary.aiRiskLevel} icon={<Brain size={18} />} color="purple" delay={400} />
                </section>

                {/* SEARCH AND GRID HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        Monitoring Fleet <span className="text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-lg text-xs font-bold tracking-tight">ONLINE • {filteredPatients.length}</span>
                    </h2>
                    <div className="flex w-full md:w-80 items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all group">
                        <Search size={18} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or bed..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-sm font-bold bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-300 w-full"
                        />
                    </div>
                </div>

                {/* PATIENT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPatients.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400 animate-float">
                                <Activity size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No Patients in Fleet</h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-xs">Admit or search for a different patient.</p>
                        </div>
                    ) : (
                        filteredPatients.map((patient, index) => (
                            <div key={patient.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in-up">
                                <SmartBeltPatientCard
                                    patient={patient}
                                    onLink={(p) => setLinkPatient(p)}
                                    onEdit={(p) => handleEdit(p)}
                                    onViewDetail={(p) => { setSelectedPatient(p); setViewMode('detail'); }}
                                    onDelete={async (p) => {
                                        if (confirm(`Are you sure you want to delete ${p.name}? This cannot be undone.`)) {
                                            await deleteSmartBeltPatient(p.id);
                                            loadData();
                                        }
                                    }}
                                    onEmergency={(p) => {
                                        if ((window as any).triggerHealthAlert) {
                                            (window as any).triggerHealthAlert(p.name, 'MANUAL EMERGENCY', 'critical');
                                        }
                                    }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

const PremiumStat: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; isCritical?: boolean; delay: number }> = ({ label, value, icon, color, isCritical, delay }) => {
    const colors: any = {
        indigo: 'from-indigo-500 to-indigo-600',
        rose: 'from-rose-500 to-rose-600',
        emerald: 'from-emerald-500 to-emerald-600',
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600'
    };

    return (
        <div
            className={`transition-all bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col gap-4 relative overflow-hidden group ${isCritical ? 'ring-2 ring-rose-100 border-rose-200' : ''}`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${colors[color]} ${isCritical ? 'animate-pulse' : ''} group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            <div>
                <div className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{value}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1">{label}</div>
            </div>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors[color]} opacity-[0.03] rounded-bl-[100px]`}></div>
        </div>
    );
};

export default SmartBeltDashboard;
