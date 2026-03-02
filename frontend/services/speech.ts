export const startListening = (
    language: string,
    onTranscript: (text: string) => void,
    onEnd?: () => void
) => {
    // UNIFIED DICTATION PROXY
    // We redirect all legacy 'startListening' calls to the new robust 'GlobalDictate.tsx' overlay.
    // This prevents dual-microphone locks, guarantees Whisper API usage, and unifies the UI.

    const handleResult = (e: any) => {
        if (e.detail && e.detail.text) {
            // Apply the recognized text back to the component that requested it
            onTranscript(e.detail.text);
        }

        // Clean up immediately
        window.removeEventListener('global-dictation-result', handleResult);
        window.removeEventListener('global-dictation-closed', handleClosed);
        if (onEnd) onEnd();
    };

    const handleClosed = () => {
        // If the user cancelled or the dictation closed without result
        window.removeEventListener('global-dictation-result', handleResult);
        window.removeEventListener('global-dictation-closed', handleClosed);
        if (onEnd) onEnd();
    };

    // Attach one-time listeners
    window.addEventListener('global-dictation-result', handleResult);
    window.addEventListener('global-dictation-closed', handleClosed);

    // Trigger the GlobalDictate central UI
    window.dispatchEvent(new CustomEvent('start-global-dictation', {
        detail: { proxy: true }
    }));
};
