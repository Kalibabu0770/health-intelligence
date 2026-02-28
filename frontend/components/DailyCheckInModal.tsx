import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const DailyCheckInModal: React.FC<{ onClose: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
    const { t, logDailyCheckIn } = usePatientContext();
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
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t.session_complete || 'Session Complete'}!</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{t.daily_vitals_saved || 'Your daily vitals & mood have been saved.'}</p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 px-6 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 transition-all"
                >{t.check_in_again || 'Check In Again'}</button>
            </div>
        );
    }

    const content = (
        <div className={`p-8 space-y-6 ${embedded ? '' : 'max-h-[70vh] overflow-y-auto custom-scrollbar'}`}>
            {/* Mood Selection */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.mood_select || "Select your mood"}</p>
                <div className="grid grid-cols-3 gap-4">
                    {['Happy', 'Neutral', 'Sad'].map(m => (
                        <button
                            key={m}
                            onClick={() => setMood(m)}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mood === m ? 'bg-emerald-50 border-emerald-500 shadow-sm font-black' : 'bg-slate-50 border-slate-100'}`}
                        >
                            <span className="text-2xl">{m === 'Happy' ? '😊' : m === 'Neutral' ? '😐' : '😔'}</span>
                            <span className="text-[10px] font-black uppercase">{m === 'Happy' ? (t.mood_happy || 'Happy') : m === 'Neutral' ? (t.mood_neutral || 'Neutral') : (t.mood_sad || 'Sad')}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Day Description */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t.describe_day || "How was your day?"}</p>
                <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 resize-none h-24"
                    placeholder={t.talk_about_day || "Talk about your day..."}
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
                    placeholder={t.symptom_placeholder || "e.g. Mild headache, slightly tired"}
                    value={symptomText}
                    onChange={e => setSymptomText(e.target.value)}
                />
            </div>

            <button
                onClick={handleSubmit}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs rounded-xl shadow-xl active:scale-95 transition-all"
            >
                {t.log_daily_status || t.submit_checkin || "Log Daily Status"}
            </button>

            {!embedded && (
                <button
                    onClick={onClose}
                    className="w-full py-2 text-[10px] font-black uppercase text-slate-300 hover:text-slate-400 transition-colors"
                >
                    {t.dismiss_for_now || "Dismiss for now"}
                </button>
            )}
        </div>
    );


    if (embedded) {
        return (
            <div className="p-8">
                <div className="bg-emerald-600 p-8 text-white relative rounded-t-[2.5rem]">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Heart size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{t.daily_checkin || "Daily Health Check-in"}</p>
                    <h2 className="text-2xl font-black leading-tight italic">{t.how_is_health || "How is your day like?"}</h2>
                </div>
                {content}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60  animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="bg-emerald-600 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Heart size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{t.daily_checkin || "Daily Health Check-in"}</p>
                    <h2 className="text-2xl font-black leading-tight italic">{t.how_is_health || "How is your day like?"}</h2>
                </div>
                {content}
            </div>
        </div>
    );
};

export default DailyCheckInModal;
