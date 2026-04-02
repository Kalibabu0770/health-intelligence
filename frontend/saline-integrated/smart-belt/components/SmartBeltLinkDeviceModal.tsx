import React, { useState } from 'react';
import { X, Link as LinkIcon, Unlink, CheckCircle2, Info } from 'lucide-react';
import { SmartBeltPatient } from '../types';
import { linkSmartBeltDevice, unlinkSmartBeltDevice } from '../services/smartBeltPatientService';

interface Props {
    isOpen: boolean;
    patient: SmartBeltPatient | null;
    onClose: () => void;
    onSuccess: () => void;
}

const SmartBeltLinkDeviceModal: React.FC<Props> = ({ isOpen, patient, onClose, onSuccess }) => {
    const [deviceId, setDeviceId] = useState(patient?.device_id || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !patient) return null;

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deviceId) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await linkSmartBeltDevice(patient.id, deviceId);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('[Smart Belt] Device link failed:', err);
            setError(err.message || 'Failed to link device');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnlink = async () => {
        if (!window.confirm(`Are you sure you want to unlink device from ${patient.name}?`)) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await unlinkSmartBeltDevice(patient.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('[Smart Belt] Device unlink failed:', err);
            setError(err.message || 'Failed to unlink device');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white">
                            <LinkIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Device Link</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Smart Belt Association</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Patient Summary */}
                    <div className="bg-indigo-50/50 rounded-2xl p-4 flex items-center gap-3 border border-indigo-100/50">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {patient.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">{patient.name}</div>
                            <div className="text-[10px] font-medium text-slate-500">Bed: {patient.bed_number || '--'} • ID: #{patient.id}</div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                            <Info className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {!patient.device_id ? (
                        <form onSubmit={handleLink} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Device ID / Serial Number</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        value={deviceId}
                                        onChange={e => setDeviceId(e.target.value)}
                                        className="w-full pl-4 pr-12 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-700 placeholder:text-slate-300"
                                        placeholder="e.g. BELT001"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                                        <Info size={20} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                                    Enter the unique identifier found on the belt's internal label.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !deviceId}
                                className="w-full py-4 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                            >
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                {isSubmitting ? 'Linking...' : 'Establish Link'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Current Active Link</div>
                                <div className="font-mono text-lg font-black text-emerald-800">{patient.device_id}</div>
                            </div>

                            <button
                                onClick={handleUnlink}
                                disabled={isSubmitting}
                                className="w-full py-4 text-sm font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all flex items-center justify-center gap-2 border border-rose-100"
                            >
                                <Unlink size={18} />
                                {isSubmitting ? 'Unlinking...' : 'Sever Device Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartBeltLinkDeviceModal;
