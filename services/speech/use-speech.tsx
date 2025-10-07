import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccount } from '@/services/account/context';

import { BrowserTTSSettings, ElevenLabsSettings, GeminiSpeechSettings } from '@/types/account';

import { BrowserSpeechProvider } from './provider-browser';
import { ElevenLabsSpeechProvider } from './provider-elevenlabs';
import { GeminiSpeechProvider } from './provider-gemini';
import { ListVoicesRequest, SpeechOptions, SpeechProvider } from './types';

export function useSpeech() {
  const { account } = useAccount();

  const browser = new BrowserSpeechProvider();

  const providers = useMemo(() => {
    const elevenlabs = new ElevenLabsSpeechProvider(account?.speech_settings?.api_key);
    const gemini = new GeminiSpeechProvider(account?.speech_settings?.api_key);

    return new Map<string, SpeechProvider>([
      ['browser_tts', browser],
      ['elevenlabs', elevenlabs],
      ['gemini', gemini],
    ]);
  }, [account?.speech_provider]);

  const engine = useMemo(() => {
    return providers.get(account?.speech_provider || 'browser_tts') || browser;
  }, [account?.speech_provider]);

  const getProviders = useCallback(() => {
    return Array.from(providers.values());
  }, []);

  const getProvider = useCallback((id: string) => {
    return providers.get(id);
  }, []);

  const generateSpeech = useCallback(
    (text: string, options?: SpeechOptions) => {
      return engine.generateSpeech({
        text,
        voice: account?.voice,
        options: { ...account?.speech_settings, ...options },
      });
    },
    [engine]
  );

  const listVoices = useCallback(
    (request: ListVoicesRequest) => {
      return engine.listVoices(request);
    },
    [engine]
  );

  return { listVoices, getProviders, generateSpeech, getProvider };
}
