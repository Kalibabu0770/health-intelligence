import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface PredictionTimelineProps {
    data: Array<{
        timestamp: string;
        heatstroke_risk: number;
        seizure_risk: number;
        overall_risk: number;
        trend: 'improving' | 'stable' | 'worsening';
    }>;
}

const PredictionTimeline: React.FC<PredictionTimelineProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">📈 Prediction Timeline (24h)</h3>
                <div className="text-center py-12 text-slate-400">
                    <Activity size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No prediction history available yet</p>
                    <p className="text-sm mt-2">Predictions will appear as data is collected</p>
                </div>
            </div>
        );
    }

    // Get last 24 hours of data, sample every 30 minutes for display
    const sampledData = data.filter((_, index) => index % 15 === 0).slice(-48);
    const maxRisk = Math.max(...sampledData.map(d => Math.max(d.heatstroke_risk, d.seizure_risk, d.overall_risk)));
    const latestTrend = data[data.length - 1]?.trend || 'stable';

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'improving': return <TrendingDown size={16} className="text-emerald-500" />;
            case 'worsening': return <TrendingUp size={16} className="text-rose-500" />;
            default: return <Minus size={16} className="text-amber-500" />;
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'improving': return 'text-emerald-600 bg-emerald-50';
            case 'worsening': return 'text-rose-600 bg-rose-50';
            default: return 'text-amber-600 bg-amber-50';
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">📈 Prediction Timeline (24h)</h3>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${getTrendColor(latestTrend)}`}>
                    {getTrendIcon(latestTrend)}
                    <span className="capitalize">{latestTrend}</span>
                </div>
            </div>

            {/* Timeline Graph */}
            <div className="relative h-48 mb-4">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 font-mono">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                </div>

                {/* Graph area */}
                <div className="ml-14 h-full relative border-l-2 border-b-2 border-slate-200">
                    {/* Risk zones */}
                    <div className="absolute inset-0">
                        <div className="h-1/3 bg-rose-50 border-b border-rose-100"></div>
                        <div className="h-1/3 bg-amber-50 border-b border-amber-100"></div>
                        <div className="h-1/3 bg-emerald-50"></div>
                    </div>

                    {/* Data points */}
                    <svg className="absolute inset-0 w-full h-full">
                        {/* Heatstroke risk line */}
                        <polyline
                            points={sampledData.map((d, i) =>
                                `${(i / (sampledData.length - 1)) * 100}%,${100 - d.heatstroke_risk}%`
                            ).join(' ')}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="2"
                            opacity="0.8"
                        />

                        {/* Seizure risk line */}
                        <polyline
                            points={sampledData.map((d, i) =>
                                `${(i / (sampledData.length - 1)) * 100}%,${100 - d.seizure_risk}%`
                            ).join(' ')}
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                            opacity="0.8"
                        />
                    </svg>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-rose-500"></div>
                    <span className="text-slate-600">Heatstroke Risk</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-purple-500"></div>
                    <span className="text-slate-600">Seizure Risk</span>
                </div>
            </div>

            {/* Time labels */}
            <div className="flex justify-between mt-4 text-xs text-slate-400 font-mono ml-14">
                <span>24h ago</span>
                <span>12h ago</span>
                <span>Now</span>
            </div>
        </div>
    );
};

export default PredictionTimeline;
