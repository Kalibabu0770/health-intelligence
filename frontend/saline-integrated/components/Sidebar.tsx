import React from 'react';
import {
    LayoutDashboard,
    Activity,
    Users,
    Settings,
    Bell,
    FileBarChart,
    LogOut,
    Brain,
    ShieldAlert
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: 'saline' | 'belt' | 'timer') => void;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
    return (
        <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col h-full z-40 transition-all duration-300 border-r border-slate-800 shrink-0">
            {/* Logo Section */}
            <div className="p-6 mb-4 flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                    <ShieldAlert size={22} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-white font-black tracking-tight text-xl leading-none">Nurse</h1>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nurse Login</span>
                </div>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 px-4 space-y-6">
                <div>
                    <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Monitoring</h3>
                    <div className="space-y-1">
                        <NavItem
                            icon={LayoutDashboard}
                            label="Saline Monitor"
                            active={activeTab === 'saline'}
                            onClick={() => setActiveTab('saline')}
                        />
                        <NavItem
                            icon={Activity}
                            label="Smart Belt"
                            active={activeTab === 'belt'}
                            onClick={() => setActiveTab('belt')}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Intelligence</h3>
                    <div className="space-y-1">
                        <NavItem icon={Brain} label="AI Diagnostics" />
                        <NavItem icon={FileBarChart} label="Health Reports" />
                    </div>
                </div>

                <div>
                    <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">System</h3>
                    <div className="space-y-1">
                        <NavItem icon={Users} label="Staff Management" />
                        <NavItem icon={Settings} label="Global Settings" />
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/50">
                <div className="flex items-center gap-3 p-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                        JD
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">Nurse</div>
                        <div className="text-[10px] text-slate-500 truncate">On Duty</div>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-medium text-sm"
                >
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>
        </aside>
    );
};

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick?: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm group
        ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
    >
        <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
        {label}
    </button>
);

export default Sidebar;
