import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onInterim?: (text: string) => void
) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const speechAlert = (translations[language as Language] || translations['en']).speech_not_supported;
        alert(speechAlert);
        return;
    }

    if (currentRecognition) {
        try { currentRecognition.abort(); } catch (e) { }
        currentRecognition = null;
    }

    const recognition = new SpeechRecognition();
    currentRecognition = recognition;

    const langMap: Record<string, string> = {
        'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
        'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-US'
    };

    recognition.lang = langMap[language] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';
    let silenceTimer: any = null;

    const activeBtn = document.activeElement as HTMLElement;
    if (activeBtn && !activeBtn.classList.contains('mic-listening')) {
        activeBtn.dataset.originalContent = activeBtn.innerHTML;
        activeBtn.classList.add('mic-listening');
        activeBtn.innerHTML = `
      <div class="mic-dots-container">
        <div class="google-dot dot-1"></div>
        <div class="google-dot dot-2"></div>
        <div class="google-dot dot-3"></div>
        <div class="google-dot dot-4"></div>
      </div>
    `;
    }

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }
        if (onInterim) onInterim(interimTranscript);
        const liveText = (finalTranscript + interimTranscript).trim();
        if (liveText) onTranscript(liveText);
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => recognition.stop(), 4000);
    };

    recognition.onend = () => {
        currentRecognition = null;
        clearTimeout(silenceTimer);
        if (finalTranscript.trim()) onTranscript(finalTranscript.trim());
        if (activeBtn) {
            activeBtn.classList.remove('mic-listening');
            if (activeBtn.dataset.originalContent) {
                activeBtn.innerHTML = activeBtn.dataset.originalContent;
                delete activeBtn.dataset.originalContent;
            }
        }
    };

    try { recognition.start(); } catch (e: any) { }
};
