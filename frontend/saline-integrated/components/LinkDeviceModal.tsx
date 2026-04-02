import React, { useState, useEffect } from 'react';
import { Link, Activity, Droplets, Timer, FlaskConical, Gauge } from 'lucide-react';
import { linkDevice } from '../services/dataService';
import { Patient, Device } from '../types/types';

interface LinkDeviceModalProps {
    isOpen: boolean;
    patient: Patient | null;
    devices: Record<string, Device>;
    usedDeviceIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

const LinkDeviceModal: React.FC<LinkDeviceModalProps> = ({
    isOpen,
    patient,
    devices,
    usedDeviceIds,
    onClose,
    onSuccess
}) => {
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [bottleSize, setBottleSize] = useState<number>(500);

    // Speed Presets
    // Speed Presets (Based on user guidelines: 20=Slow, 40=Normal, 60=Fast)
    const SPEED_PRESETS = [
        { label: 'Slow', value: 20, desc: '20 d/min' },
        { label: 'Normal', value: 40, desc: '40 d/min' },
        { label: 'Fast', value: 60, desc: '60 d/min' },
        { label: 'Emergency', value: 100, desc: '100 d/min' },
        { label: 'Custom', value: 0, desc: 'Manual' },
    ];
    const [speedMode, setSpeedMode] = useState<string>('Normal');
    const [customFlowRate, setCustomFlowRate] = useState<number>(20);

    const [estimatedTime, setEstimatedTime] = useState<string>('--');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Constants
    // Constants
    const DROP_FACTOR = 15; // drops per ml (standard 15 d/ml set)

    useEffect(() => {
        if (isOpen && patient && patient.device_id && devices[patient.device_id]) {
            const device = devices[patient.device_id];
            setSelectedDeviceId(device.device_id);
            if (device.bottle_ml) setBottleSize(device.bottle_ml);
            if (device.flow_rate) {
                setCustomFlowRate(device.flow_rate);
                setSpeedMode('Custom'); // Default to custom for editing
                // Optional: Check if it matches a preset
                const preset = SPEED_PRESETS.find(p => p.value === device.flow_rate);
                if (preset) setSpeedMode(preset.label);
            }
        }
    }, [isOpen, patient]);

    useEffect(() => {
        // Determine actual rate
        let rate = customFlowRate;
        if (speedMode !== 'Custom') {
            const preset = SPEED_PRESETS.find(p => p.label === speedMode);
            rate = preset ? preset.value : 0;
        }

        if (bottleSize > 0 && rate > 0) {
            const totalDrops = bottleSize * DROP_FACTOR;
            const totalMinutes = totalDrops / rate;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);

            let timeString = '';
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m`;
            setEstimatedTime(timeString);
        } else {
            setEstimatedTime('--');
        }
    }, [bottleSize, speedMode, customFlowRate]);

    if (!isOpen || !patient) return null;

    // Filter used devices BUT include the current patient's device if editing
    const availableDevices = Object.keys(devices).filter(
        id => !usedDeviceIds.includes(id) || (id === patient.device_id)
    );

    const handleLink = async () => {
        if (!selectedDeviceId) return;
        setIsSubmitting(true);

        // Determine final rate
        let finalRate = customFlowRate;
        if (speedMode !== 'Custom') {
            const preset = SPEED_PRESETS.find(p => p.label === speedMode);
            finalRate = preset ? preset.value : 0;
        }

        // Pass the configurations to the service
        await linkDevice(patient.id, selectedDeviceId, {
            bottle_ml: bottleSize,
            flow_rate: finalRate
        });

        setIsSubmitting(false);
        onSuccess();
        onClose();
        setSelectedDeviceId(''); // Reset
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                            <Link size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Connect Sensor</h3>
                            <p className="text-xs text-slate-500">Configure infusion for <span className="font-semibold text-slate-700">{patient.name}</span></p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Select Device */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Device</label>
                            <div className="relative">
                                <select
                                    value={selectedDeviceId}
                                    onChange={e => setSelectedDeviceId(e.target.value)}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 appearance-none bg-white font-bold text-slate-700 shadow-sm"
                                >
                                    <option value="">Choose Available Sensor...</option>
                                    {availableDevices.map(id => (
                                        <option key={id} value={id}>
                                            {id} {devices[id]?.is_empty ? '(Empty)' : '(Ready)'}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <Activity size={16} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Bottle Size */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bottle Size (ml)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={bottleSize}
                                    onChange={e => setBottleSize(Number(e.target.value))}
                                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-700"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <FlaskConical size={16} />
                                </div>
                            </div>
                        </div>

                        {/* 3. Speed Presets */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Infusion Speed (Drops/Min)</label>
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                {SPEED_PRESETS.map((mode) => (
                                    <button
                                        key={mode.label}
                                        onClick={() => setSpeedMode(mode.label)}
                                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all
                               ${speedMode === mode.label
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                : 'bg-white text-slate-500 border-gray-200 hover:border-indigo-300'}`}
                                    >
                                        {mode.label}
                                        <div className={`text-[9px] font-medium mt-0.5 ${speedMode === mode.label ? 'text-indigo-200' : 'text-slate-300'}`}>
                                            {mode.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {speedMode === 'Custom' && (
                                <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="number"
                                        value={customFlowRate}
                                        onChange={e => setCustomFlowRate(Number(e.target.value))}
                                        className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-700 pl-10"
                                        placeholder="Enter drops per minute..."
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <Gauge size={16} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Estimated Time Display */}
                        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between border border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <Timer size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-400 uppercase">Estimated Time</p>
                                    <p className="text-sm text-indigo-900 font-medium">Until Empty</p>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">
                                {estimatedTime}
                            </div>
                        </div>

                        {availableDevices.length === 0 && (
                            <div className="p-3 bg-amber-50 text-amber-600 text-xs font-medium rounded-lg text-center">
                                No available sensors to link.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-gray-200 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleLink}
                        disabled={!selectedDeviceId || isSubmitting}
                        className="px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Linking...' : 'Start Monitoring'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LinkDeviceModal;
