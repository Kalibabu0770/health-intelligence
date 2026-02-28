import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    // Stop any existing
    if (currentRecognition) {
        try { currentRecognition.stop(); } catch (e) { }
    }

    const t = translations[language as Language] || translations['en'];

    // Native Browser Web Speech Real-time API
    const SpeechRecognitionModel = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionModel) {
        alert(t.mic_not_supported || "Voice recognition is not supported natively in this browser. Please use Chrome.");
        if (onEnd) onEnd();
        return;
    }

    // Global Overlay Management
    let aura = document.getElementById('ai-aura') as HTMLElement;
    if (!aura) {
        aura = document.createElement('div');
        aura.id = 'ai-aura';
        aura.className = 'ai-aura-container';
        document.body.appendChild(aura);
    }

    aura.innerHTML = `
        <div class="aura-header">
            <div class="orb orb-1"></div>
            <div class="orb orb-2"></div>
            <div class="orb orb-3"></div>
            <div class="orb orb-4"></div>
            <span class="listening-text">${t.ai_guardian_listening || 'AI Guardian Listening...'}</span>
        </div>
        <div id="aura-transcript" class="aura-transcript-area">${t.please_speak_clearly || 'Speak now...'}</div>
        <div class="aura-actions">
            <button id="aura-done" class="aura-btn aura-btn-confirm">${t.done_use_text || 'FINISH / USE TEXT'}</button>
            <button id="aura-cancel" class="aura-btn aura-btn-cancel">${t.cancel || 'CANCEL'}</button>
        </div>
    `;

    const transcriptEl = aura.querySelector('#aura-transcript') as HTMLElement;
    const doneBtn = aura.querySelector('#aura-done') as HTMLButtonElement;
    const cancelBtn = aura.querySelector('#aura-cancel') as HTMLButtonElement;

    aura.classList.add('active');

    const recognition = new SpeechRecognitionModel();
    currentRecognition = recognition;

    // Use native continuous listening
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'en-IN' ? 'en-IN' : language;

    const cleanup = () => {
        currentRecognition = null;
        aura.classList.remove('active');
        if (onEnd) onEnd();
    };

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
        const displayTxt = (finalTxt + " " + interimTxt).trim();
        if (transcriptEl && displayTxt) {
            transcriptEl.textContent = displayTxt;
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        if (transcriptEl) transcriptEl.textContent = `Mic Error: ${event.error}`;
        if (event.error === 'not-allowed') {
            if (transcriptEl) transcriptEl.textContent = "Microphone access denied. Please allow it in address bar.";
        }
    };

    recognition.onend = () => {
        // Natural timeout stops recording automatically
    };

    doneBtn.onclick = (e) => {
        e.preventDefault();
        recognition.stop();
        const finalContent = transcriptEl?.textContent || '';
        if (finalContent && finalContent !== (t.please_speak_clearly || 'Speak now...') && !finalContent.startsWith('Mic Error:')) {
            onTranscript(finalContent);
        }
        cleanup();
    };

    cancelBtn.onclick = (e) => {
        e.preventDefault();
        recognition.stop();
        cleanup();
    };

    try {
        recognition.start();
    } catch (err) {
        console.warn(err);
    }
};
