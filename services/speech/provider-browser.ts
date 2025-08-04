import { SpeechProvider, SpeechRequest, SpeechResponse, Voice } from '.';

export class BrowserSpeechProvider implements SpeechProvider {
  id = 'browser';
  name = 'Browser TTS';
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis is not supported in this browser'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(request.text);

      // Configure utterance
      if (request.voiceId) {
        const voices = this.synthesis.getVoices();
        const voice = voices.find(v => v.voiceURI === request.voiceId);
        if (voice) utterance.voice = voice;
      }

      utterance.rate = request.options?.rate || 1;
      utterance.pitch = request.options?.pitch || 1;
      utterance.volume = request.options?.volume || 1;
      utterance.lang = request.options?.language || 'en-US';

      // Create audio blob
      const audioContext = new AudioContext();
      const mediaStreamDestination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = event => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const base64 = await this.blobToBase64(blob);
        resolve({
          blob: base64,
          duration: audioContext.currentTime,
        });
      };

      utterance.onstart = () => {
        mediaRecorder.start();
      };

      utterance.onend = () => {
        mediaRecorder.stop();
      };

      utterance.onerror = error => {
        reject(new Error(`Browser TTS error: ${error.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  async getVoices(): Promise<Voice[]> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis is not supported in this browser'));
        return;
      }

      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        resolve(
          voices.map(voice => ({
            id: voice.voiceURI,
            name: voice.name,
            language: voice.lang,
          }))
        );
      }
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
