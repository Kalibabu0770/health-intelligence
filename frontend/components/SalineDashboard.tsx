import React, { useEffect, useState } from 'react';
import { Droplet, AlertCircle, CheckCircle, Search, User, Droplets, Orbit } from 'lucide-react';
import { rtdb } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

interface SalineNode {
    is_empty: boolean;
    remaining_seconds: number;
    vol_ml: number;
    flow_rate: number;
    status: string;
}

const SalineDashboard: React.FC = () => {
    const [salineData, setSalineData] = useState<Record<string, SalineNode>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const salineRef = ref(rtdb, 'saline_status');
        const unsub = onValue(salineRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setSalineData(data);
        });
        return () => unsub();
    }, []);

    // Simulated dummy data if Firebase is dry, matching the requested schema.
    const activeBeds = Object.keys(salineData).length > 0 ? Object.keys(salineData) : ['BED-01', 'BED-02', 'BED-03'];

    const getBedData = (bed: string): SalineNode => {
        if (salineData[bed]) return salineData[bed];
        // Stand-in simulation logic to handle the empty UI state gracefully
        const isBed3 = bed === 'BED-03';
        return {
            is_empty: isBed3,
            remaining_seconds: isBed3 ? 0 : 3600,
            vol_ml: isBed3 ? 0 : 450,
            flow_rate: isBed3 ? 0 : 20,
            status: isBed3 ? 'clamped' : 'flowing'
        };
    };

    const filteredBeds = activeBeds.filter(bed => bed.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-200">
            {/* Header & Controls */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Droplets size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">IV Saline Telemetry Wall</h2>
                        <p className="text-[10px] font-black tracking-widest text-blue-500 uppercase">Live Fluid Administration Control</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="🔍 SEARCH BED..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border-2 border-slate-200 text-slate-800 text-xs font-black uppercase tracking-widest pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500 transition-colors w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Main Fluid Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2 pb-10">
                {filteredBeds.map(bed => {
                    const data = getBedData(bed);
                    const isCritical = data.is_empty;
                    const maxVolStr = bed === 'BED-01' ? 1000 : 500;
                    const percentRemaining = Math.max(0, Math.min(100, (data.vol_ml / maxVolStr) * 100));

                    return (
                        <div key={bed} className={`rounded-3xl border-2 transition-all p-6 relative overflow-hidden flex flex-col gap-5 ${isCritical ? 'bg-rose-50 border-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.15)] scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-400 shadow-md hover:shadow-lg'}`}>
                            {isCritical && (
                                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse" />
                            )}
                            
                            {/* Card Top */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm ${isCritical ? 'bg-rose-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                        {bed.replace('BED-', '')}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-tight text-slate-800">{bed}</h3>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isCritical ? 'text-rose-600 animate-pulse' : 'text-blue-500'}`}>
                                            {isCritical ? 'DEPLETED & CLAMPED' : `Sys: ${data.status.toUpperCase()}`}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center Liquid Visualizer */}
                            <div className="flex-1 flex justify-center items-center py-4 relative">
                                <div className={`w-28 h-48 rounded-full border-4 flex flex-col justify-end overflow-hidden relative shadow-inner ${isCritical ? 'border-rose-400 bg-rose-100/50' : 'border-slate-200 bg-slate-50'}`}>
                                    {/* Liquid Fill */}
                                    <div 
                                        className={`w-full transition-all duration-1000 relative ${isCritical ? 'bg-rose-500' : 'bg-blue-400'}`}
                                        style={{ height: `${percentRemaining}%` }}
                                    >
                                        {/* Wave effect overlay */}
                                        {!isCritical && percentRemaining > 0 && (
                                            <div className="absolute -top-3 left-0 right-0 h-6 bg-white/20 blur-sm rounded-full animate-wobble" />
                                        )}
                                    </div>
                                    
                                    {/* Text Overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center drop-shadow-md mix-blend-difference text-white">
                                        <span className="text-3xl font-black">{data.vol_ml}</span>
                                        <span className="text-[10px] font-black tracking-widest">ML</span>
                                    </div>
                                </div>
                                {!isCritical && (
                                   <div className="absolute top-1/2 -ml-36 bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-blue-200 shadow-sm animate-bounce-slow">
                                       ↓ {data.flow_rate} D/M
                                   </div>
                                )}
                            </div>

                            {/* Footer Metrics */}
                            <div className={`grid grid-cols-2 gap-2 mt-auto p-3 rounded-xl border ${isCritical ? 'bg-rose-500/10 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Remaining</div>
                                    <div className={`text-sm font-black ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {isCritical ? '-- : --' : `${Math.floor(data.remaining_seconds / 60)} MINS`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Action</div>
                                    {isCritical ? (
                                        <span className="text-xs font-black text-rose-600 flex items-center justify-end gap-1">
                                            <AlertCircle size={12} /> SECURED
                                        </span>
                                    ) : (
                                        <span className="text-xs font-black text-emerald-600 flex items-center justify-end gap-1">
                                            <Orbit size={12} className="animate-[spin_4s_linear_infinite]" /> REGULATING
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Embedded styles for animation */}
            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
                    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
                }
                .animate-bounce-slow { animation: bounce-slow 2s infinite; }
            `}</style>
        </div>
    );
};

export default SalineDashboard;
