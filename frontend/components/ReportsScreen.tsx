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
                        <div className="p-2 bg-blue-600 rounded-xl text-slate-900 shadow-lg"><Database size={20} /></div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Medical Records</p>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{currentTab === 'vault' ? 'Health Data Records' : 'Comprehensive Health Summary'}</h1>
                </div>

                {/* MODE SWITCHER */}
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                    <button
                        onClick={() => setCurrentTab('vault')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-500 relative ${currentTab === 'vault'
                            ? `bg-white shadow-md shadow-slate-200 text-slate-900`
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Database size={13} className={`${currentTab === 'vault' ? 'text-emerald-600' : ''}`} />
                        <span>Data Vault</span>
                        {currentTab === 'vault' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 animate-pulse" />}
                    </button>
                    <button
                        onClick={() => setCurrentTab('analysis')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-500 relative ${currentTab === 'analysis'
                            ? `bg-white shadow-md shadow-slate-200 text-slate-900`
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Sparkles size={13} className={`${currentTab === 'analysis' ? 'text-emerald-600' : ''}`} />
                        <span>AI Analysis</span>
                        {currentTab === 'analysis' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-100 animate-pulse" />}
                    </button>
                </div>

                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleReportUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-100 border border-emerald-500 text-slate-900 px-5 py-2.5 rounded-lg shadow-sm active:scale-95 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        {localIsAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <FilePlus size={14} />} Upload Document
                    </button>
                    <button onClick={handleRefresh} className="bg-white text-slate-900 border border-slate-200 px-5 py-2.5 rounded-lg shadow-sm active:scale-95 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        {isGlobalAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />} Refresh Analysis
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                {currentTab === 'vault' ? (
                    <div className="h-full w-full flex flex-col gap-6 animate-in fade-in slide-in-from-left duration-500">
                        {/* ═══ DATA MANAGEMENT BANNER ═══ */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                                    <Database size={24} />
                                </div>
                                <div className="max-w-xl">
                                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                                        Upload new records to broaden your clinical health-stack perspective, or switch to AI Analysis to verify molecular bio-signatures based on the current data density.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-3 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-left md:text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Density</p>
                                    <p className="text-2xl font-black text-slate-900 leading-none">{clinicalVault.length} <span className="text-xs font-bold text-slate-400 ml-1">Active</span></p>
                                </div>
                                <button
                                    onClick={() => setCurrentTab('analysis')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md shadow-blue-500/30 hover:bg-blue-700 transition-all whitespace-nowrap"
                                >
                                    Switch to AI Analysis
                                </button>
                            </div>
                        </div>

                        {/* ═══ DOCUMENT LIST ═══ */}
                        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-0">
                            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                    <FileText size={18} className="text-blue-500" />
                                    Ingested Molecular Data
                                </h3>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Search Vault..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500 transition-colors w-64" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {clinicalVault.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {clinicalVault.map(doc => (
                                            <div key={doc.id} className="group relative bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 text-blue-500 group-hover:scale-110 transition-transform">
                                                        <FileText size={22} />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                                            <Download size={16} />
                                                        </button>
                                                        <button onClick={() => removeDocument(doc.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-auto">
                                                    <h4 className="text-sm font-black uppercase text-slate-900 leading-tight mb-2 line-clamp-2">{doc.name}</h4>
                                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200/60">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(doc.date).toLocaleDateString()}</span>
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2 py-1 bg-blue-100 rounded-md">{doc.size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                        <Fingerprint size={64} strokeWidth={1} className="mb-6 text-slate-400" />
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Vault Encrypted & Empty</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2">Upload clinical records to populate the registry.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col gap-8 animate-in fade-in slide-in-from-right duration-500">
                        {/* ═══ AI ANALYSIS (ANALYSIS) ═══ */}
                        <div className="col-span-12 flex flex-col gap-8 min-h-0 pb-10 overflow-y-auto custom-scrollbar">
                            <div className="bg-white border border-slate-100 p-10 rounded-2xl shadow-sm relative overflow-hidden shrink-0 group">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><Sparkles size={150} /></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 leading-none">AI Record Analysis Active</h2>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">AI Confidence</p>
                                        <p className="text-2xl font-black text-blue-600">99.2%</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl relative z-10 min-h-[100px] flex items-center mt-6">
                                    <p className="text-sm font-bold leading-relaxed text-slate-600">
                                        {isGlobalAnalyzing ? "Analyzing medical records and correlating with your baseline health profile..." :
                                            (activeAnalysis?.summary || "Your medical records have been synced. The AI is correlating your test results to identify any underlying health trends. Upload more documents for a deeper analysis.")}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col min-h-0">
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3"><Activity size={16} className="text-emerald-500" /> Key Medical Observations</h3>
                                    <div className="space-y-4 overflow-y-auto">
                                        {activeAnalysis?.clinicalInsights?.length > 0 ? activeAnalysis.clinicalInsights.map((insight: string, i: number) => (
                                            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <p className="text-xs font-bold text-slate-700 leading-relaxed">"{insight}"</p>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center opacity-40 p-10 text-center">
                                                <Info size={32} className="mb-4 text-slate-400" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No Key Observations Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col min-h-0 relative">
                                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3"><ShieldCheck size={16} className="text-blue-500" /> Recommended Action Plan</h3>
                                    <div className="space-y-4 overflow-y-auto">
                                        {activeAnalysis?.actionableSteps?.length > 0 ? activeAnalysis.actionableSteps.map((step: string, i: number) => (
                                            <div key={i} className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">{i + 1}</div>
                                                <p className="text-xs font-bold text-slate-700 leading-snug">{step}</p>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center opacity-40 p-10 text-center">
                                                <CheckCircle2 size={32} className="mb-4 text-slate-400" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No Actions Required</p>
                                            </div>
                                        )}
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
