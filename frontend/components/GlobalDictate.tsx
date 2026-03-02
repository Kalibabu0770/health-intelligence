import React, { useState, useEffect, useRef } from 'react';
import { Mic, Check, X, Loader2, Globe } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';
import { transcribeAudio } from '../services/ai';

const GlobalDictate: React.FC = () => {
    const { language } = usePatientContext();
    const [isVisible, setIsVisible] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastFocusedInput, setLastFocusedInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const triggerSelectorRef = useRef<string | null>(null);
    const isProxyRef = useRef<boolean>(false);

    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                setLastFocusedInput(target as any);
            }
        };

        const listenToGlobalTrigger = (e: any) => {
            let foundInput = null;
            isProxyRef.current = !!e.detail?.proxy;

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
        setIsVisible(true);
        setTranscript('');
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("HTTPS required");
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            let localTranscript = '';

            // Tier 1: Local Browser Engine (for real-time typing and offline fallback)
            const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionAPI) {
                try {
                    const rec = new SpeechRecognitionAPI();
                    rec.continuous = true;
                    rec.interimResults = true;

                    // Set language mapping for native engine
                    const langMap: Record<string, string> = {
                        'te': 'te-IN', 'hi': 'hi-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
                        'ml': 'ml-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'en': 'en-IN'
                    };
                    rec.lang = langMap[language] || 'en-US';

                    rec.onresult = (event: any) => {
                        let finalTxt = '';
                        let interimTxt = '';
                        for (let i = 0; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTxt += event.results[i][0].transcript;
                            } else {
                                interimTxt += event.results[i][0].transcript;
                            }
                        }
                        const txt = (finalTxt + " " + interimTxt).trim();
                        if (txt) {
                            localTranscript = txt;
                            setTranscript(txt); // UI feedback: Live Typing
                        }
                    };

                    rec.onstart = () => console.log("[SpeechRec] Native engine started");
                    rec.onerror = (e: any) => console.warn("[SpeechRec] Native error:", e.error);

                    rec.start();
                    recognitionRef.current = rec;
                } catch (e) {
                    console.warn("Native speech reco failed to initialize", e);
                }
            }

            // Tier 2: MediaRecorder for High-Fidelity Whisper AI
            // Detect supported types - Safari prefers mp4, Chrome prefers webm
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const supportedType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

            const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstart = () => {
                setIsListening(true);
                if (!localTranscript) setTranscript('Listening... Speak now.');
            };

            mediaRecorder.onstop = async () => {
                // Shut down local engine
                if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) { }
                }

                setIsListening(false);
                setIsProcessing(true);

                const fallbackText = localTranscript || '';
                setTranscript(fallbackText ? 'AI Guardian perfecting text...' : 'AI Guardian processing audio sync...');

                const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || 'audio/webm' });

                try {
                    // Send to Whisper (Cloud or Local backend)
                    const text = await transcribeAudio(audioBlob, language);

                    if (text && text.trim().length > 0) {
                        setTranscript(text);
                    } else if (fallbackText) {
                        setTranscript(fallbackText); // Use local browser result if AI returned empty
                    } else {
                        setTranscript("Failed to transcribe. Please try speaking closer to the mic.");
                    }
                } catch (error) {
                    console.error("Cloud/Backend Transcription Failed:", error);
                    // Critical fallback: Use the local browser speech recognition text
                    if (fallbackText) {
                        setTranscript(fallbackText);
                    } else {
                        setTranscript("Transcription Engine Unreachable. Use manual input or check connection.");
                    }
                } finally {
                    setIsProcessing(false);
                }

                // Release the mic lock
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording
            mediaRecorder.start(1000);

        } catch (error) {
            console.warn("Universal Mic Access Error:", error);
            setIsListening(false);
            setTranscript('Microphone Data Blocked: Please enable Microphone Permissions in your browser settings.');
            mediaRecorderRef.current = null;
        }
    };

    const handleFinishRecording = () => {
        console.log("[GlobalDictate] Finishing recording...");
        try {
            setIsListening(false);
            setIsProcessing(true);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        } catch (error) {
            console.error("[GlobalDictate] Error during finish recording:", error);
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        console.log("[GlobalDictate] Confirming transcription result...");
        try {
            let targetNode = lastFocusedInput;

            if (triggerSelectorRef.current) {
                const el = document.querySelector(triggerSelectorRef.current);
                if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    targetNode = el as any;
                }
            }

            if (!targetNode) {
                const activeDom = document.activeElement;
                if (activeDom && (activeDom.tagName === 'INPUT' || activeDom.tagName === 'TEXTAREA')) {
                    targetNode = activeDom as any;
                }
            }

            if (transcript && transcript !== 'Listening...') {

                // Broadcast the result system-wide for custom components to catch
                window.dispatchEvent(new CustomEvent('global-dictation-result', {
                    detail: { text: transcript, selector: triggerSelectorRef.current }
                }));

                // Only mutate DOM natively if NOT a proxy request
                if (!isProxyRef.current) {
                    if (targetNode) {
                        try {
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
                                const currentValue = targetNode.value || '';
                                const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
                                setter.call(targetNode, newValue);
                                targetNode.dispatchEvent(new Event('input', { bubbles: true }));
                                targetNode.dispatchEvent(new Event('change', { bubbles: true }));
                            } else {
                                targetNode.value += (targetNode.value ? ' ' : '') + transcript;
                                targetNode.dispatchEvent(new Event('input', { bubbles: true }));
                                targetNode.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        } catch (domErr) {
                            console.warn("[GlobalDictate] Native DOM update failed, falling back", domErr);
                            targetNode.value += (targetNode.value ? ' ' : '') + transcript;
                        }
                    } else {
                        if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(transcript).catch(e => console.warn(e));
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[GlobalDictate] FATAL error in handleConfirm:", error);
        } finally {
            closeDictation();
        }
    };

    const handleCancel = () => {
        console.log("[GlobalDictate] UI Cancelled by user");
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        } catch (error) {
            console.error("[GlobalDictate] Error during cancel cleanup:", error);
        } finally {
            closeDictation();
        }
    };

    const closeDictation = () => {
        setIsVisible(false);
        setIsListening(false);
        setIsProcessing(false);
        setTranscript('');
        mediaRecorderRef.current = null;
        recognitionRef.current = null;
        window.dispatchEvent(new CustomEvent('global-dictation-closed'));
    };

    return (
        <>

            {/* The Dictation Action Bar Overlay */}
            {isVisible && (
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
                                className="flex-1 h-14 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer z-[1001]"
                            >
                                <X size={20} /> CANCEL
                            </button>

                            {isListening ? (
                                <button
                                    onClick={handleFinishRecording}
                                    className="flex-1 h-14 bg-rose-600 text-white rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-rose-500 transition-all active:scale-95 shadow-lg cursor-pointer z-[1001]"
                                >
                                    <Mic size={20} /> FINISH SPEAKING
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirm}
                                    disabled={!transcript || transcript.includes('Listening...')}
                                    className="flex-1 h-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-lg disabled:opacity-20 disabled:grayscale cursor-pointer z-[1001]"
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
