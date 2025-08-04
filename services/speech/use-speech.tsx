import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccountContext } from '@/components/context/account-provider';

import { SpeechProvider } from '.';
import { BrowserSpeechProvider } from './provider-browser';

const browser = new BrowserSpeechProvider();
const providers: Map<string, SpeechProvider> = new Map([['browser', browser]]);

export function useSpeech() {
  const [engine, setEngine] = useState<SpeechProvider>(browser);

  const { account } = useAccountContext();

  useEffect(() => {
    if (account.speech_provider) {
      setEngine(providers.get(account.speech_provider) || browser);
    }
  }, [account.speech_provider]);

  const getProviders = useCallback(() => {
    return [browser];
  }, []);

  const setProvider = useCallback((providerId: string) => {
    setEngine(providers.get(providerId) || browser);
  }, []);

  return { engine, getProviders, setProvider };
}
