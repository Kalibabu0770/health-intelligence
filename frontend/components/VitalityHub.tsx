import React from 'react';
import { Activity, Apple, Pill, Stethoscope, ChevronRight, ShieldCheck, Soup, Zap } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const QuickActionCard: React.FC<{
    title: string;
    description: string;
    icon: any;
    color: string;
    onClick: () => void;
    statusBadge?: string;
    stats?: string;
    gradient?: string;
}> = ({ title, description, icon: Icon, color, onClick, statusBadge, stats, gradient }) => {
    return (
        <button
            onClick={onClick}
            className="group relative overflow-hidden bg-white p-8 rounded-[3rem] border border-slate-200/50 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.04)] transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-2 hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-between h-[280px]"
        >
            {/* Background Aesthetic */}
            <div className={`absolute -top-12 -right-12 w-48 h-48 bg-${color}-500 opacity-0 group-hover:opacity-[0.07] rounded-full blur-3xl transition-opacity duration-1000`} />
            <div className={`absolute top-0 right-0 w-1 h-full bg-gradient-to-b ${gradient || 'from-slate-200 to-transparent'} opacity-20`} />

            <div>
                <div className="flex justify-between items-start mb-8">
                    <div className={`w-16 h-16 bg-${color}-50 text-${color}-600 rounded-[1.5rem] flex items-center justify-center shadow-sm group-hover:bg-${color}-600 group-hover:text-white group-hover:shadow-2xl group-hover:shadow-${color}-200 transition-all duration-500`}>
                        <Icon size={28} strokeWidth={2.5} />
                    </div>
                    {statusBadge && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-inner">
                            <div className={`w-2 h-2 bg-${color}-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-${color}-500),0.5)]`} />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{statusBadge}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3 relative z-10">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none italic group-hover:translate-x-1 transition-transform">{title}</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] leading-relaxed mt-4 opacity-80 group-hover:opacity-100 transition-opacity">{description}</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{stats || 'Action Required'}</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase mt-1 tracking-widest">Protocol Node Confirmed</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 shadow-xl`}>
                    <ChevronRight size={20} />
                </div>
            </div>
        </button>
    );
};

const VitalityHub: React.FC<{
    onOpenSymptoms: () => void;
    onOpenNutrition: () => void;
    onOpenMeds: () => void;
    onOpenAudit: () => void;
}> = ({ onOpenSymptoms, onOpenNutrition, onOpenMeds, onOpenAudit }) => {
    const { nutritionLogs, medications } = usePatientContext();

    const today = new Date().toDateString();
    const todayFood = (nutritionLogs || []).filter((l: any) => new Date(l.timestamp).toDateString() === today);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* 1. Daily Symptom Checker */}
            <QuickActionCard
                onClick={onOpenSymptoms}
                title="Symptom Node"
                description="Tactical analysis of physical nuances and clinical triage."
                icon={Stethoscope}
                color="indigo"
                statusBadge="Active Link"
                stats="0 New Reports"
                gradient="from-indigo-500 to-transparent"
            />

            {/* 2. Nutrition Registry */}
            <QuickActionCard
                onClick={onOpenNutrition}
                title="Meal Registry"
                description="Secure bio-fuel logging and metabolic flux analysis."
                icon={Soup}
                color="orange"
                statusBadge="Syncing"
                stats={`${todayFood.length} Logs Today`}
                gradient="from-orange-500 to-transparent"
            />

            {/* 3. Medication Adherence */}
            <QuickActionCard
                onClick={onOpenMeds}
                title="Protocol Sync"
                description="Verification of pharmaceutical nodes and safety schedules."
                icon={Pill}
                color="rose"
                statusBadge="G20 Encoded"
                stats={`${medications?.length || 0} active rx`}
                gradient="from-rose-500 to-transparent"
            />

            {/* 4. Biological Audit */}
            <QuickActionCard
                onClick={onOpenAudit}
                title="Bio-Audit"
                description="Strategic system review and historical resilience scoring."
                icon={ShieldCheck}
                color="emerald"
                statusBadge="Optimal"
                stats="Score: 84%"
                gradient="from-emerald-500 to-transparent"
            />
        </div>
    );
};

export default VitalityHub;
