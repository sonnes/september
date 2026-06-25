import {
  ListVoicesRequest,
  SpeechEngine,
  SpeechRequest,
  SpeechResponse,
  SpeechStreamHooks,
} from '../../types';
import { ElevenLabsSettings } from '@/packages/shared';
import { Voice } from '@/packages/shared';

import { streamElevenLabsSpeech } from './elevenlabs-stream';
import type { WsConnectionParams } from './elevenlabs-ws-connection';

const DEFAULT_MODEL = 'eleven_flash_v2_5';
const DEFAULT_STREAM_FORMAT = 'pcm_22050';

/** Voice settings payload — empty for models that don't accept them (eleven_v3). */
function buildVoiceSettings(modelId: string, settings: ElevenLabsSettings) {
  if (modelId === 'eleven_v3') return {};
  return {
    speed: settings.speed || 1.0,
    stability: settings.stability || 0.5,
    similarity_boost: settings.similarity || 0.5,
    style: settings.style || 0.0,
    use_speaker_boost: settings.speaker_boost || false,
  };
}

/** Derive the PCM sample rate from an `output_format` like `pcm_22050`. */
export function sampleRateForFormat(format: string): number {
  const m = /^pcm_(\d+)$/.exec(format);
  return m ? Number(m[1]) : 22050;
}

/** Connection params (URL/query) for the warm WebSocket, derived from config. */
export function elevenLabsStreamParams(
  voiceId: string,
  settings: ElevenLabsSettings | undefined
): WsConnectionParams {
  return {
    voiceId,
    modelId: settings?.model_id || DEFAULT_MODEL,
    outputFormat: settings?.output_format || DEFAULT_STREAM_FORMAT,
  };
}

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

export class ElevenLabsSpeechProvider implements SpeechEngine {
  id = 'elevenlabs';
  name = 'ElevenLabs';
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io';

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

    const url = `${this.baseUrl}/v1/text-to-speech/${request.voice.id}/with-timestamps`;

    const model_id = settings.model_id || DEFAULT_MODEL;
    const voice_settings = buildVoiceSettings(model_id, settings);

    const body = {
      text: request.text,
      model_id: model_id,
      voice_settings: voice_settings,
      output_format: 'mp3_44100_128',
      ...(request.previous_text ? { previous_text: request.previous_text } : {}),
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

    // ensure the blob is a base64 string by prefixing it with 'data:audio/mp3;base64,'
    if (!data.audio_base64.startsWith('data:audio/mp3;base64,')) {
      data.audio_base64 = `data:audio/mp3;base64,${data.audio_base64}`;
    }

    return {
      blob: data.audio_base64,
      alignment,
    };
  }

  /**
   * Stream synthesis over an already-open stream-input WebSocket (opened by the
   * connection manager). Plays PCM chunks live via `hooks` and resolves with the
   * assembled WAV blob + merged alignment for persistence/replay.
   */
  async generateSpeechStream(
    request: SpeechRequest,
    hooks: SpeechStreamHooks,
    socket: WebSocket
  ): Promise<SpeechResponse> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    if (!request.voice?.id) {
      throw new Error('Voice ID is required for ElevenLabs');
    }

    const settings = (request.options || {}) as ElevenLabsSettings;
    const model_id = settings.model_id || DEFAULT_MODEL;
    const output_format = settings.output_format || DEFAULT_STREAM_FORMAT;

    return streamElevenLabsSpeech(
      socket,
      {
        text: request.text,
        previousText: request.previous_text,
        apiKey: this.apiKey,
        voiceSettings: buildVoiceSettings(model_id, settings),
        sampleRate: sampleRateForFormat(output_format),
        chunkLengthSchedule: settings.chunk_length_schedule,
      },
      hooks
    );
  }

  async listVoices(request: ListVoicesRequest): Promise<Voice[]> {
    const params = new URLSearchParams({
      search: request.search || '',
      language: request.language || '',
      page: request.page?.toString() || '1',
      limit: request.limit?.toString() || '100',
      voice_type: 'non-default',
    });
    const url = request.search
      ? `${this.baseUrl}/v1/shared-voices?${params.toString()}`
      : `${this.baseUrl}/v2/voices?${params.toString()}`;

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
