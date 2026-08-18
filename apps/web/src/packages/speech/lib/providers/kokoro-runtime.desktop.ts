import type { Voice } from '@/packages/shared';

import type { ListVoicesRequest, SpeechEngine, SpeechRequest } from '../../types';

export const KOKORO_AVAILABLE = false;
export const KOKORO_SAMPLE_RATE = 24000;

export class KokoroSpeechProvider implements SpeechEngine {
  id = 'kokoro';
  name = 'Kokoro TTS';

  async generateSpeech(_request: SpeechRequest): Promise<never> {
    throw new Error('Browser-local Kokoro is unavailable in the desktop app.');
  }

  async listVoices(_request: ListVoicesRequest): Promise<Voice[]> {
    return [];
  }
}

export async function preloadKokoro(): Promise<never> {
  throw new Error('Browser-local Kokoro is unavailable in the desktop app.');
}
