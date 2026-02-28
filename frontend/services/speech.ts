import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    let recognition: any;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        // Fallback for IDEs/local dev without Speech API access
        recognition = {
            lang: 'en-IN',
            continuous: true,
            interimResults: true,
            start: () => {
                let text = "Simulated transcription because Speech API is unavailable... Patient is feeling dizzy.";
                let currentLength = 0;

                // If it relies on aura overlay elements being set up, just directly call onTranscript after small delay
                const interval = setInterval(() => {
                    currentLength += 5;
                    if (currentLength > text.length) {
                        clearInterval(interval);
                        if (recognition._mockDone) recognition._mockDone(text);
                        return;
                    }
                    if (recognition._mockUpdate) recognition._mockUpdate(text.substring(0, currentLength));
                }, 50);
                recognition._mockInterval = interval;
            },
            stop: () => {
                if (recognition._mockInterval) clearInterval(recognition._mockInterval);
            },
            abort: () => {
                if (recognition._mockInterval) clearInterval(recognition._mockInterval);
            }
        };
    } else {
        recognition = new SpeechRecognition();
    }

    if (currentRecognition) {
        try { currentRecognition.abort(); } catch (e) { }
        currentRecognition = null;
    }

    currentRecognition = recognition;

    const langMap: Record<string, string> = {
        'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN',
        'kn': 'kn-IN', 'mr': 'mr-IN', 'en': 'en-US'
    };

    recognition.lang = langMap[language] || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    const t = translations[language as Language] || translations['en'];

    // ChatGPT-style Global Overlay Management
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
        <div id="aura-transcript" class="aura-transcript-area">${t.please_speak_clearly || 'Please speak clearly...'}</div>
        <div class="aura-actions">
            <button id="aura-done" class="aura-btn aura-btn-confirm">${t.done_use_text || 'DONE / USE TEXT'}</button>
            <button id="aura-cancel" class="aura-btn aura-btn-cancel">${t.cancel || 'CANCEL'}</button>
        </div>
    `;

    const transcriptEl = aura.querySelector('#aura-transcript') as HTMLElement;
    const doneBtn = aura.querySelector('#aura-done') as HTMLButtonElement;
    const cancelBtn = aura.querySelector('#aura-cancel') as HTMLButtonElement;

    aura.classList.add('active');

    let finalTranscript = '';
    let silenceTimer: any = null;

    const finalize = () => {
        const text = transcriptEl.textContent?.trim() || finalTranscript.trim();
        if (text && text !== (t.please_speak_clearly || "Please speak clearly...")) {
            onTranscript(text);
        }
    };

    doneBtn.onclick = (e) => {
        e.preventDefault();
        finalize();
        recognition.stop();
    };

    cancelBtn.onclick = (e) => {
        e.preventDefault();
        recognition.abort();
    };

    recognition.onstart = () => {
        if (transcriptEl) transcriptEl.textContent = t.listening || "Listening...";
    };

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }

        const liveText = (finalTranscript + interimTranscript).trim();
        if (liveText) {
            if (transcriptEl) transcriptEl.textContent = liveText;
            onTranscript(liveText);
            // This provides the 'confirmation mechanism' requested by the user.
        }

        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => recognition.stop(), 8000);
    };

    // Attach mock hooks
    recognition._mockUpdate = (text: string) => {
        if (transcriptEl) transcriptEl.textContent = text;
        onTranscript(text);
    };
    recognition._mockDone = (text: string) => {
        if (transcriptEl) transcriptEl.textContent = text;
        onTranscript(text);
        setTimeout(() => {
            if (doneBtn) doneBtn.click();
        }, 500);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (transcriptEl) transcriptEl.textContent = (t.error || "Error: ") + event.error + ". " + (t.check_mic || "Please check microphone permissions.");
        setTimeout(() => recognition.stop(), 3000);
    };

    recognition.onend = () => {
        currentRecognition = null;
        aura.classList.remove('active');
        clearTimeout(silenceTimer);
        if (onEnd) onEnd();
    };

    try { recognition.start(); } catch (e: any) {
        console.error("Start failed:", e);
    }
};
