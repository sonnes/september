import { BrowserTTSSettings } from '@/types/account';

import { SpeechProvider, SpeechRequest, SpeechResponse, Voice } from '.';

export class BrowserSpeechProvider implements SpeechProvider {
  id = 'browser_tts';
  name = 'Browser TTS';
  private synthesis: SpeechSynthesis | null = null;

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

      const settings = request.options as BrowserTTSSettings;

      // Configure utterance
      if (settings.voice_id) {
        const voices = this.synthesis.getVoices();
        const voice = voices.find(v => v.voiceURI === settings.voice_id);
        if (voice) utterance.voice = voice;
      }

      utterance.rate = settings.speed || 1;
      utterance.pitch = settings.pitch || 1;
      utterance.volume = settings.volume || 1;
      utterance.lang = settings.language || 'en-US';

      resolve({
        utterance,
      });
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
          voices
            .filter(voice => voice.lang === window.navigator.language)
            .map(voice => ({
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
