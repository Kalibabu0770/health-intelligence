import React from 'react';
import { SmartBeltPrediction, RiskSeverity } from '../types';
import { Heart, Zap, Activity, Droplet, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface LiveRiskPredictionPanelProps {
    predictions: SmartBeltPrediction | null;
    loading?: boolean;
}

const LiveRiskPredictionPanel: React.FC<LiveRiskPredictionPanelProps> = ({
    predictions,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!predictions) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No prediction data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Live Health Predictions
                </h3>
                <p className="text-indigo-100 text-sm mt-1">
                    Real-time AI risk assessment • Confidence: {Math.round(predictions.prediction_confidence * 100)}%
                </p>
            </div>

            <div className="p-6 space-y-5">
                {/* Stroke Risk */}
                <RiskCard
                    icon={<Heart className="w-5 h-5" />}
                    title="Stroke Risk"
                    riskNow={predictions.stroke_risk_now}
                    risk24h={predictions.stroke_risk_24h}
                    risk48h={predictions.stroke_risk_48h}
                    severity={predictions.stroke_severity}
                    color="red"
                />

                {/* Seizure Risk */}
                <RiskCard
                    icon={<Zap className="w-5 h-5" />}
                    title="Seizure Risk"
                    riskNow={predictions.seizure_risk_now}
                    risk24h={predictions.seizure_risk_24h}
                    risk48h={predictions.seizure_risk_48h}
                    severity={predictions.seizure_severity}
                    color="yellow"
                />

                {/* Cardiac Risk */}
                <RiskCard
                    icon={<Heart className="w-5 h-5" />}
                    title="Cardiac Risk"
                    riskNow={predictions.cardiac_risk_now}
                    risk24h={predictions.cardiac_risk_24h}
                    risk48h={predictions.cardiac_risk_48h}
                    severity={predictions.cardiac_severity}
                    color="orange"
                />

                {/* Oxygen Crash Risk */}
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${getOxygenColorClasses(predictions.oxygen_crash_risk).bg}`}>
                                <Droplet className={`w-4 h-4 ${getOxygenColorClasses(predictions.oxygen_crash_risk).text}`} />
                            </div>
                            <span className="font-medium text-gray-900">Oxygen Crash Risk</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getOxygenColorClasses(predictions.oxygen_crash_risk).text}`}>
                                {predictions.oxygen_crash_risk}%
                            </span>
                            {getSeverityBadge(getRiskSeverityFromPercentage(predictions.oxygen_crash_risk))}
                        </div>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`absolute left-0 top-0 h-full ${getOxygenColorClasses(predictions.oxygen_crash_risk).progress} transition-all duration-500`}
                            style={{ width: `${predictions.oxygen_crash_risk}%` }}
                        />
                    </div>
                </div>

                {/* Risk Factors */}
                {predictions.risk_factors && predictions.risk_factors.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Contributing Risk Factors
                        </h4>
                        <div className="space-y-2">
                            {predictions.risk_factors.map((factor, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                    <span className="text-gray-700">{factor}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Updated */}
                <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    Last updated: {new Date(predictions.last_updated).toLocaleString()}
                </div>
            </div>
        </div>
    );
};

// ================================================================
// RISK CARD COMPONENT
// ================================================================

interface RiskCardProps {
    icon: React.ReactNode;
    title: string;
    riskNow: number;
    risk24h: number;
    risk48h: number;
    severity: RiskSeverity;
    color: 'red' | 'yellow' | 'orange';
}

const RiskCard: React.FC<RiskCardProps> = ({
    icon,
    title,
    riskNow,
    risk24h,
    risk48h,
    severity,
    color
}) => {
    const colorClasses = getColorClasses(severity, color);
    const trend = getTrend(riskNow, risk24h, risk48h);

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${colorClasses.bg}`}>
                        {React.cloneElement(icon as React.ReactElement, { className: `w-4 h-4 ${colorClasses.text}` })}
                    </div>
                    <span className="font-semibold text-gray-900">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {getSeverityBadge(severity)}
                    {getTrendIcon(trend)}
                </div>
            </div>

            {/* Current Risk */}
            <div className="mb-3">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs text-gray-600 font-medium">Now:</span>
                    <span className={`text-2xl font-bold ${colorClasses.text}`}>{riskNow}%</span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`absolute left-0 top-0 h-full ${colorClasses.progress} transition-all duration-500`}
                        style={{ width: `${riskNow}%` }}
                    />
                </div>
            </div>

            {/* 24h & 48h Forecasts */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <div className="text-xs text-gray-600 mb-1">24h Forecast</div>
                    <div className="flex items-baseline gap-1">
                        <span className={`font-bold ${colorClasses.text}`}>{risk24h}%</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colorClasses.progress} opacity-70`}
                                style={{ width: `${risk24h}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-600 mb-1">48h Forecast</div>
                    <div className="flex items-baseline gap-1">
                        <span className={`font-bold ${colorClasses.text}`}>{risk48h}%</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colorClasses.progress} opacity-50`}
                                style={{ width: `${risk48h}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getColorClasses(severity: RiskSeverity, baseColor: string) {
    switch (severity) {
        case 'critical':
            return {
                bg: 'bg-red-100',
                text: 'text-red-700',
                progress: 'bg-gradient-to-r from-red-500 to-red-600'
            };
        case 'high':
            return {
                bg: 'bg-orange-100',
                text: 'text-orange-700',
                progress: 'bg-gradient-to-r from-orange-500 to-orange-600'
            };
        case 'medium':
            return {
                bg: 'bg-yellow-100',
                text: 'text-yellow-700',
                progress: 'bg-gradient-to-r from-yellow-500 to-yellow-600'
            };
        default:
            return {
                bg: 'bg-green-100',
                text: 'text-green-700',
                progress: 'bg-gradient-to-r from-green-500 to-green-600'
            };
    }
}

function getOxygenColorClasses(risk: number) {
    if (risk >= 70) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-700',
            progress: 'bg-gradient-to-r from-red-500 to-red-600'
        };
    } else if (risk >= 50) {
        return {
            bg: 'bg-orange-100',
            text: 'text-orange-700',
            progress: 'bg-gradient-to-r from-orange-500 to-orange-600'
        };
    } else if (risk >= 30) {
        return {
            bg: 'bg-yellow-100',
            text: 'text-yellow-700',
            progress: 'bg-gradient-to-r from-yellow-500 to-yellow-600'
        };
    } else {
        return {
            bg: 'bg-green-100',
            text: 'text-green-700',
            progress: 'bg-gradient-to-r from-green-500 to-green-600'
        };
    }
}

function getRiskSeverityFromPercentage(risk: number): RiskSeverity {
    if (risk >= 70) return 'critical';
    if (risk >= 50) return 'high';
    if (risk >= 30) return 'medium';
    return 'low';
}

function getSeverityBadge(severity: RiskSeverity) {
    const config = {
        critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'CRITICAL' },
        high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HIGH' },
        medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'MEDIUM' },
        low: { bg: 'bg-green-100', text: 'text-green-700', label: 'LOW' }
    };

    const { bg, text, label } = config[severity];

    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${bg} ${text}`}>
            {label}
        </span>
    );
}

function getTrend(now: number, h24: number, h48: number): 'up' | 'down' | 'stable' {
    const avgFuture = (h24 + h48) / 2;
    const change = avgFuture - now;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
        case 'up':
            return (
                <div className="flex items-center gap-1 text-red-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-medium">Rising</span>
                </div>
            );
        case 'down':
            return (
                <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-xs font-medium">Declining</span>
                </div>
            );
        default:
            return (
                <div className="flex items-center gap-1 text-gray-500">
                    <Minus className="w-4 h-4" />
                    <span className="text-xs font-medium">Stable</span>
                </div>
            );
    }
}

export default LiveRiskPredictionPanel;
