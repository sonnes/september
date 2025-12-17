import { BrowserTTSSettings } from '@/types/account';
import { Voice } from '@/types/voice';

import { ListVoicesRequest, SpeechProvider, SpeechRequest, SpeechResponse } from './types';

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
      const voice = request.voice;

      // Configure utterance
      if (voice) {
        const voices = this.synthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === voice.id);
        if (selectedVoice) utterance.voice = selectedVoice;
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

  async listVoices(request: ListVoicesRequest): Promise<Voice[]> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis is not supported in this browser'));
        return;
      }

      const voices = this.synthesis.getVoices();

      const page = request.page || 1;
      const limit = request.limit || 100;

      const filteredVoices = voices
        .filter(voice => {
          if (request.search) {
            return voice.name.toLowerCase().includes(request.search.toLowerCase());
          }
          return true;
        })
        .filter(voice => {
          if (request.language) {
            return voice.lang === request.language;
          } else if (window.navigator.language) {
            return voice.lang === window.navigator.language;
          }
          return true;
        })
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        })
        .slice((page - 1) * limit, page * limit);

      resolve(
        filteredVoices.map(voice => ({
          id: voice.voiceURI,
          name: voice.name,
          language: voice.lang,
        }))
      );
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
