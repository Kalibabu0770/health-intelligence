import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import SmartBeltDashboard from './smart-belt/components/SmartBeltDashboard';
import SalineDashboard from './components/SalineDashboard';
import Sidebar from './components/Sidebar';

// Import sample data generator for testing (exposes functions to window)
import './smart-belt/utils/sampleDataGenerator';

const App: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'saline' | 'belt' | 'timer'>('belt');

    return (
        <div className="notranslate h-screen bg-[#F8FAFC] flex overflow-hidden">
            {/* Professional Sidebar Navigation */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />

            {/* Main Dashboard Area */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Content Area */}
                <div className="flex-1 container-safe overflow-auto px-4 md:px-8 py-6">
                    {activeTab === 'saline' ? <Dashboard /> :
                        activeTab === 'timer' ? <SalineDashboard /> :
                            <SmartBeltDashboard />}
                </div>
            </div>
        </div>
    );
};

export default App;
