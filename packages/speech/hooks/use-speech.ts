'use client';

import { useCallback, useMemo } from 'react';

import { useAccountContext } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { logTTSGeneration } from '@/packages/analytics';
import type { AIProvider } from '@/types/ai-config';
import type { Voice } from '@/types/voice';

import { BrowserSpeechProvider } from '@/packages/speech/lib/providers/browser';
import { KokoroSpeechProvider } from '@/packages/speech/lib/providers/kokoro';
import { ElevenLabsSpeechProvider } from '@/packages/speech/lib/providers/elevenlabs';
import { GeminiSpeechProvider } from '@/packages/speech/lib/providers/gemini';
import { ListVoicesRequest, SpeechEngine, SpeechOptions, SpeechResponse } from '@/packages/speech/types';

const browser = new BrowserSpeechProvider();

export interface UseSpeechReturn {
  listVoices: (request: ListVoicesRequest) => Promise<Voice[]> | undefined;
  getProviders: () => SpeechEngine[];
  generateSpeech: (text: string, options?: SpeechOptions) => Promise<SpeechResponse> | undefined;
  getProvider: (id: string) => SpeechEngine | undefined;
}

export function useSpeech(): UseSpeechReturn {
  const { user } = useAccountContext();
  const { speechConfig, getProviderConfig } = useAISettings();

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

  const generateSpeech = useCallback(
    (text: string, options?: SpeechOptions) => {
      if (!engine) return undefined;

      const startTime = performance.now();

      const promise = engine.generateSpeech({
        text,
        voice: voice,
        options: { ...speechConfig.settings, ...options } as SpeechOptions,
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

            logTTSGeneration(user.id, {
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

  return { listVoices, getProviders, generateSpeech, getProvider };
}
