import React, { useState, useEffect } from 'react';
import { usePatientContext } from './core/patientContext/patientStore';
import { UserProfile } from './types';
import { checkAIStatus, AIStatus, orchestrateHealth } from './services/ai';
import { calculateComprehensiveRisk } from './core/patientContext/riskEngine';

// Components
import Layout from './components/Layout';
import VitalityHub from './components/VitalityHub';
import LoginScreen from './components/LoginScreen';
import CommandHub from './components/CommandHub';
import Dashboard from './components/Dashboard';
import LifeAuditPage from './components/LifeAuditPage';
import MeditationLab from './components/MeditationLab';
import AYUSHHealthSystem from './components/AYUSHHealthSystem';
import MedsScreen from './components/MedsScreen';
import StructuredSymptomChecker from './components/StructuredSymptomChecker';
import ReportsScreen from './components/ReportsScreen';
import ProfileScreen from './components/ProfileScreen';
import DailyCheckInModal from './components/DailyCheckInModal';
import Onboarding, { INITIAL_PROFILE } from './components/Onboarding';
import PersonalAssistant from './components/PersonalAssistant';
import WorkoutLogScreen from './components/WorkoutLogScreen';
import FoodLogScreen from './components/FoodLogScreen';
import TabletCheckerForm from './components/TabletCheckerForm';
import MedicationSafetyScanner from './components/MedicationSafetyScanner';
import DoctorDashboard from './components/DoctorDashboard'; // Added DoctorDashboard
import GlobalDictate from './components/GlobalDictate'; // Global Voice Input
import { ShieldAlert, Bot, MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  const context = usePatientContext();
  const {
    profile, updateProfile,
    riskScores,
    t, language, theme
  } = context;

  const [activeScreen, setActiveScreen] = useState<'hub' | 'dashboard' | 'audit' | 'food' | 'workout' | 'meditation' | 'ayush' | 'meds' | 'symptoms' | 'reports' | 'profile' | 'analysis'>('hub');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    checkAIStatus().then(setAIStatus);
    if (profile) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [profile]);

  // Medication Protocol Monitor - Real-time Alerts
  useEffect(() => {
    if (!isAuthenticated || !context.medications.length) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Safety check for profile.age before use
      const longevityAge = parseInt(profile?.age?.toString() || '30', 10) || 30; // Sanitize and fallback

      context.medications.forEach(med => {
        if (med.times.includes(currentHHmm)) {
          // Trigger a professional health alert
          context.triggerAlert('warning', `TIME FOR MOLECULAR PROTOCOL: Please take ${med.drugName} (${med.dosage}) now. Instruction: ${med.foodInstruction.toUpperCase()}`);

          // Optional: Browser Notification if permitted
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Health Intelligence: Medication Scheduled", {
              body: `${med.drugName} - ${med.dosage} is due now.`,
              icon: "/favicon.ico"
            });
          }
        }
      });
    }, 60000); // Check every minute

    // Request notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => clearInterval(checkInterval);
  }, [isAuthenticated, context.medications, profile?.age]); // Added profile.age to dependencies

  const handleRefresh = async () => {
    setIsOrchestrating(true);
    try {
      const res = await orchestrateHealth(context);
      setAnalysis(res);
    } catch (e) {
      console.error("Orchestration failed", e);
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hi_profile');
    updateProfile(null as any);
    setIsAuthenticated(false);
    setActiveScreen('hub');
  };

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    updateProfile(newProfile);
    setIsAuthenticated(true);
    setActiveScreen('hub');
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={() => setIsAuthenticated(true)}
        onRegister={() => setIsAuthenticated(true)}
      />
    );
  }

  if (profile?.role === 'doctor') {
    return (
      <>
        <DoctorDashboard onLogout={handleLogout} />
        {showAssistant && (
          <PersonalAssistant
            onClose={() => setShowAssistant(false)}
            analysis={analysis}
          />
        )}
        {!showAssistant && (
          <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in zoom-in duration-500">
            <button
              onClick={() => setShowAssistant(true)}
              className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-[0_20px_50px_rgba(5,150,105,0.3)] hover:shadow-[0_25px_60px_rgba(5,150,105,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 group relative"
            >
              <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
              <Bot size={28} className="relative z-10" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
            </button>
          </div>
        )}
        <GlobalDictate />
      </>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'hub':
      case 'dashboard':
        return (
          <Dashboard
            unifiedData={analysis}
            isOrchestrating={isOrchestrating}
            onRefresh={handleRefresh}
            onOpenFoodLog={() => setActiveScreen('food')}
            onOpenWorkoutLog={() => setActiveScreen('workout')}
            onOpenMeditationLog={() => setActiveScreen('meditation')}
            onOpenCheckIn={() => setShowCheckIn(true)}
            onOpenMeds={() => setActiveScreen('meds')}
            onSetScreen={(s) => setActiveScreen(s)}
            theme={theme}
          />
        );
      case 'audit': return <LifeAuditPage onBack={() => setActiveScreen('hub')} />;
      case 'food': return <div className="p-8 h-full overflow-hidden"><FoodLogScreen /></div>;
      case 'workout': return <div className="p-8 h-full overflow-hidden"><WorkoutLogScreen /></div>;
      case 'meditation': return <div className="p-8 h-full overflow-hidden"><MeditationLab /></div>;
      case 'ayush': return <div className="p-8 h-full overflow-hidden"><AYUSHHealthSystem /></div>;
      case 'meds': return <div className="p-8 h-full overflow-hidden"><MedsScreen initialTab="registry" onBack={() => setActiveScreen('hub')} /></div>;
      case 'analysis': return <div className="p-8 h-full overflow-y-auto"><MedicationSafetyScanner /></div>;
      case 'symptoms': return <div className="p-8 h-full overflow-hidden"><StructuredSymptomChecker /></div>;
      case 'reports': return <div className="p-8 h-full overflow-hidden"><ReportsScreen /></div>;
      case 'profile': return <div className="p-8 h-full overflow-hidden"><ProfileScreen /></div>;
      default: return null;
    }
  };

  const handleSetScreen = (screen: any) => {
    setActiveScreen(screen);
  };

  return (
    <>
      <Layout
        activeScreen={activeScreen}
        setActiveScreen={handleSetScreen}
        onLogout={() => {
          setIsAuthenticated(false);
          updateProfile(null as any);
        }}
        onOpenAssistant={() => setShowAssistant(true)}
      >
        <div className="h-full w-full overflow-hidden relative">
          {renderScreen()}
        </div>
      </Layout>

      {showCheckIn && (
        <DailyCheckInModal
          onClose={() => setShowCheckIn(false)}
          onComplete={handleRefresh}
        />
      )}

      {showAssistant && (
        <PersonalAssistant
          onClose={() => setShowAssistant(false)}
          analysis={analysis}
        />
      )}

      {/* ═══ FLOATING AI ASSISTANT TRIGGER ═══ */}
      {!showAssistant && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in zoom-in duration-500">
          <button
            onClick={() => setShowAssistant(true)}
            className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-[0_20px_50px_rgba(5,150,105,0.3)] hover:shadow-[0_25px_60px_rgba(5,150,105,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 group relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
            <Bot size={28} className="relative z-10" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
          </button>
        </div>
      )}

      {/* Floating Action for Tablet Checker in Hub */}
      {activeScreen === 'hub' && (
        <div className="fixed bottom-32 right-8 z-40 lg:hidden focus-within:hidden">
          <button
            onClick={() => setActiveScreen('meds')}
            className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center"
          >
            <span className="text-xl">💊</span>
          </button>
        </div>
      )}

      {/* Global Voice Input Overlay */}
      <GlobalDictate />

    </>
  );
};

export default App;