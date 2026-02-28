import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Mic, Loader2, Sparkles, ShieldCheck, Fingerprint } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { getAIPersonalAssistantResponse } from '../services/ai';
import { startListening } from '../services/speech';

const PersonalAssistant: React.FC<{ onClose: () => void, analysis?: any, epidemiology?: any }> = ({ onClose, analysis, epidemiology }) => {
    const context = usePatientContext();
    const { profile, riskScores, t, language } = context;
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
        {
            role: 'model',
            text: t.assistant_greeting ? t.assistant_greeting.replace('{name}', profile?.name?.split(' ')[0] || '') : `Hello ${profile?.name?.split(' ')[0] || 'there'}! I am your AI Health Guardian. How can I assist you today?`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
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
            setMessages(p => [...p, { role: 'model', text: t.assistant_error || "I'm currently recalibrating my neural links. Please try again or visit our specific health modules." }]);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading]);

    return (
        <div className="fixed bottom-6 right-6 w-[95vw] sm:w-[420px] h-[600px] max-h-[85vh] z-[1000] bg-white flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-500 shadow-[0_40px_100px_-15px_rgba(15,23,42,0.25)] rounded-[2.5rem] overflow-hidden border border-slate-100 ring-4 ring-slate-50/50">

            {/* Header: Mission Control Aesthetic */}
            <div className="bg-emerald-600 px-8 py-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                        <Bot size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-sm text-white uppercase tracking-tight leading-none">{t.ai_health_guardian || 'AI Health Guardian'}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5 font-black uppercase text-[8px] text-emerald-500 tracking-widest">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {t.secure_link_active || 'Secure Link Active'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center bg-white/5 text-white hover:bg-white/10 rounded-xl transition-all active:scale-90"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Chat Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {m.role === 'model' && (
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mr-3 shrink-0 shadow-sm">
                                <Bot size={14} />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-5 rounded-[1.8rem] text-[12px] font-bold leading-relaxed shadow-sm ${m.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mr-3 shrink-0"><Bot size={14} /></div>
                        <div className="bg-white p-5 rounded-[1.5rem] rounded-tl-none border border-slate-100 flex gap-1.5 items-center">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Node */}
            <div className="p-6 bg-white border-t border-slate-50 shrink-0">
                <div className="relative group/input">
                    <input
                        type="text"
                        className="w-full bg-slate-50 border-2 border-slate-100 p-5 pr-24 rounded-2xl font-black text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-300 placeholder:uppercase"
                        placeholder={t.ask_me_anything || "Ask me anything about your health..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                if (isListening) return;
                                setIsListening(true);
                                startListening(language, (text) => setInput(text), () => setIsListening(false));
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 shadow-sm transition-all active:scale-95 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-emerald-600'}`}
                        >
                            <Mic size={18} />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="w-10 h-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all hover:bg-emerald-700"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-3 opacity-20">
                    <ShieldCheck size={10} className="text-emerald-600" />
                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-400">{t.encrypted_ai_protocol || 'Encrypted AI Protocol • G20 Secure'}</p>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default PersonalAssistant;
