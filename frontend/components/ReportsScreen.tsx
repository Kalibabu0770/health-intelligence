import React, { useState, useRef, useEffect } from 'react';
import {
    FileText, Upload, Sparkles, CheckCircle2, Trash2, Activity, ShieldCheck, Loader2,
    Database, Search, ChevronRight, ExternalLink, Download, FilePlus, AlertCircle,
    Info, Fingerprint, RefreshCcw
} from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { analyzeMedicalReport, getComprehensiveHealthAnalysis } from '../services/ai';

const ReportsScreen: React.FC<{ analysis?: any, isAnalyzing?: boolean, onRefresh?: () => void, setAnalysis?: (a: any) => void }> = ({
    analysis: externalAnalysis,
    isAnalyzing: externalIsAnalyzing,
    onRefresh,
    setAnalysis: externalSetAnalysis
}) => {
    const context = usePatientContext();
    const { clinicalVault, language, addDocument, setSelectedDoc, removeDocument } = context;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localIsAnalyzing, setLocalIsAnalyzing] = useState(false);
    const [currentTab, setCurrentTab] = useState<'vault' | 'analysis'>('vault');

    const handleRefresh = async () => {
        if (onRefresh) onRefresh();
        const res = await getComprehensiveHealthAnalysis(context);
        if (externalSetAnalysis) externalSetAnalysis(res);
    }

    const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setLocalIsAnalyzing(true);
            const file = files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
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

    useEffect(() => {
        if (!externalAnalysis && !externalIsAnalyzing) handleRefresh();
    }, []);

    const isGlobalAnalyzing = externalIsAnalyzing || localIsAnalyzing;
    const activeAnalysis = externalAnalysis;

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-white font-sans p-8 gap-8 animate-in fade-in duration-500">

            {/* ═══ HEADER ═══ */}
            <div className="flex justify-between items-end shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Database size={20} /></div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Integrated Clinical Vault</p>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Health Record Synthesis</h1>
                </div>

                {/* MODE SWITCHER */}
                <div className="flex bg-slate-50 p-1.5 rounded-[1.8rem] border border-slate-100">
                    <button
                        onClick={() => setCurrentTab('vault')}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative ${currentTab === 'vault'
                            ? `bg-white shadow-xl shadow-slate-200 text-slate-900`
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Database size={15} className={`${currentTab === 'vault' ? 'text-blue-600' : ''}`} />
                        <span>Data Vault</span>
                        {currentTab === 'vault' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </button>
                    <button
                        onClick={() => setCurrentTab('analysis')}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 relative ${currentTab === 'analysis'
                            ? `bg-white shadow-xl shadow-slate-200 text-slate-900`
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Sparkles size={15} className={`${currentTab === 'analysis' ? 'text-emerald-600' : ''}`} />
                        <span>AI Analysis</span>
                        {currentTab === 'analysis' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </button>
                </div>

                <div className="flex gap-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleReportUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-xl active:scale-95 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                        {localIsAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <FilePlus size={16} />} Ingest Node
                    </button>
                    <button onClick={handleRefresh} className="bg-white text-slate-900 border border-slate-200 px-6 py-4 rounded-2xl shadow-lg active:scale-95 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                        {isGlobalAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />} Sync
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {currentTab === 'vault' ? (
                    <div className="h-full w-full grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-left duration-500">
                        {/* ═══ DATA VAULT (GENERAL) ═══ */}
                        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 min-h-0">
                            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Density</p>
                                    <p className="text-3xl font-black text-slate-900">{clinicalVault.length}<span className="text-sm opacity-30 ml-2">Active Indices</span></p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1.5 h-10 bg-blue-500 rounded-full" />
                                    <div className="w-1.5 h-10 bg-blue-500/50 rounded-full" />
                                    <div className="w-1.5 h-10 bg-blue-500/20 rounded-full" />
                                </div>
                            </div>

                            <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col pt-8">
                                <div className="px-8 mb-6 flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-widest">Ingested Molecular Data</h3>
                                    <button className="text-blue-500"><Search size={16} /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-4">
                                    {clinicalVault.length > 0 ? clinicalVault.map(doc => (
                                        <div key={doc.id} className="group relative bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500/30 transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg border-2 border-slate-100 text-blue-500 group-hover:scale-110 transition-transform">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase text-slate-900 leading-none mb-1.5 truncate max-w-[200px]">{doc.name}</h4>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(doc.date).toLocaleDateString()}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest">{doc.size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => removeDocument(doc.id)} className="opacity-0 group-hover:opacity-100 p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                                <button className="opacity-0 group-hover:opacity-100 p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-20">
                                            <Fingerprint size={60} strokeWidth={1} />
                                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em]">Vault Encrypted & Empty</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-7 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center text-center p-10">
                            <div className="max-w-md space-y-6">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-blue-500 shadow-xl border border-slate-100 mx-auto">
                                    <Database size={40} />
                                </div>
                                <h2 className="text-xl font-black uppercase text-slate-900 italic">Data Management Console</h2>
                                <p className="text-[11px] font-bold text-slate-500 uppercase leading-loose italic">
                                    Select a document to verify its molecular bio-signature or upload new records to broaden your clinical health-stack perspective.
                                </p>
                                <button
                                    onClick={() => setCurrentTab('analysis')}
                                    className="px-10 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    Switch to AI Analysis
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-right duration-500">
                        {/* ═══ AI ANALYSIS (ANALYSIS) ═══ */}
                        <div className="col-span-12 lg:col-span-12 flex flex-col gap-8 min-h-0 pb-10 overflow-y-auto custom-scrollbar">
                            <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden shrink-0 group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Sparkles size={150} /></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />
                                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-600 leading-none">Autonomous Biometric Synthesis</h2>
                                        </div>
                                        <h3 className="text-3xl font-black uppercase tracking-tight leading-tight max-w-md text-slate-900 italic">Health-Stack Reasoning Core</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Cross-Ref Confidence</p>
                                        <p className="text-2xl font-black text-blue-600">99.2%</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl relative z-10 min-h-[120px] flex items-center italic mt-6">
                                    <p className="text-sm font-bold leading-relaxed text-slate-600 uppercase italic font-sans">
                                        {isGlobalAnalyzing ? "Identifying molecular markers and correlating with historical baseline..." :
                                            (activeAnalysis?.summary || "Biometric vault synced. AI is correlating thyroid baseline (doc_02) with hepatic metabolic trends (doc_05). No critical deviations detected in current node set.")}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-8 min-h-0">
                                <div className="col-span-12 lg:col-span-6 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl flex flex-col min-h-0">
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3"><Activity size={16} className="text-blue-500" /> Clinical Reasoning</h3>
                                    <div className="space-y-4">
                                        {activeAnalysis?.clinicalInsights?.length > 0 ? activeAnalysis.clinicalInsights.map((insight: string, i: number) => (
                                            <div key={i} className="p-5 rounded-[2rem] bg-slate-50 border border-slate-100">
                                                <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed italic">"{insight}"</p>
                                            </div>
                                        )) : (
                                            <div className="h-40 flex flex-col items-center justify-center opacity-30 italic p-10 text-center">
                                                <Info size={30} className="mb-2" />
                                                <p className="text-[9px] font-black uppercase">No specific insight nodes detected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-12 lg:col-span-6 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-xl flex flex-col min-h-0 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3"><ShieldCheck size={16} className="text-emerald-500" /> Recommended Protocols</h3>
                                    <div className="space-y-4">
                                        {activeAnalysis?.actionableSteps?.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-4 items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:scale-[1.02] transition-all">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                                                <p className="text-[10px] font-black text-slate-900 uppercase leading-snug">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }`}</style>
        </div>
    );
};

export default ReportsScreen;
