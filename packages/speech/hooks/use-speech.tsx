import { useCallback, useMemo } from 'react';

import { useAISettings } from '@/components/settings/context';
import type { AIProvider } from '@/types/ai-config';
import type { Voice } from '@/types/voice';

import { BrowserSpeechProvider } from '../lib/providers/browser';
import { ElevenLabsSpeechProvider } from '../lib/providers/elevenlabs';
import { GeminiSpeechProvider } from '../lib/providers/gemini';
import { ListVoicesRequest, SpeechOptions, SpeechProvider } from '../types';

const browser = new BrowserSpeechProvider();

export function useSpeech() {
  const { speechConfig, getProviderConfig } = useAISettings();

  const registry = useMemo(() => {
    const registry = new Map<string, SpeechProvider>();

    registry.set('browser', browser);

    const elevenlabsConfig = getProviderConfig('elevenlabs');
    const geminiConfig = getProviderConfig('gemini');

    if (elevenlabsConfig && elevenlabsConfig.api_key) {
      registry.set('elevenlabs', new ElevenLabsSpeechProvider(elevenlabsConfig.api_key));
    }
    if (geminiConfig && geminiConfig.api_key) {
      registry.set('gemini', new GeminiSpeechProvider(geminiConfig.api_key));
    }

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
      return engine?.generateSpeech({
        text,
        voice: voice,
        options: { ...speechConfig.settings, ...options } as SpeechOptions,
      });
    },
    [engine, voice, speechConfig.settings]
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

