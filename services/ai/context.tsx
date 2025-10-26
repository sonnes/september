'use client';

import { ReactNode, createContext, useContext, useMemo } from 'react';

import { useAccount } from '@/services/account';

import type { SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';

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

  // API Key Status
  hasGeminiApiKey: boolean;
  hasElevenLabsApiKey: boolean;

  // Update functions
  updateSuggestions: (config: Partial<SuggestionsConfig>) => Promise<void>;
  updateTranscription: (config: Partial<TranscriptionConfig>) => Promise<void>;
  updateSpeech: (config: Partial<SpeechConfig>) => Promise<void>;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

interface AISettingsProviderProps {
  children: ReactNode;
}

export function AISettingsProvider({ children }: AISettingsProviderProps) {
  const { account, updateAccount } = useAccount();

  // Memoized configurations with fallbacks to defaults
  const suggestions = useMemo(() => {
    if (account?.ai_suggestions) {
      return {
        ...DEFAULT_SUGGESTIONS_CONFIG,
        ...account.ai_suggestions,
        settings: {
          ...DEFAULT_SUGGESTIONS_CONFIG.settings,
          ...account.ai_suggestions.settings,
        },
      };
    }
    return DEFAULT_SUGGESTIONS_CONFIG;
  }, [account?.ai_suggestions]);

  const transcription = useMemo(() => {
    if (account?.ai_transcription) {
      return {
        ...DEFAULT_TRANSCRIPTION_CONFIG,
        ...account.ai_transcription,
        settings: {
          ...DEFAULT_TRANSCRIPTION_CONFIG.settings,
          ...account.ai_transcription.settings,
        },
      };
    }
    return DEFAULT_TRANSCRIPTION_CONFIG;
  }, [account?.ai_transcription]);

  const speech = useMemo(() => {
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
  }, [account?.ai_speech]);

  // API Key status checks
  const hasGeminiApiKey = Boolean(account?.ai_providers?.gemini?.api_key);
  const hasElevenLabsApiKey = Boolean(account?.ai_providers?.eleven_labs?.api_key);

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

  const contextValue: AISettingsContextType = {
    suggestions,
    transcription,
    speech,
    hasGeminiApiKey,
    hasElevenLabsApiKey,
    updateSuggestions,
    updateTranscription,
    updateSpeech,
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
