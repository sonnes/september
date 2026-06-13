export { AISettingsProvider, useAISettings } from './settings';
export { extractText } from './lib/extract-text';
export { startOpenRouterAuth, completeOpenRouterAuth } from './lib/openrouter-oauth';
export {
  useGenerate,
  useTranscribe,
  type GenerateObjectParams,
  type GenerateTextParams,
  type UseGenerateOptions,
  type UseGenerateReturn,
  type UseTranscribeReturn,
} from './generation';
export {
  AI_PROVIDERS,
  getModelsForProvider,
  getProvidersForFeature,
  supportsFeature,
} from './providers';
export {
  AIProvidersForm,
  ProviderSection,
  TranscriptionForm,
  type TranscriptionFormData,
} from './components';
export {
  AIProvidersSchema,
  AISettingsSchema,
  SpeechProviderSchema,
  SpeechSettingsSchema,
  type AIProvidersFormData,
} from './schemas';
