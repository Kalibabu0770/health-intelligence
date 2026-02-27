import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("Speech Recognition NOT supported in this browser.");
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
            <span class="listening-text">AI Guardian Listening...</span>
        </div>
        <div id="aura-transcript" class="aura-transcript-area">Please speak clearly...</div>
        <div class="aura-actions">
            <button id="aura-done" class="aura-btn aura-btn-confirm">DONE / USE TEXT</button>
            <button id="aura-cancel" class="aura-btn aura-btn-cancel">CANCEL</button>
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
        if (text && text !== "Please speak clearly...") {
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
        if (transcriptEl) transcriptEl.textContent = "Listening...";
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
            // Real-time preview in the overlay, but we wait for 'DONE' to call onTranscript
            // This provides the 'confirmation mechanism' requested by the user.
        }

        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => recognition.stop(), 8000);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (transcriptEl) transcriptEl.textContent = "Error: " + event.error + ". Please check microphone permissions.";
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
