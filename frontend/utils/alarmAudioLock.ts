class AlarmAudioLock {
    private static currentAudio: HTMLAudioElement | null = null;
    private static isPlaying: boolean = false;

    static play(url: string, loop: boolean = true) {
        if (this.isPlaying && this.currentAudio) {
            // Don't overlap if already playing an alarm, unless it's a higher priority replacement
            if (this.currentAudio.src.includes(url)) return; 
            this.stop();
        }
        
        this.currentAudio = new window.Audio(url);
        this.currentAudio.loop = loop;
        this.currentAudio.play().catch(e => console.warn("Audio block/overlap prevented:", e));
        this.isPlaying = true;
    }

    static stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPlaying = false;
    }
}

export default AlarmAudioLock;
