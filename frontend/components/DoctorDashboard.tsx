import React, { useState } from 'react';
import { ShieldCheck, Search, Users, Mic, Activity, Globe, Brain, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

const DoctorDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    // 100vh NO SCROLLING layout
    const [activePanel, setActivePanel] = useState<'queue' | 'ehr' | 'treatment' | 'surveillance' | 'evidence'>('queue');
    const [isRecording, setIsRecording] = useState(false);
    const [ehrText, setEhrText] = useState("");

    // Seeded Dummy Data as requested by the prompt
    const patientQueue = [
        { id: 'AHIMS-KAL-821', name: 'Ramesh Reddy', risk: 'High', disease: 'Urolithiasis', pincode: '530001' },
        { id: 'AHIMS-SITA-114', name: 'Sita Devi', risk: 'Moderate', disease: 'Hypertension', pincode: '530045' },
        { id: 'AHIMS-BAL-99', name: 'Balaji K', risk: 'Low', disease: 'Obesity', pincode: '530022' },
    ];

    const MenuButton = ({ panel, icon: Icon, label }: any) => (
        <button
            onClick={() => setActivePanel(panel)}
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
                    <MenuButton panel="ehr" icon={Mic} label="Voice EHR Console" />
                    <MenuButton panel="treatment" icon={Activity} label="Treatment Planner" />
                    <MenuButton panel="surveillance" icon={Globe} label="Geo Surveillance" />
                    <MenuButton panel="evidence" icon={Brain} label="Clinical Evidence" />
                </div>

                <div className="mt-auto">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-rose-500 hover:text-rose-500 transition-all tracking-widest">
                        Terminate Session
                    </button>
                </div>
            </div>

            {/* Main Content Area (No Scrolling) */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-slate-100 h-full flex flex-col items-stretch overflow-hidden">
                {activePanel === 'queue' && (
                    <div className="h-full flex flex-col p-8 bg-white">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-tighter">Patient Intelligence Queue</h2>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Triage Prioritization</p>
                        </div>
                        <div className="flex-1 grid grid-cols-1 gap-4 content-start items-start">
                            {patientQueue.map((p, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.risk === 'High' ? 'bg-rose-100 text-rose-700' : p.risk === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            Risk: {p.risk}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase text-slate-800">{p.name}</h3>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{p.id} • Pincode: {p.pincode}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Diagnosis Alert</p>
                                            <p className="text-xs font-black uppercase text-slate-700">{p.disease}</p>
                                        </div>
                                        <button onClick={() => setActivePanel('ehr')} className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors">
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activePanel === 'ehr' && (
                    <div className="h-full flex flex-col p-8">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-tighter">Voice EHR Console</h2>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Multilingual Transcription to AHMIS Schema</p>
                            </div>
                            <button onClick={() => setIsRecording(!isRecording)} className={`flex items-center gap-3 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest text-white transition-all ${isRecording ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                                <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } })); }} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic size={18} /></span>
                                {isRecording ? 'Recording Active...' : 'Initialize Audio Capture'}
                            </button>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-8">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Transcription (English / Regional)</h3>
                                <textarea
                                    value={ehrText}
                                    onChange={(e) => setEhrText(e.target.value)}
                                    placeholder="Click the mic icon above to start speaking. Transcribed text will securely paste here..."
                                    className="flex-1 w-full h-full bg-transparent border-none resize-none focus:ring-0 outline-none text-sm text-slate-700 font-medium leading-relaxed italic content-start custom-scrollbar"
                                />
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Structured AHMIS Schema</h3>
                                {ehrText.length > 10 ? (
                                    <div className="space-y-4 animate-in fade-in duration-500 w-full h-full flex flex-col">
                                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs shadow-sm">
                                            <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Chief Complaint & History</span>
                                            {ehrText.substring(0, 100)}{ehrText.length > 100 ? '...' : ''}
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs shadow-sm">
                                            <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Extracted Symptoms</span>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase">Pain</span>
                                                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase">Discomfort</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs shadow-sm mt-auto">
                                            <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">Diagnosis Candidate</span>
                                            <span className="font-black text-emerald-700 uppercase">Under Review</span>
                                        </div>
                                        <button className="w-full mt-4 bg-emerald-600 text-white font-black text-[10px] uppercase py-3 rounded-lg hover:bg-emerald-700 tracking-widest shadow-md active:scale-95 transition-all">
                                            Commit to AHMIS Registry
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schema Pending Audio Input</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activePanel === 'surveillance' && (
                    <div className="h-full flex flex-col p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-tighter">Regional Disease Surveillance</h2>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Geospatial Clustering & Outbreak Forecasting</p>
                        </div>
                        <div className="flex-1 flex gap-8">
                            {/* Mock Heatmap */}
                            <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/India_Andhra_Pradesh_location_map.svg/1024px-India_Andhra_Pradesh_location_map.svg.png')] bg-cover bg-center mix-blend-multiply filter grayscale" />
                                <div className="relative z-10 w-20 h-20 bg-rose-500 rounded-full blur-2xl opacity-60 absolute top-1/3 left-1/3" />
                                <div className="relative z-10 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-40 absolute bottom-1/4 right-1/4" />
                                <div className="absolute top-1/3 left-1/3 w-4 h-4 bg-rose-600 border-2 border-white rounded-full animate-ping" />
                                <h1 className="relative z-20 text-4xl font-black text-slate-800 opacity-20 tracking-tighter uppercase">MAP GRID ONLINE</h1>
                            </div>

                            <div className="w-80 flex flex-col gap-4">
                                <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2 text-rose-600">
                                        <AlertTriangle size={18} />
                                        <h3 className="font-black text-xs uppercase tracking-widest">Surge Alert</h3>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700">Cluster of Viral Fever detected in Pincode 530001.</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">7-Day Trajectory: RISING</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-5 rounded-xl">
                                    <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest mb-3">Anomaly Explanation</h3>
                                    <p className="text-xs font-medium text-slate-600 mb-2">Anomalous 40% deviation in respiratory logs mapped against historical monsoon baseline. Confidence: 88%.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(activePanel === 'treatment' || activePanel === 'evidence') && (
                    <div className="h-full flex items-center justify-center text-center p-10">
                        <div className="max-w-md">
                            <Brain size={48} className="text-emerald-300 mx-auto mb-6" />
                            <h2 className="text-xl font-black text-emerald-800 uppercase tracking-tighter mb-2">Explainable AI Hub Online</h2>
                            <p className="text-xs font-medium text-slate-500 mb-6">RL-based treatment planner and evidence modules are securely synced to AHIMS datastores. Patient context required for module execution.</p>
                            <button onClick={() => setActivePanel('queue')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700">Return to Queue</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDashboard;
