import type { Account } from '@/types/account';
import type { SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';

import {
  DEFAULT_SPEECH_CONFIG,
  DEFAULT_SUGGESTIONS_CONFIG,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from './defaults';

/**
 * Get suggestions configuration from account with fallback to defaults
 */
export function getSuggestionsConfig(account: Account): SuggestionsConfig {
  if (account.ai_suggestions) {
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
}

/**
 * Get transcription configuration from account with fallback to defaults
 */
export function getTranscriptionConfig(account: Account): TranscriptionConfig {
  if (account.ai_transcription) {
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
}

/**
 * Get speech configuration from account with fallback to defaults
 */
export function getSpeechConfig(account: Account): SpeechConfig {
  if (account.ai_speech) {
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
}
