import React, { useState, useEffect } from 'react';
import { EmergencyAlert, EmergencyAlertType, AlertSeverity } from '../types';
import {
    getAllActiveAlerts,
    getPatientAlertHistory,
    acknowledgeAlert,
    resolveAlert,
    subscribeToEmergencyAlerts,
    subscribeToAlertUpdates
} from '../ai/EmergencyAlertTrigger';
import {
    AlertTriangle,
    Heart,
    Zap,
    Activity,
    Droplet,
    Thermometer,
    X,
    Check,
    CheckCheck,
    ExternalLink,
    Clock
} from 'lucide-react';

interface EmergencyAlertsCenterProps {
    patientId?: number; // If provided, show only that patient's alerts
}

const EmergencyAlertsCenter: React.FC<EmergencyAlertsCenterProps> = ({ patientId }) => {
    const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [filter, setFilter] = useState<'active' | 'all'>('active');

    // Fetch alerts
    useEffect(() => {
        loadAlerts();

        // Subscribe to real-time updates
        const alertSub = subscribeToEmergencyAlerts((newAlert) => {
            if (!patientId || newAlert.patient_id === patientId) {
                setAlerts(prev => [newAlert, ...prev]);
                playAlertSound(newAlert.severity);
            }
        });

        const updateSub = subscribeToAlertUpdates((updatedAlert) => {
            setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
        });

        return () => {
            alertSub.unsubscribe();
            updateSub.unsubscribe();
        };
    }, [patientId, filter]);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            let data: EmergencyAlert[];
            if (patientId) {
                data = await getPatientAlertHistory(patientId);
            } else {
                data = await getAllActiveAlerts();
            }
            setAlerts(data);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (alert: EmergencyAlert) => {
        try {
            await acknowledgeAlert(alert.id, 'Doctor'); // TODO: Use actual user
            setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, acknowledged: true } : a));
        } catch (error) {
            console.error('Error acknowledging alert:', error);
        }
    };

    const handleResolve = async (alert: EmergencyAlert) => {
        try {
            await resolveAlert(alert.id, 'Doctor', resolutionNotes || undefined);
            setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true, acknowledged: true } : a));
            setSelectedAlert(null);
            setResolutionNotes('');
        } catch (error) {
            console.error('Error resolving alert:', error);
        }
    };

    const playAlertSound = (severity: AlertSeverity) => {
        if (severity === 'critical') {
            // Play critical alert sound
            const audio = new Audio('/alert-critical.mp3');
            audio.play().catch(() => { });
        }
    };

    const filteredAlerts = filter === 'active'
        ? alerts.filter(a => !a.acknowledged)
        : alerts;

    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
    const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Emergency Alerts Center
                        </h3>
                        <p className="text-red-100 text-sm mt-1">
                            {unacknowledgedCount} unacknowledged
                            {criticalCount > 0 && ` • ${criticalCount} critical`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'active'
                                    ? 'bg-white text-red-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Active ({unacknowledgedCount})
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-white text-red-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            All ({alerts.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-500 mt-3">Loading alerts...</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-8 text-center">
                        <CheckCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                            {filter === 'active' ? 'No active alerts' : 'No alerts found'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredAlerts.map(alert => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onAcknowledge={() => handleAcknowledge(alert)}
                                onResolve={() => setSelectedAlert(alert)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Resolution Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Resolve Alert</h3>
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">Alert:</p>
                                <p className="font-medium text-gray-900">{selectedAlert.message}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resolution Notes (Optional)
                                </label>
                                <textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe actions taken..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 min-h-[100px]"
                                />
                            </div>
                        </div>
                        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setSelectedAlert(null);
                                    setResolutionNotes('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleResolve(selectedAlert)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                                Mark as Resolved
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ================================================================
// ALERT CARD COMPONENT
// ================================================================

interface AlertCardProps {
    alert: EmergencyAlert;
    onAcknowledge: () => void;
    onResolve: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAcknowledge, onResolve }) => {
    const [expanded, setExpanded] = useState(false);
    const config = getAlertConfig(alert.alert_type, alert.severity);

    return (
        <div className={`p-4 ${!alert.acknowledged ? 'bg-red-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                    {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{config.title}</h4>
                                {getSeverityBadge(alert.severity)}
                                {alert.acknowledged && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        ✓ Acknowledged
                                    </span>
                                )}
                                {alert.resolved && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        ✓ Resolved
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-700">{alert.message}</p>
                        </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.created_at).toLocaleString()}
                        </div>
                        {alert.acknowledged_at && (
                            <div>Ack: {new Date(alert.acknowledged_at).toLocaleString()}</div>
                        )}
                    </div>

                    {/* Vitals Snapshot */}
                    {expanded && alert.vitals_snapshot && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Vitals at Alert Time:</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-gray-600">Heart Rate</div>
                                    <div className="font-semibold text-gray-900">{alert.vitals_snapshot.hr} bpm</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">SpO₂</div>
                                    <div className="font-semibold text-gray-900">{alert.vitals_snapshot.spo2}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Temperature</div>
                                    <div className="font-semibold text-gray-900">{alert.vitals_snapshot.temp?.toFixed(1)}°F</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Risk Scores */}
                    {expanded && alert.risk_scores && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Risk Scores at Alert Time:</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-gray-600">Stroke</div>
                                    <div className="font-semibold text-red-600">{alert.risk_scores.stroke}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Seizure</div>
                                    <div className="font-semibold text-yellow-600">{alert.risk_scores.seizure}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-600">Cardiac</div>
                                    <div className="font-semibold text-orange-600">{alert.risk_scores.cardiac}%</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resolution Notes */}
                    {alert.resolved && alert.resolution_notes && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-green-700 mb-1">Resolution Notes:</p>
                            <p className="text-sm text-green-900">{alert.resolution_notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            <ExternalLink className="w-3 h-3" />
                            {expanded ? 'Hide Details' : 'View Details'}
                        </button>
                        {!alert.acknowledged && (
                            <button
                                onClick={onAcknowledge}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Acknowledge
                            </button>
                        )}
                        {alert.acknowledged && !alert.resolved && (
                            <button
                                onClick={onResolve}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1"
                            >
                                <CheckCheck className="w-3 h-3" />
                                Resolve
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getAlertConfig(type: EmergencyAlertType, severity: AlertSeverity) {
    const configs: Record<EmergencyAlertType, { icon: React.ReactNode; title: string; bg: string }> = {
        STROKE_CRITICAL: {
            icon: <Heart className="w-5 h-5 text-red-700" />,
            title: 'Critical Stroke Risk',
            bg: 'bg-red-100'
        },
        STROKE_WARNING: {
            icon: <Heart className="w-5 h-5 text-orange-700" />,
            title: 'Stroke Warning',
            bg: 'bg-orange-100'
        },
        SEIZURE_DETECTED: {
            icon: <Zap className="w-5 h-5 text-yellow-700" />,
            title: 'Seizure Detected',
            bg: 'bg-yellow-100'
        },
        CARDIAC_CRITICAL: {
            icon: <Heart className="w-5 h-5 text-red-700" />,
            title: 'Critical Cardiac Event',
            bg: 'bg-red-100'
        },
        CARDIAC_ARRHYTHMIA: {
            icon: <Activity className="w-5 h-5 text-orange-700" />,
            title: 'Cardiac Arrhythmia',
            bg: 'bg-orange-100'
        },
        FALL_DETECTED: {
            icon: <AlertTriangle className="w-5 h-5 text-red-700" />,
            title: 'Fall Detected',
            bg: 'bg-red-100'
        },
        OXYGEN_CRITICAL: {
            icon: <Droplet className="w-5 h-5 text-blue-700" />,
            title: 'Critical Oxygen Level',
            bg: 'bg-blue-100'
        },
        TEMPERATURE_CRITICAL: {
            icon: <Thermometer className="w-5 h-5 text-red-700" />,
            title: 'Critical Temperature',
            bg: 'bg-red-100'
        }
    };

    return configs[type] || configs.STROKE_CRITICAL;
}

function getSeverityBadge(severity: AlertSeverity) {
    const config = {
        critical: { bg: 'bg-red-600', text: 'text-white', label: 'CRITICAL' },
        high: { bg: 'bg-orange-500', text: 'text-white', label: 'HIGH' },
        warning: { bg: 'bg-yellow-500', text: 'text-white', label: 'WARNING' }
    };

    const { bg, text, label } = config[severity];

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${bg} ${text}`}>
            {label}
        </span>
    );
}

export default EmergencyAlertsCenter;
