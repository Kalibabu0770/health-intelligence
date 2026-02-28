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
    { id: 'symptoms', icon: Stethoscope, label: t.triage_hub || 'DISEASE FINDER', desc: t.clinical_analysis || 'CLINICAL ANALYSIS' },
    { id: 'analysis', icon: ShieldAlert, label: t.safety_adherence || 'SAFETY & ADHERENCE', desc: 'MEDICATION SAFETY SCANNER' },
    { id: 'ayush', icon: Leaf, label: t.ayush_ai || 'AYUSH AI', desc: t.ancient_wisdom || 'ANCIENT WISDOM HUB' },
    { id: 'meds', icon: ClipboardList, label: t.pharmacy || 'MEDICATION REMINDER', desc: t.safety_adherence || 'SAFETY & ADHERENCE' },
    { id: 'audit', icon: Activity, label: t.vitals_trend || 'LIFESTYLE & NUTRITION', desc: 'LOG DIET & EXERCISE' },
    { id: 'reports', icon: FileText, label: t.bio_hub || 'HEALTH FILES', desc: t.vault_registry || 'HEALTH FILE REGISTRY' },
    { id: 'profile', icon: UserCircle, label: t.identity || 'IDENTITY', desc: t.vault_registry || 'HEALTH FILE REGISTRY' },
  ];

  const activeModule = menuItems.find(i => i.id === activeScreen);

  const MenuButton = ({ item }: any) => {
    const IconComp = item.icon;
    const isActive = activeScreen === item.id;
    return (
      <button
        onClick={() => setActiveScreen(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold tracking-widest text-[10px] uppercase ${isActive ? 'bg-emerald-100 border-2 border-emerald-500 text-slate-900 shadow-lg' : 'bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
      >
        <IconComp size={18} />
        <div className="flex flex-col text-left">
          <span>{item.label}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden flex font-sans text-slate-900 border-8 border-emerald-100 bg-white box-border p-2">

      {/* Sidebar Navigation */}
      <div className="w-72 bg-white rounded-xl shadow-xl border border-slate-100 flex flex-col h-full mr-2 p-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-8 shrink-0">
          <div className="w-12 h-12 bg-emerald-100 border-2 border-emerald-500 rounded-xl flex items-center justify-center text-slate-900 shadow-md">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">AHMIS Connect</h2>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Citizen Node</p>
          </div>
        </div>

        {/* GUIDANCE MESSAGE */}
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 shrink-0">
          <div className="flex items-start gap-2">
            <Bot size={16} className="text-emerald-600 mt-0.5" />
            <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest leading-relaxed">
              Welcome. This portal is integrated with AHMIS to provide real-time, explainable AI guidance across all modules. Ensure to log symptoms accurately for best precision.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {menuItems.map(item => (
            <MenuButton key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-6 shrink-0 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
            <div className="w-9 h-9 bg-emerald-100 border-2 border-emerald-500 rounded-lg flex items-center justify-center text-slate-900 font-black text-xs shrink-0">
              {(profile?.name?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase truncate text-slate-900 leading-none">{profile?.name || 'USER'}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-100 rounded-full animate-pulse" />
                <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest leading-none">{t.secured_link || 'Secured Link'}</p>
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-rose-500 hover:text-rose-500 transition-all tracking-widest">
            <LogOut size={16} />
            Terminate Session
          </button>
        </div>
      </div>

      {/* Main Content Area (No Scrolling) */}
      <div className="flex-1 bg-white rounded-xl shadow-xl border border-slate-100 h-full flex flex-col items-stretch overflow-hidden relative">

        {/* Global Alerts Overlay inside the Content Area */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] w-full max-w-lg pointer-events-none flex flex-col items-center gap-2">
          {(alerts || []).filter(a => !a.acknowledged).map(alert => (
            <div key={alert.id} className={`w-full pointer-events-auto p-4 rounded-xl shadow-2xl border flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 bg-white ${alert.type === 'danger' ? 'border-rose-500' : alert.type === 'warning' ? 'border-amber-500' : 'border-emerald-500'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${alert.type === 'danger' ? 'bg-rose-50 text-rose-600' : alert.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${alert.type === 'danger' ? 'text-rose-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {alert.type === 'danger' ? 'CRITICAL SYSTEM ALERT' : 'CLINICAL NOTICE'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">{alert.message}</p>
                </div>
              </div>
              <button onClick={() => acknowledgeAlert(alert.id)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center shrink-0 text-slate-500 active:scale-90">
                <Check size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Content Header (Replaces the old superior status bar) */}
        <div className="h-16 border-b border-slate-100 bg-white px-8 flex items-center justify-between shrink-0 z-40 relative shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              {(() => { const mod = menuItems.find(i => i.id === activeScreen); if (mod) { const IC = mod.icon; return <IC size={18} />; } return <Home size={18} />; })()}
            </div>
            <div>
              <h2 className="font-black text-sm text-emerald-800 uppercase tracking-tighter">{activeModule?.label || 'DASHBOARD'}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{activeModule?.desc || 'Live Feed'}</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex flex-col relative items-end">
            <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[10px] uppercase font-black tracking-widest transition-colors">
              <Globe size={14} />
              Language Node
            </button>
            {showLanguageMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                <div className="absolute top-10 right-0 w-48 bg-white border border-slate-100 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col">
                  {languages.map((lang) => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageMenu(false); }} className={`px-4 py-3 text-[10px] font-black uppercase text-left transition-colors flex justify-between items-center tracking-widest ${language === lang.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <span>{lang.flag} {lang.name}</span>
                      {language === lang.code && <div className="w-1.5 h-1.5 bg-emerald-100 rounded-full" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actual Screen Render */}
        <div className="flex-1 overflow-hidden relative w-full h-full p-2">
          <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden shadow-inner border border-slate-100">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Layout;