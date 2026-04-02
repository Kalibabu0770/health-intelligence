import React, { useState } from 'react';
import { X, Plus, Trash2, Server, Wifi } from 'lucide-react';
import { addDevice, deleteDevice } from '../services/dataService';
import { Device } from '../types/types';

interface SensorManagementModalProps {
    isOpen: boolean;
    devices: Record<string, Device>;
    onClose: () => void;
}

const SensorManagementModal: React.FC<SensorManagementModalProps> = ({ isOpen, devices, onClose }) => {
    const [newDeviceId, setNewDeviceId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const deviceList = Object.values(devices) as Device[];

    const handleAdd = async () => {
        if (!newDeviceId.trim()) return;
        if (devices[newDeviceId]) {
            setError('Device ID already exists');
            return;
        }

        setIsSubmitting(true);
        setError('');
        const { error: addError } = await addDevice(newDeviceId);

        if (addError) {
            console.error("Modal received error:", addError);
            setError("Failed to add sensor: " + (addError.message || "Unknown error"));
        } else {
            setNewDeviceId('');
        }

        setIsSubmitting(false);
    };

    const handleDelete = async (deviceId: string) => {
        if (window.confirm(`Are you sure you want to delete sensor ${deviceId}?`)) {
            await deleteDevice(deviceId);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Server size={20} className="text-indigo-600" />
                            Manage Sensors
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{deviceList.length} devices connected</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">

                    {/* Add New Sensor */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Add New Sensor</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newDeviceId}
                                onChange={e => setNewDeviceId(e.target.value.toUpperCase())}
                                placeholder="e.g. ICU-05"
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 font-bold text-slate-700 placeholder-gray-300"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!newDeviceId || isSubmitting}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        {error && <p className="text-xs text-rose-500 mt-2 font-bold">{error}</p>}
                    </div>

                    {/* Device List */}
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sensors</label>
                        {deviceList.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                No sensors found. Add one above.
                            </div>
                        ) : (
                            deviceList.map(device => (
                                <div key={device.device_id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-gray-100 group hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${device.is_empty ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{device.device_id}</p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Wifi size={10} /> {device.status || 'Online'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(device.device_id); }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};

export default SensorManagementModal;
