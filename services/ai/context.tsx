'use client';

import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react';

import { useAccount } from '@/services/account';

import { Account } from '@/types/account';
import type {
  AIProvider,
  SpeechConfig,
  SuggestionsConfig,
  TranscriptionConfig,
} from '@/types/ai-config';

import {
  DEFAULT_SPEECH_CONFIG,
  DEFAULT_SUGGESTIONS_CONFIG,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from './defaults';

interface AISettingsContextType {
  // AI Feature Configurations
  suggestions: SuggestionsConfig;
  transcription: TranscriptionConfig;
  speech: SpeechConfig;

  // Update functions
  updateSuggestions: (config: Partial<SuggestionsConfig>) => Promise<void>;
  updateTranscription: (config: Partial<TranscriptionConfig>) => Promise<void>;
  updateSpeech: (config: Partial<SpeechConfig>) => Promise<void>;

  // Provider Configurations
  getProviderConfig: (provider: AIProvider) => { api_key?: string; base_url?: string };
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
  const { account, updateAccount } = useAccount();

  // Memoized configurations using helper functions
  const suggestions = useMemo(() => {
    return account ? getSuggestionsConfig(account) : DEFAULT_SUGGESTIONS_CONFIG;
  }, [account]);

  const transcription = useMemo(() => {
    return account ? getTranscriptionConfig(account) : DEFAULT_TRANSCRIPTION_CONFIG;
  }, [account]);

  const speech = useMemo(() => {
    return account ? getSpeechConfig(account) : DEFAULT_SPEECH_CONFIG;
  }, [account]);

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
    (provider: AIProvider): { api_key?: string; base_url?: string } => {
      if (provider === 'browser') return {};
      return account?.ai_providers?.[provider] as { api_key?: string; base_url?: string };
    },
    [account]
  );

  const contextValue: AISettingsContextType = {
    suggestions,
    transcription,
    speech,
    updateSuggestions,
    updateTranscription,
    updateSpeech,
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
