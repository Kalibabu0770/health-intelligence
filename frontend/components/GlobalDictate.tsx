import React, { useState, useEffect, useRef } from 'react';
import { Mic, Check, X, Loader2, Globe } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { transcribeAudio } from '../services/ai';

const GlobalDictate: React.FC = () => {
    const { language } = usePatientContext();
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastFocusedInput, setLastFocusedInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const triggerSelectorRef = useRef<string | null>(null);

    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                setLastFocusedInput(target as any);
            }
        };

        const listenToGlobalTrigger = (e: any) => {
            let foundInput = null;

            if (e.detail?.selector) {
                triggerSelectorRef.current = e.detail.selector;
                foundInput = document.querySelector(e.detail.selector);
            } else {
                triggerSelectorRef.current = null;
            }

            if (!foundInput && e.detail?.target) {
                const triggerNode = e.detail.target as HTMLElement;
                // Find nearest input or textarea by traversing up to common parent
                let container = triggerNode.parentElement;
                while (container && !foundInput) {
                    foundInput = container.querySelector('input, textarea');
                    if (foundInput) break;
                    container = container.parentElement;
                }
            }
            if (foundInput) setLastFocusedInput(foundInput as any);

            startDictation();
        };

        document.addEventListener('focusin', handleFocusIn);
        window.addEventListener('start-global-dictation', listenToGlobalTrigger);

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('start-global-dictation', listenToGlobalTrigger);
        };
    }, [language]); // Depend on language so the closure has the latest language

    const startDictation = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("HTTPS required");
            }

            // Layer 1: Best-effort Real-Time Chrome API for instant UI feedback
            const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionAPI) {
                try {
                    const recognition = new SpeechRecognitionAPI();
                    recognitionRef.current = recognition;

                    const getBcp47Code = (lang: string) => {
                        const map: Record<string, string> = {
                            'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN', 'mr': 'mr-IN',
                            'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'zh': 'zh-CN', 'ja': 'ja-JP',
                            'ar': 'ar-SA', 'ru': 'ru-RU', 'pt': 'pt-BR', 'en': 'en-IN'
                        };
                        return map[lang] || 'en-IN';
                    };

                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = getBcp47Code(language);

                    recognition.onresult = (event: any) => {
                        let finalTxt = '';
                        let interimTxt = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTxt += event.results[i][0].transcript;
                            } else {
                                interimTxt += event.results[i][0].transcript;
                            }
                        }
                        const text = (finalTxt + " " + interimTxt).trim();
                        if (text) setTranscript(text);
                    };

                    recognition.onerror = (e: any) => {
                        console.warn("Real-time UI Speech error (suppressed, relying on Whisper backend):", e.error);
                    };

                    recognition.start();
                } catch (e) {
                    console.warn("Could not start real-time layer", e);
                }
            }

            // Layer 2: Secure Robust Whisper Media Recorder
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstart = () => {
                setIsListening(true);
                setTranscript(transcript || 'Listening... Speak now.');
            };

            mediaRecorder.onstop = async () => {
                setIsListening(false);
                setIsProcessing(true);
                if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) { }
                }
                setTranscript('AI Guardian perfecting analysis via Whisper Backend...');

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                try {
                    const text = await transcribeAudio(audioBlob, language);
                    setTranscript(text); // PERFECT transcription overrides the realtime interim
                } catch (error) {
                    console.error("Transcription Error:", error);
                    setTranscript("Failed to transcribe via AI. Connection error.");
                } finally {
                    setIsProcessing(false);
                }

                // Release the mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
        } catch (error) {
            console.warn("Mic Access Error:", error);
            setIsListening(false);
            setTranscript('Microphone Data Blocked: Please ensure you are running on an HTTPS connection or localhost, and that your browser has allowed Microphone Permissions for this site.');
            mediaRecorderRef.current = null;
        }
    };

    const handleFinishRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
    };

    const handleConfirm = () => {

        // Find the input to paste into
        const activeDom = document.activeElement;
        let targetNode = lastFocusedInput;

        if (activeDom && (activeDom.tagName === 'INPUT' || activeDom.tagName === 'TEXTAREA')) {
            targetNode = activeDom as any;
        }

        if (transcript && transcript !== 'Listening...') {

            // Broadcast the result system-wide for custom components to catch
            window.dispatchEvent(new CustomEvent('global-dictation-result', {
                detail: { text: transcript, selector: triggerSelectorRef.current }
            }));

            if (targetNode) {
                // Update the value natively and dispatch a React syntethic event equivalent
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                )?.set;

                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype,
                    "value"
                )?.set;

                const setter = targetNode.tagName === 'TEXTAREA' ? nativeTextAreaValueSetter : nativeInputValueSetter;

                if (setter) {
                    // Append text if there's already some, or just replace
                    const currentValue = targetNode.value || '';
                    const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;

                    setter.call(targetNode, newValue);
                    const ev2 = new Event('input', { bubbles: true });
                    targetNode.dispatchEvent(ev2);
                    const ev3 = new Event('change', { bubbles: true });
                    targetNode.dispatchEvent(ev3);
                } else {
                    // Fallback
                    targetNode.value += (targetNode.value ? ' ' : '') + transcript;
                    targetNode.dispatchEvent(new Event('input', { bubbles: true }));
                    targetNode.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                // If no target node, copy to clipboard if supported
                if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(transcript).catch(e => console.warn(e));
                }
            }
        }

        closeDictation();
    };

    const handleCancel = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        closeDictation();
    };

    const closeDictation = () => {
        setIsListening(false);
        setIsProcessing(false);
        setTranscript('');
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
    };

    return (
        <>

            {/* The Dictation Action Bar Overlay */}
            {(isListening || transcript || isProcessing) && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 pointer-events-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] w-full max-w-2xl text-slate-100 flex flex-col animate-in zoom-in-95 fade-in duration-300">

                        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-800">
                            <div className="relative">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                                    {isProcessing ? <Loader2 size={28} className="animate-spin" /> : <Mic size={28} className={isListening ? "animate-pulse" : ""} />}
                                </div>
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white tracking-wide">
                                    {isProcessing ? 'AI Whisper Transcription...' : 'AI Guardian Listening...'}
                                </h3>
                                <div className="flex items-center gap-2 mt-2 h-4">
                                    {isListening ? (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isProcessing ? 'PROCESSING AUDIO DATA' : 'RECORDING STOPPED'}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Live Text Area */}
                        <div className="min-h-[160px] w-full text-2xl font-light text-slate-300 font-sans mb-8 break-words leading-relaxed overflow-hidden">
                            {transcript || <span className="opacity-30 italic">Awaiting voice input...</span>}
                        </div>

                        {/* Professional Action Buttons */}
                        <div className="flex items-center gap-4 mt-auto">
                            <button
                                onClick={handleCancel}
                                disabled={isProcessing}
                                className="flex-1 h-14 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all active:scale-95 shadow-sm disabled:opacity-50"
                            >
                                <X size={20} /> CANCEL
                            </button>

                            {isListening ? (
                                <button
                                    onClick={handleFinishRecording}
                                    className="flex-1 h-14 bg-rose-600 text-white rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-rose-500 transition-all active:scale-95 shadow-lg"
                                >
                                    <Mic size={20} /> FINISH SPEAKING
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirm}
                                    disabled={!transcript || transcript.includes('Listening...') || isProcessing}
                                    className="flex-1 h-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-lg disabled:opacity-20 disabled:grayscale"
                                >
                                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} INSERT TEXT
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalDictate;
