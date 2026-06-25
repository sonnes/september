'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { useAccount } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { PcmStreamPlayer, useAudioPlayer } from '@/packages/audio';
import { track } from '@/packages/usage';
import type { AIProvider, ElevenLabsSettings } from '@/packages/shared';
import type { Voice } from '@/packages/shared';

import { BrowserSpeechProvider } from '../lib/providers/browser';
import { KokoroSpeechProvider } from '../lib/providers/kokoro';
import {
  ElevenLabsSpeechProvider,
  elevenLabsStreamParams,
  sampleRateForFormat,
} from '../lib/providers/elevenlabs';
import { ElevenLabsWsConnection } from '../lib/providers/elevenlabs-ws-connection';
import { GeminiSpeechProvider } from '../lib/providers/gemini';
import {
  ListVoicesRequest,
  SpeechEngine,
  SpeechOptions,
  SpeechResponse,
  SpeechStreamHooks,
} from '../types';

const browser = new BrowserSpeechProvider();

// Kill switch for the ElevenLabs WebSocket streaming path. When set, every
// caller falls back to the buffered REST synthesis and no sockets are opened.
const WS_TTS_DISABLED = import.meta.env.VITE_DISABLE_WS_TTS === 'true';

// One warm WebSocket manager shared across every useSpeech instance — avoids
// each mounted hook opening its own idle socket. Lives for the app's lifetime.
let wsConnection: ElevenLabsWsConnection | null = null;
function getWsConnection(): ElevenLabsWsConnection {
  if (!wsConnection) wsConnection = new ElevenLabsWsConnection();
  return wsConnection;
}

export interface UseSpeechReturn {
  listVoices: (request: ListVoicesRequest) => Promise<Voice[]> | undefined;
  getProviders: () => SpeechEngine[];
  generateSpeech: (
    text: string,
    options?: SpeechOptions,
    context?: { previous_text?: string }
  ) => Promise<SpeechResponse> | undefined;
  /**
   * Low-latency streaming synthesis (ElevenLabs WebSocket). Plays PCM chunks
   * live as they arrive and resolves with the full blob + alignment for
   * persistence. Returns `undefined` when the active provider has no streaming
   * path — callers fall back to `generateSpeech`. Rejects (after stopping live
   * playback) on WS failure, so callers can fall back to REST.
   */
  generateSpeechStream: (
    text: string,
    options?: SpeechOptions,
    context?: { previous_text?: string }
  ) => Promise<SpeechResponse> | undefined;
  getProvider: (id: string) => SpeechEngine | undefined;
}

export function useSpeech(): UseSpeechReturn {
  const { user } = useAccount();
  const { speechConfig, getProviderConfig } = useAISettings();
  const { selectedOutputDeviceId } = useAudioPlayer();

  const registry = useMemo(() => {
    const registry = new Map<string, SpeechEngine>();

    registry.set('browser', browser);

    const elevenlabsConfig = getProviderConfig('elevenlabs');
    const geminiConfig = getProviderConfig('gemini');

    if (elevenlabsConfig && elevenlabsConfig.api_key) {
      registry.set('elevenlabs', new ElevenLabsSpeechProvider(elevenlabsConfig.api_key));
    }
    if (geminiConfig && geminiConfig.api_key) {
      registry.set('gemini', new GeminiSpeechProvider(geminiConfig.api_key));
    }

    // Kokoro requires no API key (client-side only)
    registry.set('kokoro', new KokoroSpeechProvider());

    return registry;
  }, [getProviderConfig]);

  const engine = useMemo(() => {
    return registry.get(speechConfig.provider);
  }, [registry, speechConfig.provider]);

  const getProviders = useCallback(() => {
    return Array.from(registry.values());
  }, [registry]);

  // Construct Voice object from speech config
  const voice = useMemo<Voice | undefined>(() => {
    if (!speechConfig.voice_id || !speechConfig.voice_name) {
      return undefined;
    }
    return {
      id: speechConfig.voice_id,
      name: speechConfig.voice_name,
      language: 'en-US', // Default, could be enhanced later
    };
  }, [speechConfig.voice_id, speechConfig.voice_name]);

  // Pre-open the first socket so the very first utterance skips the handshake.
  useEffect(() => {
    if (WS_TTS_DISABLED || engine?.id !== 'elevenlabs' || !voice?.id) return;
    getWsConnection().prewarm(
      elevenLabsStreamParams(voice.id, speechConfig.settings as ElevenLabsSettings)
    );
  }, [engine?.id, voice?.id, speechConfig.settings]);

  const generateSpeech = useCallback(
    (text: string, options?: SpeechOptions, context?: { previous_text?: string }) => {
      if (!engine) return undefined;

      const startTime = performance.now();

      const promise = engine.generateSpeech({
        text,
        voice: voice,
        options: { ...speechConfig.settings, ...options } as SpeechOptions,
        previous_text: context?.previous_text,
      });

      if (!promise) return undefined;

      // Log TTS generation event after completion
      promise
        .then(result => {
          if (user?.id && result) {
            const latencyMs = Math.round(performance.now() - startTime);
            // Estimate duration from blob size (16kHz, 16-bit audio = 2 bytes per sample)
            const durationSeconds =
              result.blob && typeof result.blob === 'object' && 'size' in result.blob
                ? (result.blob as Blob).size / (16000 * 2)
                : 0;

            track(user.id, {
              type: 'tts_generation',
              provider: speechConfig.provider === 'elevenlabs' ? 'elevenlabs' : undefined,
              voice_id: speechConfig.voice_id,
              text_length: text.length,
              duration_seconds: durationSeconds,
              latency_ms: latencyMs,
              success: true,
            });
          }
        })
        .catch(error => {
          console.error('TTS generation error:', error);
        });

      return promise;
    },
    [engine, voice, speechConfig.settings, speechConfig.provider, speechConfig.voice_id, user]
  );

  const generateSpeechStream = useCallback(
    (text: string, options?: SpeechOptions, context?: { previous_text?: string }) => {
      if (WS_TTS_DISABLED || !engine?.generateSpeechStream || !voice?.id) return undefined;
      const conn = getWsConnection();

      const settings = { ...speechConfig.settings, ...options } as ElevenLabsSettings;
      const startTime = performance.now();

      // The hook owns live playback because it knows the PCM sample rate.
      const player = new PcmStreamPlayer(
        sampleRateForFormat(settings.output_format || 'pcm_22050'),
        selectedOutputDeviceId ?? undefined
      );
      const hooks: SpeechStreamHooks = { onAudioChunk: int16 => player.push(int16) };

      const promise = (async () => {
        try {
          const socket = await conn.acquire(elevenLabsStreamParams(voice.id!, settings));
          const result = await engine.generateSpeechStream!(
            { text, voice, options: settings, previous_text: context?.previous_text },
            hooks,
            socket
          );
          player.end();
          return result;
        } catch (err) {
          player.stop();
          throw err;
        }
      })();

      promise
        .then(result => {
          if (user?.id && result) {
            track(user.id, {
              type: 'tts_generation',
              provider: 'elevenlabs',
              voice_id: speechConfig.voice_id,
              text_length: text.length,
              duration_seconds: 0,
              latency_ms: Math.round(performance.now() - startTime),
              success: true,
            });
          }
        })
        .catch(() => {
          // Surfaced to the caller, which falls back to REST.
        });

      return promise;
    },
    [engine, voice, speechConfig.settings, speechConfig.voice_id, user, selectedOutputDeviceId]
  );

  const listVoices = useCallback(
    (request: ListVoicesRequest) => {
      const providerApiKey = getProviderConfig(speechConfig.provider as AIProvider)?.api_key;
      return engine?.listVoices({
        ...request,
        apiKey: request.apiKey || providerApiKey,
      });
    },
    [engine, speechConfig.provider, getProviderConfig]
  );

  const getProvider = useCallback(
    (id: string) => {
      return registry.get(id);
    },
    [registry]
  );

  return { listVoices, getProviders, generateSpeech, generateSpeechStream, getProvider };
}
