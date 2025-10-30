import { AIFeature, AIProvider, AIServiceProvider } from '@/types/ai-config';

/**
 * Registry of all supported AI providers
 */
export const AI_PROVIDERS: Record<AIProvider, AIServiceProvider> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: "Google's multimodal AI models",
    features: ['suggestions', 'transcription', 'speech'],
    requires_api_key: true,
    models: [
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Fast, cost-effective for suggestions and transcription',
      },
      {
        id: 'gemini-2.5-flash-preview-tts',
        name: 'Gemini 2.5 Flash Preview TTS',
        description: 'Text-to-speech with natural voices',
      },
      {
        id: 'gemini-2.5-pro-preview-tts',
        name: 'Gemini 2.5 Pro Preview TTS',
        description: 'High-quality text-to-speech',
      },
    ],
  },

  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs (High Quality, Requires API Key)',
    description: 'High-quality text-to-speech synthesis',
    features: ['speech'],
    requires_api_key: true,
    models: [
      {
        id: 'eleven_v3',
        name: 'Eleven v3',
        description: 'Latest generation model with improved quality',
      },
      {
        id: 'eleven_multilingual_v2',
        name: 'Eleven Multilingual v2',
        description: 'Supports multiple languages',
      },
      {
        id: 'eleven_flash_v2_5',
        name: 'Eleven Flash v2.5',
        description: 'Fast generation with good quality',
      },
      {
        id: 'eleven_flash_v2',
        name: 'Eleven Flash v2 (English Only)',
        description: 'Fast generation, English only',
      },
    ],
  },

  browser: {
    id: 'browser',
    name: 'Browser TTS (Free, No API Key)',
    description: 'Native browser text-to-speech (no API key required)',
    features: ['speech'],
    requires_api_key: false,
  },
};

/**
 * Get providers that support a specific feature
 */
export function getProvidersForFeature(feature: AIFeature): AIServiceProvider[] {
  return Object.values(AI_PROVIDERS).filter(provider => provider.features.includes(feature));
}

/**
 * Check if a provider supports a feature
 */
export function supportsFeature(provider: AIProvider, feature: AIFeature): boolean {
  return AI_PROVIDERS[provider]?.features.includes(feature) ?? false;
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: AIProvider) {
  return AI_PROVIDERS[provider]?.models ?? [];
}
