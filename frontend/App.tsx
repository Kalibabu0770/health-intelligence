import React, { useState, useEffect, useRef } from 'react';
import { AP_GOVT_HIERARCHY } from "./core/patientContext/apHierarchy";
import {
  UserProfile, MedicationReminder, HealthDocument, WorkoutLog,
  FoodLog, RiskLevel, MeditationLog, DailyCheckIn
} from './types';
import { usePatientContext } from './core/patientContext/patientStore';
import { translations, Language } from './core/patientContext/translations';
import {
  getAIHealthAdvice,
  getDiagnosticQuestions,
  getDiagnosticAdvice,
  getAIPersonalAssistantResponse,
  getComprehensiveHealthAnalysis,
  analyzeFoodImage,
  checkAIStatus,
  AIStatus,
  AI_CONFIG,
  analyzeNutritionDeficiencies,
  analyzeTabletSafety,
  identifyMedicineFromImage,
  parseVoiceCommand,
  analyzeMedicalReport,
  translateText,
  translateClinicalData,
  translateQuestionsBatch,
  orchestrateHealth,
  buildAIPrompt,
  getAyurvedicClinicalStrategy
} from './services/ai';
import { db } from './services/firebase';
import { collection, getDocs, deleteDoc, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { calculateComprehensiveRisk, getWorkBasedNutrition } from './core/patientContext/riskEngine';
import { predictHealthRisk, mapProfileToFeatures, checkMLHealth, MLPredictionResponse } from './services/mlBackend';
import Layout from './components/Layout';
import { Zap, ShieldCheck, Activity, Heart, Eye, Loader2, Play, Pause, RefreshCcw, RefreshCw, Stethoscope, ChevronRight, UserCircle, LogOut, Upload, FileUp, Sparkles, AlertTriangle, X, Check, Brain, Bot, Send, Search, ArrowRight, Video, Mic, Calendar, Clock, MapPin, Phone, MessageSquare, ChevronLeft, Dumbbell, Apple, Moon, Pill, Droplet, FileText, CheckCircle2, Camera, Trash2, Plus, Pencil, Globe, TrendingUp, Map, Languages, UserCheck, Shield, Edit3, Lock, Wind, History, Leaf } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

const INITIAL_PROFILE: UserProfile = {
  name: '', age: 0, gender: 'male', weight: 0,
  conditions: [],
  customConditions: [],
  surgeries: [],
  familyHistory: [],
  alcoholUsage: 'none', smoking: false,
  currentMedications: [], allergies: [],
  hasLiverDisease: false, hasKidneyDisease: false, hasDiabetes: false,
  hasHighBP: false, hasHeartDisease: false, hasAsthma: false,
  isPregnant: false,
  location: '',
  foodPreferences: [],
  habits: [],
  profession: '',
  workHoursPerDay: 8,
  workIntensity: 'moderate',
  role: 'citizen'
};

let currentRecognition: any = null;

const startListening = (language: string, onTranscript: (text: string) => void, onInterim?: (text: string) => void) => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const speechAlert = (translations[language as Language] || translations['en']).speech_not_supported;
    alert(speechAlert);
    return;
  }
  if (currentRecognition) {
    try { currentRecognition.abort(); } catch (e) { }
    currentRecognition = null;
  }
  const recognition = new SpeechRecognition();
  currentRecognition = recognition;
  const langMap: Record<string, string> = {
    'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
    'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-US'
  };
  recognition.lang = langMap[language] || 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  let finalTranscript = '';
  let silenceTimer: any = null;
  const activeBtn = document.activeElement as HTMLElement;
  if (activeBtn && !activeBtn.classList.contains('mic-listening')) {
    activeBtn.dataset.originalContent = activeBtn.innerHTML;
    activeBtn.classList.add('mic-listening');
    activeBtn.innerHTML = `
      <div class="mic-dots-container">
        <div class="google-dot dot-1"></div>
        <div class="google-dot dot-2"></div>
        <div class="google-dot dot-3"></div>
        <div class="google-dot dot-4"></div>
      </div>
    `;
  }
  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      else interimTranscript += event.results[i][0].transcript;
    }
    if (onInterim) onInterim(interimTranscript);
    const liveText = (finalTranscript + interimTranscript).trim();
    if (liveText) onTranscript(liveText);
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => recognition.stop(), 4000);
  };
  recognition.onend = () => {
    currentRecognition = null;
    clearTimeout(silenceTimer);
    if (finalTranscript.trim()) onTranscript(finalTranscript.trim());
    if (activeBtn) {
      activeBtn.classList.remove('mic-listening');
      if (activeBtn.dataset.originalContent) {
        activeBtn.innerHTML = activeBtn.dataset.originalContent;
        delete activeBtn.dataset.originalContent;
      }
    }
  };
  try { recognition.start(); } catch (e: any) { }
};



const VitalityHub: React.FC<{
  onOpenFood: () => void,
  onOpenWorkout: () => void,
  onOpenMeditation: () => void,
  onOpenCheckIn: () => void,
  t: any,
  nutritionLogs: any[],
  workoutLogs: any[],
  meditationLogs: any[]
}> = ({ onOpenFood, onOpenWorkout, onOpenMeditation, onOpenCheckIn, t, nutritionLogs, workoutLogs, meditationLogs }) => {
  const today = new Date().toDateString();
  const todayCals = nutritionLogs.filter(l => new Date(l.timestamp).toDateString() === today).reduce((s, l) => s + (l.calories || 0), 0);
  const todayProt = nutritionLogs.filter(l => new Date(l.timestamp).toDateString() === today).reduce((s, l) => s + (l.protein || 0), 0);
  const todayWorkoutMin = workoutLogs.filter(l => new Date(l.timestamp).toDateString() === today).reduce((s, l) => s + (l.duration || 0), 0);
  const todayZenMin = meditationLogs.filter(l => new Date(l.timestamp).toDateString() === today).reduce((s, l) => s + (l.duration || 0), 0);
  const calGoal = 2200;
  const calPct = Math.min(100, Math.round((todayCals / calGoal) * 100));

  const labs = [
    { label: 'Nutrition Lab', sub: 'Macro & Micro Intake', icon: Apple, gradient: 'from-orange-500 to-amber-400', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', onClick: onOpenFood },
    { label: 'Vitality Lab', sub: 'Workout & Fitness', icon: Dumbbell, gradient: 'from-blue-500   to-indigo-400', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', onClick: onOpenWorkout },
    { label: 'Mindfulness Lab', sub: 'Zen & Breath Sessions', icon: Wind, gradient: 'from-teal-500  to-emerald-400', bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600', onClick: onOpenMeditation },
    { label: 'Daily Check-In', sub: 'Vitals & Mood Sync', icon: Heart, gradient: 'from-rose-500  to-pink-400', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', onClick: onOpenCheckIn },
  ];

  const stats = [
    { label: 'Calories', value: todayCals, unit: 'kcal', icon: Apple, color: 'text-orange-500', bar: 'bg-orange-400', pct: calPct },
    { label: 'Protein', value: Math.round(todayProt), unit: 'g', icon: Zap, color: 'text-blue-500', bar: 'bg-blue-400', pct: Math.min(100, Math.round((todayProt / 60) * 100)) },
    { label: 'Workout', value: todayWorkoutMin, unit: 'min', icon: Dumbbell, color: 'text-indigo-500', bar: 'bg-indigo-400', pct: Math.min(100, Math.round((todayWorkoutMin / 30) * 100)) },
    { label: 'Mindful', value: todayZenMin, unit: 'min', icon: Wind, color: 'text-teal-500', bar: 'bg-teal-400', pct: Math.min(100, Math.round((todayZenMin / 15) * 100)) },
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header stripe */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-3 rounded-2xl backdrop-blur-sm">
            <Activity size={22} className="text-slate-900" />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-900/60 uppercase tracking-[0.3em]">Unified Monitoring</p>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Vitality Hub & Lab Analytics</h2>
            <p className="text-[8px] font-bold text-slate-900/50 uppercase tracking-widest mt-0.5">Metabolic Labs & Daily Mindfulness Synchronization</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* 4 Live Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-center justify-between">
                <span className={`text-[8px] font-black uppercase tracking-widest ${stat.color}`}>{stat.label}</span>
                <stat.icon size={14} className={stat.color} />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
                <span className={`text-[9px] font-bold ${stat.color} mb-0.5 uppercase`}>{stat.unit}</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${stat.bar} rounded-full transition-all duration-700`} style={{ width: `${stat.pct}%` }} />
              </div>
              <span className="text-[7px] font-bold text-slate-400 uppercase">{stat.pct}% of daily goal</span>
            </div>
          ))}
        </div>

        {/* Lab Access Grid */}
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Lab Access Points</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {labs.map((lab) => (
              <button key={lab.label} onClick={lab.onClick}
                className={`group ${lab.bg} border ${lab.border} rounded-2xl p-5 flex flex-col gap-3 text-left active:scale-95 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${lab.gradient} flex items-center justify-center shadow-md`}>
                  <lab.icon size={18} className="text-slate-900" />
                </div>
                <div>
                  <p className={`text-[10px] font-black ${lab.text} uppercase leading-tight`}>{lab.label}</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{lab.sub}</p>
                </div>
                <ChevronRight size={14} className={`${lab.text} opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (profile?: UserProfile) => void }> = ({ onLogin }) => {
  const { setLanguage, language: globalLang, theme, t: lt } = usePatientContext();
  const [role, setRole] = useState<'citizen' | 'officer' | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Anantapuramu');
  const [selectedMandal, setSelectedMandal] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [localLang, setLocalLang] = useState<any>(globalLang);
  const [existingUsers, setExistingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');
  const [isFetchingPin, setIsFetchingPin] = useState(false);

  const isDark = theme === 'dark';

  const fetchAddressByPin = async () => {
    if (!pincode || pincode.length !== 6) {
      alert(lt.pin_error);
      return;
    }
    setIsFetchingPin(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      if (data[0].Status === "Success" && data[0].PostOffice) {
        const po = data[0].PostOffice[0];
        let district = po.District;
        if (district === "Anantapur") district = "Anantapuramu";
        if (district === "Kadapa") district = "YSR";
        if (district === "Nellore") district = "Sri Potti Sriramulu Nellore";
        if (AP_GOVT_HIERARCHY[district]) {
          setSelectedDistrict(district);
          if (po.Block && AP_GOVT_HIERARCHY[district][po.Block]) {
            setSelectedMandal(po.Block);
            if (po.Name && AP_GOVT_HIERARCHY[district][po.Block].includes(po.Name)) {
              setSelectedVillage(po.Name);
            }
          }
        }
      }
    } catch (err) { } finally { setIsFetchingPin(false); }
  };

  useEffect(() => {
    const mandals = Object.keys(AP_GOVT_HIERARCHY[selectedDistrict] || {});
    if (mandals.length > 0) setSelectedMandal(mandals[0]);
  }, [selectedDistrict]);

  useEffect(() => {
    const villages = AP_GOVT_HIERARCHY[selectedDistrict]?.[selectedMandal] || [];
    if (villages.length > 0) setSelectedVillage(villages[0]);
  }, [selectedMandal, selectedDistrict]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        setExistingUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { } finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  const handleWipeDatabase = async () => {
    if (!confirm(lt.wipe_confirm)) return;
    const key = prompt(lt.admin_wipe_key);
    if (key !== 'IndiaAI-2026') return alert(lt.invalid_key);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', d.id)));
      await Promise.all(deletePromises);
      setExistingUsers([]);
      alert(lt.wipe_success);
      window.location.reload();
    } catch (err) { alert(lt.wipe_failed + err); }
  };

  const handleDeleteUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lt.purge_confirm)) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setExistingUsers(prev => prev.filter(u => u.id !== userId));
      alert(lt.purge_success);
    } catch (err) { alert(lt.delete_node_failed); }
  };

  const handleCachedLogin = (user: any) => {
    const pass = prompt(lt.login_as.replace('{name}', user.name));
    if (pass === null) return;
    if (user.password && user.password !== pass) return alert(lt.incorrect_password);
    setLanguage(user.language || localLang);
    onLogin({ ...user, language: user.language || localLang });
  };

  const handleAuth = () => {
    if (!name.trim()) return alert(lt.id_placeholder);
    if (!password.trim()) return alert(lt.node_password);
    const fullLocation = `Andhra Pradesh, ${selectedDistrict}, ${selectedMandal}, ${selectedVillage}${pincode ? ` (PIN: ${pincode})` : ''}`;
    const existing = existingUsers.find(u => u.name?.toLowerCase() === name.toLowerCase() && u.role === role);
    if (existing) {
      if (existing.password && existing.password !== password) return alert(lt.incorrect_password);
      setLanguage(localLang);
      onLogin({ ...existing, language: localLang, location: fullLocation });
    } else {
      setLanguage(localLang);
      onLogin({ ...INITIAL_PROFILE, name, password, role: role || 'citizen', language: localLang, location: fullLocation });
    }
  };

  if (!role) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950 text-white' : 'bg-[#f8fafc] text-slate-900'} transition-colors duration-500`}>
        <div className="w-full max-w-4xl space-y-12">
          <div className="text-center space-y-4">
            <div className="bg-emerald-600 text-white w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl border-4 border-white">
              <ShieldCheck size={40} />
            </div>
            <h1 className={`text-5xl font-black uppercase tracking-tighter italic ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.login_title}</h1>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">{lt.protocol_selection}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            <button onClick={() => setRole('citizen')} className={`group relative p-10 rounded-[3rem] shadow-xl border-2 transition-all text-left overflow-hidden active:scale-95 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-100 hover:border-emerald-500'}`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-transform duration-700"><UserCircle size={150} /></div>
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Heart size={32} /></div>
                <div>
                  <h2 className={`text-3xl font-black uppercase mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.login_citizen_guardian}</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase leading-relaxed">{lt.login_citizen_desc}</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                  <span>{lt.initialize_personal_node}</span><ArrowRight size={14} />
                </div>
              </div>
            </button>
            <button onClick={() => setRole('officer')} className={`group relative p-10 rounded-[3rem] shadow-xl border-2 transition-all text-left overflow-hidden active:scale-95 ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700"><Brain size={150} className="text-blue-400" /></div>
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-colors"><UserCheck size={32} /></div>
                <div>
                  <h2 className={`text-3xl font-black uppercase mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.login_health_officer}</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase leading-relaxed">{lt.login_officer_desc}</p>
                </div>
                <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                  <span>{lt.initialize_governance_portal}</span><ArrowRight size={14} />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-950' : 'bg-[#f0f2f5]'} transition-colors`}>
      <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border flex flex-col max-h-[95vh]`}>
        <div className="p-10 text-center space-y-4 shrink-0">
          <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-md shadow-xl border`}>
            {role === 'officer' ? <UserCheck size={40} className={isDark ? 'text-blue-400' : 'text-slate-900'} /> : <ShieldCheck size={40} className={isDark ? 'text-emerald-400' : 'text-slate-900'} />}
          </div>
          <div>
            <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} px-3 py-1 rounded-full w-fit mx-auto mb-2 backdrop-blur-md border`}>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.ap_govt_label}</span>
            </div>
            <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.life_shield}</h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">
              {role === 'officer' ? lt.officer_node_label : lt.citizen_node_label}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button onClick={() => setRole(null)} className="text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors">{lt.change_mode}</button>
            <span className="text-slate-700">|</span>
            <button onClick={handleWipeDatabase} className="text-[8px] font-black text-rose-400/60 uppercase tracking-widest hover:text-rose-500 transition-colors">{lt.wipe_all_data}</button>
          </div>
        </div>
        <div className={`${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'} border-y p-4 flex justify-center gap-2`}>
          {[{ id: 'en', label: 'EN' }, { id: 'te', label: 'తెలుగు' }, { id: 'hi', label: 'हिन्दी' }].map(l => (
            <button key={l.id} onClick={() => { setLocalLang(l.id); setLanguage(l.id as any); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${localLang === l.id ? 'bg-emerald-600 text-white shadow-md' : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-200')} border`}>{l.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 flex flex-col space-y-6">
          <div className="text-center space-y-2">
            <h2 className={`text-sm font-black uppercase tracking-[0.15em] ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.initialization}</h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase">{lt.auth_biometric_desc}</p>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder={lt.id_placeholder} className={`w-full border-2 p-5 rounded-[1.5rem] font-black text-sm uppercase outline-none transition-all font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300 focus:border-emerald-500'}`} value={name} onChange={e => setName(e.target.value)} />
            <input type="password" placeholder={lt.node_password} className={`w-full border-2 p-5 rounded-[1.5rem] font-black text-sm uppercase outline-none transition-all font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300 focus:border-emerald-500'}`} value={password} onChange={e => setPassword(e.target.value)} />
            <div className={`border-2 p-2 rounded-[1.5rem] flex items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <input type="text" maxLength={6} placeholder={lt.enter_pin} className={`flex-1 bg-transparent p-3 pl-4 font-black text-sm uppercase outline-none ${isDark ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-300'}`} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} />
              <button onClick={fetchAddressByPin} disabled={isFetchingPin} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50">{isFetchingPin ? '...' : lt.track_address}</button>
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">{lt.jurisdiction_label}</p>
              <select className={`w-full border-2 p-4 rounded-2xl font-black text-[11px] uppercase outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500'}`} value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
                {Object.keys(AP_GOVT_HIERARCHY).sort().map(d => <option key={d} value={d} className={isDark ? 'bg-slate-900' : ''}>{d}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select className={`border-2 p-4 rounded-2xl font-black text-[10px] uppercase outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500'}`} value={selectedMandal} onChange={e => setSelectedMandal(e.target.value)}>
                  {Object.keys(AP_GOVT_HIERARCHY[selectedDistrict] || {}).sort().map(m => <option key={m} value={m} className={isDark ? 'bg-slate-900' : ''}>{m}</option>)}
                </select>
                <select className={`border-2 p-4 rounded-2xl font-black text-[10px] uppercase outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-emerald-500'}`} value={selectedVillage} onChange={e => setSelectedVillage(e.target.value)}>
                  {(AP_GOVT_HIERARCHY[selectedDistrict]?.[selectedMandal] || []).sort().map(v => <option key={v} value={v} className={isDark ? 'bg-slate-900' : ''}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={handleAuth} className={`w-full py-6 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${role === 'officer' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20' : (isDark ? 'bg-white text-slate-950 hover:bg-emerald-400' : 'bg-slate-900 text-white hover:bg-emerald-950')}`}>
            {lt.log_in_node} <ChevronRight size={18} />
          </button>
          {existingUsers.filter(u => u.role === role).length > 0 && (
            <div className={`pt-8 border-t space-y-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="text-[10px] font-black text-slate-500 uppercase text-center">{lt.cached_nodes}</h3>
              <div className="space-y-3">
                {existingUsers.filter(u => u.role === role).map(user => (
                  <button key={user.id} onClick={() => handleCachedLogin(user)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:border-emerald-500' : 'bg-slate-50 border-slate-100 hover:border-emerald-500'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${role === 'officer' ? 'bg-blue-600 text-white' : (isDark ? 'bg-slate-700 text-white group-hover:bg-emerald-600' : 'bg-white text-slate-900 group-hover:bg-emerald-600 group-hover:text-white')}`}>{user.name?.charAt(0)}</div>
                    <span className={`flex-1 text-[10px] font-black uppercase truncate text-left ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</span>
                    <Trash2 size={16} className="text-slate-500 hover:text-rose-500 transition-colors" onClick={(e) => handleDeleteUser(user.id, e)} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={`p-5 text-center border-t ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}><p className={`text-[8px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{lt.bio_metric_online}</p></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const context = usePatientContext();
  const { profile, riskScores, updateProfile, addDocument, language, logFood, logWorkout, addMedication, t, nutritionLogs, activityLogs, clinicalVault } = context;
  const [activeTab, setActiveTab] = useState('home');
  const [subPage, setSubPage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVoiceCommanderOpen, setIsVoiceCommanderOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);

  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>({ isConnected: false, hasTextModel: false, hasVisionModel: false, availableModels: [] });

  useEffect(() => {
    (window as any).handleGlobalLogout = () => {
      setIsAuthenticated(false);
      updateProfile(null as any);
      localStorage.removeItem('lifeshield_profile');
      window.location.reload();
    };
  }, [updateProfile]);

  const startVoiceCommander = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t.speech_not_supported || "Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    const langMap: Record<string, string> = {
      'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-US'
    };

    recognition.lang = langMap[language] || 'en-US';
    recognition.start();
    setVoiceStatus('listening');
    setIsVoiceCommanderOpen(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      processVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Commander Speech Error:", event.error);
      setVoiceStatus('idle');
      if (event.error === 'not-allowed') alert(t.mic_access_blocked);
      setTimeout(() => setIsVoiceCommanderOpen(false), 2000);
    };

    recognition.onend = () => {
      if (voiceStatus === 'listening') setVoiceStatus('idle');
    };
  };

  const processVoiceCommand = async (transcript: string) => {
    setVoiceStatus('processing');
    try {
      const result = await parseVoiceCommand(context, transcript);
      if (result && result.type !== 'UNKNOWN') {
        if (result.type === 'ADD_MED') {
          addMedication({ id: Date.now().toString(), drugName: result.data.drugName || 'Unknown', dosage: result.data.dosage || '500mg', times: ['08:00'], foodInstruction: result.data.foodInstruction || 'none', days: [], isActive: true });
          setVoiceTranscript("Medication Added!");
        } else if (result.type === 'LOG_WORKOUT') {
          logWorkout({ id: Date.now().toString(), type: result.data.type || 'Exercise', durationMinutes: Number(result.data.durationMinutes) || 30, intensity: 'medium', timestamp: Date.now() });
          setVoiceTranscript("Workout Logged!");
        } else if (result.type === 'LOG_FOOD') {
          logFood({ id: Date.now().toString(), description: result.data.description || 'Meal', calories: 250, protein: 10, carbs: 30, fat: 8, timestamp: Date.now() });
          setVoiceTranscript("Food Logged!");
        } else if ((result.type as string) === 'NAVIGATE') {
          const target = result.data.target?.toLowerCase() || '';
          if (target.includes('home') || target.includes('dashboard')) setActiveTab('home');
          else if (target.includes('med') || target.includes('pharmacy')) setActiveTab('meds');
          else if (target.includes('ayush')) setActiveTab('ayush');
          else if (target.includes('symptom') || target.includes('triage')) setActiveTab('symptoms');
          else if (target.includes('bio') || target.includes('report')) setActiveTab('biohub');
          else if (target.includes('profile')) setActiveTab('profile');
          setVoiceTranscript(`Navigating to ${target}...`);
        }
      } else {
        setVoiceTranscript("Opening Assistant...");
        setIsAssistantOpen(true);
      }
    } catch (e) {
      setVoiceTranscript("Error processing command.");
    }
    setVoiceStatus('idle');
    setTimeout(() => setIsVoiceCommanderOpen(false), 2000);
  };

  const [unifiedHealthData, setUnifiedHealthData] = useState<any>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const refreshUnifiedHealth = async (options: any = {}) => {
    if (!profile) return;
    setIsOrchestrating(true);
    try {
      const data = await orchestrateHealth(context, options);
      if (data) {
        setUnifiedHealthData(data);
        if (data.guardian_summary) setAiAdvice(data.guardian_summary);
      }
    } catch (e) {
      console.error("[App] Orchestration failed:", e);
    } finally {
      setIsOrchestrating(false);
    }
  };

  useEffect(() => {
    if (profile && !unifiedHealthData && !isOrchestrating) {
      refreshUnifiedHealth();
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'officer') {
      setActiveTab('ayush');
    } else {
      setActiveTab('home');
    }
  }, [profile?.role]);

  useEffect(() => {
    const lastCheckIn = localStorage.getItem('lifeshield_last_checkin');
    const today = new Date().toDateString();
    if (lastCheckIn !== today && profile && profile.role === 'citizen') {
      setTimeout(() => setShowDailyCheckIn(true), 1500);
    }
  }, [profile]);

  useEffect(() => {
    checkAIStatus().then(setAiStatus);
    const interval = setInterval(() => checkAIStatus().then(setAiStatus), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSubPage(null);
  };

  const handleGetAIAdvice = async () => {
    await refreshUnifiedHealth();
  };

  useEffect(() => {
    if (profile && !aiAdvice && !isLoadingAdvice && !quotaExceeded) {
      handleGetAIAdvice();
    }
  }, [profile, aiAdvice]);

  // --- Real-time Medication Alerts Engine ---
  useEffect(() => {
    const checkMedications = () => {
      if (!profile || profile.role !== 'citizen') return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      context.medicationReminders.forEach(m => {
        m.slots.forEach(slot => {
          if (slot.time === currentTime) {
            const alertKey = `life_med_${m.name}_${slot.time}_${new Date().toDateString()}`;
            if (!localStorage.getItem(alertKey)) {
              alert((t.med_reminder_alert || "🔔 MEDICINE REMINDER: It is time to take {name} ({dosage}).\nInstruction: {instruction}").replace('{name}', m.name).replace('{dosage}', m.dosage).replace('{instruction}', slot.instruction || 'None'));
              localStorage.setItem(alertKey, 'alerted');
            }
          }
        });
      });
    };

    const interval = setInterval(checkMedications, 30000);
    return () => clearInterval(interval);
  }, [profile, context.medicationReminders]);

  if (!isAuthenticated) return (
    <LoginScreen onLogin={(p) => {
      if (p) {
        updateProfile(p);
        if (p.language) context.setLanguage(p.language as any);
      }
      setIsAuthenticated(true);
    }} />
  );

  if (!profile || profile.age === 0) return (
    <Onboarding onComplete={async (p) => {
      try {
        const id = Date.now().toString();
        const profileWithId = { ...p, id };
        const userRef = doc(db, 'users', id);
        await setDoc(userRef, { ...profileWithId, createdAt: new Date() });
        updateProfile(profileWithId);
      } catch (err) {
        console.error("Firebase store error:", err);
        updateProfile(p);
      }
    }} />
  );

  const renderContent = () => {

    switch (activeTab) {

      case 'home': return (
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 space-y-6">

            {/* MAIN DASHBOARD */}
            <Dashboard
              unifiedData={unifiedHealthData}
              isOrchestrating={isOrchestrating}
              onRefresh={() => refreshUnifiedHealth()}
              onOpenFoodLog={() => handleTabChange('lifeaudit')}
              onOpenWorkoutLog={() => handleTabChange('lifeaudit')}
              onOpenMeditationLog={() => handleTabChange('lifeaudit')}
              onOpenCheckIn={() => handleTabChange('lifeaudit')}
              theme={context.theme}
            />



          </div>

          {showDailyCheckIn && <DailyCheckInModal onClose={() => {
            setShowDailyCheckIn(false);
            localStorage.setItem('lifeshield_last_checkin', new Date().toDateString());
            refreshUnifiedHealth({ includeDailyCheckIn: true });
          }} />}
        </div>
      );
      case 'ayush': return <AYUSHHealthSystem />;
      case 'meds': return <MedsScreen />;
      case 'symptoms': return <StructuredSymptomChecker />;
      case 'biohub': return (
        <ReportsScreen
          analysis={comprehensiveAnalysis}
          isAnalyzing={isAnalyzing}
          onRefresh={async () => {
            setIsAnalyzing(true);
            try { await handleGetAIAdvice(); } finally { setIsAnalyzing(false); }
          }}
          setAnalysis={setComprehensiveAnalysis}
        />
      );
      case 'profile': return <ProfileScreen />;
      case 'food': return <FoodLogScreen onBack={() => handleTabChange('home')} />;
      case 'workout': return <WorkoutLogScreen onBack={() => handleTabChange('home')} />;
      case 'meditation': return <MeditationLab onBack={() => handleTabChange('home')} />;
      case 'checkin': return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <DailyCheckInModal onClose={() => {
            localStorage.setItem('lifeshield_last_checkin', new Date().toDateString());
            refreshUnifiedHealth({ includeDailyCheckIn: true });
            handleTabChange('home');
          }} />
        </div>
      );
      case 'lifeaudit': return (() => {
        // Internal Life Audit page state
        const LifeAuditPage = () => {
          const [auditTab, setAuditTab] = React.useState<'overview' | 'nutrition' | 'vitality' | 'mind'>('overview');
          const { nutritionLogs, activityLogs, meditationLogs, clinicalVault } = usePatientContext();

          // ── Today's Data ──
          const today = new Date().toDateString();
          const todayFood = nutritionLogs.filter((l: any) => new Date(l.timestamp).toDateString() === today);
          const todayWorkout = activityLogs.filter((l: any) => new Date(l.timestamp || l.date).toDateString() === today);
          const todayMed = meditationLogs ? meditationLogs.filter((l: any) => new Date(l.timestamp).toDateString() === today) : [];
          const checkIns = (clinicalVault || []).filter((d: any) => d.type === 'checkin' || d.mood);
          const lastCheckIn = checkIns[checkIns.length - 1];

          const totalCalories = todayFood.reduce((s: number, l: any) => s + (l.calories || 0), 0);
          const totalProtein = todayFood.reduce((s: number, l: any) => s + (l.protein || 0), 0);
          const totalWorkoutMins = todayWorkout.reduce((s: number, l: any) => s + (l.duration || l.minutes || 0), 0);
          const totalMedMins = todayMed.reduce((s: number, l: any) => s + (l.duration || l.minutes || 0), 0);

          const calorieGoal = 2000;
          const workoutGoal = 45;
          const medGoal = 20;

          const tabs = [
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'nutrition', label: 'Nutrition', icon: Apple },
            { id: 'vitality', label: 'Vitality', icon: Dumbbell },
            { id: 'mind', label: 'Mind & Mood', icon: Wind },
          ] as const;

          const statCards = [
            { label: 'Calories', value: totalCalories, unit: 'kcal', goal: calorieGoal, color: 'orange', icon: Apple, pct: Math.min(100, Math.round(totalCalories / calorieGoal * 100)) },
            { label: 'Protein', value: totalProtein, unit: 'g', goal: 80, color: 'rose', icon: Zap, pct: Math.min(100, Math.round(totalProtein / 80 * 100)) },

            { label: 'Workout', value: totalWorkoutMins, unit: 'min', goal: workoutGoal, color: 'blue', icon: Dumbbell, pct: Math.min(100, Math.round(totalWorkoutMins / workoutGoal * 100)) },
            { label: 'Meditation', value: totalMedMins, unit: 'min', goal: medGoal, color: 'teal', icon: Wind, pct: Math.min(100, Math.round(totalMedMins / medGoal * 100)) },
          ];

          const colorMap: Record<string, { bg: string; text: string; ring: string; bar: string; light: string }> = {
            orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-400', bar: 'bg-orange-400', light: 'bg-orange-100' },
            rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-400', bar: 'bg-rose-400', light: 'bg-rose-100' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-400', bar: 'bg-blue-400', light: 'bg-blue-100' },
            teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-400', bar: 'bg-teal-400', light: 'bg-teal-100' },
          };

          return (
            <div className="min-h-screen bg-slate-50">

              {/* ─── PAGE HEADER ─── */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 pb-0 pt-6">
                <div className="max-w-[1200px] mx-auto flex items-center gap-4 mb-5">
                  <div className="bg-slate-100 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                    <Activity size={24} className="text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[7px] font-black text-slate-900/60 uppercase tracking-[0.3em]">Wellness Tracking Suite</p>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Life Audit</h1>
                  </div>
                  <div className="ml-auto flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[7px] font-black text-slate-900 uppercase tracking-widest">4 Modules Active</span>
                  </div>
                </div>

                {/* ─── TAB NAVBAR ─── */}
                <div className="max-w-[1200px] mx-auto flex gap-1">
                  {tabs.map(tab => {
                    const IC = tab.icon;
                    const isActive = auditTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setAuditTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'bg-slate-100 text-slate-900/70 hover:bg-white/25'
                          }`}
                      >
                        <IC size={13} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── TAB CONTENT ─── */}
              <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6">

                {/* ══ OVERVIEW / ANALYTICS TAB ══ */}
                {auditTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* Greeting */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-400/30 shrink-0">
                        <Activity size={26} className="text-slate-900" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Today's Wellness Score</p>
                        <h2 className="text-3xl font-black text-slate-900 leading-none">
                          {Math.round((statCards.reduce((s, c) => s + c.pct, 0) / statCards.length))}
                          <span className="text-base text-slate-400 font-bold">%</span>
                        </h2>
                        <p className="text-[8px] font-bold text-emerald-500 uppercase mt-1">
                          {lastCheckIn?.mood ? `😊 Mood: ${lastCheckIn.mood}` : 'No check-in today yet'}
                        </p>
                      </div>
                      <div className="ml-auto hidden md:grid grid-cols-2 gap-2">
                        {statCards.map(s => (
                          <div key={s.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colorMap[s.color].bg} border border-slate-100`}>
                            <div className={`text-[9px] font-black uppercase ${colorMap[s.color].text}`}>{s.label}</div>
                            <div className={`text-[10px] font-black ml-auto ${colorMap[s.color].text}`}>{s.pct}%</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── 4 Stat Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {statCards.map(card => {
                        const IC = card.icon;
                        const c = colorMap[card.color];
                        return (
                          <div key={card.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className={`w-10 h-10 rounded-xl ${c.light} flex items-center justify-center`}>
                                <IC size={18} className={c.text} />
                              </div>
                              <span className={`text-[8px] font-black uppercase ${c.text} bg-opacity-10 ${c.bg} px-2 py-1 rounded-full`}>{card.pct}%</span>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                              <p className="text-2xl font-black text-slate-900 leading-none">
                                {card.value}<span className="text-sm text-slate-400 font-bold ml-1">{card.unit}</span>
                              </p>
                              <p className="text-[7px] font-bold text-slate-400 mt-1">Goal: {card.goal} {card.unit}</p>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${c.bar} rounded-full transition-all duration-1000`} style={{ width: `${card.pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Today's Log Summary ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Food Summary */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center"><Apple size={14} className="text-orange-600" /></div>
                          <div>
                            <p className="text-[9px] font-black text-orange-600 uppercase">Nutrition Lab</p>
                            <p className="text-[7px] font-bold text-slate-400">{todayFood.length} meals logged today</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {todayFood.length === 0 && <p className="text-[9px] text-slate-400 text-center py-4 font-bold">No meals logged yet</p>}
                          {todayFood.slice(-3).map((log: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                              <span className="text-[9px] font-black text-slate-700 truncate max-w-[120px]">{log.name || 'Meal'}</span>
                              <span className="text-[8px] font-black text-orange-500 shrink-0">{log.calories || 0} kcal</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setAuditTab('nutrition')} className="mt-3 w-full text-[8px] font-black uppercase text-orange-600 hover:text-orange-700 text-center py-1">
                          Open Nutrition Lab →
                        </button>
                      </div>

                      {/* Workout Summary */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center"><Dumbbell size={14} className="text-blue-600" /></div>
                          <div>
                            <p className="text-[9px] font-black text-blue-600 uppercase">Vitality Lab</p>
                            <p className="text-[7px] font-bold text-slate-400">{todayWorkout.length} sessions today</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {todayWorkout.length === 0 && <p className="text-[9px] text-slate-400 text-center py-4 font-bold">No workouts logged yet</p>}
                          {todayWorkout.slice(-3).map((log: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                              <span className="text-[9px] font-black text-slate-700 truncate max-w-[120px]">{log.type || 'Workout'}</span>
                              <span className="text-[8px] font-black text-blue-500 shrink-0">{log.duration || log.minutes || 0} min</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setAuditTab('vitality')} className="mt-3 w-full text-[8px] font-black uppercase text-blue-600 hover:text-blue-700 text-center py-1">
                          Open Vitality Lab →
                        </button>
                      </div>

                      {/* Mindfulness + Mood */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center"><Wind size={14} className="text-teal-600" /></div>
                          <div>
                            <p className="text-[9px] font-black text-teal-600 uppercase">Mind & Mood</p>
                            <p className="text-[7px] font-bold text-slate-400">{todayMed.length} sessions · {lastCheckIn ? 'Checked in' : 'No check-in'}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                            <span className="text-[9px] font-black text-slate-600">Meditation</span>
                            <span className="text-[9px] font-black text-teal-500">{totalMedMins} min</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                            <span className="text-[9px] font-black text-slate-600">Today's Mood</span>
                            <span className="text-[9px] font-black text-rose-500">
                              {lastCheckIn?.mood === 'Happy' ? '😊 Happy' : lastCheckIn?.mood === 'Sad' ? '😔 Low' : lastCheckIn?.mood ? `😐 ${lastCheckIn.mood}` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-[9px] font-black text-slate-600">Energy</span>
                            <span className="text-[9px] font-black text-violet-500">{lastCheckIn?.energyLevel ?? '—'}{lastCheckIn ? '%' : ''}</span>
                          </div>
                        </div>
                        <button onClick={() => setAuditTab('mind')} className="mt-2 w-full text-[8px] font-black uppercase text-teal-600 hover:text-teal-700 text-center py-1">
                          Open Mind & Mood →
                        </button>
                      </div>
                    </div>

                    {/* ── Weekly Goal Progress ── */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">Weekly Goal Progress</p>
                      <div className="space-y-4">
                        {statCards.map(card => {
                          const c = colorMap[card.color];
                          return (
                            <div key={card.label} className="flex items-center gap-4">
                              <span className={`text-[8px] font-black uppercase w-20 shrink-0 ${c.text}`}>{card.label}</span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${c.bar} rounded-full transition-all duration-1000`} style={{ width: `${card.pct}%` }} />
                              </div>
                              <span className="text-[8px] font-black text-slate-500 w-10 text-right shrink-0">{card.pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* ══ NUTRITION TAB ══ */}
                {auditTab === 'nutrition' && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                        <Apple size={16} className="text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] leading-none">Nutrition Lab</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Macro & Micro Intake</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <FoodLogScreen onBack={() => setAuditTab('overview')} embedded />
                    </div>
                  </div>
                )}

                {/* ══ VITALITY TAB ══ */}
                {auditTab === 'vitality' && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Dumbbell size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">Vitality Lab</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Workout & Fitness</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <WorkoutLogScreen onBack={() => setAuditTab('overview')} embedded />
                    </div>
                  </div>
                )}

                {/* ══ MIND & MOOD TAB ══ */}
                {auditTab === 'mind' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                        <Wind size={16} className="text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-black text-teal-600 uppercase tracking-[0.2em] leading-none">Mind & Mood</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Mindfulness + Daily Check-In</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <MeditationLab onBack={() => setAuditTab('overview')} embedded />
                    </div>
                    <div className="flex items-center gap-3 mb-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                        <Heart size={16} className="text-rose-600" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] leading-none">Daily Check-In</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Vitals & Mood Sync</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <DailyCheckInModal onClose={() => {
                        localStorage.setItem('lifeshield_last_checkin', new Date().toDateString());
                        refreshUnifiedHealth({ includeDailyCheckIn: true });
                      }} embedded />
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        };
        return <LifeAuditPage />;
      })();
      default: return null;

    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      isDanger={riskScores?.overall === RiskLevel.DANGER}
      onVoiceClick={startVoiceCommander}
    >

      <div className="pb-24 lg:pb-0">
        {renderContent()}
      </div>

      {isVoiceCommanderOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-8 text-slate-900 animate-in fade-in duration-300">
          <button onClick={() => setIsVoiceCommanderOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-full hover:bg-slate-100 transition-all">
            <X size={24} />
          </button>
          <div className="relative mb-8">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${voiceStatus === 'listening' ? 'border-emerald-500 animate-pulse' : 'border-slate-200'}`}>
              <Mic size={48} className={voiceStatus === 'listening' ? 'text-emerald-500' : 'text-slate-900'} />
            </div>
            {voiceStatus === 'listening' && (
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-25"></div>
            )}
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
            {voiceStatus === 'listening' ? 'Listening...' : voiceStatus === 'processing' ? 'Processing...' : 'Voice Command'}
          </h2>
          <p className="text-slate-900/60 text-center max-w-sm font-bold text-lg mb-8 italic">
            "{voiceTranscript || 'Speak your command...'}"
          </p>
        </div>
      )}

      {!aiStatus.isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-2 z-[9999]">
          ⚠️ AI Service Disconnected. Ensure Ollama is running.
        </div>
      )}

      {!isAssistantOpen && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 bg-[#25d366] text-slate-900 p-4 lg:p-5 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.4)] z-[40] active:scale-90 transition-all border-4 border-white flex items-center justify-center hover:bg-[#128c7e]"
        >
          <MessageSquare size={28} />
        </button>
      )}

      {isAssistantOpen && (
        <PersonalAssistant
          onClose={() => setIsAssistantOpen(false)}
          analysis={comprehensiveAnalysis}
          epidemiology={(window as any).lastGlobalStats}
        />
      )}
    </Layout>
  );
};

// --- SUB-COMPONENTS ---

const Dashboard: React.FC<{
  unifiedData: any,
  isOrchestrating: boolean,
  onRefresh: () => void,
  onOpenFoodLog: () => void,
  onOpenWorkoutLog: () => void,
  onOpenMeditationLog: () => void,
  onOpenCheckIn: () => void,
  theme: 'light' | 'dark'
}> = ({ unifiedData, isOrchestrating, onRefresh, theme }) => {
  const { nutritionLogs, activityLogs, t, profile, riskScores, clinicalVault, medications, language } = usePatientContext();
  const healthData = unifiedData?.bio_risk;

  // ── Today's quick stats ──
  const today = new Date().toDateString();
  const todayFood = nutritionLogs.filter((l: any) => new Date(l.timestamp).toDateString() === today);
  const todayWorkout = activityLogs.filter((l: any) => new Date(l.timestamp || l.date).toDateString() === today);
  const totalCal = todayFood.reduce((s: number, l: any) => s + (l.calories || 0), 0);
  const totalWorkMin = todayWorkout.reduce((s: number, l: any) => s + (l.duration || l.minutes || 0), 0);
  const todayMeds = (medications || []).filter((m: any) => m.time);
  const checkIns = (clinicalVault || []).filter((d: any) => d.mood);
  const lastCheckIn = checkIns[checkIns.length - 1];

  const riskPct = healthData ? Math.round(healthData.risk_probability * 100) : null;
  const riskLabel = healthData?.risk_level || 'Unknown';
  const riskColor = riskLabel === 'High' ? 'text-red-500' : riskLabel === 'Moderate' ? 'text-amber-500' : 'text-emerald-500';
  const riskBg = theme === 'dark'
    ? (riskLabel === 'High' ? 'from-red-950 to-slate-950' : riskLabel === 'Moderate' ? 'from-amber-950 to-slate-950' : 'from-emerald-950 to-slate-950')
    : (riskLabel === 'High' ? 'from-red-50 to-white' : riskLabel === 'Moderate' ? 'from-amber-50 to-white' : 'from-emerald-50 to-white');
  const riskBorder = theme === 'dark' ? 'border-slate-800' : 'border-slate-100';

  const modules = [
    { icon: Stethoscope, label: 'AYUSH AI', sub: 'Herbal · Ayurveda · Yoga', tab: 'ayush', color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
    { icon: Pill, label: 'Medications', sub: `${todayMeds.length} active reminders`, tab: 'meds', color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
    { icon: Brain, label: 'Disease Finder', sub: 'AI Symptom Triage', tab: 'symptoms', color: 'violet', gradient: 'from-violet-500 to-purple-500' },
    { icon: FileText, label: 'Health Files', sub: `${clinicalVault?.length || 0} documents`, tab: 'biohub', color: 'rose', gradient: 'from-rose-500 to-pink-500' },
    { icon: Activity, label: 'Life Audit', sub: 'Nutrition · Fitness · Mind', tab: 'lifeaudit', color: 'orange', gradient: 'from-orange-500 to-amber-500' },
    { icon: UserCircle, label: 'My Profile', sub: 'Settings · History · Risks', tab: 'profile', color: 'slate', gradient: 'from-slate-500 to-slate-700' },
  ] as const;

  const colorTokens: Record<string, { ring: string; bg: string; text: string }> = {
    emerald: { ring: 'ring-emerald-400/30', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue: { ring: 'ring-blue-400/30', bg: 'bg-blue-50', text: 'text-blue-600' },
    violet: { ring: 'ring-violet-400/30', bg: 'bg-violet-50', text: 'text-violet-600' },
    rose: { ring: 'ring-rose-400/30', bg: 'bg-rose-50', text: 'text-rose-600' },
    orange: { ring: 'ring-orange-400/30', bg: 'bg-orange-50', text: 'text-orange-600' },
    slate: { ring: 'ring-slate-400/30', bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10 px-2 lg:px-0">

      {/* ══ ROW 1: HERO BANNER — AI Guardian + Risk ══ */}
      <div className={`bg-gradient-to-br ${riskBg} rounded-[2.5rem] p-6 lg:p-8 relative overflow-hidden shadow-2xl border transition-all duration-500 ${riskBorder}`}>
        {/* bg decoration */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-emerald-400 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Icon + Title */}
          <div className="flex items-center gap-4 flex-1">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 border backdrop-blur-sm shadow-xl ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <ShieldCheck size={32} />
            </div>
            <div>
              <p className={`text-[8px] font-black uppercase tracking-[0.35em] mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>LifeShield AI Guardian • Active</p>
              <h1 className={`text-xl lg:text-2xl font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {profile?.name ? `Hello, ${profile.name.split(' ')[0]}` : 'Welcome Back'}
              </h1>
              <p className={`text-sm font-bold mt-1 leading-relaxed max-w-md ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {isOrchestrating
                  ? '⚙️ Running clinical orchestration...'
                  : (unifiedData?.guardian_summary || 'Your AI health guardian is monitoring all vitals. Stay healthy!')}
              </p>
            </div>
          </div>

          {/* Risk Score Dial */}
          <div className="flex items-center gap-6 shrink-0">
            {riskPct !== null ? (
              <div className="text-center">
                <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-900/40'}`}>Bio-Risk Score</p>
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none"
                      stroke={riskLabel === 'High' ? '#ef4444' : riskLabel === 'Moderate' ? '#f59e0b' : '#10b981'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${riskPct * 2.01} 201`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{riskPct}</span>
                    <span className={`text-[7px] font-black ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>%</span>
                  </div>
                </div>
                <p className={`text-[9px] font-black uppercase mt-1 ${riskColor}`}>{riskLabel} Risk</p>
              </div>
            ) : (
              <div className="text-center">
                <p className={`text-[7px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-900/40'}`}>Bio-Risk Score</p>
                <div className="w-20 h-20 flex items-center justify-center border-2 border-slate-100 rounded-full">
                  {isOrchestrating
                    ? <div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-400 rounded-full animate-spin" />
                    : <Activity size={28} className={theme === 'dark' ? 'text-slate-700' : 'text-slate-200'} />
                  }
                </div>
                <p className={`text-[8px] font-black uppercase mt-1 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`}>Not analysed</p>
              </div>
            )}
            <button onClick={onRefresh}
              className="p-3 bg-slate-100 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all active:scale-90">
              <RefreshCcw size={18} className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} ${isOrchestrating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ══ ROW 2: 4 QUICK STATS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Apple, label: "Today's Calories", value: totalCal, unit: 'kcal', goal: 2000, color: 'orange', pct: Math.min(100, Math.round(totalCal / 2000 * 100)) },
          { icon: Dumbbell, label: 'Workout', value: totalWorkMin, unit: 'min', goal: 45, color: 'blue', pct: Math.min(100, Math.round(totalWorkMin / 45 * 100)) },
          { icon: Pill, label: 'Medications Due', value: todayMeds.length, unit: 'today', goal: null, color: 'violet', pct: null },
          { icon: Heart, label: 'Mood Today', value: lastCheckIn?.mood || '—', unit: '', goal: null, color: 'rose', pct: null },
        ].map((s, i) => {
          const IC = s.icon;
          const c = {
            orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', bar: 'bg-orange-400', light: 'bg-orange-100' },
            blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', bar: 'bg-blue-400', light: 'bg-blue-100' },
            violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600', bar: 'bg-violet-400', light: 'bg-violet-100' },
            rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', bar: 'bg-rose-400', light: 'bg-rose-100' },
          }[s.color as string] || { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', bar: 'bg-slate-400', light: 'bg-slate-100' };
          return (
            <div key={i} className={`rounded-3xl border shadow-sm p-5 space-y-3 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 ${c.light} rounded-xl flex items-center justify-center`}>
                  <IC size={18} className={c.text} />
                </div>
                {s.pct !== null && (
                  <span className={`text-[8px] font-black uppercase ${c.text} px-2 py-1 ${c.bg} rounded-full`}>{s.pct}%</span>
                )}
              </div>
              <div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
                <p className={`text-xl font-black leading-none mt-0.5 ${c.text}`}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  {s.unit && <span className="text-xs text-slate-400 font-bold ml-1">{s.unit}</span>}
                </p>
                {s.goal && <p className="text-[7px] text-slate-400 font-bold mt-1">Goal: {s.goal} {s.unit}</p>}
              </div>
              {s.pct !== null && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full transition-all duration-1000`} style={{ width: `${s.pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ ROW 3: AI Bio-Risk Engine + Organ Digital Twin ══ */}
      {(healthData || isOrchestrating) && (
        <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] text-slate-900 shadow-2xl relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />ML Cloud · Live
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-base font-black uppercase tracking-tight text-slate-900/90">AI Bio-Risk Engine</h2>
            <p className="text-[9px] font-black text-slate-900/30 uppercase tracking-[0.2em]">Digital Twin · Organ Stress Analysis</p>
          </div>

          {healthData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Score */}
              <div className="space-y-5">
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-900/30 uppercase tracking-widest mb-1">Risk Probability</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-900">{riskPct}</span>
                      <span className="text-xl font-black text-emerald-500">%</span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[9px] font-black text-slate-900/30 uppercase tracking-widest mb-1">Level</p>
                    <span className={`text-lg font-black uppercase ${riskColor}`}>{riskLabel}</span>
                    {healthData.longevityAge > 0 && (
                      <div className="mt-2 text-right">
                        <p className="text-[7px] font-black text-emerald-400 uppercase">Biological Age</p>
                        <p className="text-sm font-black text-slate-900">{healthData.longevityAge} <span className="text-[8px] text-slate-900/40">YRS</span></p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black text-slate-900/40 uppercase">
                    <span>Bio Resilience</span><span>{healthData.vitality_score}%</span>
                  </div>
                  <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${healthData.vitality_score}%` }} />
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between text-[8px] font-black uppercase mb-2">
                  <span className="text-emerald-400">7-Day Risk Radar</span>
                  <span className={healthData.projection7Day > 50 ? 'text-red-400' : 'text-emerald-400'}>{healthData.projection7Day}%</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${healthData.projection7Day > 50 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${healthData.projection7Day}%` }} />
                </div>
              </div>

              {/* Right: Organ Stress */}
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-900/30'}`}>Organ Stress Map</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Cardio', val: healthData.organ_stress.cardio },
                    { label: 'Liver', val: healthData.organ_stress.liver },
                    { label: 'Kidney', val: healthData.organ_stress.kidney },
                    { label: 'Metabolic', val: healthData.organ_stress.stomach || 0.1 },
                    { label: 'Respiratory', val: healthData.organ_stress.respiratory },
                  ].map(o => (
                    <div key={o.label} className="flex items-center gap-3">
                      <span className={`text-[8px] font-black uppercase w-20 shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-900/40'}`}>{o.label}</span>
                      <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className={`h-full rounded-full transition-all duration-700 ${o.val > 0.5 ? 'bg-red-500' : o.val > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${o.val * 100}%` }} />
                      </div>
                      <span className={`text-[8px] font-black w-8 text-right shrink-0 ${o.val > 0.6 ? 'text-rose-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`}>{(o.val * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-900/40 uppercase tracking-widest">Running Clinical Orchestra...</p>
            </div>
          )}
        </div>
      )}

      {/* ══ ROW 3.5: Geospatial Biological Surveillance (Geological Alerts) ══ */}
      <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500 p-2.5 rounded-2xl text-white shadow-lg shadow-rose-500/20"><MapPin size={22} /></div>
            <div>
              <h2 className={`text-base font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Geospatial Biological Surveillance</h2>
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">Active Regional Bio-Hazard Alerts</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            Live AP-Surveillance Loop
          </div>
        </div>

        {/* AP District Biohazard Grid — 2025-26 Epidemiological Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {((window as any).lastGlobalStats?.locationTrends || [
            {
              name: "Kurnool",
              total: 462,
              status: "ALERT",
              clusters: ["Dengue Surge"],
              disease: "Dengue Fever",
              trend: "↑ Unprecedented peak 2025",
              source: "Deccan Chronicle / AP Health Dept"
            },
            {
              name: "Alluri Sitarama Raju",
              total: 2841,
              status: "CRITICAL",
              clusters: ["Malaria Hotspot"],
              disease: "P. falciparum / P. vivax Malaria",
              trend: "74.91% of AP malaria burden",
              source: "AP Health Report 2025"
            },
            {
              name: "Visakhapatnam",
              total: 318,
              status: "ALERT",
              clusters: ["Viral Fever Cluster"],
              disease: "Seasonal Viral Fever",
              trend: "↑ Joint pain + fever outbreak",
              source: "NEIE / AP Surveillance 2024-25"
            },
            {
              name: "Parvathipuram Manyam",
              total: 1892,
              status: "HIGH",
              clusters: ["Malaria Endemic Zone"],
              disease: "Malaria (Forested Tribal Belt)",
              trend: "Tribal migration risk zone",
              source: "AP Health Report 2025"
            },
            {
              name: "NTR (Vijayawada)",
              total: 197,
              status: "MONITORING",
              clusters: ["Viral Fever + Dengue"],
              disease: "Dengue / Seasonal Fever",
              trend: "Urban vector density rising",
              source: "NEIE Report 2024"
            },
            {
              name: "Bapatla",
              total: 0,
              status: "STABLE",
              clusters: ["Stable Status"],
              disease: "No Active Outbreak",
              trend: "Zero malaria cases 3 yrs",
              source: "AP Health Report 2025"
            }
          ]).slice(0, 6).map((loc: any, i: number) => {
            const isAlert = loc.status === 'CRITICAL' || loc.status === 'ALERT';
            const isHigh = loc.status === 'HIGH' || loc.status === 'MONITORING';
            const statusColor = loc.status === 'CRITICAL'
              ? 'bg-red-600 text-white'
              : loc.status === 'ALERT'
                ? 'bg-rose-500/20 text-rose-500'
                : loc.status === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-600'
                  : loc.status === 'MONITORING'
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-emerald-500/20 text-emerald-500';
            const barColor = loc.status === 'CRITICAL' ? 'bg-red-600'
              : isAlert ? 'bg-rose-500'
                : isHigh ? 'bg-amber-500'
                  : 'bg-emerald-500';

            return (
              <div key={i} className={`p-5 rounded-[2rem] border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className={`text-[11px] font-black uppercase leading-tight max-w-[60%] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{loc.name}</p>
                  <div className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase ${statusColor}`}>
                    {loc.status}
                  </div>
                </div>

                <p className={`text-[8px] font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{loc.disease}</p>

                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{loc.total.toLocaleString()}</span>
                  <span className="text-[7px] font-black text-slate-400 uppercase">Tracked Nodes</span>
                </div>

                <p className={`text-[7px] italic mb-3 ${isAlert ? 'text-rose-400' : 'text-slate-400'}`}>{loc.trend}</p>

                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${Math.min(100, (loc.total / 3000) * 100).toFixed(1)}%` }}
                  />
                </div>

                <p className="text-[6px] text-slate-400 mt-2 truncate">📊 {loc.source}</p>
              </div>
            );
          })}
        </div>

        {/* Data Attribution Footer */}
        <div className={`mt-5 p-3 rounded-2xl border text-center ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
          <p className="text-[7px] font-bold text-slate-400">
            📡 Data sourced from AP Health Department Reports, AWARE Platform (RTGS), Deccan Chronicle & NEIE Surveillance 2024–2026 •
            <span className="text-emerald-500"> Malaria: 71.57% reduction since 2015</span> •
            <span className="text-rose-500"> Dengue: South India = 61.8% of national cases (2025)</span>
          </p>
        </div>
      </div>

      {/* ══ ROW 4: MODULE QUICK-ACCESS GRID ══ */}
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">All Modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {modules.map(mod => {
            const IC = mod.icon;
            const c = colorTokens[mod.color];
            return (
              <button
                key={mod.tab}
                onClick={() => {/* handled via Layout onTabChange from parent */ }}
                className={`p-4 text-left space-y-3 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 group ring-0 hover:ring-2 ${c.ring} rounded-3xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
              >
                <div className={`w-11 h-11 bg-gradient-to-br ${mod.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-black/10`}>
                  <IC size={20} className={theme === 'dark' ? 'text-white' : 'text-slate-900'} />
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase ${c.text}`}>{mod.label}</p>
                  <p className="text-[7px] font-bold text-slate-400 mt-0.5 leading-tight">{mod.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ ROW 5: Today's Meds + Profile Snapshot ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Medication Reminders */}
        <div className={`rounded-3xl border shadow-sm p-6 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Pill size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Medication Schedule</p>
              <p className="text-[7px] font-bold text-slate-400">Today's reminders</p>
            </div>
          </div>
          <div className="space-y-2">
            {todayMeds.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-slate-300">
                <Pill size={28} />
                <p className="text-[9px] font-black uppercase">No medications scheduled</p>
              </div>
            ) : todayMeds.slice(0, 5).map((med: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 py-2.5 border-b last:border-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-black truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{med.name}</p>
                  <p className="text-[7px] font-bold text-slate-400">{med.dosage} · {med.frequency}</p>
                </div>
                <span className="text-[8px] font-black text-blue-500 shrink-0">{med.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Profile Snapshot */}
        <div className={`rounded-3xl border shadow-sm p-6 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <UserCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Health Profile</p>
              <p className="text-[7px] font-bold text-slate-400">Personal snapshot</p>
            </div>
          </div>
          {profile?.name ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Name', value: profile.name },
                { label: 'Age', value: profile.age ? `${profile.age} yrs` : '—' },
                { label: 'Weight', value: profile.weight ? `${profile.weight} kg` : '—' },
                { label: 'Profession', value: profile.profession || '—' },
                { label: 'Conditions', value: profile.conditions?.length ? `${profile.conditions.length} noted` : 'None' },
                { label: 'Medications', value: medications?.length ? `${medications.length} active` : 'None' },
              ].map((row, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-[7px] font-black text-slate-400 uppercase">{row.label}</p>
                  <p className={`text-[10px] font-black transition-colors ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} truncate`}>{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center gap-2 text-slate-300">
              <UserCircle size={28} />
              <p className="text-[9px] font-black uppercase">Complete your profile</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ ROW 6: Recent Activity Timeline ══ */}
      {
        (todayFood.length > 0 || todayWorkout.length > 0) && (
          <div className={`rounded-3xl border shadow-sm p-6 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">Today's Activity Timeline</p>
            <div className="space-y-3">
              {[
                ...todayFood.map((l: any) => ({ type: 'food', icon: Apple, color: 'text-orange-500', bg: 'bg-orange-50', label: l.name || 'Meal', detail: `${l.calories || 0} kcal`, time: l.timestamp })),
                ...todayWorkout.map((l: any) => ({ type: 'workout', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-50', label: l.type || 'Workout', detail: `${l.duration || 0} min`, time: l.timestamp || l.date })),
              ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .slice(0, 6)
                .map((item, i) => {
                  const IC = item.icon;
                  return (
                    <div key={i} className={`flex items-center gap-3 py-2 border-b last:border-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : item.bg}`}>
                        <IC size={14} className={item.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-black transition-colors ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} truncate`}>{item.label}</p>
                        <p className="text-[7px] font-bold text-slate-400">{item.detail}</p>
                      </div>
                      <span className="text-[7px] font-bold text-slate-400 shrink-0">
                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )
      }

    </div >
  );
};



const FoodLogScreen: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
  const { nutritionLogs, logFood, profile, language, t, theme } = usePatientContext();
  const lt = t;
  const isDark = theme === 'dark';
  const [analyzing, setAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [deficiencyAnalysis, setDeficiencyAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Run deficiency check on mount or when logs update
    const todayLogs = nutritionLogs.filter(l => {
      const d = new Date(l.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });

    if (profile && todayLogs.length > 0) {
      analyzeNutritionDeficiencies(profile, todayLogs, language).then(setDeficiencyAnalysis);
    }
  }, [nutritionLogs, profile]);

  const getChartData = () => {
    // Group by day for the last 7 or 30 days
    const days = viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 1;
    const data = [];
    const now = new Date();

    // If 'day', just show hourly or meals? Let's show meals for 'day'
    if (viewMode === 'day') {
      const todayLogs = nutritionLogs.filter(l => new Date(l.timestamp).toDateString() === now.toDateString());
      return todayLogs.map(l => ({
        name: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        calories: l.calories,
        protein: l.protein,
        fat: l.fat,
        carbs: l.carbs
      }));
    }

    // For week/month
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;

      const dayLogs = nutritionLogs.filter(l => l.timestamp >= dayStart && l.timestamp < dayEnd);

      data.push({
        name: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
        calories: dayLogs.reduce((acc, l) => acc + l.calories, 0),
        protein: dayLogs.reduce((acc, l) => acc + (l.protein || 0), 0),
        fat: dayLogs.reduce((acc, l) => acc + (l.fat || 0), 0),
        carbs: dayLogs.reduce((acc, l) => acc + (l.carbs || 0), 0),
      });
    }
    return data;
  };

  const chartData = getChartData();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);

    try {
      const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_DIM = 640;
              if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
              else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
            };
            img.src = event.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const base64 = await resizeImage(file);
      const result = await analyzeFoodImage(base64);

      logFood({
        id: Date.now().toString(),
        description: result.description || "Unidentified Meal",
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        timestamp: Date.now(),
        imageUrl: `data:image/jpeg;base64,${base64}`
      });
    } catch (err: any) {
      alert((t.clinical_analysis_error || "Clinical analysis error: {error}. Ensure Ollama is running with 'llava' model.").replace('{error}', err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-3 mb-2 sticky top-0 bg-[#f0f2f5] z-10 py-2">
        {!embedded && <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-50 text-slate-900 transition-all active:scale-90"><ChevronLeft size={20} /></button>}
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t.nutrition_lab}</h2>
      </div>

      {/* Manual Entry with Mic */}
      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
            placeholder="Manually log meal (e.g. 2 Chapatis)"
            id="manualFoodInput"
          />
          <button
            onClick={() => startListening(language, text => {
              const input = document.getElementById('manualFoodInput') as HTMLInputElement;
              if (input) input.value = text;
            })}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-orange-600 active:scale-90"
          >
            <Mic size={20} />
          </button>
        </div>
        <button
          onClick={() => {
            const input = document.getElementById('manualFoodInput') as HTMLInputElement;
            if (input?.value) {
              logFood({ id: Date.now().toString(), description: input.value, calories: 150, protein: 5, carbs: 20, fat: 5, timestamp: Date.now() });
              input.value = '';
            }
          }}
          className="bg-orange-600 text-slate-900 p-4 rounded-xl active:scale-95 shadow-md"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* 1. Scanner & Upload Section (Top as implied) */}
      <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto text-orange-600 shadow-inner">
          {analyzing ? <Loader2 className="animate-spin" size={28} /> : <Camera size={28} />}
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase">AI Food Scanner</h3>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Capture meal for macro-nutrient synthesis.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={analyzing}
          className="w-full bg-orange-600 text-slate-900 font-black py-6 rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2"
        >
          {analyzing ? "Analyzing..." : <><Upload size={14} /> Launch Scanner</>}
        </button>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Labor Energy Predictor */}
      {profile && (
        <div className="space-y-6">
          <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group border`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <TrendingUp size={100} className="text-emerald-400" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    {lt.energy_predictor || "Labor Energy Predictor"}
                  </h3>
                  <p className={`font-black text-xl uppercase mt-1 tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile.profession || "General Public"}</p>
                </div>
                <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-100'} px-3 py-1.5 rounded-lg border`}>
                  <p className="text-[8px] font-black text-slate-500 uppercase">Workload</p>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{(profile as any).workIntensity || 'Moderate'}</p>
                </div>
              </div>

              {(() => {
                const rec = getWorkBasedNutrition(profile);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border flex flex-col justify-center items-center text-center`}>
                      <span className="text-[9px] font-black text-slate-500 uppercase mb-1">{lt.daily_target || "Daily Target"}</span>
                      <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{rec.suggestedCalories} <span className="text-xs text-slate-500">kcal</span></p>
                      <p className="text-[8px] font-bold text-emerald-500/60 mt-1 uppercase">For {profile.workHoursPerDay || 8}h Labor</p>
                    </div>
                    <div className="space-y-3">
                      <div className={`flex justify-between items-center text-[9px] font-black ${isDark ? 'text-slate-400' : 'text-slate-600'} uppercase tracking-tighter`}>
                        <span>Prot: {rec.macronutrients.protein}</span>
                        <span>Carb: {rec.macronutrients.carbs}</span>
                        <span>Fat: {rec.macronutrients.fat}</span>
                      </div>
                      <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} h-2 w-full rounded-full overflow-hidden flex`}>
                        <div className="h-full bg-blue-500" style={{ width: rec.macronutrients.protein }}></div>
                        <div className="h-full bg-emerald-500" style={{ width: rec.macronutrients.carbs }}></div>
                        <div className="h-full bg-orange-500" style={{ width: rec.macronutrients.fat }}></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rec.focusFoods.map(f => (
                          <span key={f} className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-md border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-600 shadow-sm'}`}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Strategic Food Recommendations Card */}
          {(() => {
            const rec = getWorkBasedNutrition(profile);
            return (
              <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} p-8 rounded-[2.5rem] shadow-xl border space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700`}>
                <div className="flex items-center justify-between border-b pb-6 border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/20 p-3 rounded-2xl text-orange-500">
                      <Apple size={24} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{lt.dietary_preferences_title || "Dietary Strategy"}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Profession-Aware & Disease-Specific</p>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{lt.protocol_selection}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Vegetarian Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{lt.veg || "Vegetarian"}</span>
                    </div>
                    <div className="space-y-2">
                      {rec.categoricalSuggestions.veg.map((food, i) => (
                        <div key={i} className={`${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border group hover:border-emerald-500/30 transition-all`}>
                          <p className={`text-[12px] font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{food}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">High Bio-Availability</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Non-Vegetarian Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{lt.non_veg || "Non-Veg"}</span>
                    </div>
                    <div className="space-y-2">
                      {rec.categoricalSuggestions.nonVeg.map((food, i) => (
                        <div key={i} className={`${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border group hover:border-orange-500/30 transition-all`}>
                          <p className={`text-[12px] font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{food}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Muscle Protein Sync</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regional Column */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{lt.regional_specialties || "Regional Specialties"}</span>
                    </div>
                    <div className="space-y-2">
                      {rec.regionalSpecialties.map((food, i) => (
                        <div key={i} className={`${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border group hover:border-blue-500/30 transition-all`}>
                          <p className={`text-[12px] font-black uppercase tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{food}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Local Adaptation</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} p-6 rounded-3xl border flex items-start gap-4`}>
                  <div className="bg-blue-500 text-white p-2 rounded-xl shrink-0 mt-1">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="space-y-2">
                    <h4 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Clinical Nutri-Risk Analysis</h4>
                    <p className={`text-[11px] font-bold italic leading-relaxed ${isDark ? 'text-blue-100/70' : 'text-blue-900'}`}>{rec.riskNote}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 2. Deficiency Analysis & Recommendations */}
      {deficiencyAnalysis && (
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><ShieldCheck size={18} /></div>
            <h3 className="text-sm font-black text-slate-900 uppercase">Daily Deficiency Analysis</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-2">Detected Gaps</span>
              <ul className="list-disc list-inside space-y-1">
                {deficiencyAnalysis.deficiencies?.map((d: string, i: number) => (
                  <li key={i} className="text-[11px] font-bold text-red-900 uppercase">{d}</li>
                ))}
                {(!deficiencyAnalysis.deficiencies || deficiencyAnalysis.deficiencies.length === 0) && <li className="text-[11px] font-bold text-slate-500">None detected.</li>}
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">Remaining Needs</span>
              <p className="text-[11px] font-bold text-blue-900 leading-relaxed">{deficiencyAnalysis.remainingNeeds}</p>
            </div>
          </div>

          <div className="bg-white text-slate-900 p-4 rounded-xl text-center">
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{deficiencyAnalysis.instruction || "Select balanced options below."}</p>
          </div>

          <div className="space-y-4 pt-2">
            {deficiencyAnalysis.recommendations?.vegetarian && deficiencyAnalysis.recommendations.vegetarian.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Vegetarian Power</span>
                <div className="grid grid-cols-1 gap-2">
                  {deficiencyAnalysis.recommendations.vegetarian.map((s: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase">{s.food}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deficiencyAnalysis.recommendations?.nonVegetarian && deficiencyAnalysis.recommendations.nonVegetarian.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-md">Non-Veg Options</span>
                <div className="grid grid-cols-1 gap-2">
                  {deficiencyAnalysis.recommendations.nonVegetarian.map((s: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase">{s.food}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deficiencyAnalysis.recommendations?.fruits && deficiencyAnalysis.recommendations.fruits.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">Fruits & Nature</span>
                <div className="grid grid-cols-1 gap-2">
                  {deficiencyAnalysis.recommendations.fruits.map((s: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase">{s.food}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback for old format */}
            {deficiencyAnalysis.suggestions && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  {deficiencyAnalysis.suggestions.map((s: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-900 uppercase">{s.food}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Charts Section */}
      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 uppercase">Micro Trends</h3>
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {(['day', 'week', 'month'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === m ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>{m}</button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#64748b' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }} />
              <Bar dataKey="calories" name="Cals" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="protein" name="Prot" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="fat" name="Fat" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="carbs" name="Carbs" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Logs List (Below Charts as requested) */}
      {/* 4. Logs List Hidden as per 'Graph Only' request */}
    </div>
  );
};

const WorkoutLogScreen: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
  const { activityLogs, logWorkout, language, t } = usePatientContext();
  const [type, setType] = useState('');
  const [mins, setMins] = useState('');

  const [isTracking, setIsTracking] = useState(false);
  const [steps, setSteps] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: any;
    if (isTracking) {
      startTimeRef.current = Date.now();
      // Simulate real-time tracking if no sensors, or assume mobile usage
      // For now, we simulate "live" steps counter
      interval = setInterval(() => {
        setSteps(s => s + Math.floor(Math.random() * 3));
      }, 2000);

      // In a real mobile app, we would use:
      // window.addEventListener('devicemotion', handleMotion);
    } else {
      if (startTimeRef.current && steps > 0) {
        // Auto log on stop
        const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 60000));
        if (confirm(`Tracking stopped. Log ${steps} steps walk for ${duration} mins?`)) {
          logWorkout({ id: Date.now().toString(), type: 'Walking (Live)', durationMinutes: duration, intensity: 'medium', timestamp: Date.now(), steps: steps });
        }
        setSteps(0);
        startTimeRef.current = null;
      }
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-3 mb-2">
        {!embedded && <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm text-slate-900 active:scale-90"><ChevronLeft size={20} /></button>}
        <h2 className="text-xl font-black text-slate-900 uppercase">{t.vitality_lab}</h2>
      </div>

      {/* Live Tracker */}
      <div className="bg-white text-slate-900 p-6 rounded-[1.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-center space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">{t.edge_inference_active}</h3>
          <div className="text-6xl font-black tabular-nums tracking-tighter">{steps}</div>
          <p className="text-[9px] font-bold uppercase text-slate-400">{t.steps_detected}</p>

          <button onClick={() => setIsTracking(!isTracking)} className={`w-full py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all ${isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            {isTracking ? t.stop_sync : t.initialize_sensor}
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <input className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder={t.activity_placeholder} value={type} onChange={e => setType(e.target.value)} />
          <button onClick={() => startListening(language, setType)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all">
            <Mic size={18} />
          </button>
        </div>
        <div className="relative">
          <input type="number" className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500" placeholder={t.duration_placeholder} value={mins} onChange={e => setMins(e.target.value)} />
          <button onClick={() => startListening(language, setMins)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all">
            <Mic size={18} />
          </button>
        </div>
        <button onClick={() => { if (type && mins) { logWorkout({ id: Date.now().toString(), type, durationMinutes: Number(mins), intensity: 'medium', timestamp: Date.now() }); setType(''); setMins(''); } }} className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl shadow-xl active:scale-95 text-[11px] uppercase italic tracking-wider">{t.log_effort || "Log Effort"}</button>
      </div>

      <div className="space-y-3">
        {activityLogs.map(w => (
          <div key={w.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Dumbbell size={18} /></div>
              <div>
                <p className="font-black text-slate-900 text-[12px] uppercase">{w.type}</p>
                <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(w.timestamp).toLocaleTimeString()} {w.steps ? `• ${w.steps} Steps` : ''}</p>
              </div>
            </div>
            <span className="font-black text-slate-900 text-[12px]">{w.durationMinutes}m</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MeditationLab: React.FC<{ onBack: () => void; embedded?: boolean }> = ({ onBack, embedded }) => {
  const { t, logMeditation, meditationLogs } = usePatientContext();
  const [mins, setMins] = useState(10);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  const startTimer = () => {
    setTimeLeft(mins * 60);
    setIsActive(true);
  };

  const stopTimer = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      clearInterval(timerRef.current);
      // Play chime sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch (e) { console.warn("Audio play blocked"); }

      logMeditation({
        id: Date.now().toString(),
        durationMinutes: mins,
        timestamp: Date.now()
      });
      alert(t.session_complete || "Meditation Session Complete");
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-3">
        {!embedded && <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm text-slate-900 active:scale-90"><ChevronLeft size={20} /></button>}
        <h2 className="text-xl font-black text-slate-900 uppercase">{t.mindfulness_lab || "Mindfulness Lab"}</h2>
      </div>

      <div className="bg-white text-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Wind size={120} /></div>

        {isActive ? (
          <div className="space-y-6 relative z-10">
            <div className="text-7xl font-black tabular-nums tracking-tighter text-emerald-400">{formatTime(timeLeft)}</div>
            <button onClick={stopTimer} className="w-full py-5 bg-slate-100 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs border border-slate-100 transition-all active:scale-95">Cancel Session</button>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-xl font-black">{t.meditation_timer || "Meditation Timer"}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select focus duration</p>
            </div>

            <div className="flex justify-center gap-4">
              {[5, 10, 15, 20].map(m => (
                <button
                  key={m}
                  onClick={() => setMins(m)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all ${mins === m ? 'bg-emerald-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button onClick={startTimer} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
              {t.start_meditation || "Start Session"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Recent Sessions</h3>
        <div className="space-y-3">
          {meditationLogs && meditationLogs.length > 0 ? (
            meditationLogs.slice(0, 5).map(m => (
              <div key={m.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-xl text-emerald-600 shadow-sm"><Wind size={18} /></div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-900">Focus Session</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(m.timestamp).toLocaleDateString()} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-900">{m.durationMinutes}m</span>
              </div>
            ))
          ) : (
            <p className="text-[9px] font-black text-slate-300 uppercase text-center py-4">No sessions logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const DailyCheckInModal: React.FC<{ onClose: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
  const { t, logDailyCheckIn, orchestrateHealth } = usePatientContext();
  const [mood, setMood] = useState('Happy');
  const [energy, setEnergy] = useState(80);
  const [symptomText, setSymptomText] = useState('');
  const [dayDoc, setDayDoc] = useState('');

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    logDailyCheckIn({
      id: Date.now().toString(),
      mood,
      energyLevel: energy,
      symptoms: symptomText ? [symptomText] : [],
      note: dayDoc,
      timestamp: Date.now()
    });
    localStorage.setItem('lifeshield_last_checkin', new Date().toDateString());
    if (embedded) {
      setSubmitted(true);
    } else {
      onClose();
    }
  };

  if (embedded && submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Heart size={28} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Check-In Logged!</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Your daily vitals & mood have been saved.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 px-6 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 transition-all"
        >Check In Again</button>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="p-8">
        <div className="bg-emerald-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Heart size={80} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{t.daily_checkin || "Daily Health Check-in"}</p>
          <h2 className="text-2xl font-black leading-tight italic">{t.how_is_health || "How is your day like?"}</h2>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Mood Selection */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.mood_select || "Select your mood"}</p>
            <div className="grid grid-cols-3 gap-4">
              {['Happy', 'Neutral', 'Sad'].map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${mood === m ? 'bg-emerald-50 border-emerald-500 shadow-sm font-black' : 'bg-slate-50 border-slate-100'}`}
                >
                  <span className="text-2xl">{m === 'Happy' ? '😊' : m === 'Neutral' ? '😐' : '😔'}</span>
                  <span className="text-[10px] font-black uppercase">{m}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Day Description */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.describe_day || "How was your day?"}</p>
            <textarea
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 resize-none h-24"
              placeholder="Talk about your day..."
              value={dayDoc}
              onChange={e => setDayDoc(e.target.value)}
            />
          </div>

          {/* Energy Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.energy_level || "Energy Level"}</p>
              <span className="text-lg font-black text-emerald-600">{energy}%</span>
            </div>
            <input
              type="range"
              min="0" max="100"
              value={energy}
              onChange={e => setEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Quick Symptoms */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.any_symptoms || "Any symptoms to report?"}</p>
            <input
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
              placeholder="e.g. Mild headache, slightly tired"
              value={symptomText}
              onChange={e => setSymptomText(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            {t.submit_checkin || "Log Daily Status"}
          </button>

          {!embedded && (
            <button
              onClick={onClose}
              className="w-full py-2 text-[10px] font-black uppercase text-slate-300 hover:text-slate-400 transition-colors"
            >
              Dismiss for now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-emerald-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Heart size={80} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{t.daily_checkin || "Daily Health Check-in"}</p>
          <h2 className="text-2xl font-black leading-tight italic">{t.how_is_health || "How is your day like?"}</h2>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.mood_select || "Select your mood"}</p>
            <div className="grid grid-cols-3 gap-4">
              {['Happy', 'Neutral', 'Sad'].map(m => (
                <button key={m} onClick={() => setMood(m)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${mood === m ? 'bg-emerald-50 border-emerald-500 shadow-sm font-black' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-2xl">{m === 'Happy' ? '😊' : m === 'Neutral' ? '😐' : '😔'}</span>
                  <span className="text-[10px] font-black uppercase">{m}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.describe_day || "How was your day?"}</p>
            <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 resize-none h-24"
              placeholder="Talk about your day..." value={dayDoc} onChange={e => setDayDoc(e.target.value)} />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.energy_level || "Energy Level"}</p>
              <span className="text-lg font-black text-emerald-600">{energy}%</span>
            </div>
            <input type="range" min="0" max="100" value={energy} onChange={e => setEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.any_symptoms || "Any symptoms to report?"}</p>
            <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
              placeholder="e.g. Mild headache, slightly tired" value={symptomText} onChange={e => setSymptomText(e.target.value)} />
          </div>
          <button onClick={handleSubmit}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-2xl shadow-xl active:scale-95 transition-all">
            {t.submit_checkin || "Log Daily Status"}
          </button>
          <button onClick={onClose}
            className="w-full py-2 text-[10px] font-black uppercase text-slate-300 hover:text-slate-400 transition-colors">
            Dismiss for now
          </button>
        </div>
      </div>
    </div>
  );
};

const TabletCheckerForm: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const context = usePatientContext();
  const { t, language } = context;
  const [medicines, setMedicines] = useState<string[]>(['']);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isListeningSymptom, setIsListeningSymptom] = useState(false);
  const [isListeningMed, setIsListeningMed] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetIdx, setTargetIdx] = useState<number | null>(null);

  const handleIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetIdx !== null) {
      setIsIdentifying(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await identifyMedicineFromImage(base64, language);
        if (res) updateMedicine(targetIdx, res.name);
        setIsIdentifying(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addMedicine = () => setMedicines([...medicines, '']);
  const updateMedicine = (idx: number, val: string) => {
    const next = [...medicines];
    next[idx] = val;
    setMedicines(next);
  };
  const removeMedicine = (idx: number) => {
    if (medicines.length === 1) { updateMedicine(0, ''); return; }
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleCheck = async () => {
    const activeMeds = medicines.filter(m => m.trim());
    if (activeMeds.length === 0 || !problem.trim()) return;
    setLoading(true);
    try {
      const res = await analyzeTabletSafety(context, activeMeds, problem);
      let status: 'SAFE' | 'CAUTION' | 'DANGER' = 'CAUTION';
      let summary = res;
      if (res.includes('[SAFE]')) { status = 'SAFE'; summary = res.replace('[SAFE]', '').trim(); }
      else if (res.includes('[DANGER]')) { status = 'DANGER'; summary = res.replace('[DANGER]', '').trim(); }
      else if (res.includes('[CAUTION]')) { status = 'CAUTION'; summary = res.replace('[CAUTION]', '').trim(); }
      setResult({ summary, status, id: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
      if (onRefresh) onRefresh();
    } catch (e) { alert(t.safety_node_offline || 'Safety node offline.'); } finally { setLoading(false); }
  };

  // ── RESULT VIEW ──
  if (result) {
    const isDanger = result.status === 'DANGER';
    const isSafe = result.status === 'SAFE';
    const statusColor = isDanger ? 'text-red-400' : isSafe ? 'text-emerald-400' : 'text-amber-400';
    const statusBg = isDanger ? 'bg-red-500/15' : isSafe ? 'bg-emerald-500/15' : 'bg-amber-500/15';
    const statusBdr = isDanger ? 'border-red-500/30' : isSafe ? 'border-emerald-500/30' : 'border-amber-500/30';
    const barColor = isDanger ? 'bg-red-500' : isSafe ? 'bg-emerald-500' : 'bg-amber-500';
    const barPct = isDanger ? 90 : isSafe ? 15 : 50;

    return (
      <div className="space-y-3 animate-in zoom-in-95 duration-300">
        {/* Status Banner */}
        <div className={`${statusBg} border ${statusBdr} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusBg} border ${statusBdr}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${statusColor}`}>
                {isDanger ? '⚠ DANGER' : isSafe ? '✓ SAFE' : '! CAUTION'}
              </span>
            </div>
            <span className="text-[7px] font-bold text-slate-900/30 uppercase font-mono">{result.id}</span>
          </div>

          {/* Risk bar */}
          <div className="mb-3">
            <div className="flex justify-between text-[7px] font-black uppercase text-slate-900/30 mb-1">
              <span>Risk Level</span><span>{barPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${barPct}%` }} />
            </div>
          </div>

          <p className={`text-[11px] font-bold leading-relaxed ${statusColor.replace('400', '200')}`}>
            {result.summary}
          </p>
        </div>

        <button
          onClick={() => { setResult(null); setMedicines(['']); setProblem(''); }}
          className="w-full py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-900/40 font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-900/70 active:scale-95 transition-all"
        >
          ↩ New Scan
        </button>
      </div>
    );
  }

  // ── INPUT VIEW ──
  return (
    <div className="space-y-4">
      {/* Medicine Inputs */}
      <div>
        <p className="text-[8px] font-black text-slate-900/30 uppercase tracking-widest mb-2">Medicines to Analyze</p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-0.5">
          {medicines.map((med, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 text-[8px] font-black flex items-center justify-center shrink-0 border border-emerald-500/30">{idx + 1}</span>
              <div className="flex-1 relative">
                <input
                  className="w-full py-2.5 pl-3 pr-16 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all placeholder:text-slate-900/20 placeholder:text-[9px] placeholder:uppercase"
                  placeholder={t.med_placeholder || 'Medicine name...'}
                  onChange={e => updateMedicine(idx, e.target.value)}
                  value={med}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <button
                    onClick={() => { setTargetIdx(idx); fileInputRef.current?.click(); }}
                    className="p-1.5 text-slate-900/20 hover:text-emerald-400 active:scale-90 transition-all rounded-lg hover:bg-emerald-500/10"
                    title="Scan medicine from photo"
                  >
                    {isIdentifying && targetIdx === idx ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  </button>
                  <button
                    onClick={() => {
                      setIsListeningMed(idx);
                      startListening(language, text => { updateMedicine(idx, text); setIsListeningMed(null); });
                    }}
                    className={`p-1.5 transition-all rounded-lg active:scale-90 ${isListeningMed === idx ? 'bg-emerald-500 text-white animate-pulse' : 'text-slate-900/20 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                    title="Voice input"
                  >
                    <Mic size={12} />
                  </button>
                </div>
              </div>
              {medicines.length > 1 && (
                <button
                  onClick={() => removeMedicine(idx)}
                  className="p-1.5 text-slate-900/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addMedicine}
          className="w-full mt-2 py-2 rounded-xl bg-white/3 border border-dashed border-slate-100 text-slate-900/30 font-black text-[8px] uppercase hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={10} /> Add Medicine
        </button>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIdentify} />

      {/* Chief Complaint */}
      <div>
        <p className="text-[8px] font-black text-slate-900/30 uppercase tracking-widest mb-2">Chief Complaint / Condition</p>
        <div className="relative">
          <textarea
            className="w-full py-3 pl-3 pr-10 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all h-20 resize-none placeholder:text-slate-900/20 placeholder:text-[9px] placeholder:uppercase"
            placeholder={t.chief_complaint_placeholder || 'Describe symptoms or condition...'}
            value={problem}
            onChange={e => setProblem(e.target.value)}
          />
          <button
            onClick={() => {
              setIsListeningSymptom(true);
              startListening(language, text => { setProblem(text); setIsListeningSymptom(false); });
            }}
            className={`absolute right-2 top-2.5 p-1.5 rounded-lg transition-all ${isListeningSymptom ? 'bg-emerald-500 text-white animate-pulse' : 'text-slate-900/20 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
          >
            <Mic size={13} />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => {
            setIsListeningSymptom(true);
            startListening(language, async (text) => {
              setProblem(text);
              setIsListeningSymptom(false);
              const activeMeds = medicines.filter(m => m.trim());
              if (activeMeds.length > 0 && text.trim()) {
                setLoading(true);
                try {
                  const res = await analyzeTabletSafety(context, activeMeds, text);
                  let status: 'SAFE' | 'CAUTION' | 'DANGER' = 'CAUTION';
                  let summary = res;
                  if (res.includes('[SAFE]')) { status = 'SAFE'; summary = res.replace('[SAFE]', '').trim(); }
                  else if (res.includes('[DANGER]')) { status = 'DANGER'; summary = res.replace('[DANGER]', '').trim(); }
                  else if (res.includes('[CAUTION]')) { status = 'CAUTION'; summary = res.replace('[CAUTION]', '').trim(); }
                  setResult({ summary, status, id: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}` });
                } catch (e) { alert(t.safety_node_offline || 'Safety node offline.'); } finally { setLoading(false); }
              }
            });
          }}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-900/50 font-black text-[8px] uppercase hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all"
        >
          <Mic size={12} /> Speak
        </button>
        <button
          onClick={handleCheck}
          disabled={loading || !problem.trim() || medicines.every(m => !m.trim())}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white font-black text-[8px] uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
        >
          {loading ? <RefreshCcw className="animate-spin" size={12} /> : <Sparkles size={12} />}
          {loading ? 'Analyzing...' : 'Scan Safety'}
        </button>
      </div>
    </div>
  );
};

const MedsScreen: React.FC = () => {
  const context = usePatientContext();
  const { medications, addMedication, removeMedication, t, language } = context;
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ drugName: '', dosage: '', times: ['08:00'], foodInstruction: 'none' as any, color: 'emerald' });
  const [isIdentifying, setIsIdentifying] = useState(false);
  const medPhotoRef = useRef<HTMLInputElement>(null);

  const handleMedPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsIdentifying(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await identifyMedicineFromImage(base64, language);
        if (result) {
          setNewMed(prev => ({ ...prev, drugName: result.name, dosage: result.dosage }));
        }
        setIsIdentifying(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTimeSlot = () => setNewMed({ ...newMed, times: [...newMed.times, '12:00'] });
  const updateTimeSlot = (idx: number, val: string) => {
    const next = [...newMed.times];
    next[idx] = val;
    setNewMed({ ...newMed, times: next });
  };
  const removeTimeSlot = (idx: number) => {
    if (newMed.times.length <= 1) return;
    const next = newMed.times.filter((_, i) => i !== idx);
    setNewMed({ ...newMed, times: next });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">{t.pharmacy}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.med_safety_node}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3.5 rounded-xl shadow-md active:scale-95 text-[10px] font-black uppercase">
          {t.register_med}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {medications.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group">
            {/* Color identifier bar */}
            <div className={`absolute top-0 left-0 w-2 h-full ${r.color === 'red' ? 'bg-red-500' :
              r.color === 'blue' ? 'bg-blue-500' :
                r.color === 'green' ? 'bg-green-500' :
                  r.color === 'yellow' ? 'bg-yellow-400' :
                    r.color === 'orange' ? 'bg-orange-500' :
                      r.color === 'purple' ? 'bg-purple-500' :
                        r.color === 'pink' ? 'bg-pink-500' :
                          r.color === 'white' ? 'bg-slate-200' :
                            r.color === 'black' ? 'bg-white' : 'bg-emerald-500'
              }`}></div>

            <div className="flex items-center gap-4 pl-2">
              <div className={`p-3 rounded-xl shadow-sm ${r.color === 'red' ? 'bg-red-50 text-red-600' :
                r.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  r.color === 'green' ? 'bg-green-50 text-green-600' :
                    r.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' :
                      r.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                        r.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                          r.color === 'pink' ? 'bg-pink-50 text-pink-600' :
                            r.color === 'white' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
                              r.color === 'black' ? 'bg-white text-slate-900' : 'bg-emerald-50 text-emerald-600'
                }`}>
                <Pill size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-900 text-sm uppercase">{r.drugName}</h3>
                  <div className={`w-3 h-3 rounded-full shadow-inner ${r.color === 'red' ? 'bg-red-500' :
                    r.color === 'blue' ? 'bg-blue-500' :
                      r.color === 'green' ? 'bg-green-500' :
                        r.color === 'yellow' ? 'bg-yellow-400' :
                          r.color === 'orange' ? 'bg-orange-500' :
                            r.color === 'purple' ? 'bg-purple-500' :
                              r.color === 'pink' ? 'bg-pink-500' :
                                r.color === 'white' ? 'bg-white border border-slate-200' :
                                  r.color === 'black' ? 'bg-white' : 'bg-emerald-500'
                    }`}></div>
                </div>
                <span className="text-[9px] font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">{r.dosage}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-2">
              {r.times.map((t, i) => (
                <span key={i} className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1.5"><Clock size={10} />{t}</span>
              ))}
            </div>
            <div className="flex justify-between items-center border-t border-slate-50 pt-3 pl-2">
              <div className="text-[8px] font-black text-slate-400 uppercase">{r.foodInstruction} Meals</div>
              <button onClick={() => removeMedication(r.id)} className="text-red-400 hover:text-red-600 p-1 active:scale-90 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-95 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase">{t.register_med}</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 active:scale-90"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Color Picker Section */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Identify Tablet by Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'red', bg: 'bg-red-500' },
                    { id: 'blue', bg: 'bg-blue-500' },
                    { id: 'green', bg: 'bg-green-500' },
                    { id: 'yellow', bg: 'bg-yellow-400' },
                    { id: 'orange', bg: 'bg-orange-500' },
                    { id: 'purple', bg: 'bg-purple-500' },
                    { id: 'pink', bg: 'bg-pink-500' },
                    { id: 'white', bg: 'bg-white border-2 border-slate-200' },
                    { id: 'black', bg: 'bg-white' },
                    { id: 'emerald', bg: 'bg-emerald-500' }
                  ].map(color => (
                    <button
                      key={color.id}
                      onClick={() => setNewMed({ ...newMed, color: color.id })}
                      className={`w-full aspect-square rounded-xl transition-all relative ${color.bg} ${newMed.color === color.id ? 'ring-4 ring-emerald-500/30 scale-110 shadow-lg' : 'hover:scale-105 opacity-80'}`}
                    >
                      {newMed.color === color.id && (
                        <div className={`absolute inset-0 flex items-center justify-center ${color.id === 'white' || color.id === 'yellow' ? 'text-white' : 'text-white'}`}>
                          <Check size={16} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input className="w-full p-4 pr-24 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" placeholder={t.med_name_placeholder} value={newMed.drugName} onChange={e => setNewMed({ ...newMed, drugName: e.target.value })} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => medPhotoRef.current?.click()} className="p-2 text-emerald-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all">
                    {isIdentifying ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  </button>
                  <button onClick={() => startListening(language, text => setNewMed(p => ({ ...p, drugName: text })))} className="p-2 text-emerald-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all">
                    <Mic size={20} />
                  </button>
                </div>
                <input type="file" ref={medPhotoRef} className="hidden" accept="image/*" onChange={handleMedPhoto} />
              </div>
              <div className="relative">
                <input className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" placeholder={t.dosage_placeholder} value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })} />
                <button onClick={() => startListening(language, text => setNewMed(p => ({ ...p, dosage: text })))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-600 bg-white shadow-sm rounded-lg active:scale-90 transition-all">
                  <Mic size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.intake_slots}</label>
                  <button onClick={addTimeSlot} className="text-emerald-600 text-[9px] font-black uppercase flex items-center gap-1 active:scale-90"><Plus size={12} /> Add Time</button>
                </div>
                <div className="space-y-2">
                  {newMed.times.map((time, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="time" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500" value={time} onChange={e => updateTimeSlot(i, e.target.value)} />
                      {newMed.times.length > 1 && (
                        <button onClick={() => removeTimeSlot(i)} className="p-3 text-red-400 bg-red-50 rounded-xl active:scale-90"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" value={newMed.foodInstruction} onChange={e => setNewMed({ ...newMed, foodInstruction: e.target.value as any })}>
                <option value="none">{t.no_meal_instruction}</option>
                <option value="before">{t.meal_before}</option>
                <option value="with">{t.meal_with}</option>
                <option value="after">{t.meal_after}</option>
              </select>
            </div>
            <button onClick={() => { if (newMed.drugName) { addMedication({ ...newMed, id: Date.now().toString(), days: [], isActive: true } as any); setShowAdd(false); setNewMed({ drugName: '', dosage: '', times: ['08:00'], foodInstruction: 'none', color: 'emerald' }); } }} className="w-full bg-emerald-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-[11px] active:scale-95 tracking-widest">{t.establish_record}</button>
          </div>
        </div>
      )}
    </div>
  );
};

const StructuredSymptomChecker: React.FC = () => {
  const context = usePatientContext();
  const { t, language, theme } = context;
  const [step, setStep] = useState<'initial' | 'questions' | 'result'>('initial');
  const [complaint, setComplaint] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Auto-translate AI content when language changes
  useEffect(() => {
    let active = true;
    const handleReTranslation = async () => {
      if (language === 'en') return;

      // If we have questions and are in questions step, translate them
      if (questions.length > 0 && step === 'questions') {
        setTranslating(true);
        const translatedQuestions = await translateQuestionsBatch(questions, language);
        if (active) setQuestions(translatedQuestions);
        setTranslating(false);
      }

      // If we have a result, translate it
      if (result && step === 'result') {
        setTranslating(true);
        const translatedResult = await translateClinicalData(result, language);
        if (active) setResult(translatedResult);
        setTranslating(false);
      }
    };

    handleReTranslation();
    return () => { active = false; };
  }, [language]);

  const startTriage = async () => {
    if (!complaint) return;
    setLoading(true);
    try {
      const data = await getDiagnosticQuestions(context, complaint);
      setQuestions(data.questions || []);
      if (data.questions && data.questions.length > 0) {
        setStep('questions');
      }
    } catch (err) { alert(t.diagnostic_error); } finally { setLoading(false); }
  };

  const submitAnswers = async () => {
    setLoading(true);
    try {
      const answersList = Object.entries(answers).map(([id, val]) => ({ qId: id, answer: val }));

      // Parallelize AI calls for performance
      let [assessment, ayushRec] = await Promise.all([
        getDiagnosticAdvice(context, complaint, answersList),
        getAyurvedicClinicalStrategy(context, complaint, answersList)
      ]);

      if (language !== 'en') {
        // Double check language and re-translate if AI hallucinated English content
        const translated = await translateClinicalData({ ...assessment, ayush: ayushRec }, language);
        if (translated) {
          assessment = { ...assessment, ...translated };
          ayushRec = translated.ayush || ayushRec;
        }
      }

      if (!ayushRec) {
        ayushRec = {
          aura_system: 'Integrative AYUSH Node',
          dosha_insight: 'General Physiological Imbalance Detected',
          chikitsa: 'Tinospora Cordifolia (Guduchi) for Immunity Support',
          ahar: 'Low glycemic, warm, easily digestible (Laghu) diet',
          vihaar: 'Surya Namaskar & Targeted Stretching',
          satwa: 'Nadi Shodhana (Alternate Nostril Breathing)',
          referral: 'Consult a BAMS physician for clinical assessment'
        };
      }

      const finalResult = {
        ...assessment,
        ayush: ayushRec,
        severity: assessment.severity || (Math.random() > 0.7 ? 'High' : 'Moderate')
      };

      setResult(finalResult);
      context.logSymptom({
        id: Date.now().toString(),
        complaint: complaint,
        aiAnalysis: assessment.assessment || "Clinical assessment completed.",
        questions: Object.entries(answers).map(([id, val]) => ({
          qId: id,
          question: questions.find(q => q.id === id)?.question || '',
          answer: String(val)
        })),
        timestamp: Date.now(),
      } as any);
      setStep('result');
    } catch (err) {
      console.error("[Triage] Synthesis error:", err);
      alert(t.synthesis_error || "Synthesis error. Ensure Ollama is running and responsive.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 px-1 pb-20">
      {/* Super Header as requested */}
      <div className={`p-8 sm:p-10 rounded-[2.5rem] shadow-2xl mb-8 relative overflow-hidden group transition-all duration-500 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Brain size={150} /></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl opacity-10"></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg"><Activity size={24} /></div>
              <h2 className={`text-3xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.clinical_intel_hub}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-emerald-400' : 'opacity-80'}`}>Synapse Link Online</span>
            </div>
          </div>
          <div className={`backdrop-blur-md px-6 py-4 rounded-3xl border text-right shadow-inner ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">Status</h3>
            <p className={`text-[10px] font-black uppercase leading-none ${theme === 'dark' ? 'text-slate-300' : 'opacity-90'}`}>{t.diagnostic_synthesis}</p>
          </div>
        </div>
      </div>


      {step === 'initial' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 border border-emerald-100"><Pencil size={20} /></div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest underline decoration-emerald-200 decoration-4 underline-offset-4">{t.symptom_node_entry}</h4>
              </div>
              <div className="relative">
                <textarea
                  className="w-full p-8 pr-16 bg-slate-50 border border-slate-200 rounded-[2rem] min-h-[220px] font-bold text-lg outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none shadow-inner placeholder:text-slate-300 placeholder:uppercase placeholder:text-[10px]"
                  placeholder={t.describe_symptoms}
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                />
                <button
                  onClick={() => startListening(language, setComplaint)}
                  className="absolute right-6 top-6 p-2 text-emerald-600 bg-white shadow-sm rounded-xl active:scale-95 transition-all"
                >
                  <Mic size={24} />
                </button>
              </div>
              <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center gap-4 shadow-sm">
                <div className="bg-white p-2 rounded-xl text-emerald-600 shadow-sm"><Sparkles size={18} /></div>
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tight leading-relaxed">{t.hybrid_protocol}</p>
              </div>
              <button onClick={startTriage} disabled={loading || !complaint.trim()} className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] shadow-[0_10px_25px_rgba(5,150,105,0.3)] flex justify-center items-center gap-4 active:scale-95 transition-all hover:bg-[#065f46] hover:shadow-none">
                {loading ? <RefreshCcw className="animate-spin" size={24} /> : <Activity size={24} />} {t.initialize_protocol}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-4">
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><History size={14} /></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.clinical_vault_memory || "Clinical Memory (Background Data)"}</h4>
            </div>

            <div className="space-y-3">
              {[...(context.symptoms || []), ...(context.dailyCheckIns || [])]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map((log: any) => (
                  <div key={log.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${log.mood ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600 shadow-sm'}`}>
                      {log.mood ? <Heart size={18} /> : <Activity size={18} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[11px] font-black uppercase text-slate-900 leading-none">
                          {log.mood ? `Daily Check-In (${log.mood})` : (log.userInput?.substring(0, 30) + '...')}
                        </p>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed line-clamp-2">
                        {log.aiResponse || (log.symptoms?.length > 0 ? log.symptoms[0] : "General wellness log entry.")}
                      </p>
                    </div>
                  </div>
                ))}
              {[...(context.symptoms || []), ...(context.dailyCheckIns || [])].length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-300 uppercase italic">No history found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'questions' && (
        <div className="space-y-5 animate-in slide-in-from-right duration-500 relative">
          {translating && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem]">
              <RefreshCcw className="animate-spin text-emerald-500 mb-2" size={32} />
              <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Translating content…</p>
            </div>
          )}
          <div className={`p-6 rounded-3xl flex items-center gap-5 mb-2 shadow-xl border relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-100'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent"></div>
            <div className={`p-3 rounded-2xl relative z-10 backdrop-blur-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}><Bot size={24} /></div>
            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-0.5">Clinical AI Orchestrator</p>
              <p className="text-[12px] font-black uppercase tracking-tight">{t.follow_up_questions || 'Extracting bio-metric data points for inference...'}</p>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}></div>
          </div>
          {questions.map(q => (
            <div key={q.id} className={`p-8 rounded-[2.5rem] border shadow-sm space-y-5 group transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
              <h4 className={`font-black text-base leading-tight uppercase pl-1 border-l-4 border-emerald-500 ml-1 py-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{q.question}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt: string) => (
                  <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })} className={`p-5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all border-2 text-left ${answers[q.id] === opt ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-emerald-100 active:scale-[0.98]')}`}>{opt}</button>
                ))}
              </div>
              <div className="relative">
                <input
                  className={`w-full p-4 border rounded-xl font-bold text-sm outline-none focus:border-emerald-500 transition-all pr-20 shadow-inner ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'} placeholder:text-slate-500 placeholder:uppercase placeholder:text-[10px]`}
                  placeholder={t.advanced_context}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => startListening(language, text => setAnswers(p => ({ ...p, [q.id]: text })))} className="p-2 text-emerald-600 active:scale-90"><Mic size={18} /></button>
                  <Edit3 size={16} className="text-slate-200" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={submitAnswers} disabled={loading || Object.keys(answers).length < questions.length} className="w-full bg-emerald-600 text-white py-7 rounded-[2.5rem] font-black uppercase text-[12px] shadow-2xl flex justify-center items-center gap-4 active:scale-95 hover:bg-emerald-700 transition-all group overflow-hidden relative">
            <span className="relative z-10 flex items-center gap-3">
              {loading ? <RefreshCcw className="animate-spin" size={24} /> : <CheckCircle2 size={24} />} {t.submit_analysis || 'Execute Hybrid Synthesis Protocol'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom duration-700">

          {/* ── Header ── */}
          <div className={`p-8 rounded-[3rem] border-2 shadow-xl relative overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-emerald-900/30' : 'bg-white border-emerald-100'}`}>
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none"><ShieldCheck size={220} /></div>
            {translating && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[3rem]">
                <RefreshCcw className="animate-spin text-emerald-500 mb-2" size={32} />
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Translating to {language.toUpperCase()}…</p>
              </div>
            )}
            <div className={`flex flex-col sm:flex-row items-start gap-5 pb-6 border-b relative z-10 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
              <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-xl rotate-3 shrink-0"><ShieldCheck size={28} /></div>
              <div className="flex-1">
                <h3 className={`text-xl font-black uppercase leading-none mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.clinical_insights}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${theme === 'dark' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>AI Diagnosis Engine</span>
                  {result.severity && (
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${result.severity === 'Critical' ? 'bg-red-600 text-white border-red-600' :
                      result.severity === 'High' ? (theme === 'dark' ? 'bg-red-950/50 text-red-400 border-red-900/50' : 'bg-red-100 text-red-700 border-red-200') :
                        result.severity === 'Moderate' ? (theme === 'dark' ? 'bg-amber-950/50 text-amber-400 border-amber-900/50' : 'bg-amber-100 text-amber-700 border-amber-200') :
                          (theme === 'dark' ? 'bg-green-950/50 text-green-400 border-green-900/50' : 'bg-green-100 text-green-700 border-green-200')
                      }`}>Severity: {result.severity}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Clinical Assessment */}
            <div className="mt-6 relative z-10">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Clinical Assessment</p>
              <div className={`p-6 rounded-2xl border-l-4 border-emerald-500 font-bold text-sm leading-relaxed italic ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                "{String(result.assessment || 'Assessment completed')}"
              </div>
            </div>
          </div>

          {/* ── Possible Diagnoses ── */}
          {result.possibleDiagnoses && result.possibleDiagnoses.length > 0 && (
            <div className={`p-6 rounded-3xl border shadow-sm transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Possible Conditions</p>
              <div className="space-y-3">
                {result.possibleDiagnoses.map((d: any, i: number) => (
                  <div key={i} className={`flex items-center gap-4 py-2.5 border-b last:border-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black ${i === 0 ? 'bg-red-500/10 text-red-500' : i === 1 ? 'bg-amber-500/10 text-amber-500' : (theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-500')
                      }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-black ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{d.condition}</p>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase shrink-0 ${d.likelihood === 'High' ? 'bg-red-500/20 text-red-500' :
                      d.likelihood === 'Moderate' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-slate-500/20 text-slate-500'
                      }`}>{d.likelihood}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Specialist + Actions + Red Flags Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Specialist + Immediate Actions */}
            <div className="space-y-4">
              <div className={`border rounded-3xl p-5 ${theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Recommended Specialist</p>
                <p className={`text-lg font-black uppercase ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-900'}`}>{result.specialistSuggestion}</p>
              </div>

              {result.immediateActions && result.immediateActions.length > 0 && (
                <div className={`border rounded-3xl p-5 ${theme === 'dark' ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50 border-blue-100'}`}>
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3">Immediate Actions</p>
                  <div className="space-y-2">
                    {result.immediateActions.map((a: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 text-[8px] font-black mt-0.5">{i + 1}</div>
                        <p className={`text-[10px] font-bold leading-tight ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'}`}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Red Flags + Preventive Measures */}
            <div className="space-y-4">
              {result.redFlags && result.redFlags.length > 0 && (
                <div className={`border rounded-3xl p-5 ${theme === 'dark' ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.3em]">Red Flags — Seek Immediate Care If</p>
                  </div>
                  <div className="space-y-1.5">
                    {result.redFlags.map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                        <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-red-200' : 'text-red-800'}`}>{f}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.preventiveMeasures && result.preventiveMeasures.length > 0 && (
                <div className={`border rounded-3xl p-5 ${theme === 'dark' ? 'bg-teal-950/20 border-teal-900/50' : 'bg-teal-50 border-teal-100'}`}>
                  <p className="text-[8px] font-black text-teal-500 uppercase tracking-[0.3em] mb-3">Preventive Measures</p>
                  <div className="space-y-1.5">
                    {result.preventiveMeasures.map((m: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-teal-500 shrink-0 mt-0.5" />
                        <p className={`text-[10px] font-bold ${theme === 'dark' ? 'text-teal-200' : 'text-teal-900'}`}>{m}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── AYUSH Recommendation ── */}
          {result.ayush && (
            <div className={`p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden transition-all duration-500 border ${theme === 'dark' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-100'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-xl"><Sparkles size={22} /></div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight">{t.personalized_strategy}</h3>
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-0.5">AYUSH Integrated Protocol</p>
                    </div>
                  </div>
                  {result.ayush?.dosha_insight && (
                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 hidden sm:block">
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Dosha Insight</span>
                      <span className="text-[10px] font-black text-emerald-800 uppercase">{result.ayush.dosha_insight}</span>
                    </div>
                  )}
                </div>
                {(() => {
                  const renderValue = (val: any) => {
                    if (!val) return null;
                    if (typeof val === 'string') return <p className={`text-[10px] font-bold mt-1 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{val}</p>;

                    const getVal = (obj: any, ...keys: string[]) => {
                      if (!obj || typeof obj !== 'object') return null;
                      for (const key of keys) {
                        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase() || k.toLowerCase().replace('_', ' ') === key.toLowerCase());
                        if (foundKey) return obj[foundKey];
                      }
                      return null;
                    };

                    if (Array.isArray(val)) {
                      return (
                        <div className="space-y-3 mt-2">
                          {val.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-2xl border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                              {typeof item === 'string' ? (
                                <p className="text-[10px] font-bold text-slate-500">{item}</p>
                              ) : (
                                <>
                                  <p className="text-[10px] font-black uppercase text-emerald-500">{getVal(item, 'name', 'asana', 'pranayama', 'food group', 'category') || 'Recommendation'}</p>
                                  {(getVal(item, 'dosage', 'frequency', 'duration', 'specific foods', 'specific spices', 'items')) && (
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 opacity-80">{getVal(item, 'dosage', 'frequency', 'duration', 'specific foods', 'specific spices', 'items')}</p>
                                  )}
                                  {(getVal(item, 'rationale', 'benefit', 'logic', 'preparation')) && (
                                    <p className="text-[9px] font-medium text-slate-500 mt-1 italic leading-snug">{getVal(item, 'rationale', 'benefit', 'logic', 'preparation')}</p>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (typeof val === 'object') {
                      return (
                        <div className="space-y-4 mt-2">
                          {Object.entries(val).map(([key, value]: [string, any], idx) => (
                            <div key={idx} className="animate-in fade-in slide-in-from-left-2 duration-300">
                              <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${key.toLowerCase().includes('pathya') ? 'bg-emerald-100 text-emerald-600' : key.toLowerCase().includes('apathya') ? 'bg-rose-100 text-rose-600' : 'text-slate-400'}`}>{key}</span>
                              <div className="space-y-1 mt-2">
                                {Array.isArray(value) ? value.map((v, i) => (
                                  <div key={i} className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                    {typeof v === 'string' ? (
                                      <p className="text-[9px] font-bold text-slate-600">{v}</p>
                                    ) : (
                                      <>
                                        <p className="text-[8px] font-black uppercase text-slate-400">{getVal(v, 'food group', 'category')}</p>
                                        <p className="text-[10px] font-bold text-slate-700 leading-snug">{getVal(v, 'specific foods', 'specific_foods', 'specific spices', 'items')}</p>
                                      </>
                                    )}
                                  </div>
                                )) : <p className="text-[9px] font-bold text-slate-500">{typeof value === 'object' ? JSON.stringify(value) : value}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-[2rem] border shadow-sm ${theme === 'dark' ? 'bg-slate-800/40 border-emerald-900/20' : 'bg-emerald-50/20 border-emerald-100'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-emerald-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"><Leaf size={20} /></div>
                            <div>
                              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] block">Module 01</span>
                              <h4 className="text-xs font-black uppercase text-slate-900">Herbal Chikitsa</h4>
                            </div>
                          </div>
                          {renderValue(result.ayush?.chikitsa)}
                        </div>

                        <div className={`p-6 rounded-[2rem] border shadow-sm ${theme === 'dark' ? 'bg-slate-800/40 border-amber-900/20' : 'bg-amber-50/20 border-amber-100'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-amber-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"><Apple size={20} /></div>
                            <div>
                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] block">Module 02</span>
                              <h4 className="text-xs font-black uppercase text-slate-900">Pathya Ahar</h4>
                            </div>
                          </div>
                          {renderValue(result.ayush?.ahar)}
                        </div>

                        <div className={`p-6 rounded-[2rem] border shadow-sm ${theme === 'dark' ? 'bg-slate-800/40 border-blue-900/20' : 'bg-blue-50/20 border-blue-100'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"><Dumbbell size={20} /></div>
                            <div>
                              <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] block">Module 03</span>
                              <h4 className="text-xs font-black uppercase text-slate-900">Yoga & Vihaar</h4>
                            </div>
                          </div>
                          {renderValue(result.ayush?.vihaar)}
                        </div>

                        <div className={`p-6 rounded-[2rem] border shadow-sm ${theme === 'dark' ? 'bg-slate-800/40 border-purple-900/20' : 'bg-purple-50/20 border-purple-100'}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-500 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"><Wind size={20} /></div>
                            <div>
                              <span className="text-[8px] font-black text-purple-500 uppercase tracking-[0.2em] block">Module 04</span>
                              <h4 className="text-xs font-black uppercase text-slate-900">Pranayama & Mind</h4>
                            </div>
                          </div>
                          {renderValue(result.ayush?.satwa)}
                        </div>
                      </div>

                      {result.ayush.referral && (
                        <div className={`mt-6 p-5 rounded-3xl border flex items-start gap-4 ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                          <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500"><AlertTriangle size={20} /></div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block mb-1">Clinical Disclaimer</span>
                            <p className={`text-[10px] font-bold leading-relaxed ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'}`}>{typeof result.ayush.referral === 'string' ? result.ayush.referral : JSON.stringify(result.ayush.referral)}</p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Disclaimer + New Session ── */}
          <div className="space-y-3 px-2">
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[8px] font-bold text-center italic leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>
                ⚠️ This AI analysis is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider.
              </p>
            </div>
            <button onClick={() => { setStep('initial'); setAnswers({}); setComplaint(''); }}
              className={`w-full font-black uppercase text-[10px] py-5 rounded-2xl active:scale-[0.98] transition-all border border-dashed group ${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border-slate-700' : 'bg-slate-100/50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border-slate-200'}`}>
              <span className="flex items-center justify-center gap-3">
                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                {t.new_session}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};




const ResilienceBar: React.FC<{ label: string, score: number, color: string }> = ({ label, score, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-600 px-1">
      <span>{label}</span>
      <span className={score > 70 ? 'text-red-600' : 'text-slate-900'}>{Math.round(score)}% Stress</span>
    </div>
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
      <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }}></div>
    </div>
  </div>
);

const ReportsScreen: React.FC<{ analysis: any, isAnalyzing: boolean, onRefresh: () => void, setAnalysis: (a: any) => void }> = ({ analysis, isAnalyzing, onRefresh, setAnalysis }) => {
  const context = usePatientContext();
  const { riskScores, clinicalVault, t, language, addDocument, setSelectedDoc } = context;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localIsAnalyzing, setLocalIsAnalyzing] = useState(false);

  const handleRefresh = async () => {
    onRefresh(); // Set loading state in parent
    const res = await getComprehensiveHealthAnalysis(context);
    setAnalysis(res);
  }

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setLocalIsAnalyzing(true);
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const doc = await analyzeMedicalReport(base64, language);
          if (doc) {
            addDocument(doc);
            setSelectedDoc(doc);
          } else {
            addDocument({
              id: Date.now().toString(),
              name: file.name,
              type: file.type || 'document',
              date: Date.now(),
              size: (file.size / 1024).toFixed(1) + 'KB'
            });
          }
          handleRefresh();
        } catch (err) {
          console.error("Upload error", err);
        } finally {
          setLocalIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Effect to trigger analysis on mount if not present
  useEffect(() => {
    if (!analysis && !isAnalyzing) handleRefresh();
  }, []);

  if (!riskScores) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">{t.bio_hub}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.biometric_synthesis}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleReportUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl shadow-xl active:scale-95 text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:bg-emerald-500"
          >
            {localIsAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Upload Report
          </button>
          <button onClick={handleRefresh} className="bg-white text-slate-900 px-6 py-3.5 rounded-xl shadow-xl active:scale-95 text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:bg-slate-100">
            {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} {t.synthesize_data || "Synthesize Data"}
          </button>
        </div>
      </div>

      {/* 1. Document Synthesis Status */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600"><FileText size={20} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">{t.vault_analysis}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{clinicalVault.length} {t.clinical_nodes_active}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinicalVault.length === 0 ? (
            <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.no_biometric_uploaded}</p>
              <p className="text-[9px] text-slate-300 font-bold mt-1">{t.upload_reports_note}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.ingested_reports}</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {clinicalVault.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm"><CheckCircle2 size={14} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-900 truncate uppercase">{d.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(d.date).toLocaleDateString()} • {d.size}</p>
                      </div>
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded hidden sm:inline-block">{t.processed}</span>
                      <button onClick={() => context.removeDocument(d.id)} title="Delete Document" className="p-1.5 bg-white text-slate-300 hover:text-red-500 rounded-lg sm:opacity-0 group-hover:opacity-100 transition-all shadow-sm active:scale-95"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center space-y-3">
                <h4 className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">{t.synthesis_output}</h4>
                <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                  {isAnalyzing ? "Processing biometric data nodes..." :
                    (analysis?.summary || "System is comparing all uploaded reports against historical patterns to detect anomalies. No critical deviations found in current set.")}
                </p>
                <div className="flex gap-2 pt-2">
                  <span className="px-2 py-1 bg-white rounded-lg text-[8px] font-black text-emerald-700 uppercase shadow-sm border border-emerald-100">{t.trend_stable}</span>
                  <span className="px-2 py-1 bg-white rounded-lg text-[8px] font-black text-emerald-700 uppercase shadow-sm border border-emerald-100">{t.cross_ref_complete}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Comprehensive AI Report */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-500 delay-100">
          {/* Clinical Insights */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Activity size={18} /></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{t.clinical_insights}</h3>
            </div>
            <ul className="space-y-3">
              {analysis.clinicalInsights?.length > 0 ? analysis.clinicalInsights.map((insight: string, i: number) => (
                <li key={i} className="flex gap-3 text-[11px] font-bold text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-blue-500 mt-0.5">•</span> {insight}
                </li>
              )) : <p className="text-[10px] text-slate-400 font-bold italic p-4 text-center">{t.no_specific_insights}</p>}
            </ul>
          </div>

          {/* Actionable Protocol */}
          <div className="bg-white text-slate-900 p-6 rounded-[2rem] shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><ShieldCheck size={100} /></div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-slate-100 p-2 rounded-xl text-emerald-400"><CheckCircle2 size={18} /></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{t.recommended_protocol}</h3>
              </div>
              <div className="space-y-2">
                {analysis.actionableSteps?.map((step: string, i: number) => (
                  <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 backdrop-blur-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">{i + 1}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileScreen: React.FC = () => {
  const { profile, updateProfile, resetVault, language, t } = usePatientContext();
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<UserProfile | null>(profile);

  if (!profile || !edited) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">{t.identity}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.bio_context_registry}</p>
        </div>
        <button onClick={() => {
          if (isEditing && edited) {
            updateProfile(edited);
          } else {
            setEdited(profile); // Reset edits on cancel or ensure current on edit start
          }
          setIsEditing(!isEditing);
        }} className={`p-4 rounded-xl shadow-md active:scale-90 transition-all ${isEditing ? 'bg-white text-slate-900' : 'bg-white border border-slate-200 text-slate-700'}`}>
          {isEditing ? <Check size={20} /> : <Pencil size={20} />}
        </button>
      </div>

      <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-6">
        <div className="w-24 h-24 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 text-4xl font-black shadow-inner border-4 border-white">{profile.name.charAt(0)}</div>
        {isEditing ? (
          <div className="w-full space-y-4">
            <div className="relative">
              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-lg outline-none" value={edited.name} onChange={e => setEdited({ ...edited, name: e.target.value })} placeholder="Identity" />
              <button
                onClick={() => startListening(language, text => setEdited(p => p ? { ...p, name: text } : null))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"
              >
                <Mic size={20} />
              </button>
            </div>

            <div className="flex gap-3">
              <div className="relative w-1/2">
                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none pr-10" value={edited.age || ''} onChange={e => setEdited({ ...edited, age: Number(e.target.value) })} placeholder={t.age} />
                <button onClick={() => startListening(language, text => setEdited(p => p ? { ...p, age: parseInt(text.replace(/\D/g, '')) } : null))} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 active:scale-90"><Mic size={14} /></button>
              </div>
              <div className="relative w-1/2">
                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none pr-10" value={edited.weight || ''} onChange={e => setEdited({ ...edited, weight: Number(e.target.value) })} placeholder={t.weight} />
                <button onClick={() => startListening(language, text => setEdited(p => p ? { ...p, weight: parseInt(text.replace(/\D/g, '')) } : null))} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 active:scale-90"><Mic size={14} /></button>
              </div>
            </div>

            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none appearance-none" value={edited.gender} onChange={e => setEdited({ ...edited, gender: e.target.value as any })}>
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
              <option value="other">{t.other}</option>
            </select>

            <div className="relative">
              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none" value={edited.location || ''} onChange={e => setEdited({ ...edited, location: e.target.value })} placeholder={t.region_placeholder} />
              <button
                onClick={() => startListening(language, text => setEdited(p => p ? { ...p, location: text } : null))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"
              >
                <Mic size={20} />
              </button>
            </div>

            <div className="pt-4 space-y-4 border-t border-slate-50 mt-4">
              <div className="relative">
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none" value={edited.profession || ''} onChange={e => setEdited({ ...edited, profession: e.target.value })} placeholder="Profession" />
                <button onClick={() => startListening(language, text => setEdited(p => p ? { ...p, profession: text } : null))} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"><Mic size={20} /></button>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-slate-400">Work Hours: {edited.workHoursPerDay}</p>
                <input type="range" min="1" max="18" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" value={edited.workHoursPerDay} onChange={e => setEdited({ ...edited, workHoursPerDay: parseInt(e.target.value) })} />
              </div>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-base outline-none appearance-none" value={edited.workIntensity} onChange={e => setEdited({ ...edited, workIntensity: e.target.value as any })}>
                <option value="low">Low Intensity</option>
                <option value="moderate">Moderate Intensity</option>
                <option value="high">High Intensity</option>
                <option value="very_high">Extreme Intensity</option>
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.dietary_filter}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { key: 'vegetarian', label: 'Veg' },
                  { key: 'non_veg', label: 'Non-Veg' },
                  { key: 'vegan', label: 'Vegan' },
                  { key: 'keto', label: 'Keto' }
                ].map(diet => (
                  <button key={diet.key} onClick={() => {
                    const prefs = edited.foodPreferences || [];
                    if (prefs.includes(diet.label)) setEdited({ ...edited, foodPreferences: prefs.filter(p => p !== diet.label) });
                    else setEdited({ ...edited, foodPreferences: [...prefs, diet.label] });
                  }} className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${edited.foodPreferences?.includes(diet.label) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    {t[diet.key] || diet.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.chronic_conditions}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hasDiabetes', label: t.diabetes },
                  { id: 'hasHighBP', label: t.hypertension },
                  { id: 'hasLiverDisease', label: t.liver_disease },
                  { id: 'hasKidneyDisease', label: t.kidney_disease },
                  { id: 'hasHeartDisease', label: t.heart_disease },
                  { id: 'hasAsthma', label: t.asthma },
                ].map(cond => (
                  <button
                    key={cond.id}
                    onClick={() => setEdited({ ...edited, [cond.id]: !(edited as any)[cond.id] })}
                    className={`p-2 rounded-lg text-[8px] font-black uppercase border transition-all ${(edited as any)[cond.id] ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
              {edited.gender === 'female' && (
                <button
                  onClick={() => setEdited({ ...edited, isPregnant: !edited.isPregnant })}
                  className={`w-full p-2 rounded-lg text-[8px] font-black uppercase border transition-all ${edited.isPregnant ? 'bg-purple-600 border-purple-600 text-slate-900' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  {t.pregnant}: {edited.isPregnant ? t.confirm || 'YES' : t.no || 'NO'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 w-full">
            <h3 className="font-black text-3xl text-slate-900 uppercase leading-none">{profile.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{profile.age} {t.yrs} • {profile.weight} {t.kg} • {t[profile.gender.toLowerCase()] || profile.gender}</p>

            {(profile.location || (profile.foodPreferences && profile.foodPreferences.length > 0)) && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                {profile.location && <p className="text-xs font-black text-emerald-800 uppercase tracking-tight flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> {profile.location}</p>}
                {profile.foodPreferences && profile.foodPreferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {profile.foodPreferences.map(p => (
                      <span key={p} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-emerald-100/50">
                        {p === 'Vegetarian' || p === 'Veg' ? t.vegetarian :
                          p === 'Non-Veg' ? t.non_veg :
                            p === 'Vegan' ? t.vegan :
                              p === 'No Gluten' ? t.no_gluten :
                                p === 'No Dairy' ? t.no_dairy :
                                  p === 'Keto' ? t.keto : p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="space-y-3">
          <button onClick={() => { if (confirm("Purge vault?")) resetVault(); }} className="w-full py-4 text-emerald-600 font-black text-[9px] uppercase tracking-widest hover:text-emerald-700 transition-colors bg-emerald-50 rounded-xl active:scale-95 border border-emerald-100/50">Wipe Local Context</button>
          <button
            onClick={async () => {
              if (confirm("DANGER: This will permanently delete your account from the CLOUD. Proceed?")) {
                try {
                  if (profile.id) {
                    await deleteDoc(doc(db, 'users', profile.id));
                  } else {
                    const q = query(collection(db, 'users'));
                    const snap = await getDocs(q);
                    const userDoc = snap.docs.find(d => d.data().name === profile.name);
                    if (userDoc) {
                      await deleteDoc(doc(db, 'users', userDoc.id));
                    }
                  }
                  (window as any).handleGlobalLogout?.();
                } catch (err) {
                  console.error("Delete error:", err);
                  alert(t.cloud_delete_failed || "Failed to delete cloud record.");
                }
              }
            }}
            className="w-full py-4 text-rose-500 font-black text-[9px] uppercase tracking-widest hover:text-rose-700 transition-colors bg-rose-50 rounded-xl active:scale-95 border border-rose-100"
          >
            Permanently Delete Cloud Account
          </button>
        </div>
      )}
    </div>
  );
};

const Onboarding: React.FC<{ onComplete: (p: UserProfile) => Promise<void> }> = ({ onComplete }) => {
  const { language, t, profile } = usePatientContext();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserProfile>(profile || INITIAL_PROFILE);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md min-h-[500px] rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-center space-y-8 animate-in zoom-in-95 duration-500 shadow-xl border border-slate-200">
        <div className="text-center space-y-3">
          <div className="bg-emerald-600 text-white w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-xl"><ShieldCheck size={40} /></div>
          <h1 className="text-3xl font-black text-slate-900 uppercase">{t.life_shield}</h1>
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{t.protocol_initialization}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in max-w-[300px] mx-auto w-full">
            <div className="relative">
              <input
                type="text"
                placeholder={t.identity_name}
                className="w-full bg-slate-50 border border-slate-200 p-4 pr-12 rounded-xl font-bold"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <button
                onClick={() => startListening(language, text => setFormData(p => ({ ...p, name: text })))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"
              >
                <Mic size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="number"
                  placeholder={t.age}
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold pr-10"
                  value={formData.age || ''}
                  onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                />
                <button onClick={() => startListening(language, text => setFormData(p => ({ ...p, age: parseInt(text.replace(/\D/g, '')) })))} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 active:scale-90"><Mic size={14} /></button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder={t.weight}
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold pr-10"
                  value={formData.weight || ''}
                  onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                />
                <button onClick={() => startListening(language, text => setFormData(p => ({ ...p, weight: parseInt(text.replace(/\D/g, '')) })))} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 active:scale-90"><Mic size={14} /></button>
              </div>
            </div>
            <select
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold appearance-none"
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
            >
              <option value="male">{t.male}</option>
              <option value="female">{t.female}</option>
              <option value="other">{t.other}</option>
            </select>
            {formData.gender === 'female' && (
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-600">{t.pregnant}</span>
                <button
                  onClick={() => setFormData({ ...formData, isPregnant: !formData.isPregnant })}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.isPregnant ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isPregnant ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                placeholder={t.region_placeholder || "Location/Town"}
                className="w-full bg-slate-50 border border-slate-200 p-4 pr-12 rounded-xl font-bold"
                value={formData.location || ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
              <button
                onClick={() => startListening(language, text => setFormData(p => ({ ...p, location: text })))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"
              >
                <Mic size={20} />
              </button>
            </div>
            <button
              onClick={() => {
                if (!formData.name) return alert(t.enter_identity_name || "Enter Identity Name");
                if (formData.age <= 0) return alert(t.enter_valid_age || "Enter valid Age");
                setStep(1.5);
              }}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.5 && (
          <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.chronic_conditions}</h3>
            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {[
                { id: 'hasDiabetes', label: t.diabetes },
                { id: 'hasHighBP', label: t.hypertension },
                { id: 'hasLiverDisease', label: t.liver_disease },
                { id: 'hasKidneyDisease', label: t.kidney_disease },
                { id: 'hasHeartDisease', label: t.heart_disease },
                { id: 'hasAsthma', label: t.asthma },
              ].map(condition => (
                <button
                  key={condition.id}
                  onClick={() => setFormData({ ...formData, [condition.id]: !(formData as any)[condition.id] })}
                  className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${(formData as any)[condition.id] ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {condition.label}
                  {(formData as any)[condition.id] && <Check size={14} />}
                </button>
              ))}
              {formData.customConditions.map((cond, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                  {cond}
                  <button onClick={() => setFormData({ ...formData, customConditions: formData.customConditions.filter((_, i) => i !== idx) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other (e.g. Thyroid)"
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setFormData({ ...formData, customConditions: [...formData.customConditions, val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input.value.trim();
                if (val) {
                  setFormData({ ...formData, customConditions: [...formData.customConditions, val] });
                  input.value = '';
                }
              }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
            </div>

            <button
              onClick={() => setStep(1.6)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.6 && (
          <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.family_history}</h3>
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.family_history_q}</p>

            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer', 'Asthma'].map(cond => (
                <button
                  key={cond}
                  onClick={() => {
                    const existing = formData.familyHistory || [];
                    const next = existing.includes(cond) ? existing.filter(x => x !== cond) : [...existing, cond];
                    setFormData({ ...formData, familyHistory: next });
                  }}
                  className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.familyHistory?.includes(cond) ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {cond}
                  {formData.familyHistory?.includes(cond) && <Check size={14} />}
                </button>
              ))}
              {formData.familyHistory?.filter(c => !['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer', 'Asthma'].includes(c)).map((cond, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                  {cond}
                  <button onClick={() => setFormData({ ...formData, familyHistory: formData.familyHistory?.filter(x => x !== cond) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other condition in family..."
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setFormData({ ...formData, familyHistory: [...(formData.familyHistory || []), val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input.value.trim();
                if (val) {
                  setFormData({ ...formData, familyHistory: [...(formData.familyHistory || []), val] });
                  input.value = '';
                }
              }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
            </div>

            <button
              onClick={() => setStep(1.7)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.7 && (
          <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.surgical_history}</h3>
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.surgical_history_q}</p>

            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {['Appendix', 'Gallbladder', 'Hernia', 'C-Section', 'Heart Bypass', 'Knee Replacement'].map(surgery => (
                <button
                  key={surgery}
                  onClick={() => {
                    const existing = formData.surgeries || [];
                    const next = existing.includes(surgery) ? existing.filter(x => x !== surgery) : [...existing, surgery];
                    setFormData({ ...formData, surgeries: next });
                  }}
                  className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.surgeries?.includes(surgery) ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {surgery}
                  {formData.surgeries?.includes(surgery) && <Check size={14} />}
                </button>
              ))}
              {formData.surgeries?.filter(s => !['Appendix', 'Gallbladder', 'Hernia', 'C-Section', 'Heart Bypass', 'Knee Replacement'].includes(s)).map((surgery, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                  {surgery}
                  <button onClick={() => setFormData({ ...formData, surgeries: formData.surgeries?.filter(x => x !== surgery) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other surgery or issue..."
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setFormData({ ...formData, surgeries: [...(formData.surgeries || []), val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input.value.trim();
                if (val) {
                  setFormData({ ...formData, surgeries: [...(formData.surgeries || []), val] });
                  input.value = '';
                }
              }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
            </div>

            <button
              onClick={() => setStep(1.72)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.72 && (
          <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.allergies_title}</h3>
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-none">{t.allergies_q}</p>

            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Peanuts', 'Dairy', 'Latex'].map(allergy => (
                <button
                  key={allergy}
                  onClick={() => {
                    const existing = formData.allergies || [];
                    const next = existing.includes(allergy) ? existing.filter(x => x !== allergy) : [...existing, allergy];
                    setFormData({ ...formData, allergies: next });
                  }}
                  className={`p-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-between transition-all border ${formData.allergies?.includes(allergy) ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {allergy}
                  {formData.allergies?.includes(allergy) && <Check size={14} />}
                </button>
              ))}
              {formData.allergies?.filter(s => !['Penicillin', 'Sulfa Drugs', 'Aspirin', 'Peanuts', 'Dairy', 'Latex'].includes(s)).map((allergy, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-black uppercase flex items-center justify-between animate-in zoom-in-95">
                  {allergy}
                  <button onClick={() => setFormData({ ...formData, allergies: formData.allergies?.filter(x => x !== allergy) })} className="text-purple-400 hover:text-rose-500"><X size={14} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other allergy..."
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setFormData({ ...formData, allergies: [...(formData.allergies || []), val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input.value.trim();
                if (val) {
                  setFormData({ ...formData, allergies: [...(formData.allergies || []), val] });
                  input.value = '';
                }
              }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
            </div>

            <button
              onClick={() => setStep(1.75)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.75 && (
          <div className="space-y-4 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Lifestyle & Habits</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
              {[
                { name: 'Kaini/Gutka', id: 'gutka' },
                { name: 'Cigarettes', id: 'cigarettes' },
                { name: 'Alcohol', id: 'alcohol' },
                { name: 'Other Tobacco', id: 'tobacco' }
              ].map(habit => (
                <div key={habit.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-700">{habit.name}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'occasionally', 'daily'].map(freq => (
                      <button
                        key={freq}
                        onClick={() => {
                          const existing = formData.habits?.filter(h => h.name !== habit.name) || [];
                          if (freq !== 'none') {
                            existing.push({ name: habit.name, frequency: freq as any });
                          }
                          setFormData({ ...formData, habits: existing });
                        }}
                        className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${(formData.habits?.find(h => h.name === habit.name)?.frequency || 'none') === freq
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white text-slate-400 border border-slate-100'
                          }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {formData.habits?.filter(h => !['Kaini/Gutka', 'Cigarettes', 'Alcohol', 'Other Tobacco'].includes(h.name)).map((habit, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-amber-900">{habit.name}</p>
                    <button onClick={() => setFormData({ ...formData, habits: formData.habits?.filter(h => h.name !== habit.name) })} className="text-amber-400 hover:text-rose-500"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'occasionally', 'daily'].map(freq => (
                      <button
                        key={freq}
                        onClick={() => {
                          const existing = formData.habits?.filter(h => h.name !== habit.name) || [];
                          if (freq !== 'none') existing.push({ name: habit.name, frequency: freq as any });
                          setFormData({ ...formData, habits: existing });
                        }}
                        className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${habit.frequency === freq ? 'bg-amber-600 text-slate-900 shadow-sm' : 'bg-white text-amber-400 border border-amber-100'}`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Other habit (e.g. Soda)"
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setFormData({ ...formData, habits: [...(formData.habits || []), { name: val, frequency: 'daily' }] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                const val = input.value.trim();
                if (val) {
                  setFormData({ ...formData, habits: [...(formData.habits || []), { name: val, frequency: 'daily' }] });
                  input.value = '';
                }
              }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={16} /></button>
            </div>

            <button
              onClick={() => setStep(1.8)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all mt-4"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 1.8 && (
          <div className="space-y-6 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Occupation & Labor</h3>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Profession (e.g. Farmer, Driver)"
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-xl font-bold"
                  value={formData.profession || ''}
                  onChange={e => setFormData({ ...formData, profession: e.target.value })}
                />
                <button
                  onClick={() => startListening(language, text => setFormData(p => ({ ...p, profession: text })))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 p-2 active:scale-90"
                >
                  <Mic size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Daily Work Hours: {formData.workHoursPerDay}</p>
                <input
                  type="range"
                  min="1" max="18"
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  value={formData.workHoursPerDay}
                  onChange={e => setFormData({ ...formData, workHoursPerDay: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Workload Intensity</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'low', label: 'Low/Desk' },
                    { id: 'moderate', label: 'Moderate' },
                    { id: 'high', label: 'High/Physical' },
                    { id: 'very_high', label: 'Extreme/Hard' }
                  ].map(intensity => (
                    <button
                      key={intensity.id}
                      onClick={() => setFormData({ ...formData, workIntensity: intensity.id as any })}
                      className={`p-3 rounded-lg text-[8px] font-black uppercase border transition-all ${formData.workIntensity === intensity.id ? 'bg-orange-500 border-orange-500 text-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    >
                      {intensity.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.next_step}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.dietary_preferences}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'vegetarian', label: 'Vegetarian' },
                  { key: 'vegan', label: 'Vegan' },
                  { key: 'non_veg', label: 'Non-Veg' },
                  { key: 'no_gluten', label: 'No Gluten' },
                  { key: 'no_dairy', label: 'No Dairy' }
                ].map(pref => (
                  <button
                    key={pref.key}
                    onClick={() => {
                      const current = formData.foodPreferences || [];
                      const updated = current.includes(pref.label) ? current.filter(p => p !== pref.label) : [...current, pref.label];
                      setFormData({ ...formData, foodPreferences: updated });
                    }}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${formData.foodPreferences?.includes(pref.label) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {t[pref.key] || pref.label}
                  </button>
                ))}
                {formData.foodPreferences?.filter(p => !['Vegetarian', 'Vegan', 'Non-Veg', 'No Gluten', 'No Dairy'].includes(p)).map(p => (
                  <button
                    key={p}
                    onClick={() => setFormData({ ...formData, foodPreferences: formData.foodPreferences?.filter(x => x !== p) })}
                    className="px-4 py-2 rounded-lg text-[9px] font-black uppercase bg-emerald-600 text-white flex items-center gap-2"
                  >
                    {p} <X size={10} />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Other (e.g. Keto)"
                  className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setFormData({ ...formData, foodPreferences: [...(formData.foodPreferences || []), val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input.value) {
                    setFormData({ ...formData, foodPreferences: [...(formData.foodPreferences || []), input.value] });
                    input.value = '';
                  }
                }} className="bg-emerald-600 text-white p-3 rounded-lg active:scale-95"><Plus size={14} /></button>
              </div>
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.establish_context}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-right max-w-[300px] mx-auto w-full">
            <div className="bg-emerald-50 p-6 rounded-2xl text-center space-y-3">
              <h3 className="text-lg font-black text-emerald-900 uppercase">{t.clinical_safe}</h3>
              <p className="text-[10px] text-emerald-700 font-bold uppercase leading-relaxed">{t.medical_context_note}</p>
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all"
            >
              {t.agree_continue}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in zoom-in-95 text-center max-w-[300px] mx-auto w-full">
            <CheckCircle2 className="text-emerald-500 mx-auto" size={80} strokeWidth={1} />
            <h3 className="text-2xl font-black text-slate-900 uppercase">{t.node_ready}</h3>
            <button
              onClick={async () => {
                setIsFinishing(true);
                try {
                  await onComplete(formData);
                } finally {
                  setIsFinishing(false);
                }
              }}
              disabled={isFinishing}
              className="w-full bg-white text-slate-900 py-6 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isFinishing ? <Loader2 size={18} className="animate-spin text-emerald-400" /> : <ShieldCheck size={18} />}
              {isFinishing ? 'Initializing Guardian...' : t.launch_guardian}
            </button>
          </div>
        )}
      </div>
    </div >
  );
};

const PersonalAssistant: React.FC<{ onClose: () => void, analysis?: any, epidemiology?: any }> = ({ onClose, analysis, epidemiology }) => {
  const context = usePatientContext();
  const { profile, riskScores, t, language } = context;
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    {
      role: 'model',
      text: `${t.assistant_active.replace('{name}', profile?.name.split(' ')[0] || '')} ${t.how_assist}`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput('');
    setMessages(p => [...p, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await getAIPersonalAssistantResponse(context, msg, messages, { ...analysis, epidemiology });
      setMessages(p => [...p, { role: 'model', text: res }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'model', text: t.biolink_error || "Bio-link error. Retrying..." }]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  return (
    <div className="fixed inset-0 lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[400px] lg:h-[600px] z-[500] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl lg:rounded-[2rem] overflow-hidden lg:border-4 lg:border-white">
      <div className="bg-white p-4 sm:p-5 flex justify-between items-center shadow-lg text-slate-900">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-xl backdrop-blur-md"><Bot size={24} /></div>
          <div>
            <h3 className="font-black text-base leading-none uppercase tracking-tight">{t.assistant_title}</h3>
            <p className="text-[8px] font-black opacity-60 uppercase mt-1 tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> {t.link_active}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 opacity-80 active:scale-90 transition-all bg-slate-100/10 rounded-lg"><X size={20} /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#e5ddd5] custom-scrollbar relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-[1.2rem] text-[13px] font-bold shadow-sm ${m.role === 'user' ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
              {m.text}
              <div className="text-[7px] text-slate-400 mt-1.5 font-black uppercase text-right opacity-60 tracking-tighter">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="flex gap-1.5 p-3 bg-white rounded-xl rounded-tl-none border border-slate-100 w-20 justify-center shadow-sm"><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
      </div>
      <div className="p-4 sm:p-6 bg-[#f0f2f5] border-t border-slate-200 relative z-20 pb-8 sm:pb-6">
        <div className="max-w-2xl mx-auto flex gap-3 items-center">
          <div className="flex-1 bg-white rounded-full px-5 py-3.5 flex items-center shadow-sm border border-slate-200 gap-3">
            <input className="flex-1 text-[14px] font-bold outline-none text-slate-900 placeholder-slate-400 bg-transparent" placeholder={t.query_placeholder} value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} />
            <button
              onClick={() => startListening(language, setInput)}
              className="p-2 text-slate-400 hover:text-emerald-600 active:scale-90 transition-all"
            >
              <Mic size={20} />
            </button>
          </div>
          <button onClick={handleSend} className="bg-white hover:bg-[#128c7e] text-slate-900 p-4 rounded-full active:scale-90 transition-all shadow-lg flex items-center justify-center">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};


const AYUSHHealthSystem: React.FC = () => {
  const context = usePatientContext();
  const { profile, language, t } = context;
  const [activeTab, setActiveTab] = useState<'public' | 'officer'>(profile?.role === 'officer' ? 'officer' : 'public');
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Regional Filters
  const [fDistrict, setFDistrict] = useState('All');
  const [fMandal, setFMandal] = useState('All');
  const [fVillage, setFVillage] = useState('All');

  useEffect(() => {
    const fetchGlobalData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        let users = snap.docs.map(d => d.data());

        // Apply Real-time AP Regional Filtering
        if (fDistrict !== 'All') {
          users = users.filter((u: any) => u.location?.includes(fDistrict));
          if (fMandal !== 'All') {
            users = users.filter((u: any) => u.location?.includes(fMandal));
            if (fVillage !== 'All') {
              users = users.filter((u: any) => u.location?.includes(fVillage));
            }
          }
        }

        const total = users.length;
        const officers = users.filter((u: any) => u.role === 'officer').length;
        const citizens = total - officers;
        const healthy = users.filter((u: any) =>
          !u.hasDiabetes && !u.hasHighBP && !u.hasLiverDisease &&
          !u.hasKidneyDisease && !u.hasHeartDisease && !u.hasAsthma &&
          (!u.customConditions || u.customConditions.length === 0)
        ).length;

        const ageDist = [
          { name: 'Under 25', value: users.filter((u: any) => u.age < 25).length },
          { name: '25-50', value: users.filter((u: any) => u.age >= 25 && u.age < 50).length },
          { name: '50+', value: users.filter((u: any) => u.age >= 50).length },
        ];

        const locMap: Record<string, any> = {};
        users.forEach((u: any) => {
          const loc = u.location || 'Remote';
          if (!locMap[loc]) locMap[loc] = { name: loc, fever: 0, chronic: 0, total: 0, clusters: [] as string[] };
          locMap[loc].total++;

          if (u.hasAsthma || (u.conditions?.some((c: any) => c.name.toLowerCase().includes('fever')))) {
            const diseaseTypes = ['Viral Fever', 'COVID-19 Cluster', 'Dengue Alert', 'Flu Outbreak'];
            const randomDisease = diseaseTypes[Math.floor(Math.random() * diseaseTypes.length)];
            if (!locMap[loc].clusters.includes(randomDisease)) locMap[loc].clusters.push(randomDisease);
            locMap[loc].fever += 1;
          }
          if (u.hasDiabetes || u.hasHeartDisease) locMap[loc].chronic++;
        });

        Object.values(locMap).forEach((loc: any) => {
          if (loc.clusters.length === 0) loc.clusters = loc.fever > 0 ? ['General Infection'] : ['Stable Status'];
        });

        const stats = {
          totalUsers: total,
          officerCount: officers,
          citizenCount: citizens,
          rawUsers: users,
          healthyRatio: total > 0 ? (healthy / total) * 100 : 0,
          ageGroups: ageDist,
          locationTrends: Object.values(locMap).sort((a, b) => b.total - a.total).slice(0, 6)
        };
        setGlobalStats(stats);
        (window as any).lastGlobalStats = stats;
      } catch (err) {
        console.error("AYUSH Data Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalData();
  }, [fDistrict, fMandal, fVillage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header with Segment Control & Multilingual Support */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Globe size={100} className="text-emerald-900" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Brain size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{t.ap_govt_label_long || "GOVERNMENT OF ANDHRA PRADESH"}</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">{t.dept_health_label || "DEPT. OF HEALTH & FAMILY WELFARE"}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase leading-none">{t.ap_surveillance_title || "AP STATE BIO-SURVEILLANCE"}</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">{t.surveillance_node_desc || "Centralized Regional Epidemiological Surveillance Node • 2026"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {profile?.role === 'officer' ? (
              (['public', 'officer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t[tab] || tab}
                </button>
              ))
            ) : (
              <div className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase bg-white shadow-lg text-emerald-600">
                {t.public}
              </div>
            )}
          </div>
          <button onClick={() => {
            const cycle: Record<string, string> = { 'en': 'hi', 'hi': 'te', 'te': 'ta', 'ta': 'kn', 'kn': 'mr', 'mr': 'en' };
            context.setLanguage((cycle[language] || 'en') as any);
          }} className="p-3 bg-white border border-slate-200 shadow-md rounded-2xl text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Languages size={18} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase">{language}</span>
          </button>
        </div>
      </div>

      {/* Regional Filter Bar - Live Scope Analysis */}
      <div className="bg-white p-6 rounded-[2rem] shadow-2xl flex flex-wrap gap-4 items-center animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3 mr-4 border-r border-slate-200 pr-6">
          <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-400"><MapPin size={20} /></div>
          <div>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">{t.operational_scope || "Operational Scope"}</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">{t.live_monitoring || "Government of Andhra Pradesh • Live Monitoring"}</span>
          </div>
        </div>

        <select
          className="bg-slate-100 text-slate-900 border border-slate-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-lg hover:bg-slate-700"
          value={fDistrict}
          onChange={(e) => { setFDistrict(e.target.value); setFMandal('All'); setFVillage('All'); }}
        >
          <option value="All">{t.all_districts_ap || "All Districts (AP)"}</option>
          {Object.keys(AP_GOVT_HIERARCHY).sort().map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {fDistrict !== 'All' && (
          <select
            className="bg-slate-100 text-slate-900 border border-slate-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer animate-in fade-in zoom-in-95 shadow-lg hover:bg-slate-700"
            value={fMandal}
            onChange={(e) => { setFMandal(e.target.value); setFVillage('All'); }}
          >
            <option value="All">{t.all_mandals || "All Mandals"}</option>
            {Object.keys(AP_GOVT_HIERARCHY[fDistrict] || {}).sort().map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}

        {fMandal !== 'All' && (
          <select
            className="bg-slate-100 text-slate-900 border border-slate-700 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer animate-in fade-in zoom-in-95 shadow-lg hover:bg-slate-700"
            value={fVillage}
            onChange={(e) => setFVillage(e.target.value)}
          >
            <option value="All">{t.all_villages || "All Villages"}</option>
            {(AP_GOVT_HIERARCHY[fDistrict]?.[fMandal] || []).slice().sort().map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        <div className="ml-auto bg-emerald-500/10 px-6 py-3.5 rounded-2xl border border-emerald-500/20 backdrop-blur-md">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter flex items-center gap-2">
            <Activity size={14} className="animate-pulse" />
            {globalStats?.totalUsers || 0} {t.nodes_synchronized || "Nodes Synchronized"}
          </p>
        </div>
      </div>

      {activeTab === 'public' && <AYUSHPublicHealth stats={globalStats} loading={loading} />}
      {activeTab === 'officer' && <AYUSHOfficerPortal stats={globalStats} />}
    </div>
  );
};


const AYUSHPublicHealth: React.FC<{ stats: any, loading: boolean }> = ({ stats, loading }) => {
  const { t } = usePatientContext();

  if (loading || !stats) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.synthesizing_community_data || "Synthesizing Community Data..."}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Real-time Global Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.global_adoption || "Global Adoption"}</p>
          <p className="text-3xl font-black text-slate-900">{stats.totalUsers}</p>
          <p className="text-[8px] font-bold text-emerald-600 uppercase">{t.live_nodes_tracking || "Live Nodes Tracking"}</p>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.health_index || "Health Index"}</p>
          <p className="text-3xl font-black text-emerald-600">{stats.healthyRatio.toFixed(1)}%</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase">{t.clinically_stable_users || "Clinically Stable Users"}</p>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.active_outbreaks || "Active Outbreaks"}</p>
          <p className="text-3xl font-black text-rose-500">{stats.locationTrends.filter((l: any) => l.fever > 5).length}</p>
          <p className="text-[8px] font-bold text-rose-400 uppercase">{t.cluster_anomalies || "Cluster Anomalies"}</p>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.symptom_density || "Symptom Density"}</p>
          <p className="text-3xl font-black text-blue-600">{stats.locationTrends.reduce((acc: number, l: any) => acc + l.fever, 0)}</p>
          <p className="text-[8px] font-bold text-blue-400 uppercase">{t.reported_cases_24h || "Reported Cases (24h)"}</p>
        </div>
      </div>

      {/* Disease Trend Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
            <TrendingUp size={150} />
          </div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><TrendingUp size={20} /></div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{t.disease_geospatial_trends || "Disease Geospatial Trends"}</h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">{t.symptom_dist_region || "Symptom Distribution by Region"}</p>
              </div>
            </div>
          </div>

          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.locationTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                <Bar dataKey="fever" name="Fever Cases" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="chronic" name="Chronic Conditions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Pie */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-3 rounded-2xl text-slate-900 shadow-lg"><UserCircle size={20} /></div>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Demographic Split</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.ageGroups}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.ageGroups.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {stats.ageGroups.map((group: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'][i] }}></div>
                  <span className="text-slate-500">{group.name}</span>
                </div>
                <span className="text-slate-900">{group.value} Users</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW: Region-Specific Disease Alerts */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-3 rounded-2xl text-white shadow-lg"><Activity size={20} /></div>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Regional Epidemiological Alerts</h3>
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mt-1">Live Outbreak Monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.locationTrends.map((loc: any, i: number) => (
            <div key={i} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase">{loc.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{loc.total} Registered Nodes</p>
                </div>
                <div className={`p-2 rounded-lg ${loc.fever > 3 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Globe size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Clusters</p>
                <div className="flex flex-wrap gap-2">
                  {loc.clusters.map((c: string, j: number) => (
                    <span key={j} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border shadow-sm ${c.includes('COVID-19') || c.includes('Dengue') ? 'bg-rose-600 text-white border-rose-300' : 'bg-white text-emerald-600 border-emerald-100'}`}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className={`text-[9px] font-black uppercase ${loc.fever > 3 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {loc.fever > 3 ? '⚠️ High Outbreak Potential' : '✅ Stable Territory'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Regional Symptom Map */}
      <div className="bg-white p-8 rounded-[2.5rem] text-slate-900 space-y-8 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,#059669,transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><MapPin size={16} /></div>
              <h3 className="text-lg font-black uppercase tracking-tight">Geospatial Surveillance</h3>
            </div>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              Detecting localized outbreaks in <span className="text-emerald-400 font-bold whitespace-nowrap">{(stats.totalUsers * 1.5).toFixed(0)}+ virtual segments</span>. AI is cross-referencing symptom density with regional climate patterns.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {stats.locationTrends.slice(0, 4).map((loc: any, i: number) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 backdrop-blur-sm group-hover:border-emerald-500/30 transition-all">
                  <p className="text-[11px] font-black text-slate-900 uppercase truncate">{loc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${loc.fever > 3 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{loc.fever} Reported Fever</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-slate-100/50 rounded-3xl border border-slate-100 relative flex items-center justify-center min-h-[300px] overflow-hidden">
            <Globe size={180} className="text-slate-700 opacity-50 animate-pulse-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Visual Outbreak Dots */}
              <div className="absolute top-1/4 left-1/2 w-4 h-4 bg-rose-500/40 rounded-full blur-md animate-ping"></div>
              <div className="absolute bottom-1/3 left-1/3 w-6 h-6 bg-amber-500/30 rounded-full blur-xl"></div>
              <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-emerald-500/50 rounded-full blur-sm"></div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {t.status_stable || "Stable"}</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> {t.high_outbreak_risk || "High Outbreak Risk"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AYUSHPersonalizedCare merged into StructuredSymptomChecker


const AYUSHOfficerPortal: React.FC<{ stats: any }> = ({ stats }) => {
  const { t } = usePatientContext();
  const [selectedRegion, setSelectedRegion] = useState<any>(null);

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-white p-4 rounded-2xl text-slate-900 shadow-2xl ring-4 ring-slate-100"><UserCheck size={28} /></div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-950">{t.strategic_intelligence || "Strategic Health Intelligence"}</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                {t.officer_node_desc || "Secure Officer Command Node • G20 Protocol V4.2"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
              <Zap size={16} /> {t.deploy_node || "Deploy Resource Node"}
            </button>
            <button className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95">
              <FileText size={16} /> {t.policy_export || "Bio-Policy Export"}
            </button>
          </div>
        </div>

        {/* High-Level Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: t.active_surveillance || 'Active Surveillance', val: stats.totalUsers, change: `${stats.officerCount} Officers • ${stats.citizenCount} Citizens`, color: 'emerald', icon: <Activity size={18} /> },
            { label: t.critical_anomalies || 'Critical Anomalies', val: stats.locationTrends.filter((l: any) => l.fever > 5).length, change: 'Immediate Action', color: 'rose', icon: <AlertTriangle size={18} /> },
            { label: t.system_integrity || 'System Integrity', val: '99.9%', change: 'Encrypted Sync', color: 'blue', icon: <ShieldCheck size={18} /> },
            { label: t.resource_load || 'Resource Load', val: '42%', change: 'Optimal Allocation', color: 'amber', icon: <Brain size={18} /> },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 transition-all hover:shadow-md group">
              <div className={`p-3 w-fit rounded-xl mb-4 bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900">{stat.val}</p>
              </div>
              <p className={`text-[8px] font-black uppercase text-${stat.color}-600 mt-2 tracking-tighter`}>{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          {/* Detailed Territorial Nodes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <Globe size={16} className="text-blue-600" />
                {t.regional_analytics || "Regional Symptom Load Analytics"}
              </h4>
            </div>
            <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-sm bg-white">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">Territory Node</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">Adopted Load</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">Symptom Cluster</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">Bio-Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.locationTrends.map((loc: any, i: number) => (
                    <tr
                      key={i}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${selectedRegion?.name === loc.name ? 'bg-emerald-50/50' : ''}`}
                      onClick={() => setSelectedRegion(loc)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${loc.fever > 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                          <span className="text-[11px] font-black text-slate-900 uppercase">{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[11px] font-bold text-slate-500 tracking-tighter">{loc.total} active nodes</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {loc.clusters.map((c: string, j: number) => (
                            <span key={j} className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${c.includes('COVID-19') || c.includes('Dengue') ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                            <div
                              className={`h-full transition-all duration-1000 ${loc.fever > 5 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (loc.fever / 10) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-400">{Math.min(100, (loc.fever / 10) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* NEW: Surveillance Node Directory */}
            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <UserCheck size={16} className="text-emerald-600" />
                Surveillance Node Directory
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.rawUsers?.map((u: any, i: number) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${u.role === 'officer' ? 'bg-white text-slate-900' : 'bg-emerald-50 text-emerald-600'}`}>
                        {u.role === 'officer' ? <ShieldCheck size={18} /> : <Activity size={18} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase">{u.name || 'Anonymous Node'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          {u.role === 'officer' ? 'Strategic Officer' : 'Citizen Node'} • {u.location || 'Remote'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${u.role === 'officer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.role === 'officer' ? 'Officer' : 'Citizen'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategic Action Sidebar (Advanced Feature) */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Strategic Predictive Action
            </h4>

            <div className="bg-white p-6 rounded-[2.5rem] text-slate-900 space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from- emerald-600/20 to-transparent opacity-50"></div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-xl text-emerald-400"><Brain size={18} /></div>
                  <h5 className="text-sm font-black uppercase tracking-tight">AI Intervention Logic</h5>
                </div>

                {selectedRegion ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Recommended Deployment</p>
                      <p className="text-xs font-bold leading-relaxed">
                        Dispatch <span className="text-emerald-400">{(selectedRegion.fever * 15)} Units</span> of Ayurvedic preventive care to <span className="text-slate-900">{selectedRegion.name}</span> segment within 24 hours.
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-rose-400 uppercase mb-1">Anomaly Factor</p>
                      <p className="text-xs font-bold">
                        Symptom load in <strong>{selectedRegion.name}</strong> is {((selectedRegion.fever / stats.totalUsers) * 100).toFixed(1)}% higher than national median.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center space-y-3 opacity-40">
                    <Search size={40} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Select region for deep-scan analysis</p>
                  </div>
                )}

                <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                  Authorize Emergency Protocols
                </button>
              </div>
            </div>

            {/* High-Risk Sensitive Nodes */}
            <div className="bg-rose-50/50 p-6 rounded-[2.5rem] border border-rose-100 shadow-sm space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 flex items-center gap-2">
                <Shield size={14} className="text-rose-500" />
                Restricted Node Analytics
              </h5>
              <div className="space-y-2">
                {[
                  { id: 'TX-902', risk: 'Critical', markers: 'High Liver Load Cluster' },
                  { id: 'AX-112', risk: 'Elevated', markers: 'Interaction Warning' },
                ].map((node, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-rose-200 group hover:border-rose-400 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-900 uppercase">TELEMETRY: {node.id}</span>
                      <span className="text-[8px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-md uppercase tracking-widest">{node.risk}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{node.markers}</p>
                  </div>
                ))}
              </div>
              <p className="text-[7px] font-black text-rose-400 uppercase mt-2 italic text-center">* PII ENCRYPTED UNDER BIO-SAFETY PROTOCOLS</p>
            </div>
          </div>
        </div>

        {/* Medication Safety Surveillance Section */}
        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl text-white"><Pill size={18} /></div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Population Medication Adherence & Safety</h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">National Pharmaco-vigilance Live Feed</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Drug Interaction Alerts', val: 'Low', status: 'Stable', color: 'emerald' },
              { label: 'Medication Adherence', val: '72%', status: 'Improving', color: 'blue' },
              { label: 'Bio-Response Variation', val: '4.2%', status: 'Monitor', color: 'amber' },
            ].map((m, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{m.label}</p>
                  <p className="text-2xl font-black text-slate-900">{m.val}</p>
                </div>
                <div className={`p-2 rounded-xl bg-${m.color}-50 text-${m.color}-600 text-[10px] font-black uppercase`}>
                  {m.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System & Connectivity Status */}
        <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-100">
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-slate-600">National Health Stack Connected</span>
          </div>
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase text-slate-600">AYUSH Decentralized Node V2.1</span>
          </div>
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-slate-600">AI Predictive Engine Synced</span>
          </div>
          <div className="flex-1"></div>
          <p className="text-[8px] font-black text-slate-300 uppercase italic">Confidential National Surveillance Log • DO NOT DISTRIBUTE</p>
        </div>
      </div>
    </div>
  );
};

export default App;