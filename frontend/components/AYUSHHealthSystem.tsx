import React, { useState, useEffect } from 'react';
import {
    Globe, Brain, Activity, Zap, FileText, MapPin,
    UserCircle, TrendingUp, ShieldCheck, AlertTriangle, Shield, Loader2,
    ChevronRight, CheckCircle2, Fingerprint, Leaf, Navigation, Crosshair, Radar
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { usePatientContext } from '../core/patientContext/patientStore';
import { AP_GOVT_HIERARCHY } from '../core/patientContext/apHierarchy';
import { db } from '../services/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

const AYUSHHealthSystem: React.FC = () => {
    const context = usePatientContext();
    const { profile, t, language } = context;
    const [mainTab, setMainTab] = useState<'wisdom' | 'surveillance'>('wisdom');
    const [activeTab, setActiveTab] = useState<'public' | 'officer'>(profile?.role === 'officer' ? 'officer' : 'public');
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [fDistrict, setFDistrict] = useState('All');
    const [fMandal, setFMandal] = useState('All');

    const userLocation = profile?.location || 'Unknown Sector';
    const localSafety = globalStats?.riskZones?.find((z: any) => z.name.toLowerCase().includes(userLocation.toLowerCase()));

    useEffect(() => {
        const fetchGlobalData = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'users'));
                const snap = await getDocs(q);
                let users = snap.docs.map(d => d.data());

                if (fDistrict !== 'All') {
                    users = users.filter((u: any) => u.location?.includes(fDistrict));
                }

                const total = users.length;
                const healthy = users.filter((u: any) =>
                    !u.hasDiabetes && !u.hasHighBP && !u.hasLiverDisease &&
                    !u.hasKidneyDisease && !u.hasHeartDisease && !u.hasAsthma
                ).length;

                const ageDist = [
                    { name: 'U25', value: users.filter((u: any) => u.age < 25).length },
                    { name: '25-50', value: users.filter((u: any) => u.age >= 25 && u.age < 50).length },
                    { name: '50+', value: users.filter((u: any) => u.age >= 50).length },
                ];

                const locMap: Record<string, any> = {};
                users.forEach((u: any) => {
                    const loc = u.location || 'Remote Sector';
                    if (!locMap[loc]) locMap[loc] = { name: loc, fever: 0, chronic: 0, total: 0 };
                    locMap[loc].total++;
                    if (u.hasAsthma || (u.conditions?.some((c: any) => c.name.toLowerCase().includes('fever')))) locMap[loc].fever++;
                    if (u.hasDiabetes || u.hasHeartDisease || u.hasHighBP || u.hasLiverDisease) locMap[loc].chronic++;
                });

                const riskZones = Object.values(locMap).map((l: any) => {
                    const acuteRisk = (l.fever / l.total) * 100;
                    const chronicRisk = (l.chronic / l.total) * 100;
                    const combinedRisk = (acuteRisk * 0.6) + (chronicRisk * 0.4);

                    let status = t.status_stable || 'SAFE';
                    let color = 'emerald';
                    let advice = t.optimal_stability || '✓ OPTIMAL STABILITY';

                    if (combinedRisk > 35) {
                        status = t.critical_sector || 'CRITICAL SECTOR';
                        color = 'rose';
                        advice = t.extreme_burden || '✖ EXTREME HEALTH BURDEN';
                    }
                    else if (combinedRisk > 15) {
                        status = t.sensitive_area || 'SENSITIVE AREA';
                        color = 'amber';
                        advice = t.monitor_biometrics || '! MONITOR BIOMETRICS';
                    }
                    return { ...l, risk: combinedRisk, acuteRisk, chronicRisk, status, color, advice };
                });

                setGlobalStats({
                    totalUsers: total,
                    healthyRatio: total > 0 ? (healthy / total) * 100 : 0,
                    ageGroups: ageDist,
                    locationTrends: riskZones.sort((a, b) => b.total - a.total).slice(0, 5),
                    riskZones: riskZones.sort((a, b) => b.risk - a.risk),
                    rawUsers: users.slice(0, 10)
                });
            } catch (err) {
                console.error("AYUSH Data Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalData();
    }, [fDistrict, fMandal, t]);

    const renderWisdom = () => (
        <div className="h-full w-full grid grid-cols-12 gap-5 animate-in fade-in duration-500 pb-6">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-lg relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><Leaf size={140} className="text-emerald-600" /></div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><Leaf size={20} /></div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 italic">{t.ancient_wisdom || 'Heritage Wisdom Matrix'}</h2>
                        <p className="text-[11px] font-bold leading-relaxed text-slate-400 uppercase italic max-w-xl">
                            {t.ayush_desc || 'Century-old AYUSH protocols synchronized with IndiaAI. Botanical deployments and lifestyle alignments for homeostasis.'}
                        </p>
                        <div className="flex gap-3">
                            <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all">{t.pharmacopoeia || 'Pharmacopoeia'}</button>
                            <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">{t.ai_alignment || 'AI Alignment'}</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    {[
                        { title: t.dinacharya || 'Dinacharya', desc: t.daily_rhythm || 'Daily Bio-Rhythm', icon: Activity, color: 'blue', grad: 'from-blue-500/10 to-transparent' },
                        { title: t.ritucharya || 'Ritucharya', desc: t.seasonal_protocols || 'Seasonal Protocols', icon: Globe, color: 'emerald', grad: 'from-emerald-500/10 to-transparent' }
                    ].map((card, i) => (
                        <div key={i} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.grad} opacity-0 group-hover:opacity-100 transition-opacity`} />
                            <div className={`w-10 h-10 rounded-xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center mb-4 border border-${card.color}-100 group-hover:scale-110 transition-transform`}><card.icon size={20} /></div>
                            <h4 className="text-base font-black uppercase text-slate-900 leading-none">{card.title}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
                {/* LOCAL SAFETY SHIELD ANALYSIS */}
                <div className={`rounded-[2rem] p-8 text-white shadow-xl space-y-6 relative overflow-hidden flex-1 flex flex-col justify-between transition-all duration-700 ${localSafety?.color === 'rose' ? 'bg-rose-600' : localSafety?.color === 'amber' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                    <div className="absolute -top-5 -right-5 p-4 opacity-10"><Brain size={100} /></div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Radar className="animate-pulse" size={18} />
                                <h3 className="text-sm font-black uppercase tracking-widest italic">{t.sattva_intel || 'Local Safety Shield'}</h3>
                            </div>
                            <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">
                                <p className="text-[8px] font-black uppercase tracking-widest">{t.live_intel || 'Live'}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{t.current_location || 'Current Sector'}</p>
                            <h4 className="text-2xl font-black uppercase tracking-tight italic leading-none">{userLocation}</h4>
                        </div>

                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">{localSafety?.status || t.stable_node || 'STABLE NODE'}</p>
                                    <p className="text-[8px] font-bold uppercase opacity-70 tracking-tight">{localSafety?.advice || t.location_safe || 'Regional biometrics optimal'}</p>
                                </div>
                            </div>

                            <p className="text-[11px] font-bold leading-relaxed opacity-90 uppercase italic">
                                {localSafety?.color === 'rose'
                                    ? `"${t.high_risk_advice || 'Atmospheric bio-load in focal sector is extreme. Avoid congregant zones and initialize Sattvic shield.'}"`
                                    : `"${t.sattva_intelligence_note || 'Molecular density stable. Tulsi-Ginger titration recommended for preemptive bio-shielding.'}"`
                                }
                            </p>
                        </div>
                    </div>

                    <button className="w-full bg-white text-slate-900 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest mt-6 hover:scale-[1.02] active:scale-95 transition-all shadow-lg relative z-10">
                        {t.deploy_ai_protocol || 'Analyze Safety Protocol'}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderSurveillance = () => (
        <div className="h-full w-full flex flex-col gap-5 animate-in slide-in-from-bottom-5 duration-700 pb-6">
            {activeTab === 'public' ? (
                <div className="grid grid-cols-12 gap-5">
                    {/* RISK ZONE RADAR SECTION */}
                    <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">
                        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col shadow-xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 italic flex items-center gap-3">
                                        <Navigation size={20} className="text-emerald-600" />
                                        {t.biometric_safety_zones || 'Biometric Safety Zones'}
                                    </h2>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{t.geospatial_risk_triage || 'Real-time Geospatial Risk Triage'}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    <Crosshair size={12} className="text-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t.live_scanning || 'Live Scanning'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(globalStats?.riskZones || []).slice(0, 4).map((zone: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-2xl border flex flex-col gap-3 group transition-all hover:scale-[1.02] ${zone.color === 'emerald' ? 'bg-emerald-50/30 border-emerald-100' :
                                        zone.color === 'amber' ? 'bg-amber-50/30 border-amber-100' : 'bg-rose-50/30 border-rose-100'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase truncate max-w-[120px]">{zone.name}</p>
                                                <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 text-${zone.color}-600`}>{zone.status}</p>
                                            </div>
                                            <div className={`p-1.5 rounded-lg bg-${zone.color}-500/10 text-${zone.color}-600`}><MapPin size={14} /></div>
                                        </div>
                                        <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                            <div className={`h-full bg-${zone.color}-500 transition-all duration-1000`} style={{ width: `${Math.max(5, (100 - zone.risk))}%` }} />
                                        </div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            {zone.advice}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-lg flex-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">{t.regional_analytics || 'Regional Symptom Load Analytics'}</h3>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={globalStats?.locationTrends || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                        <Bar dataKey="fever" name={t.risk_load || "Risk Load"} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="chronic" name={t.density || "Density"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: t.population || 'Population', val: globalStats?.totalUsers || 0, color: 'blue', icon: Activity },
                                { label: t.stability || 'Stability', val: globalStats?.healthyRatio.toFixed(1) || 0, color: 'emerald', icon: ShieldCheck }
                            ].map((kpi, i) => (
                                <div key={i} className="bg-white p-5 rounded-[1.8rem] border border-slate-100 shadow-md flex flex-col gap-3">
                                    <div className={`w-8 h-8 rounded-lg bg-${kpi.color}-500/10 text-${kpi.color}-500 flex items-center justify-center`}><kpi.icon size={16} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                                        <p className="text-xl font-black text-slate-900 leading-none">{kpi.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-lg flex-1 flex flex-col items-center justify-center text-center">
                            <h4 className="text-[9px] font-black uppercase text-slate-400 mb-6 tracking-widest w-full text-left">{t.bio_demographics || 'Bio-Demographics'}</h4>
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={globalStats?.ageGroups || []} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={8} dataKey="value" stroke="none">
                                            {globalStats?.ageGroups?.map((entry: any, i: number) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b'][i % 3]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-4">
                                {['U25', '25-50', '50+'].map((l, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${['bg-emerald-500', 'bg-blue-500', 'bg-amber-500'][i]}`} />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col shadow-xl overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                                <Fingerprint size={16} className="text-emerald-600" />
                                {t.node_telemetry_registry || 'Node Telemetry Registry'}
                            </h3>
                            <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-[8px] font-black text-slate-400 border border-slate-100 uppercase tracking-widest">{t.live_sync || 'LIVE SYNC'}</div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar max-h-[350px]">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white z-10 border-b border-slate-50">
                                    <tr>
                                        <th className="py-3 text-[8px] font-black uppercase text-slate-400 tracking-widest px-3">{t.identity_mapping || 'Identity Mapping'}</th>
                                        <th className="py-3 text-[8px] font-black uppercase text-slate-400 tracking-widest px-3 text-center">{t.risk_level || 'Risk Level'}</th>
                                        <th className="py-3 text-[8px] font-black uppercase text-slate-400 tracking-widest px-3 text-center">{t.status || 'Status'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(globalStats?.rawUsers || []).map((user: any, i: number) => (
                                        <tr key={i} className="group hover:bg-slate-50 transition-all cursor-pointer">
                                            <td className="py-4 px-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                        <UserCircle size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">{user.name || t.anon_node || 'ANON_NODE'}</p>
                                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{user.location || t.remote_sector || 'REMOTE SECTOR'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-3 text-center">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${user.role === 'officer' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {t.stable || 'STABLE'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-3 text-center">
                                                <div className="w-1.5 h-1.5 mx-auto rounded-full bg-emerald-500 animate-pulse" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 space-y-5 shadow-lg relative overflow-hidden group h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><Zap size={120} /></div>
                            <div className="space-y-4 relative z-10">
                                <div className="bg-emerald-600 p-3 rounded-2xl w-fit shadow-lg shadow-emerald-500/20"><Zap size={20} className="text-white" /></div>
                                <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 italic">{t.rapid_response_protocol || 'Rapid Response Protocol'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed italic">
                                    {t.cluster_alert || `Detected cluster variations in ${fDistrict}. Deployment of sattvic kits authorized.`}
                                </p>
                                <button className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg uppercase text-[9px] tracking-widest hover:bg-emerald-700 transition-all">{t.initiate_deployment || 'Initiate Deployment'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={`h-full w-full flex flex-col overflow-hidden bg-slate-100/30 font-sans p-6 gap-5 animate-in fade-in duration-500`}>
            {/* ═══ GOVERNMENT HEADER ═══ */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-5 flex flex-col lg:flex-row justify-between items-center shadow-lg shrink-0 gap-5">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20"><Globe size={24} /></div>
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest">{t.ap_govt_node || 'AP STATE GOVT'}</span>
                            <span className="bg-blue-500 text-white px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest">{t.bio_sentinel || 'BIO-SENTINEL'}</span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">{t.pop_surveillance || 'Population Surveillance'}</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">{t.innovation_stack || 'IndiaAI Innovation Stack • V4.8'}</p>
                    </div>
                </div>

                {/* MAIN MODE SWITCHER */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setMainTab('wisdom')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mainTab === 'wisdom' ? `bg-white shadow-md text-emerald-600` : 'text-slate-400'}`}>
                        <Leaf size={12} /> <span>{t.wisdom_hub || 'Wisdom Hub'}</span>
                    </button>
                    <button onClick={() => setMainTab('surveillance')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mainTab === 'surveillance' ? `bg-white shadow-md text-indigo-600` : 'text-slate-400'}`}>
                        <Zap size={12} /> <span>{t.surveillance || 'Surveillance'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {mainTab === 'surveillance' && (
                        <>
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                {['public', 'officer'].map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>{t[tab] || tab}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg shadow-md">
                                <MapPin size={12} className="text-emerald-500" />
                                <select className="bg-transparent border-none outline-none text-[8px] font-black uppercase tracking-widest text-slate-900" value={fDistrict} onChange={(e) => setFDistrict(e.target.value)}>
                                    <option value="All">{t.districts || 'Districts'}</option>
                                    {Object.keys(AP_GOVT_HIERARCHY).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-emerald-600" size={32} />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.syncing_matrix || 'Syncing Matrix...'}</p>
                    </div>
                ) : mainTab === 'wisdom' ? renderWisdom() : renderSurveillance()}
            </div>

            <div className="shrink-0 h-10 bg-white border-t border-slate-200 px-6 flex justify-between items-center rounded-b-xl">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded-md"><CheckCircle2 size={10} /></div>
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none">{t.g20_secured || 'G20 Health Stack Secured'}</p>
                </div>
                <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none">{t.security_protocol_active || 'Security Protocol 992-B Active'}</p>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 3px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
        </div>
    );
};

export default AYUSHHealthSystem;
