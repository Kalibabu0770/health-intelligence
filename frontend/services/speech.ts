import { translations, Language } from '../core/patientContext/translations';

let currentRecognition: any = null;

export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    // Stop any existing
    if (currentRecognition && currentRecognition.state === 'recording') {
        try { currentRecognition.stop(); } catch (e) { }
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
            aura.classList.remove('active');
            stream.getTracks().forEach(track => track.stop());
            if (onEnd) onEnd();
        };

        mediaRecorder.onstop = async () => {
            if (transcriptEl) transcriptEl.textContent = "AI Transcribing via Whisper...";
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            try {
                // We're inside `speech.ts`, so we need to dynamically import or just assume `transcribeAudio` is available 
                // Since `ai.ts` is in the same directory structure, we'll import it at the top of the file
                const { transcribeAudio } = await import('./ai');
                const text = await transcribeAudio(audioBlob, language);

                if (text && transcriptEl) {
                    transcriptEl.textContent = text;
                    onTranscript(text);
                }
            } catch (error) {
                console.error("Transcription Failed:", error);
                if (transcriptEl) transcriptEl.textContent = "Transcription failed. Please try again.";
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
                // Empty the chunks so it doesn't try to transcribe
                audioChunks = [];
                mediaRecorder.stop();
            } else {
                cleanup();
            }
        };

        mediaRecorder.start();
        if (transcriptEl) transcriptEl.textContent = t.listening || "Listening (Whisper NLP)...";

    }).catch(err => {
        console.error("Microphone access error:", err);
        if (transcriptEl) transcriptEl.textContent = "Microphone access denied.";
        setTimeout(() => {
            aura.classList.remove('active');
            if (onEnd) onEnd();
        }, 3000);
    });
};
