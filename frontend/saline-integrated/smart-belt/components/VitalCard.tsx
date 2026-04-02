import React from 'react';
import { LucideIcon } from 'lucide-react';

interface VitalCardProps {
    title: string;
    value: string | number;
    unit: string;
    icon: LucideIcon;
    colorClass: string; // e.g., "text-red-500"
    status?: 'normal' | 'warning' | 'critical';
}

const VitalCard: React.FC<VitalCardProps> = ({ title, value, unit, icon: Icon, colorClass, status = 'normal' }) => {
    let bgBorder = "border-white/20 bg-white/60";
    if (status === 'warning') bgBorder = "border-yellow-400/50 bg-yellow-50/80";
    if (status === 'critical') bgBorder = "border-red-500/50 bg-red-50/80 animate-pulse";

    return (
        <div className={`relative p-6 rounded-2xl border backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 ${bgBorder}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</span>
                <div className={`p-2 rounded-full bg-white/50 ${colorClass}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-800">{value}</span>
                <span className="text-sm font-semibold text-slate-400">{unit}</span>
            </div>
        </div>
    );
};

export default VitalCard;
