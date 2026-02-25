import React, { useState, useEffect } from 'react';
import {
    Mic,
    Brain,
    Activity,
    AlertCircle,
    ChevronRight,
    ShieldCheck,
    Leaf,
    Wind,
    CheckCircle2,
    ArrowLeft,
    Layers,
    Sparkles,
    MessageSquare,
    ArrowRight
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import {
    getDiagnosticQuestions,
    getDiagnosticAdvice,
    getAyurvedicClinicalStrategy
} from '../services/ai';
import { startListening } from '../services/speech';

interface Question {
    id: string;
    text: string;
    options?: string[];
}

interface AnalysisResult {
    severity: 'low' | 'moderate' | 'high' | 'critical';
    assessment: string;
    differential_diagnosis: Array<{
        condition: string;
        likelihood: string;
        specialist: string;
    }>;
    ayurvedic_strategy: {
        dosha_impact: string;
        herbal_recommendations: string[];
        dietary_pathya: string[];
        lifestyle_vihaar: string[];
        pranayama: string[];
    };
    red_flags: string[];
}

const StructuredSymptomChecker: React.FC = () => {
    const patientContext = usePatientContext();
    const { language, t } = patientContext;

    const [stage, setStage] = useState<'input' | 'processing' | 'questions' | 'review' | 'synthesizing' | 'result'>('input');
    const [resultPage, setResultPage] = useState<number>(0);

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const handleStartTriage = async () => {
        if (!input.trim()) return;
        setStage('processing');
        try {
            const res = await getDiagnosticQuestions(patientContext as any, input);
            const questionList = res?.questions || res || [];
            // Support for different formats from AI
            const normalizedQuestions = questionList.map((q: any) => ({
                id: q.id || q.question || q.text,
                text: q.text || q.question || "",
                options: q.options || []
            })).filter((q: any) => q.text.length > 0);

            setQuestions(normalizedQuestions);
            setStage('questions');
        } catch (error) {
            console.error('Triage questions error:', error);
            setStage('input');
        }
    };

    const handleAnswer = (answer: string) => {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return;

        setAnswers(prev => ({ ...prev, [currentQ.id]: answer }));

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setStage('review');
        }
    };

    const executeSynthesis = async () => {
        setStage('synthesizing');

        // Minimum duration for UX
        const startTime = Date.now();

        try {
            const formattedAnswers = Object.entries(answers).map(([id, ans]) => {
                const q = questions.find(q => q.id === id);
                return {
                    qId: id,
                    question: q?.text || id,
                    answer: ans
                };
            });

            const [clinicalAdvice, ayushStrategy] = await Promise.all([
                getDiagnosticAdvice(patientContext as any, input, formattedAnswers),
                getAyurvedicClinicalStrategy(patientContext as any, input, formattedAnswers)
            ]);

            // Robust Fallback Logic for Real-time Display
            const complaintLower = input.toLowerCase();
            const symptomFallbacks: any = {
                fever: {
                    dosha: "Pitta-Vata Jwara",
                    herbs: ["Guduchi (Giloy): 500mg twice daily", "Sudarshan Vati: 1 tablet after meals", "Tulsi Ghan Vati: 1 tablet daily"],
                    diet: ["Warm rice gruel (Peya)", "Mung dal soup", "Pomegranate juice", "Avoid spicy/oily foods"],
                    yoga: ["Savasana (Corpse Pose)", "Sheetali Pranayama"],
                    mind: ["Bed rest in cool environment", "Yoga Nidra"]
                },
                pain: {
                    dosha: "Vata Aggravation / Shoola",
                    herbs: ["Yograj Guggulu: 1 tablet twice daily", "Shunti (Ginger) powder: 1g with honey"],
                    diet: ["Warm, freshly cooked meals", "Sesame oil in diet", "Avoid cold water"],
                    yoga: ["Bhadrasana", "Vajrasana"],
                    mind: ["Nadi Shodhana", "Warm compress meditation"]
                },
                default: {
                    dosha: "Tridosic Alignment",
                    herbs: ["Triphala: 1 tsp at bedtime", "Amalaki: 500mg daily"],
                    diet: ["Satvik pathya", "Warm water", "Seasonal fruits"],
                    yoga: ["Tadasana", "Surya Namaskar"],
                    mind: ["Silent meditation", "Deep breathing"]
                }
            };

            const activeFallback = (complaintLower.includes('fev') || complaintLower.includes('hot')) ? symptomFallbacks.fever :
                (complaintLower.includes('pain') || complaintLower.includes('ache')) ? symptomFallbacks.pain : symptomFallbacks.default;

            // Helper to get array data even if AI returns empty or wrong keys
            const getValidArray = (aiData: any, primaryKey: string, secondaryKey: string, fallback: string[]) => {
                const data = aiData?.[primaryKey] || aiData?.[secondaryKey];
                return (Array.isArray(data) && data.length > 0) ? data : fallback;
            };

            const finalResult: AnalysisResult = {
                severity: (clinicalAdvice?.severity?.toLowerCase() || 'moderate') as any,
                assessment: clinicalAdvice?.assessment || "Clinical assessment pending further nodes.",
                differential_diagnosis: (clinicalAdvice?.possibleDiagnoses || []).map((d: any) => ({
                    condition: d.condition || "Unknown Condition",
                    likelihood: d.likelihood || "Moderate",
                    specialist: clinicalAdvice?.specialistSuggestion || 'General Physician'
                })),
                red_flags: clinicalAdvice?.redFlags || [],
                ayurvedic_strategy: {
                    dosha_impact: ayushStrategy?.dosha_insight || ayushStrategy?.dosha_impact || activeFallback.dosha,
                    herbal_recommendations: getValidArray(ayushStrategy, 'chikitsa', 'herbs', activeFallback.herbs).map((c: any) => {
                        if (typeof c === 'string') return c;
                        return `${c.NAME || c.name || 'Herb'}: ${c.DOSAGE || c.dosage || 'Standard dose'}`;
                    }),
                    dietary_pathya: (ayushStrategy?.ahar?.['PATHYA (Inclusions)'] || ayushStrategy?.ahar?.pathya || ayushStrategy?.diet || activeFallback.diet).map((f: any) => {
                        if (typeof f === 'string') return f;
                        return f.SPECIFIC_FOODS || f.specific_foods || f.food || f.toString();
                    }),
                    lifestyle_vihaar: getValidArray(ayushStrategy, 'vihaar', 'lifestyle', activeFallback.yoga).map((v: any) => {
                        if (typeof v === 'string') return v;
                        return v.ASANA || v.asana || v.activity || v.toString();
                    }),
                    pranayama: getValidArray(ayushStrategy, 'satwa', 'mind', activeFallback.mind).map((s: any) => {
                        if (typeof s === 'string') return s;
                        return s.PRANAYAMA || s.pranayama || s.technique || s.toString();
                    })
                }
            };

            // Ensure minimal animation time
            const elapsed = Date.now() - startTime;
            if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

            setAnalysis(finalResult);
            setStage('result');
            setResultPage(0);
        } catch (error) {
            console.error('Core clinical synthesis failed:', error);
            setStage('review');
        }
    };

    const resetTriage = () => {
        setStage('input');
        setInput('');
        setAnswers({});
        setCurrentQuestionIndex(0);
        setAnalysis(null);
        setResultPage(0);
    };

    const handleVoiceInput = () => {
        setIsListening(true);
        startListening(language, (text) => {
            setInput(text);
            setIsListening(false);
        }, () => setIsListening(false));
    };

    const renderInputStage = () => (
        <div className="h-full flex flex-col p-8">
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full animate-in fade-in zoom-in-95 duration-700">
                <div className="w-20 h-20 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center mb-8">
                    <Brain size={42} className="text-blue-600" />
                </div>

                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight text-center">
                    {t.clinical_intel_hub}
                </h2>
                <p className="text-slate-500 font-medium mb-12 text-center uppercase tracking-widest text-[10px]">
                    {t.bio_analysis_protocol}
                </p>

                <div className="w-full relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative bg-white border border-slate-200 rounded-[2.2rem] p-3 shadow-2xl shadow-slate-200/50">
                        <textarea
                            className="w-full bg-transparent border-none focus:ring-0 text-lg p-6 min-h-[160px] text-slate-800 placeholder:text-slate-300 font-medium resize-none"
                            placeholder={t.describe_symptoms}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />

                        <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-[1.8rem] border border-slate-100">
                            <button
                                onClick={handleVoiceInput}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200' : 'bg-white text-slate-400 hover:text-blue-600 hover:shadow-md border border-slate-200'}`}
                            >
                                <Mic size={20} />
                            </button>

                            <button
                                onClick={handleStartTriage}
                                disabled={!input.trim()}
                                className="bg-slate-900 hover:bg-blue-600 disabled:opacity-20 disabled:hover:bg-slate-900 text-white px-8 h-12 rounded-2xl font-black flex items-center gap-3 transition-all duration-500 hover:gap-5 group"
                            >
                                {t.initialize_protocol}
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex gap-12 opacity-40">
                    <div className="flex flex-col items-center">
                        <ShieldCheck size={18} className="mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Secured</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Brain size={18} className="mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Neural v2</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Activity size={18} className="mb-2" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Real-time</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderQuestionsStage = () => {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return null;
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

        return (
            <div className="h-full flex flex-col p-8 max-w-3xl mx-auto w-full animate-in slide-in-from-right-8 duration-500">
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Captured Node {currentQuestionIndex + 1} of {questions.length}</span>
                        <span className="text-[11px] font-black text-slate-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-3xl font-black text-slate-900 leading-tight mb-12">
                        {currentQ.text}
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {currentQ.options && currentQ.options.length > 0 ? (
                            currentQ.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(option)}
                                    className="bg-white hover:bg-blue-50 border border-slate-200 p-6 rounded-[2rem] text-left text-lg font-bold text-slate-700 transition-all duration-300 hover:border-blue-300 hover:scale-[1.01] shadow-sm hover:shadow-xl hover:shadow-blue-100 flex items-center justify-between group"
                                >
                                    {option}
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ArrowRight size={18} />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    id="manual-answer"
                                    className="w-full bg-white border border-slate-200 rounded-[2rem] p-6 text-lg font-medium text-slate-800 min-h-[140px] focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                    placeholder={t.advanced_context}
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        const textarea = document.getElementById('manual-answer') as HTMLTextAreaElement;
                                        if (textarea) handleAnswer(textarea.value);
                                    }}
                                    className="w-full bg-slate-900 text-white h-16 rounded-[1.5rem] font-black tracking-widest uppercase text-xs hover:bg-blue-600 transition-colors shadow-xl"
                                >
                                    {t.next_step || 'Continue Capture'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderReviewStage = () => (
        <div className="h-full flex flex-col p-8 max-w-2xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mb-8">
                    <CheckCircle2 size={42} className="text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">
                    {t.synthesis_ready || 'Data Synthesis Ready'}
                </h3>
                <p className="text-slate-500 font-medium mb-10 max-w-md">
                    All clinical data nodes have been captured. Execute clinical synthesis for the hybrid diagnostic output.
                </p>

                <div className="w-full bg-slate-50 rounded-[2.5rem] p-8 text-left border border-slate-100 mb-10 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Manifest Summary</span>
                    <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 scrollbar-none">
                        <div className="flex items-start gap-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                            <p className="text-slate-700 font-bold text-sm">{input}</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">
                                {Object.keys(answers).length} follow-up points processed.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex w-full gap-4 mt-auto">
                    <button
                        onClick={() => {
                            setCurrentQuestionIndex(questions.length - 1);
                            setStage('questions');
                        }}
                        className="flex-1 h-16 rounded-[1.5rem] border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                    >
                        {t.go_back || 'Back'}
                    </button>
                    <button
                        onClick={executeSynthesis}
                        className="flex-[2] bg-slate-900 hover:bg-blue-600 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl shadow-slate-200"
                    >
                        {t.submit_analysis || 'Execute Synthesis'}
                        <Sparkles size={16} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProcessingStage = (title: string, sub: string) => (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white animate-in fade-in duration-500">
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse"></div>
                <div className="relative w-28 h-28 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-slate-100 rounded-[2.5rem]"></div>
                    <div className="absolute inset-0 border-2 border-blue-600 rounded-[2.5rem] border-t-transparent animate-spin"></div>
                    <Brain className="text-blue-600" size={42} />
                </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
                {title}
            </h3>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                {sub}
            </p>

            <div className="mt-12 space-y-4 w-72">
                {[0, 1, 2].map(i => (
                    <div key={i} className="h-1 bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 animate-shimmer" style={{ animationDelay: `${i * 200}ms` }} />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderResultStage = () => {
        if (!analysis) return null;

        const severityConfigs = {
            low: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            moderate: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            high: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            critical: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
        };
        const config = severityConfigs[analysis.severity] || severityConfigs.low;

        return (
            <div className="h-full flex flex-col overflow-hidden bg-white animate-in fade-in duration-700">
                {/* Header - Fixed pagination */}
                <div className="bg-white border-b border-slate-50 px-10 py-6 flex items-center justify-between shrink-0">
                    <button
                        onClick={resetTriage}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-2">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-500 ${resultPage === i ? 'w-10 bg-blue-600' : 'w-1.5 bg-slate-100'}`}
                            />
                        ))}
                    </div>

                    <div className="w-10" />
                </div>

                {/* Paginated Content Area - NO SCROLL */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {resultPage === 0 && (
                        <div className="flex-1 p-10 flex flex-col justify-center animate-in slide-in-from-right-8 duration-700">
                            <div className="max-w-4xl mx-auto w-full">
                                <span className={`inline-block px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-8 ${config.bg} ${config.color} border ${config.border}`}>
                                    {t.severity}: {analysis.severity}
                                </span>

                                <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
                                    {t.core_clinical_assessment}
                                </h2>

                                <div className="bg-slate-50 rounded-[3rem] p-10 relative overflow-hidden group hover:bg-white hover:shadow-2xl transition-all duration-700 border border-transparent hover:border-slate-100">
                                    <MessageSquare className="absolute -top-6 -left-6 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" size={160} />
                                    <p className="text-2xl font-medium text-slate-700 leading-relaxed italic relative z-10">
                                        "{analysis.assessment}"
                                    </p>
                                </div>

                                {analysis.red_flags.length > 0 && (
                                    <div className="mt-8 flex items-center gap-6 p-6 bg-rose-50 rounded-[2rem] border border-rose-100">
                                        <AlertCircle className="text-rose-500 shrink-0" size={28} />
                                        <div>
                                            <h4 className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">{t.red_flags}</h4>
                                            <p className="text-sm font-bold text-rose-800 leading-tight">
                                                {analysis.red_flags.join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {resultPage === 1 && (
                        <div className="flex-1 p-10 flex flex-col justify-center animate-in slide-in-from-right-8 duration-700">
                            <div className="max-w-4xl mx-auto w-full">
                                <h2 className="text-4xl font-black text-slate-900 mb-10 flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                        <Layers size={24} />
                                    </div>
                                    {t.differential_diagnosis_path}
                                </h2>

                                <div className="grid grid-cols-1 gap-4">
                                    {analysis.differential_diagnosis.map((item, idx) => (
                                        <div key={idx} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between shadow-sm hover:shadow-2xl transition-all group">
                                            <div className="flex items-center gap-6">
                                                <div className="text-4xl font-black text-slate-50 group-hover:text-blue-50 transition-colors">0{idx + 1}</div>
                                                <div>
                                                    <p className="text-2xl font-black text-slate-900 mb-1">{item.condition}</p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 px-3 py-1 bg-blue-50 rounded-lg">{item.specialist}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Target</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-black text-slate-900 italic tracking-tighter opacity-80">{item.likelihood}</p>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Confidence</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {resultPage === 2 && (
                        <div className="flex-1 px-8 py-4 flex flex-col animate-in slide-in-from-right-8 duration-700 overflow-hidden bg-slate-50/30">
                            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-4 shrink-0 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                            <Leaf size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic leading-none">{t.ayush_integrated_protocol || 'AYUSH Integrated Protocol'}</h2>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Clinical Ayurveda Node v4.1</p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-4 transition-all hover:bg-emerald-100/50">
                                        <div className="text-right">
                                            <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">{t.dosha_insight_label || 'DOSHA INSIGHT'}</p>
                                            <p className="text-sm font-black text-emerald-700 uppercase italic leading-none">{analysis.ayurvedic_strategy.dosha_impact.split(' ')[0]}</p>
                                        </div>
                                        <Activity className="text-emerald-500 animate-pulse" size={18} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 min-h-0 mb-4 overflow-y-auto custom-thin-scrollbar pr-1">
                                    {[
                                        { id: '01', title: t.herbal_chikitsa || 'Herbal Chikitsa', items: analysis.ayurvedic_strategy.herbal_recommendations, color: 'blue', icon: Wind },
                                        { id: '02', title: t.pathya_ahar || 'Pathya Ahar', items: analysis.ayurvedic_strategy.dietary_pathya, color: 'emerald', icon: Activity },
                                        { id: '03', title: t.yoga_vihaar || 'Yoga & Vihaar', items: analysis.ayurvedic_strategy.lifestyle_vihaar, color: 'amber', icon: Activity },
                                        { id: '04', title: t.pranayama_mind || 'Pranayama & Mind', items: analysis.ayurvedic_strategy.pranayama, color: 'indigo', icon: Sparkles }
                                    ].map(block => (
                                        <div key={block.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 flex flex-col shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden h-fit lg:h-full">
                                            <div className="flex items-center justify-between mb-4 shrink-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl bg-${block.color}-50 flex items-center justify-center text-${block.color}-600 border border-${block.color}-100/30 group-hover:scale-110 transition-transform`}>
                                                        {block.icon && <block.icon size={18} />}
                                                    </div>
                                                    <div>
                                                        <span className={`text-[7px] font-black text-${block.color}-400 uppercase tracking-widest block leading-none mb-1`}>Module {block.id}</span>
                                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none italic">{block.title}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                {block.items.length > 0 ? block.items.map((item, i) => (
                                                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-none hover:bg-white hover:shadow-sm transition-all group/item">
                                                        <div className={`w-1 h-1 rounded-full bg-${block.color}-400 mt-2 shrink-0 group-hover/item:scale-150 transition-transform`} />
                                                        <span className="text-[10px] font-bold text-slate-600 leading-tight uppercase italic">{item}</span>
                                                    </div>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center h-20 text-[8px] font-black text-slate-300 uppercase tracking-widest gap-2 opacity-30 italic">
                                                        Protocol Pending
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-900 rounded-[1.5rem] p-4 flex items-center justify-between shadow-xl shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400"><ShieldCheck size={16} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase italic leading-none">{t.clinical_threshold || 'CLINICAL THRESHOLD'}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">If symptoms escalate, initialize tier-1 medical consultation.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em]">Guardian Synced</p>
                                        <p className="text-[6px] font-black text-slate-600 uppercase mt-0.5">PROTOCOL 952-AYUSH</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="bg-white px-10 py-8 border-t border-slate-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
                        PHASE 0{resultPage + 1} / 03
                    </div>

                    <div className="flex gap-4">
                        {resultPage > 0 && (
                            <button
                                onClick={() => setResultPage(prev => prev - 1)}
                                className="h-14 px-8 rounded-2xl border-2 border-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all flex items-center gap-3"
                            >
                                <ArrowLeft size={16} />
                                {t.go_back || 'Back'}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (resultPage < 2) setResultPage(prev => prev + 1);
                                else resetTriage();
                            }}
                            className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] hover:bg-blue-600 transition-all flex items-center gap-3 shadow-2xl shadow-slate-200"
                        >
                            {resultPage < 2 ? (t.next_step || 'Next') : (t.start_new_triage || 'Exit')}
                            {resultPage < 2 && <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 py-2.5 text-center">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                        {t.ai_disclaimer}
                    </p>
                </div>
            </div>
        );
    };

    const HeartPulse = Activity; // Fallback icon
    const SparklesIcon = Sparkles;

    return (
        <div className="h-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <style>{`
                .custom-thin-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
            {stage === 'input' && renderInputStage()}
            {stage === 'processing' && renderProcessingStage(t.active_diagnosis_engine, "Targeting Diagnostic Nodes...")}
            {stage === 'questions' && renderQuestionsStage()}
            {stage === 'review' && renderReviewStage()}
            {stage === 'synthesizing' && renderProcessingStage(t.ai_synthesis_engine, t.synthesizing_community_data)}
            {stage === 'result' && renderResultStage()}
        </div>
    );
};

export default StructuredSymptomChecker;
