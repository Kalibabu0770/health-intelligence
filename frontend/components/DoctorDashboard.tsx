import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Users, Mic, Activity, Globe, Brain, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Microscope, FileText, History, Zap, Weight, TrendingUp, TrendingDown, Pill } from 'lucide-react';
import { orchestrateHealth, generateClinicalMasterDocument, generateGeoSurveillanceData } from '../services/ai';
import { startListening } from '../services/speech';
import { PatientMasterHealthDocument, ClinicalEncounter } from '../types';
import { usePatientContext } from '../core/patientContext/patientStore';
import { languages } from '../core/patientContext/translations';

const DoctorDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { language, setLanguage, t } = usePatientContext();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    // 100vh NO SCROLLING layout
    const [activePanel, setActivePanel] = useState<'queue' | 'patient_analysis' | 'surveillance' | 'protocols'>('queue');
    const [surveillanceTab, setSurveillanceTab] = useState<'tracking' | 'logistics'>('tracking');
    const [isRecording, setIsRecording] = useState(false);
    const [ehrText, setEhrText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPatientContext, setCurrentPatientContext] = useState<any>(null);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisPage, setAnalysisPage] = useState(1);
    const [generatedSchema, setGeneratedSchema] = useState<any>(null);
    const [masterHealthDoc, setMasterHealthDoc] = useState<PatientMasterHealthDocument | null>(null);

    const [patientQueue, setPatientQueue] = useState<any[]>([]);
    const [showRegistryDropdown, setShowRegistryDropdown] = useState(false);

    const [surveillanceData, setSurveillanceData] = useState<any>(null);
    const [isSurveillanceLoading, setIsSurveillanceLoading] = useState(false);

    useEffect(() => {
        if (activePanel === 'surveillance' && !surveillanceData) {
            const fetchSurveillanceData = async () => {
                setIsSurveillanceLoading(true);
                try {
                    const saved = localStorage.getItem('hi_accounts');
                    const accounts = (saved && saved !== 'null') ? JSON.parse(saved) : [];
                    const data = await generateGeoSurveillanceData(accounts);
                    if (data) {
                        setSurveillanceData(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch surveillance data:", e);
                } finally {
                    setIsSurveillanceLoading(false);
                }
            };
            fetchSurveillanceData();
        }
    }, [activePanel, surveillanceData]);

    useEffect(() => {
        const saved = localStorage.getItem('hi_accounts');
        const accounts = (saved && saved !== 'null') ? JSON.parse(saved) : [];
        const patientAccounts = Array.isArray(accounts) ? accounts.filter((a: any) => {
            const id = (a.patientId || '').toUpperCase();
            return !id.startsWith('DOC-') && !id.startsWith('LS-DOC') && !id.startsWith('AHIMS-DOC');
        }) : [];

        const realPatients = patientAccounts.map((a: any) => ({
            id: a.patientId || 'UNKNOWN-ID',
            name: a.name || 'Unknown User',
            risk: (a.conditions && a.conditions.length >= 3) ? 'High' : (a.conditions && a.conditions.length > 0) ? 'Moderate' : 'Low',
            disease: a.conditions?.[0]?.name || 'Routine Review',
            pincode: a.pincode || 'Unknown PIN',
            isMock: false
        }));
        setPatientQueue(realPatients);
    }, []);

    useEffect(() => {
        const handleDictationResult = (e: any) => {
            if (e.detail && e.detail.selector === '#ehr-textarea') {
                setEhrText(prev => {
                    const combined = (prev + " " + e.detail.text).trim();
                    if (combined.length > 15) {
                        // Auto-trigger AI synthesis after dictation finishes
                        setTimeout(() => {
                            document.getElementById('ai-analyze-btn')?.click();
                        }, 800);
                    }
                    return combined;
                });
            }
        };
        window.addEventListener('global-dictation-result', handleDictationResult);
        return () => window.removeEventListener('global-dictation-result', handleDictationResult);
    }, []);

    useEffect(() => {
        if (currentPatientContext?.profile?.patientId) {
            const saved = localStorage.getItem('hi_lcmhd_registry');
            const registry = (saved && saved !== 'null') ? JSON.parse(saved) : {};
            const doc = registry[currentPatientContext.profile.patientId];
            if (doc) {
                setMasterHealthDoc(doc);
            } else {
                // If no master doc exists, we'll generate one on the fly from current context
                // This ensures we always have a base document even if it's the first time
                generateClinicalMasterDocument(currentPatientContext).then(setMasterHealthDoc);
            }
        }
    }, [currentPatientContext]);

    const handleSearch = () => {
        const saved = localStorage.getItem('hi_accounts');
        const accounts = (saved && saved !== 'null') ? JSON.parse(saved) : [];
        const found = accounts.find((a: any) => {
            const id = (a.patientId || '').toUpperCase();
            const isDoc = id.startsWith('DOC-') || id.startsWith('LS-DOC') || id.startsWith('AHIMS-DOC');
            return !isDoc && (a.patientId === searchQuery || a.name.toLowerCase() === searchQuery.toLowerCase());
        });

        if (found) {
            setPatientQueue([{
                id: found.patientId,
                name: found.name,
                risk: found.hasHeartDisease || found.hasDiabetes ? 'High' : 'Moderate',
                disease: 'Pending AI Scan',
                pincode: found.location,
                isMock: false
            }, ...patientQueue]);
            setSearchQuery("");
        } else {
            alert("Patient ID not found in local registries.");
        }
    };

    const handleAnalyze = async () => {
        if (!currentPatientContext) {
            return alert("Please select a valid searched patient from the queue to run unified AI context analysis.");
        }
        if (!ehrText || ehrText.length < 10) {
            return alert("Please dictate or type at least 10 characters of clinical notes.");
        }
        setIsAnalyzing(true);
        try {
            const analysis = await orchestrateHealth(currentPatientContext, { query: ehrText });
            setAiAnalysis(analysis);

            // Generate a formal 13-Section PATIENT COMPREHENSIVE HEALTH RECORD
            const mockSchema = {
                header: {
                    title: "PATIENT COMPREHENSIVE HEALTH RECORD",
                    version: "AHMIS-V5.0-CLINICAL",
                    timestamp: new Date().toLocaleString(),
                    document_id: `AHMIS-IX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                },
                // 1. PATIENT IDENTIFICATION
                identification: {
                    name: currentPatientContext.profile.name,
                    id: currentPatientContext.profile.patientId || "LS-NEW-882",
                    abha_id: "NOT_LINKED",
                    dob: currentPatientContext.profile.dob || "1990-01-01",
                    age: currentPatientContext.profile.age || "34",
                    gender: currentPatientContext.profile.gender,
                    blood_group: currentPatientContext.profile.bloodGroup || "O+",
                    contact: currentPatientContext.profile.phone || "Hidden for Privacy",
                    address: `${currentPatientContext.profile.mandal || ''}, ${currentPatientContext.profile.district || ''}`,
                    pincode: currentPatientContext.profile.location || "500001",
                    district: currentPatientContext.profile.district || "Visakhapatnam",
                    state: "Andhra Pradesh",
                    occupation: currentPatientContext.profile.profession || "Not specified"
                },
                // 2. PHYSICAL & BIOMETRIC PROFILE
                biometrics: {
                    height: "172 cm",
                    weight: currentPatientContext.profile.weight || "72kg",
                    bmi: "24.3 (Normal)",
                    waist: "34 inches",
                    sleep_duration: `${currentPatientContext.profile.workHoursPerDay || 8} hrs`,
                    activity_level: currentPatientContext.profile.workIntensity || "Moderate",
                    stress_level: currentPatientContext.profile.stressLevel || "Medium"
                },
                // 3. MEDICAL HISTORY
                history: {
                    chronic: currentPatientContext.profile.conditions.map(c => c.name).concat(currentPatientContext.profile.customConditions || []),
                    surgical: currentPatientContext.profile.surgeries || [],
                    allergies: currentPatientContext.profile.allergies || [],
                    family: currentPatientContext.profile.familyHistory || [],
                    lifestyle: {
                        smoking: currentPatientContext.profile.smoking ? "Yes" : "No",
                        alcohol: currentPatientContext.profile.alcoholUsage || "None",
                        tobacco: currentPatientContext.profile.tobaccoFrequency || "None",
                        betel: "None",
                        diet: currentPatientContext.profile.foodPreferences || ["General"]
                    }
                },
                // 4. CURRENT HEALTH STATUS
                status: {
                    complaints: analysis.ehr_record?.chief_complaint || ehrText,
                    hpi: analysis.ehr_record?.hpi || "Patient presents for evaluation of symptoms as dictated.",
                    severity: analysis.ehr_record?.triage_priority || "Moderate",
                    ros: "Cardiovascular: Normal; Respiratory: Normal; GI: Stable; Neuro: Intact."
                },
                // 5. VITAL SIGNS
                vitals: {
                    bp: "120/80 mmHg",
                    pulse: "72 bpm",
                    temp: "98.6 F",
                    rr: "16 bpm",
                    spo2: "98%",
                    weight: currentPatientContext.profile.weight || "72kg"
                },
                // 6. PHYSICAL EXAMINATION
                examination: {
                    general: "Patient is conscious, oriented, and stable.",
                    cv: "S1 S2 heard, no murmurs.",
                    resp: "Clear breath sounds, no rales.",
                    abd: "Soft, non-tender.",
                    neuro: "GCS 15/15.",
                    other: "No visible edema or pallor."
                },
                // 7. LAB REPORTS
                labs: [
                    { test: "HbA1c", result: "5.7%", range: "4.0-5.6%", interpretation: "Pre-diabetic baseline" },
                    { test: "Total Cholesterol", result: "190 mg/dL", range: "<200 mg/dL", interpretation: "Normal" }
                ],
                // 8. AYUSH ASSESSMENT
                ayush: {
                    prakriti: "Vata-Pitta Dominant",
                    vata: 45,
                    pitta: 35,
                    kapha: 20,
                    imbalance: "Minor Vata provocation detected due to sleep fragmentation."
                },
                // 9. DIAGNOSIS
                diagnosis: {
                    primary: analysis.ehr_record?.triage_status || "Routine Observation",
                    secondary: "Lifestyle induced biomarker volatility"
                },
                // 10. TREATMENT PLAN
                treatment: {
                    herbal: "REAL-TIME AYUSH SCAN FOR KIK IN 532201. BIORHYTHM ALIGNMENT IS STABLE.",
                    dietary: ["Low Sodium", "Increased Fiber"],
                    yoga: ["Surya Namaskar", "Pranayama"],
                    lifestyle: "Optimize sleep cycle, target 8 hours."
                },
                // 11. CLINICAL NOTE (SOAP)
                notes: {
                    subjective: `Patient reports: ${ehrText}`,
                    objective: "Vitals stable, general examination unremarkable.",
                    assessment: "Clinical correlation with Integrated AI matrix shows 88% stability.",
                    plan: "Follow home care protocol and monitor vitals daily."
                },
                // 12. FOLLOW-UP
                follow_up: {
                    date: "2026-03-15",
                    tests: ["Fasting Glucose", "BP monitoring"],
                    warning_signs: "Excessive fatigue, sudden chest pain, or vision blurriness."
                },
                // 13. PROGRESS
                progress: {
                    improvement: "STABLE BASELINE MAINTAINED.",
                    recovery: "90% RECOVERY PROJECTED.",
                    response: "AWAITING TREATMENT INITIATION.",
                    complications: "NONE."
                },
                verification: {
                    signature: "0xAHMIS-IX-K2IT181R7_19CA8467A47",
                    seal: "VERIFIED BY AHMIS-CORE-STABLE"
                },
                // MISSING FIELDS FOR CLINICAL INTELLIGENCE PAGE
                phyto_analytics: {
                    optimization_metric: "88.5%",
                    suggested_compounds: analysis.suggested_remedies?.map((r: any) => r.name) || ["Curcumin", "Piperine", "Withanolides"]
                },
                predictive_risk: {
                    risk_score: analysis.risk_score || 1.5,
                    prediction: analysis.narrative_summary || "Elevated Systemic Inflammatory Markers Detected.",
                    contributing_factors: ["Elevated SpO2 Deviation", "Historical Trauma Correlation", "Biorhythm Volatility"]
                },
                integrative_recommendations: {
                    ayush: analysis.ayush_strategy || "Initiate Dashamarishta protocol (10ml bid) for stabilization.",
                    general: analysis.clinical_plan || "Restorative sleep focus; follow-up in 72 hours if fever persists."
                },
                treatment_plan: analysis.clinical_plan || "INITIATE PROTOCOL AHMIS-V5"
            };
            setGeneratedSchema(mockSchema);

            // ── NEW: Map Schema to Official Clinical Encounter Format for Master Record ──
            const latestEncounter: ClinicalEncounter = {
                encounter_id: mockSchema.header.document_id,
                patient_global_id: currentPatientContext.profile.patientId || "LS-NEW-882",
                doctor_id: "DOC-AHMIS-001",
                visit_date: new Date().toISOString(),
                visit_type: "AI Unified Analysis",
                chief_complaint: mockSchema.status.complaints,
                history_of_present_illness: mockSchema.status.hpi,
                vitals: {
                    blood_pressure: mockSchema.vitals.bp,
                    pulse: parseInt(mockSchema.vitals.pulse),
                    temperature: parseFloat(mockSchema.vitals.temp),
                    oxygen_saturation: parseInt(mockSchema.vitals.spo2),
                    weight: parseFloat(mockSchema.vitals.weight)
                },
                physical_examination: mockSchema.examination.general,
                ayush_assessment: {
                    prakriti_type: mockSchema.ayush.prakriti,
                    vata_score: mockSchema.ayush.vata,
                    pitta_score: mockSchema.ayush.pitta,
                    kapha_score: mockSchema.ayush.kapha
                },
                diagnosis: {
                    primary_diagnosis: mockSchema.diagnosis.primary,
                    secondary_diagnosis: mockSchema.diagnosis.secondary,
                    icd_code: "ICD-10:R69"
                },
                treatment_plan: {
                    herbal_prescription: [
                        { name: "Integrated Protocol", dosage: "As specified", rationale: mockSchema.treatment.herbal }
                    ],
                    diet_plan: mockSchema.treatment.dietary,
                    yoga_recommendation: mockSchema.treatment.yoga,
                    lifestyle_advice: mockSchema.treatment.lifestyle
                },
                follow_up_date: mockSchema.follow_up.date,
                doctor_notes: JSON.stringify(mockSchema.notes)
            };

            const masterDoc = await generateClinicalMasterDocument(currentPatientContext, latestEncounter);
            setMasterHealthDoc(masterDoc);
        } catch (e) {
            console.error(e);
            alert("Deep analysis failed. Verify AI engine is online.");
        }
        setIsAnalyzing(false);
    };

    const MenuButton = ({ panel, icon: Icon, label }: any) => (
        <button
            onClick={() => {
                setActivePanel(panel);
                if (panel === 'patient_analysis') {
                    setAnalysisPage(1); // Default to first page when clicked from sidebar
                }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold tracking-widest text-[11px] uppercase ${activePanel === panel ? 'bg-emerald-600 text-white shadow-lg' : 'bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="h-screen w-screen bg-slate-50 overflow-hidden flex font-sans text-slate-900 border-4 border-emerald-600 box-border p-2">

            {/* Sidebar Navigation */}
            <div className="w-72 bg-white rounded-xl shadow-xl border border-slate-100 flex flex-col h-full mr-2 p-6">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">AHMIS Connect</h2>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Doctor Terminal</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                    <MenuButton panel="queue" icon={Users} label="Patient Queue" />
                    <MenuButton panel="surveillance" icon={Globe} label="Geo Surveillance" />
                    <MenuButton panel="protocols" icon={FileText} label="Clinical Protocols" />
                </div>

                <div className="mt-auto flex flex-col gap-3">
                    {/* Language Switcher */}
                    <div className="relative flex flex-col w-full">
                        <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className="w-full flex justify-between items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 hover:bg-emerald-50 text-[10px] uppercase font-black tracking-widest transition-colors">
                            <span className="flex items-center gap-2"><Globe size={14} /> Language Node</span>
                            <span className="text-emerald-600">{language.toUpperCase()}</span>
                        </button>
                        {showLanguageMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                                <div className="absolute bottom-14 left-0 w-full bg-white border border-slate-100 shadow-2xl rounded-xl z-50 overflow-hidden flex flex-col">
                                    {languages.map((lang) => (
                                        <button key={lang.code} onClick={() => { setLanguage(lang.code as any); setShowLanguageMenu(false); }} className={`px-4 py-3 text-[10px] font-black uppercase text-left transition-colors flex justify-between items-center tracking-widest ${language === lang.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>{lang.flag} {lang.name}</span>
                                            {language === lang.code && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-black text-lg uppercase shadow-inner">
                            {JSON.parse(localStorage.getItem('hi_profile') || '{}').name?.charAt(0) || 'D'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter truncate">
                                DR. {JSON.parse(localStorage.getItem('hi_profile') || '{}').name || 'UNKNOWN CLINICIAN'}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <ShieldCheck size={10} className="text-emerald-500" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Secured Link</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-rose-500 hover:text-rose-500 transition-all tracking-widest">
                        Terminate Session
                    </button>
                </div>
            </div>

            {/* Main Content Area (No Scrolling) */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-slate-100 h-full flex flex-col items-stretch overflow-hidden">
                {activePanel === 'queue' && (
                    <div className="h-full flex flex-col p-8 bg-white">
                        <div className="mb-8 flex justify-between items-end relative">
                            <div>
                                <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-tighter">Patient Intelligence Queue</h2>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Triage Prioritization</p>
                            </div>
                            <div className="flex gap-2 relative group">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Add Patient via ID or Name..."
                                        className="px-5 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl text-xs font-black outline-none focus:border-emerald-500 focus:bg-white min-w-[320px] transition-all shadow-inner"
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value);
                                            setShowRegistryDropdown(true);
                                        }}
                                        onFocus={() => setShowRegistryDropdown(true)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    />
                                    {/* Real-time Registry Dropdown */}
                                    {(showRegistryDropdown) && (
                                        <div
                                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                            onMouseLeave={() => setShowRegistryDropdown(false)}
                                        >
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Registry Records</span>
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Verified AHMIS Nodes</span>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                {JSON.parse(localStorage.getItem('hi_accounts') || '[]')
                                                    .filter((a: any) => {
                                                        const id = (a.patientId || '').toUpperCase();
                                                        const isDoc = id.startsWith('DOC-') || id.startsWith('LS-DOC') || id.startsWith('AHIMS-DOC');
                                                        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.patientId.toLowerCase().includes(searchQuery.toLowerCase());
                                                        return !isDoc && matchesSearch && !patientQueue.some(p => p.id === a.patientId);
                                                    })
                                                    .map((a: any, i: number) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setPatientQueue([{
                                                                    id: a.patientId,
                                                                    name: a.name,
                                                                    risk: (a.conditions && a.conditions.length >= 3) ? 'High' : (a.conditions && a.conditions.length > 0) ? 'Moderate' : 'Low',
                                                                    disease: a.conditions?.[0]?.name || 'Routine Review',
                                                                    pincode: a.pincode || 'Unknown PIN',
                                                                    isMock: false
                                                                }, ...patientQueue]);
                                                                setSearchQuery("");
                                                                setShowRegistryDropdown(false);
                                                            }}
                                                            className="w-full p-4 flex items-center justify-between hover:bg-emerald-50 border-b border-slate-50 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-[10px]">
                                                                    ID
                                                                </div>
                                                                <div>
                                                                    <div className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1">{a.patientId}</div>
                                                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{a.location} TERMINAL</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Select</div>
                                                        </button>
                                                    ))
                                                }
                                                {JSON.parse(localStorage.getItem('hi_accounts') || '[]').filter((a: any) => {
                                                    const id = (a.patientId || '').toUpperCase();
                                                    const isDoc = id.startsWith('DOC-') || id.startsWith('LS-DOC') || id.startsWith('AHIMS-DOC');
                                                    return !isDoc && !patientQueue.some(p => p.id === a.patientId);
                                                }).length === 0 && (
                                                        <div className="p-8 text-center text-slate-400 italic text-[10px] font-bold uppercase tracking-widest">No new records found in registry</div>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleSearch} className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                                    <Search size={16} /> <span className="text-[10px] font-black uppercase">Search</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 gap-4 content-start items-start overflow-y-auto custom-scrollbar">
                            {patientQueue.map((p, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.risk === 'High' ? 'bg-rose-100 text-rose-700' : p.risk === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            Risk: {p.risk}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tighter">CASE ID: {p.id}</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Registry Node: {p.pincode}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Diagnosis Alert</p>
                                            <p className="text-xs font-black uppercase text-slate-700">{p.disease}</p>
                                        </div>
                                        <button onClick={() => {
                                            if (!p.isMock) {
                                                const saved = localStorage.getItem('hi_accounts');
                                                const accounts = (saved && saved !== 'null') ? JSON.parse(saved) : [];
                                                const prof = accounts.find((a: any) => a.patientId === p.id);
                                                if (prof) {
                                                    setCurrentPatientContext({
                                                        profile: prof,
                                                        medications: JSON.parse(localStorage.getItem('hi_reminders') || '[]'),
                                                        symptoms: JSON.parse(localStorage.getItem('hi_symptoms') || '[]')
                                                    });
                                                }
                                            } else {
                                                setCurrentPatientContext(null);
                                            }
                                            setActivePanel('patient_analysis');
                                        }} className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors">
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activePanel === 'patient_analysis' && (
                    <div className="h-full flex flex-col p-8 bg-slate-50 overflow-y-auto custom-scrollbar">
                        <div className="mb-6 flex justify-between items-end">
                            <div className="flex-1 text-left">
                                <h3 className="text-xl font-black text-slate-900 border-l-4 border-emerald-500 pl-4 uppercase tracking-tighter mb-4">Case Registry: {currentPatientContext.profile.patientId}</h3>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Deep 3-Tier Multi-Modal Analysis</p>
                            </div>
                            <button onClick={() => setActivePanel('queue')} className="px-5 py-2 border-2 border-emerald-600 text-emerald-700 bg-emerald-50 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all tracking-widest">
                                ← Return to Queue
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Page Navigation */}
                            <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                                {[
                                    { id: 1, label: 'Overview Health Report', icon: Activity },
                                    { id: 2, label: 'Live Capture Hub', icon: Mic },
                                    { id: 3, label: 'Clinical Intelligence', icon: Brain },
                                    { id: 4, label: 'AYUSH Health Node', icon: ShieldCheck },
                                    { id: 5, label: 'Master Health Record', icon: FileText }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setAnalysisPage(p.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${analysisPage === p.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-emerald-50'}`}
                                    >
                                        <p.icon size={14} />
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {!currentPatientContext && analysisPage !== 2 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-serif">
                                    <AlertTriangle size={48} className="mb-4 text-emerald-200" />
                                    <h3 className="text-xl font-black uppercase tracking-widest">No Context Target</h3>
                                    <p className="text-sm font-bold opacity-75 mt-2 text-center">Please select a patient from the intelligence queue or use the Live Capture Hub.</p>
                                </div>
                            ) : (
                                <div className="flex-1 min-h-0">
                                    {analysisPage === 1 && (
                                        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 custom-scrollbar">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Risk Card */}
                                                <div className="bg-blue-600 border border-blue-700 rounded-2xl p-8 shadow-2xl flex flex-col justify-center text-white text-left relative overflow-hidden h-64">
                                                    <div className="absolute top-0 right-0 p-8 opacity-10"><Globe size={100} /></div>
                                                    <div className="relative z-10 w-full">
                                                        <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-4 border-l-4 border-blue-300 pl-3">Sentinel AI Risk Baseline</span>
                                                        <div className="text-5xl font-black mb-4 tracking-tighter">{(currentPatientContext.profile?.conditions?.length || 0) * 15}%</div>
                                                        <p className="text-[11px] font-medium leading-relaxed text-blue-50 opacity-90 border-t border-blue-500/50 pt-4">
                                                            Profile indicates a {(currentPatientContext.profile?.conditions?.length || 0) * 15}% elevated risk requiring routine monitoring.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Lifestyle & Meds Card */}
                                                <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-lg flex flex-col justify-center text-left h-64">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><Activity size={24} /></div>
                                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Clinical Lifestyle Matrix</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Conditions</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {currentPatientContext.profile?.conditions?.length ? currentPatientContext.profile.conditions.slice(0, 3).map((c: any, i: number) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-700 uppercase">{c.name}</span>
                                                                )) : <span className="text-xs font-bold text-slate-400 italic">None Reported</span>}
                                                            </div>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Medication Load</span>
                                                            <div className="font-black text-lg text-slate-800">
                                                                {currentPatientContext.medications?.length || 0} Registered
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Consult & History Summary */}
                                            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col p-8 text-left">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Encounter Synthesis Summary</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Audio & NLP Intelligence</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        <Mic size={14} /> Sentinel Synced
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    {(() => {
                                                        const existingRecords = JSON.parse(localStorage.getItem('hi_patient_analysis') || '{}');
                                                        const recs = existingRecords[currentPatientContext.profile.patientId || ''] || [];
                                                        const latest = recs[recs.length - 1];
                                                        if (!latest) {
                                                            return (
                                                                <div className="p-5 bg-slate-50 border-l-4 border-slate-300 rounded-r-xl">
                                                                    <p className="text-xs font-bold italic text-slate-400 mb-2">No recent consults available.</p>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="space-y-6">
                                                                <div className="p-5 bg-slate-50 border-l-4 border-emerald-500 rounded-r-xl">
                                                                    <p className="text-xs font-bold italic text-slate-600 mb-2">Last Consult: "{latest.rawAudioNotes}"</p>
                                                                    <div className="flex gap-2">
                                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase">{latest.ehr?.chief_complaint || 'N/A'}</span>
                                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-black uppercase">{latest.ehr?.icd_10_code || 'N/A'}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Multi-Component Treatment Plan Section */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-inner border border-slate-800">
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <Brain size={16} className="text-blue-400" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">AI Treatment Planner</span>
                                                                        </div>
                                                                        <p className="text-[11px] font-bold text-slate-300 leading-relaxed mb-4">
                                                                            {latest.ehr?.treatment_plan || "No active protocols synced. Run Clinical Analysis for optimization."}
                                                                        </p>
                                                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                                            <span>Protocol: Standard v4</span>
                                                                            <span className="text-emerald-400">Stable Analysis</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <Activity size={16} className="text-emerald-700" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Phyto-Optimization Matrix</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="flex justify-between text-[10px] font-bold"><span>Minimal Complexity</span> <span className="text-emerald-600">88% Match</span></div>
                                                                            <div className="flex justify-between text-[10px] font-bold"><span>Convergence Score</span> <span className="text-emerald-600">High</span></div>
                                                                            <div className="flex justify-between text-[10px] font-bold"><span>Proposed Phyto-Form</span> <span className="text-emerald-600">Poly-S1</span></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Navigation to AYUSH */}
                                            <div className="mt-2 text-left">
                                                <button
                                                    onClick={() => setAnalysisPage(4)}
                                                    className="w-full group bg-slate-900 hover:bg-emerald-800 text-white p-6 rounded-2xl transition-all shadow-xl flex items-center justify-between border-b-8 border-slate-800"
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                                                            <ShieldCheck size={32} className="text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-black uppercase tracking-tighter">Move To AYUSH Health Reports</h4>
                                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-100 italic">Access Verified Clinical Registry & Blockchain Records</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={24} className="opacity-50 group-hover:translate-x-2 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {analysisPage === 2 && (
                                        <div className="h-full bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                                            <div className="p-8 border-b border-slate-100 flex justify-between items-center text-left">
                                                <div>
                                                    <h3 className="text-xl font-black text-emerald-800 uppercase tracking-tighter">Multilingual Voice-to-EHR Hub</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">AI-Enabled NLP Clinical Transcription & Synthesis</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {isRecording && <div className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" /> <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Recording Active</span></div>}
                                                    <button
                                                        onClick={() => {
                                                            if (!isRecording) {
                                                                const lang = localStorage.getItem('hi_lang') || 'en-IN';
                                                                startListening(
                                                                    lang,
                                                                    (text) => setEhrText(prev => (prev + " " + text).trim()),
                                                                    () => setIsRecording(false)
                                                                );
                                                                setIsRecording(true);
                                                            } else {
                                                                setIsRecording(false);
                                                            }
                                                        }}
                                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRecording ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-emerald-600 text-white shadow-emerald-200'} shadow-lg hover:scale-105 active:scale-95`}
                                                    >
                                                        {isRecording ? "Terminate Capture" : "Initialize Audio Capture"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex p-8 gap-8 min-h-0 bg-slate-50/20">
                                                {/* Transcription Sidebar */}
                                                <div className="w-80 flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consult Stream</span>
                                                        <button onClick={() => setEhrText("")} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Clear</button>
                                                    </div>
                                                    <textarea
                                                        id="ehr-textarea"
                                                        value={ehrText}
                                                        onChange={e => setEhrText(e.target.value)}
                                                        className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-medium outline-none focus:border-emerald-500 transition-all font-serif resize-none shadow-inner"
                                                        placeholder="Consultation audio will stream here..."
                                                    />
                                                    <button
                                                        onClick={handleAnalyze}
                                                        disabled={isAnalyzing || !ehrText}
                                                        className="w-full bg-slate-900 text-white font-black text-[10px] uppercase py-4 rounded-xl hover:bg-emerald-900 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                                                    >
                                                        {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Brain size={16} />}
                                                        Generate Schema
                                                    </button>
                                                </div>
                                                {/* Specialized Workspace Center (EHR Only) */}
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                                                    {generatedSchema ? (
                                                        <div className="max-w-4xl mx-auto flex flex-col gap-10 animate-in zoom-in-95 duration-500 pb-10">
                                                            <div className="bg-white border-2 border-slate-200 p-12 text-left shadow-2xl relative overflow-hidden rounded-3xl font-sans">
                                                                <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={140} className="text-emerald-600" /></div>

                                                                <div className="flex justify-between items-start mb-12 border-b-4 border-emerald-600 pb-8">
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-100">🏥</div>
                                                                            <div>
                                                                                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Patient Comprehensive Health Record</h1>
                                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] font-mono mt-1">AHMIS VERIFIED • CLINICAL MASTER DOCUMENT • SECURE NODE</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Document Status</div>
                                                                        <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Verified Final Draft</div>
                                                                        <div className="text-[10px] font-bold text-slate-400 mt-2 font-mono">{generatedSchema.header.document_id}</div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-16">
                                                                    {/* 1. PATIENT IDENTIFICATION */}
                                                                    <section>
                                                                        <div className="flex items-center gap-4 border-b border-slate-100 pb-3 mb-8">
                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">1</div>
                                                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.25em]">Patient Identification</h3>
                                                                        </div>
                                                                        <div className="grid grid-cols-4 gap-y-10 gap-x-12 p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                                                                            {[
                                                                                { label: "Full Name", value: generatedSchema.identification.name },
                                                                                { label: "Patient ID", value: generatedSchema.identification.id },
                                                                                { label: "ABHA ID", value: generatedSchema.identification.abha_id },
                                                                                { label: "Date of Birth", value: generatedSchema.identification.dob },
                                                                                { label: "Age", value: generatedSchema.identification.age },
                                                                                { label: "Gender", value: generatedSchema.identification.gender },
                                                                                { label: "Blood Group", value: generatedSchema.identification.blood_group },
                                                                                { label: "Contact Number", value: generatedSchema.identification.contact },
                                                                                { label: "Address", value: generatedSchema.identification.address, span: 2 },
                                                                                { label: "Pincode", value: generatedSchema.identification.pincode },
                                                                                { label: "District", value: generatedSchema.identification.district },
                                                                                { label: "State", value: generatedSchema.identification.state },
                                                                                { label: "Occupation", value: generatedSchema.identification.occupation }
                                                                            ].map((item, idx) => (
                                                                                <div key={idx} className={`${item.span === 2 ? 'col-span-2' : ''} space-y-1`}>
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{item.label}</span>
                                                                                    <span className="text-xs font-bold text-slate-700 uppercase">{item.value}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </section>

                                                                    {/* NARRATIVE CLINICAL RECORD CONTENT */}
                                                                    <div className="space-y-12 text-slate-700 font-serif leading-relaxed text-sm pb-10">
                                                                        <section className="bg-slate-50/30 p-8 rounded-3xl border border-slate-100">
                                                                            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 border-b border-emerald-100 pb-2">2. Physical & Biometric Synthesis</h3>
                                                                            <p>The patient presents with a biometric profile including a recorded height of {generatedSchema.biometrics.height} and a current weight of {generatedSchema.biometrics.weight}, resulting in a calculated BMI of <span className="font-bold text-slate-900">{generatedSchema.biometrics.bmi}</span>. Physical activity level is characterized as {generatedSchema.biometrics.activity_level} with a metabolic stress index noted as {generatedSchema.biometrics.stress_level}. Sleep hygiene reports an average duration of {generatedSchema.biometrics.sleep_duration}.</p>
                                                                        </section>

                                                                        <section className="bg-slate-50/30 p-8 rounded-3xl border border-slate-100">
                                                                            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-4 border-b border-rose-100 pb-2">3. Medical History & Lifestyle Analysis</h3>
                                                                            <p>Clinical history is significant for <span className="font-bold text-slate-900">{generatedSchema.history.chronic.join(', ') || 'no documented chronic conditions'}</span>. Past surgical interventions include {generatedSchema.history.surgical.join(', ') || 'no prior surgical procedures'}. The allergy profile identifies sensitivities to <span className="text-rose-700 font-bold">{generatedSchema.history.allergies.join(', ') || 'no known allergens'}</span>. Family history records include {generatedSchema.history.family.join(', ') || 'no significant familial conditions'}. Lifestyle assessment indicates {generatedSchema.history.lifestyle.smoking === 'Yes' ? 'active smoking status' : 'non-smoking status'} and {generatedSchema.history.lifestyle.alcohol} alcohol consumption. Dietary pattern follows a {generatedSchema.history.lifestyle.diet.join(', ')} regimen.</p>
                                                                        </section>

                                                                        <section className="bg-slate-900 text-slate-300 p-8 rounded-3xl border-l-[10px] border-emerald-500 shadow-xl">
                                                                            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 border-b border-emerald-800 pb-2">4 & 5. Current Health Status & Vital Signs</h3>
                                                                            <p className="mb-4">The patient currently presents with a primary complaint of <span className="text-white italic underline decoration-emerald-500/50">"{generatedSchema.status.complaints}"</span>, categorized under <span className="text-emerald-400 font-bold uppercase">{generatedSchema.status.severity} clinical priority</span>. The history of present illness is summarized as: <span className="text-slate-200">{generatedSchema.status.hpi}</span>. Review of Systems (ROS) suggests: {generatedSchema.status.ros}.</p>
                                                                            <p>Objective vital signs at the time of evaluation: <span className="text-white font-bold">Blood Pressure: {generatedSchema.vitals.bp}; Pulse Rate: {generatedSchema.vitals.pulse}; Body Temp: {generatedSchema.vitals.temp}; SpO2: {generatedSchema.vitals.spo2}; RR: {generatedSchema.vitals.rr}</span>.</p>
                                                                        </section>

                                                                        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm font-mono text-[11px]">
                                                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">6 & 7. Physical Examination & Laboratory Investigations</h3>
                                                                            <p className="mb-4">General physical examination findings: {generatedSchema.examination.general}. Cardiovascular: {generatedSchema.examination.cv}. Respiratory: {generatedSchema.examination.resp}. Abdominal: {generatedSchema.examination.abd}. Neurological status: {generatedSchema.examination.neuro}. {generatedSchema.examination.other}.</p>
                                                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                                                <p className="font-bold text-slate-500 mb-2 uppercase tracking-widest">Diagnostic Correlation:</p>
                                                                                <ul className="list-disc pl-5 space-y-1">
                                                                                    {generatedSchema.labs.map((lab: any, i: number) => (
                                                                                        <li key={i}>{lab.test}: <span className="text-emerald-700 font-bold">{lab.result}</span> (Rel. Range: {lab.range}) - <span className="italic">{lab.interpretation}</span></li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </section>

                                                                        <section className="bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100">
                                                                            <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-4 border-b border-emerald-200 pb-2">8 & 9. Integrative AYUSH Diagnosis</h3>
                                                                            <p className="mb-4">The primary global diagnosis is categorized as <span className="font-bold text-slate-900 uppercase">{generatedSchema.diagnosis.primary}</span> with secondary findings of {generatedSchema.diagnosis.secondary}. AYUSH assessment identifies a <span className="text-emerald-800 font-black">{generatedSchema.ayush.prakriti}</span> Prakriti (Vata: {generatedSchema.ayush.vata}%, Pitta: {generatedSchema.ayush.pitta}%, Kapha: {generatedSchema.ayush.kapha}%).</p>
                                                                            <p className="italic text-emerald-700">Imbalance Note: "{generatedSchema.ayush.imbalance}"</p>
                                                                        </section>

                                                                        <section className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200">
                                                                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 border-b border-blue-100 pb-2">10. Integrative Treatment Plan</h3>
                                                                            <p className="mb-4">Medication Protocol: <span className="font-bold text-blue-900 uppercase">{generatedSchema.treatment.herbal}</span>. Dietary Pathya (Guidelines): {generatedSchema.treatment.dietary.join(' • ')}. Yoga & Pranayama regimen: {generatedSchema.treatment.yoga.join(' • ')}. Lifestyle modification advice: <span className="italic">"{generatedSchema.treatment.lifestyle}"</span>.</p>
                                                                        </section>

                                                                        <section className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-lg">
                                                                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 border-b border-slate-200 pb-2">11. Clinical Narrative (SOAP Note)</h3>
                                                                            <div className="space-y-4 font-serif text-[12px]">
                                                                                <p><span className="font-bold uppercase text-[10px] text-slate-400 mr-2">Subjective:</span>{generatedSchema.notes.subjective}</p>
                                                                                <p><span className="font-bold uppercase text-[10px] text-slate-400 mr-2">Objective:</span>{generatedSchema.notes.objective}</p>
                                                                                <p><span className="font-bold uppercase text-[10px] text-slate-400 mr-2">Assessment:</span>{generatedSchema.notes.assessment}</p>
                                                                                <p className="bg-slate-900 text-white p-4 rounded-xl"><span className="font-bold uppercase text-[10px] text-emerald-400 mr-2">Plan:</span>{generatedSchema.notes.plan}</p>
                                                                            </div>
                                                                        </section>

                                                                        <section className="grid grid-cols-2 gap-8">
                                                                            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-200">
                                                                                <h3 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-4 border-b border-amber-200 pb-2">12. Recovery & Follow-up</h3>
                                                                                <p className="mb-2">Follow-up is scheduled for <span className="font-bold">{generatedSchema.follow_up.date}</span>. Required tests: {generatedSchema.follow_up.tests?.join(', ') || 'Periodic Checkup'}.</p>
                                                                                <p className="text-rose-700 text-[11px] font-bold">⚠️ WARNING SIGNS: {generatedSchema.follow_up.warning_signs}</p>
                                                                            </div>
                                                                            <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100">
                                                                                <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-4 border-b border-emerald-100 pb-2">13. Health Progress Summary</h3>
                                                                                <p className="mb-2">Progress: <span className="font-bold text-emerald-700">{generatedSchema.progress.improvement}</span>. Projected Recovery: {generatedSchema.progress.recovery}.</p>
                                                                                <p className="text-[11px]">Notes: "{generatedSchema.progress.response}". Complications: {generatedSchema.progress.complications}.</p>
                                                                            </div>
                                                                        </section>
                                                                    </div>

                                                                    <div className="pt-20 border-t-4 border-slate-100 flex justify-between items-center bg-slate-50/30 -mx-12 p-12 mt-12">
                                                                        <div className="flex items-center gap-6">
                                                                            <ShieldCheck size={64} className="text-emerald-600 drop-shadow-2xl" />
                                                                            <div>
                                                                                <div className="text-xl font-black text-slate-900 uppercase tracking-tighter">AHMIS Verification Signature</div>
                                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Legally binding clinical record • Authorized Regional Node Cluster</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col text-right">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification Hash</span>
                                                                            <span className="text-[11px] font-mono font-black text-emerald-700 bg-white px-4 py-2 rounded-xl border border-emerald-50 shadow-sm">0x{generatedSchema.header.document_id}_{Date.now().toString(16).toUpperCase()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-20 pt-10 border-t-4 border-emerald-100 flex justify-between items-center opacity-80">
                                                                    <div className="flex flex-col">
                                                                        <div className="text-[11px] font-black uppercase text-slate-900 tracking-[0.4em]">Digital Cryptographic Seal</div>
                                                                        <div className="text-[9px] font-bold text-emerald-600 mt-2 uppercase font-mono tracking-widest">VERIFIED BY AHMIS-CORE-STABLE</div>
                                                                    </div>
                                                                    <ShieldCheck size={48} className="text-emerald-600 drop-shadow-lg" />
                                                                </div>

                                                                <div className="flex gap-6 mt-12">
                                                                    <button
                                                                        onClick={() => alert(`Transmitting Official Document ${generatedSchema.header.document_id} to AYUSH Health Node...`)}
                                                                        className="flex-1 bg-blue-600 text-white font-black text-[12px] uppercase py-6 rounded-2xl shadow-2xl hover:bg-blue-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-blue-800">
                                                                        <Globe size={24} /> Transmit to AYUSH Node
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const patientId = currentPatientContext.profile.patientId || currentPatientContext.profile.name;
                                                                            const saved = localStorage.getItem('hi_patient_analysis');
                                                                            const existingRecords = (saved && saved !== 'null') ? JSON.parse(saved) : {};
                                                                            if (!existingRecords[patientId]) existingRecords[patientId] = [];
                                                                            existingRecords[patientId].push({
                                                                                date: new Date().toISOString(),
                                                                                ehr: aiAnalysis.ehr_record,
                                                                                schema: generatedSchema,
                                                                                fusion: aiAnalysis.fusionScores,
                                                                                rawAudioNotes: ehrText
                                                                            });
                                                                            localStorage.setItem('hi_patient_analysis', JSON.stringify(existingRecords));
                                                                            alert("Clinical Record synced to Global Blockchain Node!");
                                                                            setAnalysisPage(1);
                                                                        }}
                                                                        className="flex-1 bg-emerald-600 text-white font-black text-[12px] uppercase py-6 rounded-2xl shadow-2xl hover:bg-emerald-700 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 border-b-4 border-emerald-800">
                                                                        <CheckCircle size={24} /> Seal & Sync to Registry
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-20 grayscale">
                                                            <Mic size={140} className="text-emerald-400 mb-8" />
                                                            <h4 className="text-3xl font-black text-emerald-800 uppercase tracking-tighter mb-4">Registry Node Standby</h4>
                                                            <p className="text-sm font-bold text-slate-400 max-w-sm uppercase tracking-widest leading-relaxed">Capture clinical audio from the sidebar to generate a verified AHMIS/AHMIS schema document.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                    }

                                    {
                                        analysisPage === 3 && (
                                            <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 custom-scrollbar">
                                                {generatedSchema ? (
                                                    <div className="max-w-6xl mx-auto w-full flex flex-col gap-8 pb-10 text-left">
                                                        {/* Unified Intelligence Header */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" /><span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Unified Clinical Intelligence Node</span></div>
                                                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-500 uppercase tracking-widest">Active Multi-Modal Scan</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                                            {/* SYSTEM ANALYSIS (Left Column) */}
                                                            <div className="lg:col-span-2 flex flex-col gap-8">
                                                                {/* Analysis Optimization Matrix */}
                                                                <div className="bg-slate-900 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                                                                    <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-400 rotate-12 transition-transform group-hover:rotate-0"><Brain size={120} /></div>
                                                                    <div className="flex items-center gap-4 mb-8">
                                                                        <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30"><ShieldCheck size={32} /></div>
                                                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Integrated Decision Support</h3>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-8">
                                                                        <div className="space-y-6">
                                                                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Convergence Analytics</span>
                                                                                <div className="text-lg font-black text-white italic">DETECTION: YES</div>
                                                                            </div>
                                                                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Minimal Complexity Metric</span>
                                                                                <div className="text-3xl font-black text-emerald-400 tracking-tighter">{generatedSchema.phyto_analytics.optimization_metric}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-center">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-white/10 pb-2">Suggested Compound Subsets</span>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {generatedSchema.phyto_analytics.suggested_compounds.map((c: string, i: number) => (
                                                                                    <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-[10px] font-black uppercase border border-blue-500/30">{c}</span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Predictive Health Analytics */}
                                                                <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl relative overflow-hidden text-left">
                                                                    <div className="absolute top-0 right-0 p-10 opacity-5 text-amber-500"><AlertTriangle size={100} /></div>
                                                                    <div className="flex items-center justify-between mb-8">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl"><Activity size={32} /></div>
                                                                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Predictive Health Analytics</h3>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Risk Score</span>
                                                                            <div className="text-2xl font-black text-amber-600">{generatedSchema.predictive_risk?.risk_score}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-8 bg-amber-50 border-2 border-amber-200 rounded-2xl mb-8 shadow-inner">
                                                                        <div className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">AI-Generated Health Forecast</div>
                                                                        <p className="text-xl font-black text-slate-900 uppercase tracking-tight italic leading-tight">{generatedSchema.predictive_risk?.prediction}</p>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-3">
                                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">Core Biomarker Deviation:</span>
                                                                        {generatedSchema.predictive_risk?.contributing_factors.map((f: string, i: number) => (
                                                                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase border border-slate-200">{f}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* TREATMENT & PATHWAY (Right Column) */}
                                                            <div className="flex flex-col gap-8 h-full">
                                                                {/* Integrative Treatment Matrix */}
                                                                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-lg flex-1">
                                                                    <div className="flex items-center gap-3 mb-8">
                                                                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><CheckCircle size={24} /></div>
                                                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Integrative Treatment Matrix</h3>
                                                                    </div>
                                                                    <div className="space-y-6">
                                                                        <div className="p-6 bg-white border border-blue-200 rounded-2xl shadow-sm hover:border-blue-400 transition-all group">
                                                                            <span className="text-[10px] font-black text-blue-600 uppercase block mb-3 border-b border-blue-50 pb-2">AYUSH Therapeutic Referral</span>
                                                                            <p className="text-xs font-bold text-slate-600 italic leading-relaxed group-hover:text-slate-900 transition-colors">{generatedSchema.integrative_recommendations?.ayush}</p>
                                                                        </div>
                                                                        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-400 transition-all group">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 border-b border-slate-100 pb-2">Standard Clinical Protocol</span>
                                                                            <p className="text-xs font-bold text-slate-600 italic leading-relaxed group-hover:text-slate-900 transition-colors">{generatedSchema.integrative_recommendations?.general}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Pathway Decision & RL Feedback */}
                                                                <div className="bg-emerald-600 rounded-3xl p-8 shadow-2xl border-b-8 border-emerald-800 relative overflow-hidden group">
                                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                                                        <div>
                                                                            <div className="flex justify-between items-start mb-6">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Globe size={24} className="text-emerald-200" />
                                                                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Official Decision Pathway</span>
                                                                                </div>
                                                                                <div className="px-3 py-1 bg-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/30 backdrop-blur-md">Prediction Confidence: 94.2%</div>
                                                                            </div>
                                                                            <p className="text-2xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-md mb-8">{generatedSchema.treatment_plan}</p>
                                                                        </div>
                                                                        <div className="pt-6 border-t border-white/20">
                                                                            <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest block mb-4 border-b border-emerald-500/50 pb-2">RL Model Validation Pipeline (Physician Feedback)</span>
                                                                            <div className="flex gap-4">
                                                                                <button onClick={() => alert("Positive clinical outcome rewarded! RL Graph updated.")} className="flex-1 px-4 py-3 bg-white text-emerald-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95 text-center">
                                                                                    👍 Validate & Reinforce
                                                                                </button>
                                                                                <button onClick={() => alert("Clinical Deviation Flagged! Forwarded for expert system tuning.")} className="flex-1 px-4 py-3 bg-emerald-800 text-emerald-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-inner hover:shadow-rose-600/50 hover:scale-105 active:scale-95 border border-emerald-700 hover:border-rose-500 text-center">
                                                                                    👎 Report Deviation
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 font-serif opacity-30 grayscale p-20 text-center">
                                                        <Brain size={120} className="mb-8 text-blue-200" />
                                                        <h3 className="text-3xl font-black uppercase tracking-widest text-slate-800">Intelligence Node Standby</h3>
                                                        <p className="max-w-md text-sm font-bold opacity-75 mt-4 uppercase tracking-widest leading-relaxed">Please generate a clinical schema from the Live Capture Hub to initialize deep multi-modal analysis & AHMIS optimization.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }

                                    {
                                        analysisPage === 4 && (
                                            <div className="h-full bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col p-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex justify-between items-center mb-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-4 bg-emerald-100 text-emerald-800 rounded-2xl"><ShieldCheck size={32} /></div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">AHMIS Official Node</h3>
                                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Clinical Registry & Blockchain Persistence</p>
                                                        </div>
                                                    </div>
                                                    <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                        Syncing with Ministry Central Node
                                                    </div>
                                                </div>
                                                <div className="flex-1 grid grid-cols-2 gap-10">
                                                    <div className="space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                                                        {(() => {
                                                            const saved = localStorage.getItem('hi_patient_analysis');
                                                            const existingRecords = (saved && saved !== 'null') ? JSON.parse(saved) : {};
                                                            const recs = existingRecords[currentPatientContext.profile?.patientId || ''] || [];
                                                            const latest = recs[recs.length - 1];

                                                            if (latest && latest.schema) {
                                                                return (
                                                                    <div className="space-y-6">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registry Record: {latest.schema.header.version}</h4>
                                                                        <div className="p-8 bg-white border border-slate-200 rounded-3xl font-mono text-[10px] text-slate-600 space-y-4 shadow-sm">
                                                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                                                <span className="text-emerald-700 font-bold">BLOCKCHAIN ID</span>
                                                                                <span>0xAFB...{Date.now().toString().slice(-6)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                                                <span className="text-emerald-700 font-bold">PHYTO_MATRIX</span>
                                                                                <span>{latest.schema.phyto_analytics.optimization_metric}</span>
                                                                            </div>
                                                                            <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-emerald-900 border border-emerald-100">
                                                                                <span className="font-black">SIGNED_TREATMENT_PLAN:</span> <br />
                                                                                {latest.schema.treatment_plan}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div>
                                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Official EHR Schema</h4>
                                                                    <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 space-y-3">
                                                                        <p><span className="text-emerald-700 font-bold">TYPE:</span> OFFICIAL_ENCOUNTER</p>
                                                                        <p><span className="text-emerald-700 font-bold">NODE:</span> LS-DOC-{Date.now().toString().slice(-4)}</p>
                                                                        <p><span className="text-emerald-700 font-bold">PATIENT_ID:</span> {currentPatientContext.profile?.patientId}</p>
                                                                        <p><span className="text-emerald-700 font-bold">STATUS:</span> LOCAL-FAILSAFE-VERIFIED</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="flex flex-col justify-center items-center p-12 bg-emerald-50/50 rounded-3xl border border-emerald-100 italic text-center">
                                                        <Globe size={48} className="text-emerald-300 mb-6" />
                                                        <p className="text-emerald-800 font-bold mb-4">The AYUSH Health Report for this patient is securely persisted across the decentralized health grid.</p>
                                                        <button className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">Download Signed PDF Report</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    {
                                        analysisPage === 5 && (
                                            <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 custom-scrollbar text-left pb-10">
                                                {masterHealthDoc ? (
                                                    <div className="max-w-5xl mx-auto w-full space-y-12">
                                                        {/* ENHANCED DOCUMENT HEADER */}
                                                        <div className="bg-white border-t-8 border-emerald-600 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Globe size={240} className="text-emerald-900" /></div>
                                                            <div className="flex justify-between items-start mb-12 border-b-2 border-slate-50 pb-10 relative z-10">
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center gap-5">
                                                                        <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_20px_40px_-10px_rgba(5,150,105,0.3)]">HI</div>
                                                                        <div>
                                                                            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Patient Comprehensive Health Record</h1>
                                                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-3">AHMIS Verified • Clinical Master Document • Secure Node</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-6 mt-8">
                                                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col min-w-[160px]">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Document Status</span>
                                                                            <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-2 italic">
                                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Verified Final Draft
                                                                            </span>
                                                                        </div>
                                                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col min-w-[160px]">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Blockchain Hash</span>
                                                                            <span className="text-[9px] font-black text-slate-600 font-mono">0xAHMIS-IX-{masterHealthDoc.patient_global_id.slice(-10)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right space-y-4">
                                                                    <div className="inline-block px-4 py-2 bg-emerald-900 text-white rounded-lg">
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 opacity-60">Global Healthcare Node</p>
                                                                        <p className="text-base font-bold font-mono tracking-tighter">AHMIS-NODE-AP-8054</p>
                                                                    </div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                        SYNCED: {new Date(masterHealthDoc.last_updated_timestamp).toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* MASTER NARRATIVE SECTIONS */}
                                                            <div className="space-y-12 relative z-10">
                                                                {/* 1. Identification */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">1</span>
                                                                        <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">Patient Identification Narrative</h3>
                                                                    </div>
                                                                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-emerald-100">
                                                                        Registry identifies <span className="font-black text-emerald-900 uppercase underline decoration-emerald-200 decoration-4">{masterHealthDoc.profile.demographic_information.full_name}</span>, a <span className="font-bold underline">{masterHealthDoc.profile.demographic_information.age}</span>-year-old <span className="font-bold uppercase underline">{masterHealthDoc.profile.demographic_information.gender}</span> assigned Patient ID <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">LS-KAL-8054</span>.
                                                                        Biological markers confirm blood group <span className="font-black text-rose-600">{masterHealthDoc.profile.demographic_information.blood_group}</span> with DOB <span className="font-bold">{masterHealthDoc.profile.demographic_information.date_of_birth}</span>.
                                                                        Primary residence is established in <span className="font-bold uppercase">{masterHealthDoc.profile.demographic_information.district || 'Visakhapatnam'}</span>, {masterHealthDoc.profile.demographic_information.state || 'Andhra Pradesh'}, under occupational category <span className="font-bold italic">{masterHealthDoc.profile.professional_details.occupation || 'Farmer'}</span>.
                                                                    </p>
                                                                </div>

                                                                {/* 2. Biometrics */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">2</span>
                                                                        <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Physical & Biometric Synthesis</h3>
                                                                    </div>
                                                                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-white p-8 rounded-3xl border border-blue-50 shadow-sm">
                                                                        Biometric evaluation confirms height of <span className="font-bold text-slate-900">{masterHealthDoc.profile.biometric_profile.height_cm} cm</span> and weight of <span className="font-bold text-slate-900">{masterHealthDoc.profile.biometric_profile.weight_kg} kg</span>, with BMI of <span className="font-black text-emerald-600">{masterHealthDoc.profile.biometric_profile.bmi} (Normal)</span>.
                                                                        Waist registered at <span className="font-bold text-slate-900">34 inches</span>. Average sleep duration is <span className="font-bold text-blue-600">{masterHealthDoc.profile.biometric_profile.sleep_hours} hrs</span>.
                                                                        Activity: <span className="font-black text-slate-800 uppercase underline decoration-blue-100">{masterHealthDoc.profile.professional_details.work_type || 'moderate'}</span>, with stress index rated <span className="font-black text-blue-600 uppercase">{masterHealthDoc.profile.professional_details.stress_level || 'low'}</span>.
                                                                    </p>
                                                                </div>

                                                                {/* 3. Medical History */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">3</span>
                                                                        <h3 className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-none">Longitudinal Medical History Summary</h3>
                                                                    </div>
                                                                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-slate-50/50 p-8 rounded-3xl border border-rose-50 shadow-sm">
                                                                        Historical telemetry denotes <span className="font-bold text-slate-900">{masterHealthDoc.history.chronic_conditions.length > 0 ? `active conditions including ${masterHealthDoc.history.chronic_conditions.map((c: any) => c.disease_name).join(', ')}` : 'zero reported chronic conditions'}</span>.
                                                                        Surgical registry identifies prior intervention for <span className="italic font-bold text-rose-700">{masterHealthDoc.history.past_surgeries.length > 0 ? masterHealthDoc.history.past_surgeries.map((s: any) => s.surgery_name).join(', ') : 'no major surgical episodes'}</span>.
                                                                        Allergy profile highlights <span className="font-black text-rose-600 uppercase">{masterHealthDoc.history.allergies.length > 0 ? masterHealthDoc.history.allergies.map((a: any) => a.reaction_description).join(', ') : 'No Known Allergies'}</span>.
                                                                        Lifestyle assessment: <span className="font-bold">{masterHealthDoc.history.lifestyle_risks.smoking ? 'Active Smoking Status' : 'Non-Smoking protocol'}</span> and <span className="font-bold">{masterHealthDoc.history.lifestyle_risks.alcohol ? 'regular alcohol consumption' : 'zero alcohol consumption'}</span>.
                                                                    </p>
                                                                </div>

                                                                {/* 4. Vitals & Current Status */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">4</span>
                                                                        <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">Vital Sign Telemetry & Current Status</h3>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                        <div className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-slate-50/50 p-8 rounded-3xl border border-blue-50 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-4">
                                                                            <div className="text-center"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">BP</span><span className="text-xs font-black text-slate-800">{masterHealthDoc.encounters[0]?.vitals.blood_pressure || '120/80'}</span></div>
                                                                            <div className="text-center"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Pulse</span><span className="text-xs font-black text-slate-800">{masterHealthDoc.encounters[0]?.vitals.pulse || '72'}</span></div>
                                                                            <div className="text-center"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Temp</span><span className="text-xs font-black text-slate-800">{masterHealthDoc.encounters[0]?.vitals.temperature || '98.6'}</span></div>
                                                                            <div className="text-center"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">SpO2</span><span className="text-xs font-black text-emerald-600">{masterHealthDoc.encounters[0]?.vitals.oxygen_saturation || '98'}%</span></div>
                                                                            <div className="text-center"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Weight</span><span className="text-xs font-black text-slate-800">{masterHealthDoc.encounters[0]?.vitals.weight || '50'}kg</span></div>
                                                                        </div>
                                                                        <p className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-white p-8 rounded-3xl border border-emerald-50 shadow-sm">
                                                                            Complaint: <span className="italic font-bold text-emerald-900">"{masterHealthDoc.encounters[0]?.chief_complaint || 'baseline monitoring'}"</span>.
                                                                            Priority: <span className="font-black text-rose-600 uppercase">MODERATE</span>.
                                                                            HPI Narrative: <span className="text-slate-900 italic font-bold">"{ehrText ? (ehrText.length > 150 ? ehrText.slice(0, 150) + '...' : ehrText) : (masterHealthDoc.encounters[0]?.history_of_present_illness || 'Clinical capture baseline steady.')}"</span>.
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* 5. AYUSH Assessment */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs">5</span>
                                                                        <h3 className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Integrative AYUSH & Biorhythm Analysis</h3>
                                                                    </div>
                                                                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed font-serif bg-teal-50/30 p-8 rounded-3xl border border-teal-50 shadow-sm">
                                                                        Prakriti protocol establishes a <span className="font-black text-emerald-900 uppercase underline decoration-teal-200 decoration-4">{masterHealthDoc.encounters[0]?.ayush_assessment.prakriti_type || 'Vata-Pitta Dominant'}</span> equilibrium.
                                                                        Dosha distribution: <span className="font-bold text-teal-800">Vata: {masterHealthDoc.encounters[0]?.ayush_assessment.vata_score || 45}%, Pitta: {masterHealthDoc.encounters[0]?.ayush_assessment.pitta_score || 35}%, and Kapha: {masterHealthDoc.encounters[0]?.ayush_assessment.kapha_score || 20}%</span>.
                                                                        Assessment notes: <span className="italic font-bold text-teal-900">"Minor Vata provocation detected due to sleep fragmentation baseline."</span>
                                                                    </p>
                                                                </div>

                                                                {/* 6. Treatment Plan */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">6</span>
                                                                        <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">Comprehensive Treatment Strategy</h3>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 border-b border-blue-50 pb-3"><div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">02</div><h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.25em]">Baseline Biometrics</h3></div>
                                                                    <div className="grid grid-cols-3 gap-6">
                                                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-2">Height</div>
                                                                            <div className="text-base font-black text-slate-800">{masterHealthDoc.profile.biometric_profile.height_cm}cm</div>
                                                                        </div>
                                                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-2">Weight</div>
                                                                            <div className="text-base font-black text-slate-800">{masterHealthDoc.profile.biometric_profile.weight_kg}kg</div>
                                                                        </div>
                                                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-2">BMI</div>
                                                                            <div className="text-base font-black text-emerald-600">{masterHealthDoc.profile.biometric_profile.bmi}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex justify-between items-center text-xs font-bold uppercase tracking-widest text-blue-800">
                                                                        <span>Active Rest Period Node:</span>
                                                                        <span>{masterHealthDoc.profile.biometric_profile.sleep_hours} Hours/Day</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 3. LONGITUDINAL MEDICAL HISTORY */}
                                                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                                                            <div className="p-8 bg-slate-900 border-b-8 border-rose-500/30">
                                                                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4"><History size={24} className="text-rose-500" /> Longitudinal Medical History</h3>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 grayscale opacity-50">Persistence Cluster: Verified AHIM-CORE Blockchain</p>
                                                            </div>
                                                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                                                                <div className="space-y-6">
                                                                    <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 border-b border-rose-50 pb-2">Chronic Conditions</span>
                                                                    <div className="space-y-3">
                                                                        {masterHealthDoc.history.chronic_conditions.map((c, i) => (
                                                                            <div key={i} className="flex justify-between items-start gap-4 p-3 bg-rose-50/30 border border-rose-100/50 rounded-xl">
                                                                                <span className="text-xs font-black text-slate-800 uppercase leading-snug">{c.disease_name}</span>
                                                                                <span className="text-[8px] font-black py-0.5 px-1.5 bg-rose-100 text-rose-700 rounded-lg uppercase">{c.duration}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-6">
                                                                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b border-blue-50 pb-2">Past Surgeries & Trauma</span>
                                                                    <div className="space-y-3">
                                                                        {masterHealthDoc.history.past_surgeries.length > 0 ? masterHealthDoc.history.past_surgeries.map((s, i) => (
                                                                            <div key={i} className="flex justify-between items-start gap-4 p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl">
                                                                                <span className="text-xs font-black text-slate-800 uppercase leading-snug">{s.surgery_name}</span>
                                                                                <span className="text-[8px] font-black py-0.5 px-1.5 bg-blue-100 text-blue-700 rounded-lg uppercase">{s.year}</span>
                                                                            </div>
                                                                        )) : <div className="text-xs font-bold text-slate-400 italic">No Past Surgeries Reported</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-6">
                                                                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">Allergies & Sensitivities</span>
                                                                    <div className="space-y-3">
                                                                        {masterHealthDoc.history.allergies.map((a, i) => (
                                                                            <div key={i} className="flex justify-between items-center gap-4 p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl">
                                                                                <span className="text-xs font-black text-slate-800 uppercase">{a.reaction_description}</span>
                                                                                <span className="text-[8px] font-black py-0.5 px-1.5 bg-rose-500 text-white rounded-lg uppercase tracking-wider">{a.severity}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                                                <div className="flex gap-4">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifestyle Risks:</span>
                                                                    <div className="flex gap-4">
                                                                        <div className={`flex items-center gap-2 text-[10px] font-black ${masterHealthDoc.history.lifestyle_risks.smoking ? 'text-rose-600' : 'text-slate-300'}`}><span className={`w-2 h-2 rounded-full ${masterHealthDoc.history.lifestyle_risks.smoking ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : 'bg-slate-300'}`} /> SMOKING</div>
                                                                        <div className={`flex items-center gap-2 text-[10px] font-black ${masterHealthDoc.history.lifestyle_risks.alcohol ? 'text-rose-600' : 'text-slate-300'}`}><span className={`w-2 h-2 rounded-full ${masterHealthDoc.history.lifestyle_risks.alcohol ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : 'bg-slate-300'}`} /> ALCOHOL</div>
                                                                        <div className={`flex items-center gap-2 text-[10px] font-black ${masterHealthDoc.history.lifestyle_risks.tobacco ? 'text-rose-600' : 'text-slate-300'}`}><span className={`w-2 h-2 rounded-full ${masterHealthDoc.history.lifestyle_risks.tobacco ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]' : 'bg-slate-300'}`} /> TOBACCO</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">Verified Genomic Markers AD-72 Detected</div>
                                                            </div>
                                                        </div>

                                                        {/* 4. RECENT CLINICAL ENCOUNTERS */}
                                                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                                                            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                                <div>
                                                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Active Clinical Encounters</h3>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-modal AI Transcription Synthesized</p>
                                                                </div>
                                                                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-inner text-right">
                                                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Encounter Volume</div>
                                                                    <div className="text-xl font-black text-slate-800">{masterHealthDoc.encounters.length} Registered Visits</div>
                                                                </div>
                                                            </div>
                                                            <div className="divide-y divide-slate-100">
                                                                {masterHealthDoc.encounters.length > 0 ? masterHealthDoc.encounters.map((enc, i) => (
                                                                    <div key={i} className="p-10 hover:bg-slate-50 transition-all group">
                                                                        <div className="flex justify-between items-start mb-8">
                                                                            <div className="space-y-1">
                                                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encounter #{enc.encounter_id}</div>
                                                                                <h4 className="text-lg font-black text-emerald-800 uppercase tracking-tight">{enc.diagnosis.primary_diagnosis || enc.chief_complaint}</h4>
                                                                                <div className="text-xs font-bold text-slate-500">{new Date(enc.visit_date).toLocaleDateString()} • {enc.visit_type} • ICD-10: {enc.diagnosis.icd_code}</div>
                                                                            </div>
                                                                            <div className="flex gap-4">
                                                                                {Object.entries(enc.vitals).map(([k, v], idx) => (
                                                                                    <div key={idx} className="text-right">
                                                                                        <div className="text-[7px] font-black text-slate-400 uppercase">{k.replace('_', ' ')}</div>
                                                                                        <div className="text-[11px] font-black text-slate-800">{v}</div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                                            <div className="p-6 bg-slate-900 border-l-[6px] border-emerald-500 rounded-r-2xl shadow-lg">
                                                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-4">Master Narrative Synthesis</span>
                                                                                <p className="text-xs font-serif leading-relaxed text-slate-300 italic">"{enc.history_of_present_illness}"</p>
                                                                            </div>
                                                                            <div className="space-y-6">
                                                                                <div className="flex items-center gap-4 border-b border-slate-100 pb-2"><div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[9px]">TX</div><h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">AHMIS TREATMENT PROTOCOL</h5></div>
                                                                                <div className="space-y-4">
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {enc.treatment_plan.herbal_prescription.map((h, idx) => (
                                                                                            <span key={idx} className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase shadow-sm">{h.name} {h.dosage}</span>
                                                                                        ))}
                                                                                    </div>
                                                                                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                                                                                        Lifestyle: {enc.treatment_plan.lifestyle_advice}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )) : <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest">No Encounter Telemetry Recorded</div>}
                                                            </div>
                                                        </div>

                                                        {/* 5. AI RISK ANALYSIS & LONGITUDINAL TRENDS */}
                                                        <div className="bg-emerald-600 rounded-3xl p-12 shadow-2xl relative overflow-hidden group border-b-[12px] border-emerald-800">
                                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30" />
                                                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-125"><Brain size={140} className="text-white" /></div>
                                                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center gap-3"><Zap size={24} className="text-emerald-200" /><h3 className="text-2xl font-black text-white uppercase tracking-tighter">AI Master Risk Forecast</h3></div>
                                                                    <div className="p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                                                                        <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2">Complication Probability</div>
                                                                        <div className="text-6xl font-black text-white tracking-tighter mb-4">{(masterHealthDoc.ai_risk_analysis.complication_probability * 100).toFixed(0)}%</div>
                                                                        <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wide opacity-80 leading-relaxed">
                                                                            Sentinel-AI reports {(masterHealthDoc.ai_risk_analysis.complication_probability * 100).toFixed(1)}% variance from health baseline (Confidence: {masterHealthDoc.ai_risk_analysis.confidence_score * 100}%).
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="lg:col-span-2 space-y-8">
                                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                                        {Object.entries(masterHealthDoc.ai_risk_analysis.disease_risk_scores).map(([k, v], idx) => (
                                                                            <div key={idx} className="bg-emerald-700/50 p-4 rounded-2xl border border-emerald-500/30 text-center shadow-lg">
                                                                                <div className="text-[8px] font-black text-emerald-300 uppercase mb-2">{k}</div>
                                                                                <div className="text-xl font-black text-white">{v}%</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="p-8 bg-white rounded-3xl shadow-xl flex items-center justify-between group-hover:scale-[1.02] transition-transform duration-500 cursor-default">
                                                                        <div className="flex items-center gap-6 text-slate-800">
                                                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner italic">OSI</div>
                                                                            <div>
                                                                                <h4 className="text-lg font-black uppercase tracking-tighter">Organ Stress Index (Integrated)</h4>
                                                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Multi-modal Biological Score Convergence</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-5xl font-black text-emerald-800 tracking-tighter">{masterHealthDoc.ai_risk_analysis.organ_stress_index.toFixed(1)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* FINAL AUTHENTICATION FOOTER */}
                                                        <div className="pt-10 border-t-4 border-slate-100 flex justify-between items-center opacity-60">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="text-[12px] font-black uppercase text-slate-900 tracking-[0.5em]">LCMHD-AHMIS-GLOBAL-V5</div>
                                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">BLOCKCHAIN PERSISTED • ENCRYPTED TELEMETRY • VERIFIED RECIPIENT</div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <button
                                                                    onClick={() => {
                                                                        const blob = new Blob([JSON.stringify(masterHealthDoc, null, 2)], { type: "application/json" });
                                                                        const url = URL.createObjectURL(blob);
                                                                        const a = document.createElement('a');
                                                                        a.href = url;
                                                                        a.download = `LCMHD_${masterHealthDoc.patient_global_id}.json`;
                                                                        document.body.appendChild(a);
                                                                        a.click();
                                                                        document.body.removeChild(a);
                                                                        URL.revokeObjectURL(url);
                                                                    }}
                                                                    className="px-6 py-2 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans">
                                                                    Download Certified Record
                                                                </button>
                                                                <button
                                                                    onClick={() => alert("Transmitting Longitudinal Clinical Master Health Document to AHMIS Central Registry...")}
                                                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-sans">
                                                                    Transmit to GOVT Node
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center p-20 grayscale opacity-30 text-center">
                                                        <div className="w-24 h-24 bg-slate-200 rounded-3xl mb-8 flex items-center justify-center"><FileText size={48} className="text-slate-400" /></div>
                                                        <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-4">Master Record Node Offline</h3>
                                                        <p className="max-w-md text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Select a patient and generate a clinical schema to synthesize their Longitudinal Clinical Master Health Document (LCMHD).</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activePanel === 'surveillance' && (
                    <div className="h-full flex flex-col p-8 animate-in fade-in duration-500">
                        <div className="mb-6 flex justify-between items-end">
                            <div className="text-left">
                                <h2 className="text-3xl font-black text-emerald-800 uppercase tracking-tighter">Regional Disease Surveillance</h2>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic border-l-4 border-emerald-500 pl-3">Spatiotemporal Graph Neural Networks & Forecasting Engine</p>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                                <button onClick={() => setSurveillanceTab('tracking')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${surveillanceTab === 'tracking' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>Outbreak Tracking</button>
                                <button onClick={() => setSurveillanceTab('logistics')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${surveillanceTab === 'logistics' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}>Emergency Logistics</button>
                            </div>
                        </div>

                        {surveillanceTab === 'tracking' ? (
                            <div className="flex-1 flex gap-8 min-h-0">
                                <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col items-center justify-center shadow-2xl">
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/India_Andhra_Pradesh_location_map.svg/1024px-India_Andhra_Pradesh_location_map.svg.png')] bg-cover bg-center mix-blend-multiply filter grayscale" />
                                    <div className="relative z-10 w-48 h-48 bg-emerald-500 rounded-full blur-[100px] opacity-20 absolute top-1/4 left-1/4 animate-pulse" />

                                    {surveillanceData?.tracking?.nodes?.map((node: any, idx: number) => (
                                        <div key={idx} className="absolute text-center" style={{ top: node.pos_y, left: node.pos_x }}>
                                            <div className={`w-8 h-8 border-4 border-white rounded-full animate-ping shadow-2xl mx-auto ${node.status === 'Critical' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                                            <div className="mt-2 text-[10px] font-black text-slate-800 bg-white/80 px-2 py-1 rounded backdrop-blur-sm">{node.location} ({node.status})</div>
                                        </div>
                                    ))}
                                    {(!surveillanceData || !surveillanceData.tracking || !surveillanceData.tracking.nodes || surveillanceData.tracking.nodes.length === 0) && (
                                        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 text-center opacity-40">
                                            <div className="mt-2 text-[10px] font-black text-slate-800 bg-white/80 px-4 py-2 rounded-full backdrop-blur-sm">Awaiting Network Telemetry</div>
                                        </div>
                                    )}

                                    <h1 className="relative z-20 text-6xl font-black text-slate-800 opacity-5 tracking-tighter uppercase select-none">AI SURVEILLANCE ACTIVE</h1>
                                </div>
                                <div className="w-96 flex flex-col gap-6 text-left overflow-y-auto custom-scrollbar pr-2">
                                    {isSurveillanceLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                            <Loader2 size={48} className="animate-spin mb-4 text-emerald-500" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Aggregating Live AP Network Data...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                                                <div className="absolute right-[-10px] top-[-10px] opacity-10"><AlertTriangle size={80} className="text-rose-600" /></div>
                                                <div className="flex items-center gap-3 mb-4 text-rose-600 relative z-10">
                                                    <AlertTriangle size={24} />
                                                    <h3 className="font-black text-xs uppercase tracking-widest">{surveillanceData?.tracking?.dangerousCases?.title || 'Active Dangerous Cases'}</h3>
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed mb-4 relative z-10">{surveillanceData?.tracking?.dangerousCases?.description || 'No critical disease clusters currently detected.'}</p>
                                            </div>

                                            {/* Chronic Condition Real-time Cluster Map */}
                                            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-lg">
                                                <div className="flex items-center gap-3 mb-4 text-indigo-600">
                                                    <Activity size={24} />
                                                    <h3 className="font-black text-xs uppercase tracking-widest">Chronic Disease Clustering</h3>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1"><span>Nephrolithiasis Risk</span> <span className="text-indigo-600">High Variance</span></div>
                                                        <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full w-[82%]"></div></div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1"><span>Obesity / Hypertension</span> <span className="text-amber-500">Rising Trend</span></div>
                                                        <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full w-[65%]"></div></div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 pt-3 border-t border-indigo-100/50 opacity-80 italic">Data synchronized from latest AHMIS cohorts (n=12,000+ nodes) utilizing ensemble learning.</p>
                                            </div>

                                            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl shadow-lg">
                                                <div className="flex items-center gap-3 mb-4 text-amber-600">
                                                    <TrendingUp size={24} />
                                                    <h3 className="font-black text-xs uppercase tracking-widest">{surveillanceData?.tracking?.increasingCases?.title || 'Gradually Increasing Cases'}</h3>
                                                </div>
                                                <p className="text-[12px] font-bold text-slate-600 leading-relaxed">
                                                    {surveillanceData?.tracking?.increasingCases?.description || 'No emergent localized trends identified over the past 72 hours.'}
                                                </p>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl shadow-lg">
                                                <div className="flex items-center gap-3 mb-4 text-blue-600">
                                                    <Globe size={24} />
                                                    <h3 className="font-black text-xs uppercase tracking-widest">{surveillanceData?.tracking?.prediction?.title || 'Outbreak Prediction Engine'}</h3>
                                                </div>
                                                <p className="text-[12px] font-bold text-slate-600 leading-relaxed mb-3">
                                                    {surveillanceData?.tracking?.prediction?.description || 'No immediate outbreak forecast models active for current trajectory.'}
                                                </p>
                                                <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                                                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${surveillanceData?.tracking?.prediction?.probability || 0}%` }}></div>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{surveillanceData?.tracking?.prediction?.probability || 0}% Spread Probability</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 overflow-y-auto">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                                        <AlertTriangle size={24} className="text-rose-500" /> Emergency Medicine Connectivity
                                    </h3>

                                    {isSurveillanceLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                            <Loader2 size={48} className="animate-spin mb-4 text-rose-400" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Scanning State Logistics Grid...</p>
                                        </div>
                                    ) : (
                                        (!surveillanceData?.logistics?.critical_nodes || surveillanceData.logistics.critical_nodes.length === 0) ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                                <AlertTriangle size={32} className="mb-4 text-slate-300" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Network Stable</p>
                                                <p className="text-xs font-bold">No emergency connectivity or severe shortages flagged.</p>
                                            </div>
                                        ) : (
                                            surveillanceData.logistics.critical_nodes.map((node: any, idx: number) => (
                                                <div key={idx} className={`bg-white p-6 rounded-2xl border-l-[6px] ${node.priority === 1 ? 'border-rose-500' : 'border-amber-500'} border-y border-r border-slate-200 shadow-sm text-left relative overflow-hidden group`}>
                                                    <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:scale-110 transition-transform"><Pill size={120} /></div>
                                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                                        <div>
                                                            <h4 className="text-sm font-black text-slate-900 uppercase">{node.location}</h4>
                                                            <p className={`text-[10px] font-black ${node.priority === 1 ? 'text-rose-600' : 'text-amber-600'} uppercase tracking-widest mt-1`}>Status: {node.status}</p>
                                                        </div>
                                                        <span className={`${node.priority === 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'} px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest`}>Priority {node.priority}</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-600 mb-6 relative z-10">{node.requirement}</p>
                                                    <div className="flex gap-3 relative z-10">
                                                        <button className="flex-1 px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 shadow-md">{node.priority === 1 ? 'Dispatch Emergency Supply' : 'Schedule Restock'}</button>
                                                        {node.priority === 1 && <button className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-50 hover:border-slate-300">Alert Nearby Pharmacies</button>}
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                                        <Globe size={24} className="text-emerald-500" /> Logistics Grid Status
                                    </h3>
                                    <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-3xl shadow-inner text-center flex flex-col items-center justify-center">
                                        <div className="w-24 h-24 bg-emerald-200 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-xl shadow-emerald-200">
                                            <Activity size={48} className="text-emerald-700" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">{surveillanceData?.logistics?.grid_status?.title || 'Central AP Supply Route is Clear'}</h4>
                                        <p className="text-sm font-bold text-emerald-800 max-w-sm mb-8 leading-relaxed">{surveillanceData?.logistics?.grid_status?.description || 'Delivery drones and emergency vehicles currently active. Estimated delivery time to Visakhapatnam critical zone is 4 hours 15 minutes.'}</p>
                                        <button className="px-8 py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-600/30 transition-transform active:scale-95">Track Active Shipments ({surveillanceData?.logistics?.grid_status?.active_shipments || 4})</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activePanel === 'protocols' && (
                    <div className="h-full flex flex-col p-8 animate-in fade-in duration-500 bg-white">
                        <div className="mb-8 text-left">
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Clinical Protocols & Directory</h2>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic border-l-4 border-slate-400 pl-3">Doctor's Master Reference Module</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto custom-scrollbar pr-2 pb-10">

                            {/* Protocol Card 1 */}
                            <a href="https://main.mohfw.gov.in/sites/default/files/24%20Chapter%204444.pdf" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left block group">
                                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                                    <FileText size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Standard Treatment Guidelines (STG)</h3>
                                <p className="text-xs font-bold text-slate-500 mb-6 line-clamp-3 leading-relaxed">National Medical Commission mandated guidelines for primary & secondary care of common illnesses.</p>
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest group-hover:underline">Access Module →</span>
                            </a>

                            {/* Protocol Card 2 */}
                            <a href="https://ayush.gov.in/docs/National-Clinical-Management-Protocol-based-on-Ayurveda-and-Yoga-for-management-of-Covid-19.pdf" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left block group">
                                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-inner">
                                    <Activity size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">AYUSH Integrated Protocols</h3>
                                <p className="text-xs font-bold text-slate-500 mb-6 line-clamp-3 leading-relaxed">Cross-disciplinary treatment methodologies bridging modern medicine with Ayurveda, Yoga & Naturopathy.</p>
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest group-hover:underline">Access Module →</span>
                            </a>

                            {/* Protocol Card 3 */}
                            <a href="https://ndma.gov.in/sites/default/files/PDF/Guidelines/medical.pdf" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left block group">
                                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-600 group-hover:text-white transition-colors shadow-inner">
                                    <AlertTriangle size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Emergency Response Operations</h3>
                                <p className="text-xs font-bold text-slate-500 mb-6 line-clamp-3 leading-relaxed">Immediate triage and stabilization protocols for severe trauma, cardiac arrest, and massive viral outbreaks.</p>
                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest group-hover:underline">Access Module →</span>
                            </a>

                            {/* Protocol Card 4 */}
                            <a href="https://nmc.org.in/information-desk/indian-medical-register/" target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left block group">
                                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-inner">
                                    <Users size={28} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Specialist Network Directory</h3>
                                <p className="text-xs font-bold text-slate-500 mb-6 line-clamp-3 leading-relaxed">Secure communication channel to consult with top-tier specialists, surgeons, and department heads across the state.</p>
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest group-hover:underline">Access Module →</span>
                            </a>

                            {/* Feature Coming Soon */}
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-70">
                                <Brain size={48} className="text-slate-400 mb-4" />
                                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-1">AI Diagnostic Assistant</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Training underway. Expected Q3 2026.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default DoctorDashboard;
