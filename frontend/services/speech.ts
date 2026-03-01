import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;
let currentNativeRec: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    let latestNativeTranscript = '';
    // Stop any existing
    if (currentRecognition && currentRecognition.state === 'recording') {
        try { currentRecognition.stop(); } catch (e) { }
    }
    if (currentNativeRec) {
        try { currentNativeRec.stop(); } catch (e) { }
    }

    const t = translations[language as Language] || translations['en'];

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
            <span class="listening-text">${t.ai_guardian_listening || 'AI Guardian Listening (Whisper NLP)...'}</span>
        </div>
        <div id="aura-transcript" class="aura-transcript-area">${t.please_speak_clearly || 'Speak now...'}</div>
        <div class="aura-actions">
            <button id="aura-done" class="aura-btn aura-btn-confirm">${t.done_use_text || 'FINISH / TRANSCRIBE'}</button>
            <button id="aura-cancel" class="aura-btn aura-btn-cancel">${t.cancel || 'CANCEL'}</button>
        </div>
    `;

    const transcriptEl = aura.querySelector('#aura-transcript') as HTMLElement;
    const doneBtn = aura.querySelector('#aura-done') as HTMLButtonElement;
    const cancelBtn = aura.querySelector('#aura-cancel') as HTMLButtonElement;

    aura.classList.add('active');

    // Layer 1: Real-Time Browser API
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        try {
            const recognition = new SpeechRecognitionAPI();
            currentNativeRec = recognition;

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
                for (let i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTxt += event.results[i][0].transcript;
                    } else {
                        interimTxt += event.results[i][0].transcript;
                    }
                }
                const text = (finalTxt + " " + interimTxt).trim();
                if (text && transcriptEl) {
                    transcriptEl.textContent = text;
                    latestNativeTranscript = text; // Track to fallback if Groq API fails
                }
            };

            recognition.onerror = (e: any) => console.warn("Native speech error setup:", e.error);
            recognition.start();
        } catch (e) { console.warn(e) }
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        currentRecognition = mediaRecorder;
        let audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        const cleanup = () => {
            currentRecognition = null;
            if (currentNativeRec) {
                try { currentNativeRec.stop(); } catch (e) { }
                currentNativeRec = null;
            }
            aura.classList.remove('active');
            stream.getTracks().forEach(track => track.stop());
            if (onEnd) onEnd();
        };

        mediaRecorder.onstop = async () => {
            if (currentNativeRec) {
                try { currentNativeRec.stop(); } catch (e) { }
            }
            if (transcriptEl) transcriptEl.textContent = "AI Perfecting via Whisper Analytics...";
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            try {
                const { transcribeAudio } = await import('./ai');
                const text = await transcribeAudio(audioBlob, language);

                if (text && text.trim().length > 0) {
                    if (transcriptEl) transcriptEl.textContent = text;
                    onTranscript(text);
                } else {
                    // Fallback to native Chrome layer if Whisper returns empty
                    if (latestNativeTranscript && transcriptEl) {
                        transcriptEl.textContent = latestNativeTranscript;
                        onTranscript(latestNativeTranscript);
                    }
                }
            } catch (error) {
                console.error("Transcription Failed:", error);
                // Fallback to native layer
                if (latestNativeTranscript && transcriptEl) {
                    transcriptEl.textContent = latestNativeTranscript;
                    onTranscript(latestNativeTranscript);
                } else if (transcriptEl) {
                    transcriptEl.textContent = "Transcription failed. Please try again.";
                }
            } finally {
                setTimeout(cleanup, 1000);
            }
        };

        doneBtn.onclick = (e) => {
            e.preventDefault();
            if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        };

        cancelBtn.onclick = (e) => {
            e.preventDefault();
            if (mediaRecorder.state === 'recording') {
                audioChunks = [];
                mediaRecorder.stop();
            } else {
                cleanup();
            }
        };

        mediaRecorder.start();

    }).catch(err => {
        console.warn("Microphone access error:", err);
        if (transcriptEl) transcriptEl.textContent = "Microphone Data Blocked: Please ensure you are running on an HTTPS connection or localhost.";

        if (currentNativeRec) {
            try { currentNativeRec.stop(); } catch (e) { }
            currentNativeRec = null;
        }

        cancelBtn.onclick = (e) => {
            e.preventDefault();
            setTimeout(() => {
                aura.classList.remove('active');
                if (onEnd) onEnd();
            }, 500);
        };

        doneBtn.onclick = (e) => {
            e.preventDefault();
            setTimeout(() => {
                aura.classList.remove('active');
                if (onEnd) onEnd();
            }, 500);
        };
    });
};
