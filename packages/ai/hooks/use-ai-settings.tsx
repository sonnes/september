'use client';

import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

import { useAccountContext } from '@/packages/account';
import { Account } from '@/packages/account';
import type {
  AIProvider,
  ProviderConfig,
  SpeechConfig,
  SuggestionsConfig,
  TranscriptionConfig,
} from '@/types/ai-config';

import {
  DEFAULT_SPEECH_CONFIG,
  DEFAULT_SUGGESTIONS_CONFIG,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from '@/packages/ai/lib/defaults';

interface AISettingsContextType {
  // AI Feature Configurations
  suggestionsConfig: SuggestionsConfig;
  transcriptionConfig: TranscriptionConfig;
  speechConfig: SpeechConfig;

  // Update functions
  updateSuggestionsConfig: (config: Partial<SuggestionsConfig>) => Promise<void>;
  updateTranscriptionConfig: (config: Partial<TranscriptionConfig>) => Promise<void>;
  updateSpeechConfig: (config: Partial<SpeechConfig>) => Promise<void>;

  // Provider Configurations
  getProviderConfig: (provider: AIProvider) => ProviderConfig | undefined;
}

const getSpeechConfig = (account: Account) => {
  if (account?.ai_speech) {
    return {
      ...DEFAULT_SPEECH_CONFIG,
      ...account.ai_speech,
      settings: {
        ...DEFAULT_SPEECH_CONFIG.settings,
        ...account.ai_speech.settings,
      },
    };
  }
  return DEFAULT_SPEECH_CONFIG;
};

const getSuggestionsConfig = (account: Account) => {
  if (account?.ai_suggestions) {
    return {
      ...DEFAULT_SUGGESTIONS_CONFIG,
      ...account.ai_suggestions,
    };
  }
  return DEFAULT_SUGGESTIONS_CONFIG;
};

const getTranscriptionConfig = (account: Account) => {
  if (account?.ai_transcription) {
    return {
      ...DEFAULT_TRANSCRIPTION_CONFIG,
      ...account.ai_transcription,
    };
  }
  return DEFAULT_TRANSCRIPTION_CONFIG;
};

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

interface AISettingsProviderProps {
  children: ReactNode;
}

export function AISettingsProvider({ children }: AISettingsProviderProps) {
  const { account, updateAccount, loading } = useAccountContext();

  // Memoized configurations using helper functions
  // Use defaults while loading to avoid race conditions with incomplete data
  const suggestions = useMemo(() => {
    if (loading || !account) return DEFAULT_SUGGESTIONS_CONFIG;
    return getSuggestionsConfig(account);
  }, [account, loading]);

  const transcription = useMemo(() => {
    if (loading || !account) return DEFAULT_TRANSCRIPTION_CONFIG;
    return getTranscriptionConfig(account);
  }, [account, loading]);

  const speech = useMemo(() => {
    if (loading || !account) return DEFAULT_SPEECH_CONFIG;
    return getSpeechConfig(account);
  }, [account, loading]);

  // Update functions
  const updateSuggestions = async (config: Partial<SuggestionsConfig>) => {
    const updatedConfig = {
      ...suggestions,
      ...config,
      settings: {
        ...suggestions.settings,
        ...config.settings,
      },
    };
    await updateAccount({ ai_suggestions: updatedConfig });
  };

  const updateTranscription = async (config: Partial<TranscriptionConfig>) => {
    const updatedConfig = {
      ...transcription,
      ...config,
      settings: {
        ...transcription.settings,
        ...config.settings,
      },
    };
    await updateAccount({ ai_transcription: updatedConfig });
  };

  const updateSpeech = async (config: Partial<SpeechConfig>) => {
    const updatedConfig = {
      ...speech,
      ...config,
      settings: {
        ...speech.settings,
        ...config.settings,
      },
    };
    await updateAccount({ ai_speech: updatedConfig });
  };

  const getProviderConfig = useCallback(
    (provider: AIProvider): ProviderConfig | undefined => {
      if (provider === 'browser') return undefined;
      return account?.ai_providers?.[provider];
    },
    [account]
  );

  const contextValue: AISettingsContextType = {
    suggestionsConfig: suggestions,
    transcriptionConfig: transcription,
    speechConfig: speech,
    updateSuggestionsConfig: updateSuggestions,
    updateTranscriptionConfig: updateTranscription,
    updateSpeechConfig: updateSpeech,
    getProviderConfig,
  };

  return <AISettingsContext.Provider value={contextValue}>{children}</AISettingsContext.Provider>;
}

export function useAISettings() {
  const context = useContext(AISettingsContext);
  if (context === undefined) {
    throw new Error('useAISettings must be used within an AISettingsProvider');
  }
  return context;
}
