import { ElevenLabsSettings } from '@/types/account';

import { SpeechProvider, SpeechRequest, SpeechResponse, Voice } from '.';

const ranks = {
  cloned: 1,
  professional: 2,
  premade: 3,
  similar: 4,
};

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  language?: string;
}

interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface ElevenLabsResponse {
  audio_base64: string;
  alignment?: ElevenLabsAlignment;
  normalized_alignment?: ElevenLabsAlignment;
}

export class ElevenLabsSpeechProvider implements SpeechProvider {
  id = 'elevenlabs';
  name = 'ElevenLabs';
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
  }

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    if (!request.options?.voice_id) {
      throw new Error('Voice ID is required for ElevenLabs');
    }

    const settings = request.options as ElevenLabsSettings;

    const url = `${this.baseUrl}/text-to-speech/${request.options.voice_id}/with-timestamps`;

    const body = {
      text: request.text,
      model_id: settings.model_id || 'eleven_flash_v2_5',
      voice_settings: {
        speed: settings.speed || 1.0,
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarity || 0.5,
        style: settings.style || 0.0,
        use_speaker_boost: settings.speaker_boost || false,
      },
      output_format: 'mp3_44100_128',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: ElevenLabsResponse = await response.json();

    const alignment = data.alignment
      ? {
          characters: data.alignment.characters,
          start_times: data.alignment.character_start_times_seconds,
          end_times: data.alignment.character_end_times_seconds,
        }
      : undefined;

    return {
      blob: data.audio_base64,
      alignment,
    };
  }

  async getVoices(): Promise<Voice[]> {
    if (!this.apiKey) {
      return [];
    }

    const url = `${this.baseUrl}/voices`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: { voices: ElevenLabsVoice[] } = await response.json();

    const sortedVoices = data.voices.sort((a, b) => {
      const rankA = ranks[a.category as keyof typeof ranks] || 999;
      const rankB = ranks[b.category as keyof typeof ranks] || 999;
      return rankA - rankB;
    });

    return sortedVoices.map(voice => ({
      id: voice.voice_id,
      name: voice.name || '',
      language: voice.language || '',
    }));
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}
