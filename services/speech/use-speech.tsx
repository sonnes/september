import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';

import { SpeechProvider } from '.';
import { BrowserSpeechProvider } from './provider-browser';
import { ElevenLabsSpeechProvider } from './provider-elevenlabs';

const browser = new BrowserSpeechProvider();
const elevenlabs = new ElevenLabsSpeechProvider();

const providers = new Map<string, SpeechProvider>([
  ['browser', browser],
  ['elevenlabs', elevenlabs],
]);

export function useSpeech() {
  const { account } = useAccountContext();

  const [engine, setEngine] = useState<SpeechProvider>(browser);

  useEffect(() => {
    if (account.speech_provider) {
      setEngine(providers.get(account.speech_provider) || browser);
    }
  }, [account.speech_provider]);

  useEffect(() => {
    if (account.elevenlabs_api_key) {
      elevenlabs.setApiKey(account.elevenlabs_api_key);
    }
  }, [account.elevenlabs_api_key]);

  const getProviders = useCallback(() => {
    return Array.from(providers.values());
  }, []);

  const setProvider = useCallback((providerId: string) => {
    setEngine(providers.get(providerId) || browser);
  }, []);

  return { engine, getProviders, setProvider };
}
