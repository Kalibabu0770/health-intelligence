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
            if (e.detail?.target) {
                const triggerNode = e.detail.target as HTMLElement;
                // Find nearest input or textarea by traversing up to common parent
                let container = triggerNode.parentElement;
                let foundInput = null;
                while (container && !foundInput) {
                    foundInput = container.querySelector('input, textarea');
                    if (foundInput) break;
                    container = container.parentElement;
                }
                if (foundInput) setLastFocusedInput(foundInput as any);
            }
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
            'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-US'
        };

        // We use the language context to support all languages, defaulting to local or en-US
        recognition.lang = langMap[language || 'en'] || 'en-US';
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
            console.error(e);
            if (e.error !== 'aborted') {
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
            } else {
                // Fallback
                targetNode.value += (targetNode.value ? ' ' : '') + transcript;
                targetNode.dispatchEvent(new Event('input', { bubbles: true }));
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
                <div className="fixed inset-x-0 bottom-0 z-[1000] p-4 lg:p-8 flex items-end justify-center pointer-events-none">
                    <div className="bg-white border-4 border-emerald-500 rounded-2xl p-6 shadow-2xl w-full max-w-2xl text-slate-900 flex flex-col pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

                        <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Mic size={24} className={isListening ? "animate-pulse" : ""} />
                                </div>
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                                    Real-Time Voice Dictation <Globe size={14} className="text-emerald-500 font-bold" />
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">
                                    {isListening ? 'Speak now. Translating to active language...' : 'Recording stopped. Review text.'}
                                </p>
                            </div>
                        </div>

                        {/* Live Text Area */}
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 min-h-[120px] max-h-[250px] overflow-y-auto w-full text-xl font-bold text-slate-800 font-sans custom-scrollbar mb-6 break-words shadow-inner">
                            {transcript || <span className="opacity-40 italic flex items-center gap-3"><Loader2 size={18} className="animate-spin text-emerald-500" /> Awaiting voice input... Speak now.</span>}
                        </div>

                        {/* Professional Action Buttons */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleCancel}
                                className="flex-1 h-14 bg-white border-2 border-rose-200 text-rose-600 rounded-xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] hover:bg-rose-50 hover:border-rose-400 transition-all active:scale-95 shadow-sm"
                            >
                                <X size={24} /> Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!transcript || transcript === 'Listening...'}
                                className="flex-1 h-14 bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:grayscale"
                            >
                                <Check size={24} /> Confirm & Paste
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};

export default GlobalDictate;
