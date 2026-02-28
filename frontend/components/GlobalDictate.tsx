import React, { useState, useEffect, useRef } from 'react';
import { Mic, Check, X, Loader2, Globe } from 'lucide-react';
import { usePatientContext } from '../core/patientContext/patientStore';

const GlobalDictate: React.FC = () => {
    const { language } = usePatientContext();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastFocusedInput, setLastFocusedInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const recognitionRef = useRef<any>(null);

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
                foundInput = document.querySelector(e.detail.selector);
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

    const startDictation = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition is not supported in this browser. Try Chrome.");
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        const langMap: Record<string, string> = {
            'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
            'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-IN'
        };

        // We use the language context to support all languages, defaulting to local IN to handle Indian dialects/Slangs naturally
        recognition.lang = langMap[language || 'en'] || 'en-IN';
        recognition.continuous = true;
        recognition.interimResults = true;

        let finalTranscript = '';

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('Listening...');
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript((finalTranscript + interimTranscript).trim());
        };

        recognition.onerror = (e: any) => {
            console.error("Speech Recognition Error:", e);
            setIsListening(false);
            if (e.error === 'not-allowed') {
                if (!window.isSecureContext) {
                    setTranscript("⚠️ SECURE CONTEXT REQUIRED: Browsers block the microphone on HTTP IP addresses. You must access this site via 'http://localhost:5173' or 'http://127.0.0.1:5173' (NOT a local network IP) or configure HTTPS.");
                } else {
                    setTranscript("⚠️ MICROPHONE BLOCKED BY OS: Even if allowed in the browser, your computer's OS might be blocking it. On Mac: Go to System Settings -> Privacy & Security -> Microphone, and check the box next to your web browser.");
                }
            } else if (e.error !== 'aborted') {
                setTranscript(`Error: ${e.error}`);
            }
        };

        recognition.onend = () => {
            // Keep the overlay open even if it stops listening, so they can confirm
        };

        recognition.start();
        setIsListening(true);
        setTranscript('');
    };

    const handleConfirm = () => {
        // Stop recognition
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        // Find the input to paste into
        const activeDom = document.activeElement;
        let targetNode = lastFocusedInput;

        if (activeDom && (activeDom.tagName === 'INPUT' || activeDom.tagName === 'TEXTAREA')) {
            targetNode = activeDom as any;
        }

        if (targetNode && transcript && transcript !== 'Listening...') {
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
        } else if (transcript && transcript !== 'Listening...') {
            // If no input was focused, we can try to copy to clipboard as fallback
            navigator.clipboard.writeText(transcript).catch(e => console.error(e));
        }

        closeDictation();
    };

    const handleCancel = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
        }
        closeDictation();
    };

    const closeDictation = () => {
        setIsListening(false);
        setTranscript('');
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
            recognitionRef.current = null;
        }
    };

    return (
        <>

            {/* The Dictation Action Bar Overlay */}
            {(isListening || transcript) && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 pointer-events-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] w-full max-w-2xl text-slate-100 flex flex-col animate-in zoom-in-95 fade-in duration-300">

                        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-800">
                            <div className="relative">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                                    <Mic size={28} className={isListening ? "animate-pulse" : ""} />
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
                                    AI Guardian Listening...
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
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RECORDING STOPPED</span>
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
                                className="flex-1 h-14 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                                <X size={20} /> CANCEL
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!transcript || transcript === 'Listening...'}
                                className="flex-1 h-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-lg disabled:opacity-20 disabled:grayscale"
                            >
                                <Check size={20} /> DONE / CONFIRM
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalDictate;
