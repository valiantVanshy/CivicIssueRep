/**
 * Voice Input Manager
 * Handles speech-to-text for report forms using Web Speech API
 */

class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.supportsSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        if (this.supportsSpeech) {
            this.initRecognition();
        }
    }

    /**
     * Initialize speech recognition
     */
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN'; // Indian English
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            
            if (this.currentField) {
                this.currentField.value = transcript;
                
                // Trigger input event for validation
                this.currentField.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Show interim results
            if (!result.isFinal && this.statusElement) {
                this.statusElement.textContent = `Listening... "${transcript}"`;
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateStatus('stopped');
            this.updateButtonState();
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not found or not working.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                default:
                    errorMessage = `Error: ${event.error}`;
            }
            
            this.updateStatus('error', errorMessage);
            this.updateButtonState();
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateStatus('listening');
            this.updateButtonState();
        };
    }

    /**
     * Start listening to a field
     */
    startListening(fieldId, statusElementId = null) {
        if (!this.supportsSpeech) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        this.currentField = document.getElementById(fieldId);
        this.statusElement = statusElementId ? document.getElementById(statusElementId) : null;
        this.currentButton = document.querySelector(`[data-voice-for="${fieldId}"]`);

        if (!this.currentField) {
            console.error('Field not found:', fieldId);
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    /**
     * Update status display
     */
    updateStatus(state, message = '') {
        if (!this.statusElement) return;

        switch (state) {
            case 'listening':
                this.statusElement.className = 'voice-status voice-status--listening';
                this.statusElement.innerHTML = '🎤 Listening... Speak now';
                break;
            case 'stopped':
                this.statusElement.className = 'voice-status voice-status--stopped';
                this.statusElement.innerHTML = '✓ Done';
                setTimeout(() => {
                    if (this.statusElement) this.statusElement.innerHTML = '';
                }, 2000);
                break;
            case 'error':
                this.statusElement.className = 'voice-status voice-status--error';
                this.statusElement.innerHTML = `⚠️ ${message}`;
                setTimeout(() => {
                    if (this.statusElement) this.statusElement.innerHTML = '';
                }, 3000);
                break;
        }
    }

    /**
     * Update button state
     */
    updateButtonState() {
        if (!this.currentButton) return;

        if (this.isListening) {
            this.currentButton.classList.add('voice-btn--active');
            this.currentButton.innerHTML = '⏹️ Stop';
        } else {
            this.currentButton.classList.remove('voice-btn--active');
            this.currentButton.innerHTML = '🎤 Voice';
        }
    }

    /**
     * Check if speech recognition is supported
     */
    isSupported() {
        return this.supportsSpeech;
    }

    /**
     * Add voice button to a field
     */
    addVoiceButton(fieldId, statusElementId = null) {
        const field = document.getElementById(fieldId);
        if (!field || !this.supportsSpeech) return;

        const container = field.parentElement;
        
        // Create voice button
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.className = 'voice-btn';
        voiceBtn.setAttribute('data-voice-for', fieldId);
        voiceBtn.innerHTML = '🎤 Voice';
        voiceBtn.onclick = () => this.startListening(fieldId, statusElementId);

        // Create status element if not exists
        if (statusElementId && !document.getElementById(statusElementId)) {
            const statusEl = document.createElement('div');
            statusEl.id = statusElementId;
            statusEl.className = 'voice-status';
            container.appendChild(statusEl);
        }

        // Insert button after field
        field.parentNode.insertBefore(voiceBtn, field.nextSibling);
    }
}

// Create global instance
const voiceInputManager = new VoiceInputManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VoiceInputManager, voiceInputManager };
} else {
    window.VoiceInputManager = VoiceInputManager;
    window.voiceInputManager = voiceInputManager;
}
