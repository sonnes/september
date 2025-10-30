import { useCallback, useMemo } from 'react';

import { useAISettings } from '@/services/ai/context';

import type { AIProvider } from '@/types/ai-config';
import type { Voice } from '@/types/voice';

import { BrowserSpeechProvider } from './provider-browser';
import { ElevenLabsSpeechProvider } from './provider-elevenlabs';
import { GeminiSpeechProvider } from './provider-gemini';
import { ListVoicesRequest, SpeechOptions, SpeechProvider } from './types';

export function useSpeech() {
  const { speech, getProviderConfig } = useAISettings();

  const browser = new BrowserSpeechProvider();

  const providers = useMemo(() => {
    const elevenlabsApiKey = getProviderConfig('elevenlabs')?.api_key;
    const geminiApiKey = getProviderConfig('gemini')?.api_key;

    const elevenlabs = new ElevenLabsSpeechProvider(elevenlabsApiKey);
    const gemini = new GeminiSpeechProvider(geminiApiKey);

    return new Map<string, SpeechProvider>([
      ['browser', browser],
      ['elevenlabs', elevenlabs],
      ['gemini', gemini],
    ]);
  }, [getProviderConfig]);

  const engine = useMemo(() => {
    return providers.get(speech.provider);
  }, [providers, speech.provider]);

  const getProviders = useCallback(() => {
    return Array.from(providers.values());
  }, [providers]);

  const getProvider = useCallback(
    (id: string) => {
      return providers.get(id);
    },
    [providers]
  );

  // Construct Voice object from speech config
  const voice = useMemo<Voice | undefined>(() => {
    if (!speech.voice_id || !speech.voice_name) {
      return undefined;
    }
    return {
      id: speech.voice_id,
      name: speech.voice_name,
      language: 'en-US', // Default, could be enhanced later
    };
  }, [speech.voice_id, speech.voice_name]);

  const generateSpeech = useCallback(
    (text: string, options?: SpeechOptions) => {
      return engine?.generateSpeech({
        text,
        voice: voice,
        options: { ...speech.settings, ...options } as SpeechOptions,
      });
    },
    [engine, voice, speech.settings]
  );

  const listVoices = useCallback(
    (request: ListVoicesRequest) => {
      // Inject API key from provider config if not provided
      const providerApiKey = getProviderConfig(speech.provider as AIProvider)?.api_key;
      return engine?.listVoices({
        ...request,
        apiKey: request.apiKey || providerApiKey,
      });
    },
    [engine, speech.provider, getProviderConfig]
  );

  return { listVoices, getProviders, generateSpeech, getProvider };
}
