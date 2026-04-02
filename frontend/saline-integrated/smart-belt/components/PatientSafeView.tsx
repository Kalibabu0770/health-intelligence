import React, { useState } from 'react';
import { ShieldCheck, Phone, MapPin, Activity } from 'lucide-react';
import { AlertService } from '../services/alertService';
import { SmartBeltTelemetry } from '../types';

interface PatientSafeViewProps {
    status: 'online' | 'offline';
    lastUpdate: string;
    onEmergency: () => void;
    patientId: string;
}

const PatientSafeView: React.FC<PatientSafeViewProps> = ({ status, lastUpdate, onEmergency, patientId }) => {
    const [helpSent, setHelpSent] = useState(false);

    const handleSOS = () => {
        setHelpSent(true);
        AlertService.triggerAlert({
            patientId,
            deviceId: 'unknown', // Context usually has this, simplified here
            riskType: 'general',
            level: 'emergency',
            message: 'Patient triggered Manual SOS Emergency'
        });
        onEmergency();

        // Reset state after 10s just for demo
        setTimeout(() => setHelpSent(false), 10000);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50 p-6 animate-in fade-in duration-500">
            {/* Calm Header */}
            <div className="mb-12 text-center">
                <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                    <ShieldCheck size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-700 mb-2">Monitoring Active</h2>
                <p className="text-slate-500 text-lg">Your health is being protected.</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                    System {status === 'online' ? 'Connected' : 'Connecting...'}
                </div>
            </div>

            {/* Wellness Tip */}
            <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-sm border border-slate-100 text-center mb-12">
                <h3 className="tex-sm font-bold text-indigo-500 uppercase mb-2">Wellness Tip</h3>
                <p className="text-slate-600 italic">"Stay hydrated and take deep breaths. Your consistent heart rate today allows for good relaxation."</p>
            </div>

            {/* Emergency Action */}
            <div className="w-full max-w-xs">
                {helpSent ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center animate-pulse">
                        <h3 className="text-xl font-bold text-rose-700 mb-2">Help Notified</h3>
                        <p className="text-rose-600 text-sm">Location sent to caregiver.</p>
                        <p className="text-rose-600 text-sm">Stay calm.</p>
                    </div>
                ) : (
                    <button
                        onClick={handleSOS}
                        className="w-full py-4 bg-white border-2 border-rose-100 text-rose-500 rounded-xl font-bold hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Phone size={20} /> Request Check-in
                    </button>
                )}

                <p className="text-center text-xs text-slate-300 mt-4">
                    <MapPin size={10} className="inline mr-1" />
                    Exact location used only in emergency
                </p>
            </div>
        </div>
    );
};

export default PatientSafeView;
