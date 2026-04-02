import React, { useState, useEffect } from 'react';
import { SmartBeltPatientWithData } from '../types';
import { getActivePatientsWithData, subscribeToSmartBeltPatients } from '../services/smartBeltPatientService';
import SmartBeltAdmissionModal from './SmartBeltAdmissionModal';
import LiveHealthMonitoringDashboard from './LiveHealthMonitoringDashboard';
import {
    Heart,
    Activity,
    AlertTriangle,
    UserPlus,
    Users,
    TrendingUp,
    Search,
    Filter,
    Wifi,
    WifiOff
} from 'lucide-react';

const SmartBeltPatientManagementDashboard: React.FC = () => {
    const [patients, setPatients] = useState<SmartBeltPatientWithData[]>([]);
    const [loading, setLoading] = useState(true);
    const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning'>('all');

    useEffect(() => {
        loadPatients();

        // Subscribe to patient changes
        const subscription = subscribeToSmartBeltPatients(() => {
            loadPatients();
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadPatients = async () => {
        try {
            const data = await getActivePatientsWithData();
            setPatients(data);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter patients
    const filteredPatients = patients.filter(patient => {
        // Search filter
        const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        let matchesStatus = true;
        if (filterStatus === 'critical') {
            matchesStatus = (patient.unacknowledged_alerts_count || 0) > 0 ||
                (patient.predictions?.stroke_severity === 'critical') ||
                (patient.predictions?.seizure_severity === 'critical') ||
                (patient.predictions?.cardiac_severity === 'critical');
        } else if (filterStatus === 'warning') {
            matchesStatus = (patient.predictions?.stroke_severity === 'high') ||
                (patient.predictions?.seizure_severity === 'high') ||
                (patient.predictions?.cardiac_severity === 'high');
        }

        return matchesSearch && matchesStatus;
    });

    // Dashboard statistics
    const stats = {
        total: patients.length,
        critical: patients.filter(p => (p.unacknowledged_alerts_count || 0) > 0).length,
        highRisk: patients.filter(p =>
            p.predictions?.stroke_severity === 'high' ||
            p.predictions?.seizure_severity === 'high' ||
            p.predictions?.cardiac_severity === 'high'
        ).length,
        online: patients.filter(p => p.device_id).length
    };

    if (selectedPatientId) {
        return (
            <LiveHealthMonitoringDashboard
                patientId={selectedPatientId}
                onClose={() => setSelectedPatientId(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Heart className="w-7 h-7 text-white" />
                            </div>
                            Smart Belt Patients
                        </h1>
                        <p className="text-gray-600 mt-1">Real-time health monitoring and AI predictions</p>
                    </div>
                    <button
                        onClick={() => setAdmissionModalOpen(true)}
                        className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                        <UserPlus className="w-5 h-5" />
                        New Patient
                    </button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={<Users className="w-6 h-6" />}
                        label="Total Patients"
                        value={stats.total}
                        color="blue"
                    />
                    <StatCard
                        icon={<AlertTriangle className="w-6 h-6" />}
                        label="Critical Alerts"
                        value={stats.critical}
                        color="red"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="High Risk"
                        value={stats.highRisk}
                        color="orange"
                    />
                    <StatCard
                        icon={<Wifi className="w-6 h-6" />}
                        label="Online Devices"
                        value={stats.online}
                        color="green"
                    />
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search patients by name..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Patients</option>
                            <option value="critical">Critical Only</option>
                            <option value="warning">High Risk Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Patient Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading patients...</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchQuery || filterStatus !== 'all' ? 'No patients found' : 'No patients yet'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Add your first Smart Belt patient to start monitoring'}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                        <button
                            onClick={() => setAdmissionModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Add First Patient
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.map(patient => (
                        <PatientCard
                            key={patient.id}
                            patient={patient}
                            onClick={() => setSelectedPatientId(patient.id)}
                        />
                    ))}
                </div>
            )}

            {/* Admission Modal */}
            <SmartBeltAdmissionModal
                isOpen={admissionModalOpen}
                onClose={() => setAdmissionModalOpen(false)}
                onPatientCreated={loadPatients}
            />
        </div>
    );
};

// ================================================================
// STAT CARD COMPONENT
// ================================================================

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'blue' | 'red' | 'orange' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    const colorConfig = {
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', textColor: 'text-blue-600' },
        red: { bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600', textColor: 'text-red-600' },
        orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', textColor: 'text-orange-600' },
        green: { bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', textColor: 'text-green-600' }
    };

    const config = colorConfig[color];

    return (
        <div className={`${config.bg} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 ${config.iconBg} rounded-lg`}>
                    {React.cloneElement(icon as React.ReactElement, { className: config.iconColor })}
                </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${config.textColor}`}>{value}</p>
        </div>
    );
};

// ================================================================
// PATIENT CARD COMPONENT
// ================================================================

interface PatientCardProps {
    patient: SmartBeltPatientWithData;
    onClick: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
    const hasAlerts = (patient.unacknowledged_alerts_count || 0) > 0;
    const maxRiskSeverity = getMaxRiskSeverity(patient);

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border-2 ${hasAlerts ? 'border-red-300' : maxRiskSeverity === 'critical' ? 'border-red-200' : maxRiskSeverity === 'high' ? 'border-orange-200' : 'border-transparent'
                }`}
        >
            {/* Header */}
            <div className={`p-4 ${hasAlerts ? 'bg-red-50' : maxRiskSeverity === 'critical' ? 'bg-red-50' : maxRiskSeverity === 'high' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                            <p className="text-sm text-gray-600">{patient.age}y • {patient.gender}</p>
                        </div>
                    </div>
                    {patient.device_id ? (
                        <Wifi className="w-5 h-5 text-green-600" />
                    ) : (
                        <WifiOff className="w-5 h-5 text-gray-400" />
                    )}
                </div>

                {/* Alert Badge */}
                {hasAlerts && (
                    <div className="bg-red-100 border border-red-300 rounded-lg px-3 py-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-700" />
                        <span className="text-sm font-semibold text-red-700">
                            {patient.unacknowledged_alerts_count} Active Alert{patient.unacknowledged_alerts_count! > 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Predictions */}
            {patient.predictions && (
                <div className="p-4 space-y-2">
                    <RiskRow label="Stroke" risk={patient.predictions.stroke_risk_now} severity={patient.predictions.stroke_severity} />
                    <RiskRow label="Seizure" risk={patient.predictions.seizure_risk_now} severity={patient.predictions.seizure_severity} />
                    <RiskRow label="Cardiac" risk={patient.predictions.cardiac_risk_now} severity={patient.predictions.cardiac_severity} />
                </div>
            )}

            {/* Medical History */}
            {(patient.stroke_history || patient.heart_disease_history || patient.seizure_history) && (
                <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-1">
                        {patient.stroke_history && <HistoryTag label="Stroke" />}
                        {patient.heart_disease_history && <HistoryTag label="Heart" />}
                        {patient.seizure_history && <HistoryTag label="Seizure" />}
                        {patient.diabetes && <HistoryTag label="Diabetes" />}
                        {patient.hypertension && <HistoryTag label="HTN" />}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                    <span>Admitted: {new Date(patient.admitted_at).toLocaleDateString()}</span>
                    {patient.device_id && (
                        <span className="font-medium text-blue-600">Device: {patient.device_id}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ================================================================
// HELPER COMPONENTS
// ================================================================

const RiskRow: React.FC<{ label: string; risk: number; severity: string }> = ({ label, risk, severity }) => {
    const severityColors = {
        critical: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-green-500'
    };

    const barColor = severityColors[severity as keyof typeof severityColors] || 'bg-gray-300';

    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{risk}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${risk}%` }}
                />
            </div>
        </div>
    );
};

const HistoryTag: React.FC<{ label: string }> = ({ label }) => (
    <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">
        {label}
    </span>
);

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getMaxRiskSeverity(patient: SmartBeltPatientWithData): 'critical' | 'high' | 'medium' | 'low' | null {
    if (!patient.predictions) return null;

    const severities = [
        patient.predictions.stroke_severity,
        patient.predictions.seizure_severity,
        patient.predictions.cardiac_severity
    ];

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
}

export default SmartBeltPatientManagementDashboard;
