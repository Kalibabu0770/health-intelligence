import React from 'react';
import { AlertCircle, CheckCircle, Smartphone } from 'lucide-react';

interface RiskGaugeProps {
    status: 'safe' | 'warning' | 'critical';
    risks: string[];
    score: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ status, risks, score }) => {
    return (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm h-full flex flex-col justify-center items-center">

            <div className="relative mb-4">
                {/* Status Icon Orb */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500
                    ${status === 'safe' ? 'bg-emerald-100 text-emerald-600' : ''}
                    ${status === 'warning' ? 'bg-amber-100 text-amber-600 animate-pulse' : ''}
                    ${status === 'critical' ? 'bg-red-100 text-red-600 animate-ping-slow' : ''}
                `}>
                    {status === 'safe' && <CheckCircle size={48} />}
                    {(status === 'warning' || status === 'critical') && <AlertCircle size={48} />}
                </div>
            </div>

            <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">
                {status === 'safe' ? 'Normal' : status}
            </h2>

            {status !== 'safe' && (
                <div className="w-full bg-red-50 border border-red-100 rounded-lg p-3 mt-2">
                    <h4 className="text-xs font-bold text-red-500 uppercase mb-1">Detected Risks:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700">
                        {risks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
            )}

            {status === 'critical' && (
                <div className="mt-4 flex gap-2 w-full animate-bounce">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-bold shadow-lg shadow-red-500/30 flex items-center justify-center gap-2">
                        <Smartphone size={18} />
                        SOS ALERT SENT
                    </button>
                </div>
            )}
        </div>
    );
};

export default RiskGauge;
