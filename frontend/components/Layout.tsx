import React from 'react';
import {
  Home, ClipboardList, FileText,
  ChevronRight, Languages, Globe, Mic, LogOut, Leaf, Stethoscope,
  UserCircle, ShieldCheck, Activity, ShieldAlert, Moon, Sun
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { translations, languages } from '../core/patientContext/translations';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDanger: boolean;
  onVoiceClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, isDanger, onVoiceClick }) => {
  const { language, setLanguage, profile, theme, setTheme } = usePatientContext();
  const t = translations[language];
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

  const menuItems = [
    { id: 'home', icon: Home, label: t.dashboard || 'Dashboard', desc: t.central_intelligence || 'Central Intelligence' },
    { id: 'lifeaudit', icon: Activity, label: 'Life Audit', desc: 'Wellness Tracking Suite' },
    { id: 'ayush', icon: Leaf, label: t.ayush_ai || 'AYUSH AI', desc: t.ancient_wisdom || 'Ancient Wisdom Hub' },
    { id: 'meds', icon: ClipboardList, label: t.pharmacy || 'Medication Reminder', desc: t.safety_adherence || 'Safety & Adherence' },
    { id: 'symptoms', icon: Stethoscope, label: t.triage_hub || 'Disease Finder', desc: t.clinical_analysis || 'Clinical Analysis' },
    { id: 'biohub', icon: FileText, label: t.bio_hub || 'Health Files', desc: t.biometric_synthesis || 'Health Record Synthesis' },
    { id: 'profile', icon: UserCircle, label: t.identity || 'Identity', desc: t.vault_registry || 'Health File Registry' },
  ];

  const activeModule = menuItems.find(i => i.id === activeTab);

  return (
    <div className={`h-screen w-full flex items-center justify-center font-sans overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <div className={`w-full h-full lg:h-[95vh] lg:max-w-[1550px] lg:w-[96%] lg:rounded-2xl shadow-2xl flex flex-row overflow-hidden lg:border transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className={`hidden lg:flex w-[280px] xl:w-[300px] border-r flex-col shrink-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>

          {/* Brand Header */}
          <header className={`h-16 border-b flex items-center px-4 gap-3 shrink-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-slate-900 shadow-md shadow-emerald-600/30 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black text-[13px] uppercase tracking-tight leading-loose truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Health Intelligence</h1>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[6px] font-black text-emerald-600 uppercase">Live</span>
            </div>
          </header>

          {/* Navigation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2 space-y-0.5">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] px-3 pb-2">Modules</p>

            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              const isLifeAudit = item.id === 'lifeaudit';
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${isActive
                    ? isLifeAudit
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100'
                      : 'bg-emerald-50 border border-emerald-100'
                    : 'hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105 ${isActive
                    ? isLifeAudit
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-slate-900 shadow-md shadow-emerald-400/30'
                      : 'bg-emerald-600 text-slate-900 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-500'
                    }`}>
                    <IconComp size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-[11px] uppercase tracking-tight leading-none truncate ${isActive
                      ? isLifeAudit ? 'text-emerald-700' : 'text-emerald-700'
                      : 'text-slate-700'
                      }`}>
                      {item.label}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">{item.desc}</p>
                  </div>
                  {isActive
                    ? <div className={`w-1.5 h-1.5 rounded-full ${isLifeAudit ? 'bg-teal-500' : 'bg-emerald-500'} shrink-0`} />
                    : <ChevronRight size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  }
                </button>
              );
            })}
          </div>

          {/* Profile Footer */}
          <div className={`p-3 border-t shrink-0 ${theme === 'dark' ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`flex items-center gap-3 p-3 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0">
                {(profile?.name?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{profile?.name || 'User'}</p>
                <p className={`text-[8px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Health Node</p>
              </div>
              <button
                onClick={() => (window as any).handleGlobalLogout?.()}
                className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-90 shrink-0"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN PANEL ═══ */}
        <div className={`flex-1 flex flex-col h-full relative min-w-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>

          {/* Top Bar */}
          <header className={`h-16 flex items-center justify-between px-5 z-20 shadow-sm shrink-0 transition-all duration-500 ${isDanger ? (theme === 'dark' ? 'bg-red-950/50 border-red-900' : 'bg-red-50 border-red-100') : (theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
            } border-b`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                {(() => { const mod = menuItems.find(i => i.id === activeTab); if (mod) { const IC = mod.icon; return <IC size={18} />; } return <Home size={18} />; })()}
              </div>
              <div>
                <h2 className={`font-black text-[14px] tracking-tight leading-none uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {activeModule?.label || 'Dashboard'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">{activeModule?.desc || 'Central Intelligence'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newTheme = theme === 'light' ? 'dark' : 'light';
                  setTheme(newTheme);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-600'}`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {isDanger && (
                <div className="bg-white text-red-800 px-3 py-1 rounded-full text-[9px] font-black uppercase animate-pulse shadow-lg">
                  {t.risk_detected || 'RISK DETECTED'}
                </div>
              )}
              <div className="relative">
                <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <Languages size={20} />
                </button>
                {showLanguageMenu && (
                  <div className="absolute top-12 right-0 w-48 bg-white border border-slate-200 shadow-2xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-1 mb-1 border-b border-slate-100 flex items-center gap-2">
                      <Globe size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-black uppercase text-slate-400">{t.select_region || 'Select Region'}</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {languages.map((lang) => (
                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${language === lang.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'}`}>
                          <span className="text-lg">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {onVoiceClick && (
                <button onClick={onVoiceClick} className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95">
                  <Mic size={20} />
                </button>
              )}
              <button onClick={() => onTabChange('profile')} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center lg:hidden">
                <ShieldAlert size={20} />
              </button>
              <button onClick={() => (window as any).handleGlobalLogout?.()} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center lg:hidden active:scale-90">
                <LogOut size={20} />
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
            <div className="h-28 lg:h-8" />
          </main>

          {/* Mobile Bottom Nav */}
          <nav className={`lg:hidden border-t flex justify-around items-center px-2 pt-3 pb-8 z-30 shadow-inner shrink-0 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-xl`}>
            {menuItems.slice(0, 6).map((item) => {
              const IC = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => onTabChange(item.id)}
                  className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-emerald-50 scale-110 shadow-sm' : ''}`}>
                    <IC size={18} />
                  </div>
                  <span className={`text-[7px] font-black uppercase tracking-tighter transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Layout;