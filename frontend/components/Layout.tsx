import React, { useEffect } from 'react';
import {
  Home, ClipboardList, FileText,
  ChevronRight, Languages, Globe, Mic, LogOut, Leaf, Stethoscope,
  UserCircle, ShieldCheck, Activity, ShieldAlert, Moon, Sun,
  LayoutDashboard, Bot, Check
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { translations, languages } from '../core/patientContext/translations';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: string;
  setActiveScreen: (screen: any) => void;
  onLogout?: () => void;
  onOpenAssistant?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, setActiveScreen, onLogout, onOpenAssistant }) => {
  const context = usePatientContext();
  const { language, setLanguage, profile, theme, setTheme, riskScores, alerts, acknowledgeAlert, t } = context;
  const [showLanguageMenu, setShowLanguageMenu] = React.useState(false);

  // FORCE LIGHT THEME
  useEffect(() => {
    if (theme !== 'light') setTheme('light');
  }, [theme, setTheme]);

  const menuItems = [
    { id: 'hub', icon: Home, label: t.dashboard || 'DASHBOARD', desc: t.central_intelligence || 'CENTRAL INTELLIGENCE' },
    { id: 'audit', icon: Activity, label: t.vitals_trend || 'LIFE AUDIT', desc: t.vitals_trend_monitor || 'WELLNESS TRACKING SUITE' },
    { id: 'ayush', icon: Leaf, label: t.ayush_ai || 'AYUSH AI', desc: t.ancient_wisdom || 'ANCIENT WISDOM HUB' },
    { id: 'meds', icon: ClipboardList, label: t.pharmacy || 'MEDICATION REMINDER', desc: t.safety_adherence || 'SAFETY & ADHERENCE' },
    { id: 'symptoms', icon: Stethoscope, label: t.triage_hub || 'DISEASE FINDER', desc: t.clinical_analysis || 'CLINICAL ANALYSIS' },
    { id: 'reports', icon: FileText, label: t.bio_hub || 'HEALTH FILES', desc: t.vault_registry || 'HEALTH RECORD SYNTHESIS' },
    { id: 'profile', icon: UserCircle, label: t.identity || 'IDENTITY', desc: t.vault_registry || 'PROFILE REGISTRY' },
  ];

  const activeModule = menuItems.find(i => i.id === activeScreen);

  return (
    <div className={`h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-white transition-all duration-700 relative`}>
      {/* ═══ CRYSTAL GLOW NEBULAS ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-emerald-100/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* ═══ EDGE-TO-EDGE CONSOLE ═══ */}
      <div className={`w-full h-full flex flex-col lg:flex-row overflow-hidden relative z-10 bg-white/40 backdrop-blur-3xl`}>
        {/* Superior Status Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 z-[100]" />

        {/* Global Loading / Status Node */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 h-5 rounded-full bg-slate-900/90 text-white z-[100] flex items-center justify-center gap-2 shadow-lg">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[7.5px] font-black uppercase tracking-[0.2em]">{t.network_stable || 'Neural Link Secure'}</span>
        </div>

        {/* --- LEFT SIDEBAR (Streamlined) --- */}
        <aside className={`hidden lg:flex w-[280px] border-r border-slate-100 flex-col shrink-0 bg-white/80 backdrop-blur-xl relative z-10`}>
          <header className={`h-24 border-b border-slate-50 flex items-center px-8 gap-4 shrink-0`}>
            <div className="w-10 h-10 bg-[#059669] rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="min-w-0">
              <h1 className={`font-black text-[16px] uppercase tracking-tight leading-none text-slate-900 italic`}>LifeShield</h1>
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">Bio-Sentinel v2.8</p>
            </div>
          </header>

          <nav className="flex-1 overflow-y-auto custom-scrollbar py-6 px-3 space-y-1">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] px-4 pb-3">Protocol Modules</p>
            {menuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 text-left group relative ${isActive
                    ? 'bg-slate-900 text-white shadow-xl'
                    : 'hover:bg-slate-50 text-slate-500'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-900'}`}>
                    <IconComp size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-[11px] uppercase tracking-tight leading-none truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-[0.1em] truncate mt-1.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          <footer className="p-4 border-t border-slate-50 bg-slate-50/30 space-y-3">
            <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 transition-all group">
              <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                <LogOut size={16} />
              </div>
              <p className="text-[9px] font-black uppercase text-slate-900 underline decoration-rose-500/20 underline-offset-2 tracking-widest">{t.exit_protocol || 'Exit Protocol'}</p>
            </button>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0">
                {(profile?.name?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase truncate text-slate-900 leading-none">{profile?.name || 'USER'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest leading-none">Secured Link</p>
                </div>
              </div>
            </div>
          </footer>
        </aside>

        {/* --- MAIN CONTENT PANEL --- */}
        <div className={`flex-1 flex flex-col relative min-w-0 bg-transparent`}>
          {/* Global Alert Overlay */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md pointer-events-none flex flex-col items-center gap-2">
            {(alerts || []).filter(a => !a.acknowledged).map(alert => (
              <div key={alert.id} className={`w-full pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 backdrop-blur-3xl ${alert.type === 'danger' ? 'bg-rose-900/90 text-white border-rose-800' : alert.type === 'warning' ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-emerald-900/90 text-white border-emerald-800'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.type === 'danger' ? 'bg-rose-500 text-white' : alert.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{alert.type === 'danger' ? 'CRITICAL' : 'NOTICE'}</p>
                    <p className="text-[12px] font-bold leading-tight">{alert.message}</p>
                  </div>
                </div>
                <button onClick={() => acknowledgeAlert(alert.id)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center shrink-0 border border-white/10 active:scale-90">
                  <Check size={18} />
                </button>
              </div>
            ))}
          </div>

          <header className={`h-20 flex items-center justify-between px-10 z-20 shrink-0 border-b border-slate-100 transition-all duration-500 bg-white/60 backdrop-blur-md`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
                {(() => { const mod = menuItems.find(i => i.id === activeScreen); if (mod) { const IC = mod.icon; return <IC size={20} />; } return <Home size={20} />; })()}
              </div>
              <div>
                <h2 className="font-black text-[15px] tracking-tight leading-none uppercase text-slate-900 italic">
                  {activeModule?.label || 'DASHBOARD'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">{activeModule?.desc || 'SECURED LINK ACTIVE'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm transition-all">
                <Globe size={20} />
              </button>
              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[200]" onClick={() => setShowLanguageMenu(false)} />
                  <div className="fixed top-20 right-10 w-64 max-h-[60vh] bg-white border border-slate-100 shadow-2xl rounded-3xl flex flex-col z-[201] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t.select_protocol_language || 'Language Node'}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                      {languages.map((lang) => (
                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }} className={`w-full text-left px-6 py-3 text-[11px] font-black flex items-center justify-between hover:bg-slate-50 transition-all ${language === lang.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{lang.flag}</span>
                            <span className="uppercase tracking-tight">{lang.name}</span>
                          </div>
                          {language === lang.code && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-hidden p-0 w-full relative">
            {children}
          </main>

          <nav className={`lg:hidden border-t border-slate-100 flex justify-around items-center px-4 pt-3 pb-8 z-30 shrink-0 transition-all duration-500 bg-white/95 backdrop-blur-xl`}>
            {menuItems.slice(0, 5).map((item) => {
              const IC = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button key={item.id} onClick={() => setActiveScreen(item.id)} className={`flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50 scale-110' : ''}`}>
                    <IC size={20} />
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        * { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.05) transparent; }
      `}</style>
    </div>
  );
};

export default Layout;