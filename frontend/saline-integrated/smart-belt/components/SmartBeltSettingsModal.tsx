import React, { useState, useEffect } from 'react';
import { X, Server, Activity, Thermometer, Zap, Save, RefreshCw } from 'lucide-react';
import { SmartBeltConfig, getThresholds, saveThresholds } from '../services/healthDataService';
import { database } from '../../services/firebaseConfig';
import { ref, update } from 'firebase/database';

interface SmartBeltSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SmartBeltSettingsModal: React.FC<SmartBeltSettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'thresholds' | 'simulation'>('thresholds');
    const [config, setConfig] = useState<SmartBeltConfig>(getThresholds());
    const [simDeviceId, setSimDeviceId] = useState('');
    const [simType, setSimType] = useState<'normal' | 'seizure' | 'fever' | 'cardiac'>('normal');

    useEffect(() => {
        if (isOpen) setConfig(getThresholds());
    }, [isOpen]);

    const handleSave = () => {
        saveThresholds(config);
        onClose();
    };

    const runSimulation = async () => {
        if (!simDeviceId) return;

        // Construct payload based on type
        const payload: any = {
            vitals: { bpm: 75, spo2: 98, temp: 36.6 },
            motion: { ax: 0.05, ay: 0.98, az: 0.1, gyro_idx: 0 },
            ecg: { val: 512, leads_ok: true }
        };

        if (simType === 'normal') {
            // Defaults above are fine
        } else if (simType === 'fever') {
            payload.vitals.temp = 39.5;
            payload.vitals.bpm = 110;
        } else if (simType === 'seizure') {
            payload.motion = { ax: 2.1, ay: 1.5, az: 1.8, gyro_idx: 50 };
            payload.vitals.bpm = 140;
        } else if (simType === 'cardiac') {
            payload.vitals.bpm = 175;
            payload.ecg.leads_ok = true;
        }

        try {
            await update(ref(database, `smart_belt_telemetry/${simDeviceId}/live`), payload);
            alert(`Simulation '${simType}' sent to ${simDeviceId}`);
        } catch (e) {
            alert('Simulation failed: ' + e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <SettingsIcon /> Smart Belt Configuration
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('thresholds')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'thresholds' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        AI Thresholds
                    </button>
                    <button
                        onClick={() => setActiveTab('simulation')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'simulation' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Simulation / Demo
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'thresholds' ? (
                        <div className="space-y-6">
                            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700 font-medium">
                                Note: These thresholds apply globally to the AI Risk Engine for all patients.
                            </div>

                            {/* HR Config */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Activity size={16} className="text-rose-500" />
                                    Heart Rate Limits (BPM)
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Max (Tachycardia)</span>
                                        <input
                                            type="number"
                                            value={config.maxHeartRate}
                                            onChange={(e) => setConfig({ ...config, maxHeartRate: Number(e.target.value) })}
                                            className="w-full border rounded-lg p-2 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Min (Bradycardia)</span>
                                        <input
                                            type="number"
                                            value={config.minHeartRate}
                                            onChange={(e) => setConfig({ ...config, minHeartRate: Number(e.target.value) })}
                                            className="w-full border rounded-lg p-2 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Temp Config */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Thermometer size={16} className="text-amber-500" />
                                    Fever Threshold (°C)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.feverTemp}
                                    onChange={(e) => setConfig({ ...config, feverTemp: Number(e.target.value) })}
                                    className="w-full border rounded-lg p-2 font-mono"
                                />
                            </div>

                            {/* Seizure Config */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Zap size={16} className="text-indigo-500" />
                                    Seizure Sensitivity
                                </label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    {(['low', 'medium', 'high'] as const).map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setConfig({ ...config, seizureSensitivity: level })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${config.seizureSensitivity === level ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Target Device ID</label>
                                <input
                                    type="text"
                                    value={simDeviceId}
                                    onChange={(e) => setSimDeviceId(e.target.value)}
                                    placeholder="e.g. SB-1001"
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <SimButton
                                    active={simType === 'normal'}
                                    onClick={() => setSimType('normal')}
                                    label="Normal Vitals"
                                    color="emerald"
                                />
                                <SimButton
                                    active={simType === 'fever'}
                                    onClick={() => setSimType('fever')}
                                    label="High Fever (39.5°)"
                                    color="amber"
                                />
                                <SimButton
                                    active={simType === 'seizure'}
                                    onClick={() => setSimType('seizure')}
                                    label="Seizure Motion"
                                    color="purple"
                                />
                                <SimButton
                                    active={simType === 'cardiac'}
                                    onClick={() => setSimType('cardiac')}
                                    label="Cardiac Event"
                                    color="rose"
                                />
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={!simDeviceId}
                                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> INJECT DATA
                            </button>
                        </div>
                    )}
                </div>

                {activeTab === 'thresholds' && (
                    <div className="p-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                        >
                            <Save size={18} /> Save Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsIcon = () => (
    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
        <Server size={18} />
    </div>
);

const SimButton: React.FC<{ active: boolean, onClick: () => void, label: string, color: string }> = ({ active, onClick, label, color }) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-emerald-600 border-emerald-100',
        amber: active ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-amber-600 border-amber-100',
        purple: active ? 'bg-purple-500 text-white shadow-purple-200' : 'bg-white text-purple-600 border-purple-100',
        rose: active ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white text-rose-600 border-rose-100',
    };

    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-xl border text-sm font-bold shadow-sm transition-all ${colors[color]} ${active ? 'shadow-lg ring-2 ring-offset-2 ring-indigo-100 transform scale-[1.02]' : 'hover:scale-[1.02]'}`}
        >
            {label}
        </button>
    );
}

export default SmartBeltSettingsModal;
