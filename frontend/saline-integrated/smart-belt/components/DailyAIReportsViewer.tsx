import React, { useState, useEffect } from 'react';
import { SmartBeltDailyReport } from '../types';
import { getPatientDailyReports } from '../ai/DailyReportGenerator';
import {
    FileText,
    Calendar,
    TrendingUp,
    TrendingDown,
    Activity,
    Heart,
    Droplet,
    Thermometer,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Download
} from 'lucide-react';

interface DailyAIReportsViewerProps {
    patientId: number;
    patientName: string;
}

const DailyAIReportsViewer: React.FC<DailyAIReportsViewerProps> = ({ patientId, patientName }) => {
    const [reports, setReports] = useState<SmartBeltDailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedReportId, setExpandedReportId] = useState<number | null>(null);
    const [limit, setLimit] = useState(30);

    useEffect(() => {
        loadReports();
    }, [patientId, limit]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await getPatientDailyReports(patientId, limit);
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleReport = (reportId: number) => {
        setExpandedReportId(expandedReportId === reportId ? null : reportId);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading AI health reports...</p>
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                <p className="text-gray-600">Daily AI reports will be generated automatically at midnight</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-7 h-7 text-blue-600" />
                            Daily AI Health Reports
                        </h2>
                        <p className="text-gray-600 mt-1">Patient: {patientName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Total Reports</p>
                        <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-3">
                {reports.map(report => (
                    <ReportCard
                        key={report.id}
                        report={report}
                        isExpanded={expandedReportId === report.id}
                        onToggle={() => toggleReport(report.id)}
                    />
                ))}
            </div>

            {/* Load More */}
            {reports.length >= limit && (
                <div className="text-center py-4">
                    <button
                        onClick={() => setLimit(limit + 30)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Load More Reports
                    </button>
                </div>
            )}
        </div>
    );
};

// ================================================================
// REPORT CARD COMPONENT
// ================================================================

interface ReportCardProps {
    report: SmartBeltDailyReport;
    isExpanded: boolean;
    onToggle: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, isExpanded, onToggle }) => {
    const getStatusColor = () => {
        if (report.critical_incidents > 0) return 'red';
        if (report.anomaly_count > 5) return 'orange';
        if (report.stability_score < 70) return 'yellow';
        return 'green';
    };

    const statusColor = getStatusColor();
    const statusConfig = {
        red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
        green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' }
    };

    const config = statusConfig[statusColor];

    return (
        <div className={`bg-white border-2 ${config.border} rounded-xl shadow-sm overflow-hidden transition-all`}>
            {/* Card Header */}
            <div
                onClick={onToggle}
                className={`${config.bg} p-5 cursor-pointer hover:opacity-80 transition-opacity`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 bg-white rounded-lg`}>
                            <Calendar className={`w-6 h-6 ${config.icon}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                {new Date(report.report_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Generated {new Date(report.generated_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        {report.critical_incidents > 0 ? (
                            <span className={`px-3 py-1 ${config.badge} rounded-full text-sm font-semibold flex items-center gap-1`}>
                                <AlertTriangle className="w-4 h-4" />
                                Critical
                            </span>
                        ) : report.stability_score >= 80 ? (
                            <span className={`px-3 py-1 ${config.badge} rounded-full text-sm font-semibold flex items-center gap-1`}>
                                <CheckCircle className="w-4 h-4" />
                                Stable
                            </span>
                        ) : (
                            <span className={`px-3 py-1 ${config.badge} rounded-full text-sm font-semibold`}>
                                Monitoring
                            </span>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-5 gap-4 mt-4">
                    <QuickStat icon={<Activity />} label="Stability" value={`${report.stability_score}%`} />
                    <QuickStat icon={<Heart />} label="Avg HR" value={`${report.avg_hr} bpm`} />
                    <QuickStat icon={<Droplet />} label="Avg SpO₂" value={`${report.avg_spo2}%`} />
                    <QuickStat icon={<AlertTriangle />} label="Anomalies" value={report.anomaly_count} />
                    <QuickStat icon={<Thermometer />} label="Avg Temp" value={`${report.avg_temp.toFixed(1)}°F`} />
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-6 space-y-6 bg-white">
                    {/* AI Summary */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            AI Health Summary
                        </h4>
                        <p className="text-gray-700 leading-relaxed">{report.ai_summary}</p>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Heart Rate Details */}
                        <MetricDetail
                            icon={<Heart className="w-5 h-5" />}
                            label="Heart Rate Analysis"
                            metrics={[
                                { label: 'Average', value: `${report.avg_hr} bpm` },
                                { label: 'Minimum', value: `${report.min_hr} bpm` },
                                { label: 'Maximum', value: `${report.max_hr} bpm` }
                            ]}
                        />

                        {/* SpO₂ Details */}
                        <MetricDetail
                            icon={<Droplet className="w-5 h-5" />}
                            label="Blood Oxygen Analysis"
                            metrics={[
                                { label: 'Average', value: `${report.avg_spo2}%` },
                                { label: 'Minimum', value: `${report.min_spo2}%` }
                            ]}
                        />

                        {/* Temperature Details */}
                        <MetricDetail
                            icon={<Thermometer className="w-5 h-5" />}
                            label="Temperature Analysis"
                            metrics={[
                                { label: 'Average', value: `${report.avg_temp.toFixed(1)}°F` },
                                { label: 'Maximum', value: `${report.max_temp.toFixed(1)}°F` }
                            ]}
                        />

                        {/* Activity Details */}
                        <MetricDetail
                            icon={<Activity className="w-5 h-5" />}
                            label="Activity Analysis"
                            metrics={[
                                { label: 'Level', value: report.activity_level.toUpperCase() },
                                { label: 'Stability Score', value: `${report.stability_score}%` }
                            ]}
                        />
                    </div>

                    {/* Recommendations */}
                    {report.recommendations && report.recommendations.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                AI Recommendations
                            </h4>
                            <div className="space-y-2">
                                {report.recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                                        <p className="text-sm text-gray-700">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Critical Incidents */}
                    {report.critical_incidents > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                Critical Incidents: {report.critical_incidents}
                            </div>
                            <p className="text-sm text-red-700">
                                This day had {report.critical_incidents} critical health incident{report.critical_incidents > 1 ? 's' : ''} that required immediate attention.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ================================================================
// HELPER COMPONENTS
// ================================================================

const QuickStat: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({
    icon,
    label,
    value
}) => (
    <div className="text-center">
        <div className="flex justify-center mb-1">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 text-gray-600' })}
        </div>
        <p className="text-xs text-gray-600 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
);

interface MetricDetailProps {
    icon: React.ReactNode;
    label: string;
    metrics: { label: string; value: string }[];
}

const MetricDetail: React.FC<MetricDetailProps> = ({ icon, label, metrics }) => (
    <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {icon}
            {label}
        </h5>
        <div className="space-y-2">
            {metrics.map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{metric.label}</span>
                    <span className="font-semibold text-gray-900">{metric.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default DailyAIReportsViewer;
