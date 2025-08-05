import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';

import { SpeechOptions, SpeechProvider } from '.';
import { BrowserSpeechProvider } from './provider-browser';
import { ElevenLabsSpeechProvider } from './provider-elevenlabs';

const browser = new BrowserSpeechProvider();
const elevenlabs = new ElevenLabsSpeechProvider();

const providers = new Map<string, SpeechProvider>([
  ['browser_tts', browser],
  ['elevenlabs', elevenlabs],
]);

export function useSpeech() {
  const { account } = useAccountContext();

  const getSettings = useCallback((providerId: string) => {
    if (providerId === 'browser_tts') {
      return account.browser_tts_settings;
    }
    return account.elevenlabs_settings;
  }, [account]);

  const [engine, setEngine] = useState<SpeechProvider>(browser);

  useEffect(() => {
    if (account.speech_provider) {
      setEngine(providers.get(account.speech_provider) || browser);
    }
  }, [account.speech_provider]);

  useEffect(() => {
    if (account.elevenlabs_settings?.api_key) {
      elevenlabs.setApiKey(account.elevenlabs_settings.api_key);
    }
  }, [account.elevenlabs_settings?.api_key]);

  const getProviders = useCallback(() => {
    return Array.from(providers.values());
  }, []);

  const setProvider = useCallback((providerId: string) => {
    setEngine(providers.get(providerId) || browser);
  }, []);

  const generateSpeech = useCallback((text: string, options: SpeechOptions) => {
    const settings = getSettings(engine.id);
    return engine.generateSpeech({ text, options: { ...settings, ...options } });
  }, [engine, getSettings]);

  const getVoices = useCallback(() => {
    return engine.getVoices();
  }, [engine]);

  return { getVoices, getProviders, setProvider, generateSpeech };
}
