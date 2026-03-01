import React, { useState } from 'react';
import { Microscope, Search, Globe, Library, Zap, Filter, ArrowRight, ShieldCheck, Beaker, CheckCircle } from 'lucide-react';

interface PhytoCandidate {
    id: string;
    organism: string;
    commonName: string;
    convergence_score: number;
    tms_systems: string[];
    compounds: string[];
    indication_match: string;
}

const PharosResearchPortal: React.FC = () => {
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<PhytoCandidate[] | null>(null);

    const handlePharosSearch = () => {
        if (!query) return;
        setIsSearching(true);
        // MOCK DATA based on the patent examples (Migraine, Pain, Piper)
        setTimeout(() => {
            const mockResults: PhytoCandidate[] = [
                {
                    id: '1',
                    organism: 'Piper nigrum',
                    commonName: 'Black Pepper',
                    convergence_score: 98,
                    tms_systems: ['Ayurveda', 'TCM', 'Unani', 'Kampo', 'Hildegard'],
                    compounds: ['Piperine', 'Chavicine', 'Guineensine'],
                    indication_match: 'Migraine / Neuralgic Pain'
                },
                {
                    id: '2',
                    organism: 'Glycyrrhiza uralensis',
                    commonName: 'Licorice Root',
                    convergence_score: 85,
                    tms_systems: ['Ayurveda', 'TCM', 'Kampo', 'Egyptian'],
                    compounds: ['Glycyrrhizin', 'Isoliquiritigenin'],
                    indication_match: 'Inflammatory Pain'
                },
                {
                    id: '3',
                    organism: 'Paeonia lactiflora',
                    commonName: 'Peony',
                    convergence_score: 72,
                    tms_systems: ['TCM', 'Kampo', 'Korean'],
                    compounds: ['Paeoniflorin', 'Albiflorin'],
                    indication_match: 'Vascular Migraine'
                }
            ];
            setResults(mockResults);
            setIsSearching(false);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col p-8 bg-white overflow-hidden text-left">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <Microscope size={36} className="text-emerald-600" />
                        PhAROS Research Portal
                    </h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Phytomedicine Analytics for Research Optimization at Scale
                    </p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                    <Library size={20} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Unified Meta-Pharmacopeia v4.2
                    </span>
                </div>
            </div>

            {/* Search Engine Layer */}
            <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl border-b-8 border-slate-800 mb-8">
                <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} /> Transcultural Indication Dictionary Query
                    </span>
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Enter indication (e.g., Migraine, Chronic Pain, Anxiety)..."
                                className="w-full bg-slate-800 border border-slate-700 p-4 pl-12 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-emerald-500 transition-all shadow-inner"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        </div>
                        <button
                            onClick={handlePharosSearch}
                            disabled={isSearching}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSearching ? <span className="animate-spin">🌀</span> : "Run Convergence Scan"}
                        </button>
                    </div>
                    <div className="flex gap-4 mt-2">
                        {['Global', 'South Asia', 'East Asia', 'Historical Europe', 'Amazonian'].map(reg => (
                            <label key={reg} className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" defaultChecked className="hidden" />
                                <div className="w-3 h-3 border border-slate-600 rounded-sm group-hover:border-emerald-500 bg-slate-700" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-emerald-400 font-mono">{reg}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Analysis Results */}
            <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
                {/* Convergence Matrix */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={16} /> Convergence Analysis Summary
                        </h4>
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"><Filter size={16} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {!results && !isSearching && (
                            <div className="h-64 border-4 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                                <Microscope size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-black uppercase tracking-widest opacity-30">Awaiting Query Initialization</p>
                            </div>
                        )}

                        {results && results.map(item => (
                            <div key={item.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all border-l-8 border-l-emerald-500 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-slate-800 tracking-tighter truncate">{item.organism}</h3>
                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">[{item.commonName}]</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest italic">{item.indication_match}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-2xl font-black text-slate-900 tracking-tighter">{item.convergence_score}%</div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Convergence Score</span>
                                    </div>
                                </div>

                                <div className="mb-6 flex flex-wrap gap-2">
                                    {item.tms_systems.map(s => (
                                        <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                                            {s}
                                        </span>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Minimal Essential Compounds</span>
                                        <div className="flex flex-wrap gap-1">
                                            {item.compounds.map(c => (
                                                <span key={c} className="text-[10px] font-bold text-slate-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-end">
                                        <button className="flex items-center gap-2 group-hover:gap-4 transition-all text-xs font-black uppercase tracking-widest text-emerald-600">
                                            View Pathway Map <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Polypharmacy Optimization Panel */}
                <div className="w-96 flex flex-col gap-6 min-h-0">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col h-full">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
                                <Beaker size={20} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Polypharmacy Proposer</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ML-Optimized Formulation Designs</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 underline">Candidate Formulation A-7</h5>
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-[11px] font-bold"><span>Piperine (P. nigrum)</span> <span className="text-emerald-600">45 mg</span></div>
                                    <div className="flex justify-between text-[11px] font-bold"><span>Isoliquiritigenin</span> <span className="text-emerald-600">120 mg</span></div>
                                    <div className="flex justify-between text-[11px] font-bold"><span>Gingerols (Z. officinale)</span> <span className="text-emerald-600">30 mg</span></div>
                                </div>
                                <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Predicted Efficacy</span>
                                        <div className="text-lg font-black text-slate-900 tracking-tighter">Goldilocks Stable</div>
                                    </div>
                                    <button className="bg-slate-900 text-white p-2 rounded-lg hover:bg-emerald-600 transition-all"><ShieldCheck size={16} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <button className="w-full bg-slate-100 text-slate-400 py-3 rounded-2xl border-2 border-dashed border-slate-300 text-[10px] font-black uppercase tracking-widest hover:border-emerald-300 hover:text-emerald-600 transition-all">
                                + Add Custom Substitution Matrix
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PharosResearchPortal;
