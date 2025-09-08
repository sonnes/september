import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccount } from '@/services/account/context';

import { BrowserTTSSettings, ElevenLabsSettings } from '@/types/account';

import { ListVoicesRequest, SpeechOptions, SpeechProvider } from '.';
import { BrowserSpeechProvider } from './provider-browser';
import { ElevenLabsSpeechProvider } from './provider-elevenlabs';

const browser = new BrowserSpeechProvider();
const elevenlabs = new ElevenLabsSpeechProvider();

const providers = new Map<string, SpeechProvider>([
  ['browser_tts', browser],
  ['elevenlabs', elevenlabs],
]);

export function useSpeech() {
  const { account } = useAccount();

  const getSettings = useCallback(
    (providerId: string) => {
      if (providerId === 'browser_tts') {
        return account.speech_settings as BrowserTTSSettings;
      }
      return account.speech_settings as ElevenLabsSettings;
    },
    [account]
  );

  const [engine, setEngine] = useState<SpeechProvider>(browser);

  useEffect(() => {
    if (account?.speech_provider) {
      setEngine(providers.get(account.speech_provider) || browser);
    }
  }, [account?.speech_provider]);

  const getProviders = useCallback(() => {
    return Array.from(providers.values());
  }, []);

  const setProvider = useCallback((providerId: string) => {
    setEngine(providers.get(providerId) || browser);
  }, []);

  const generateSpeech = useCallback(
    (text: string, options?: SpeechOptions) => {
      const settings = getSettings(engine.id);
      return engine.generateSpeech({ text, options: { ...settings, ...options } });
    },
    [engine, getSettings]
  );

  const getVoices = useCallback(() => {
    return engine.getVoices();
  }, [engine]);

  const listVoices = useCallback(
    (request: ListVoicesRequest) => {
      return engine.listVoices(request);
    },
    [engine]
  );

  return { getVoices, listVoices, getProviders, setProvider, generateSpeech };
}
