import { SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';

export const DEFAULT_SUGGESTIONS_CONFIG: SuggestionsConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {
    temperature: 0.7,
    max_suggestions: 5,
    context_window: 10,
  },
};

export const DEFAULT_TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {
    detect_language: true,
    include_timestamps: false,
    filter_profanity: false,
  },
};

export const DEFAULT_SPEECH_CONFIG: SpeechConfig = {
  provider: 'browser', // Safe default for all users
  settings: {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    language: 'en-us',
  },
};
