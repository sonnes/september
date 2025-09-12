import { ElevenLabsSettings } from '@/types/account';
import { Voice } from '@/types/voice';

import { ListVoicesRequest, SpeechProvider, SpeechRequest, SpeechResponse } from './types';

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
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  sharing?: {
    public_owner_id?: string;
  };
  is_added_by_user?: boolean;
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
    this.apiKey = apiKey || '';
  }

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    if (!request.voice?.id) {
      throw new Error('Voice ID is required for ElevenLabs');
    }

    const settings = request.options as ElevenLabsSettings;

    const url = `${this.baseUrl}/text-to-speech/${request.voice.id}/with-timestamps`;

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

  async listVoices(request: ListVoicesRequest): Promise<Voice[]> {
    const params = new URLSearchParams({
      search: request.search || '',
      language: request.language || '',
      page: request.page?.toString() || '1',
      limit: request.limit?.toString() || '100',
    });
    const url = `${this.baseUrl}/voices?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': request.apiKey || this.apiKey,
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
      // Include additional properties for the UI
      category: voice.category,
      description: voice.description,
      preview_url: voice.preview_url,
      labels: voice.labels,
      sharing: voice.sharing,
      is_added_by_user: voice.is_added_by_user,
    }));
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}
