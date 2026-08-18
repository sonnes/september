import { BROWSER_LOCAL_AI_PROVIDERS } from '@/packages/ai/lib/local-providers';
import { AIFeature, AIProvider, AIServiceProvider } from '@/packages/shared';

import { OPENROUTER_FREE_MODELS, OPENROUTER_FREE_STACK_ID } from './openrouter-model';

/**
 * Registry of all supported AI providers
 */
const PROVIDER_DEFINITIONS: Partial<Record<AIProvider, AIServiceProvider>> = {
  browser: {
    id: 'browser',
    name: 'Browser',
    description: 'Native browser text-to-speech. No API key required.',
    features: ['speech'],
    requires_api_key: false,
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: "Google's multimodal AI models",
    features: ['ai', 'transcription', 'speech'],
    requires_api_key: true,
    api_key_url: 'https://aistudio.google.com/app/apikey',
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

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'One key for 300+ models (Claude, Gemini, GPT, Llama). Connect in one click.',
    features: ['ai', 'transcription'],
    requires_api_key: true,
    oauth: true,
    api_key_url: 'https://openrouter.ai/keys',
    models: [
      {
        id: OPENROUTER_FREE_STACK_ID,
        name: 'Free (recommended)',
        description: 'Free models with automatic fallback. No cost beyond connecting OpenRouter.',
      },
      ...OPENROUTER_FREE_MODELS,
      {
        id: 'google/gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Fast, cheap — good default for suggestions and transcription',
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Stronger multimodal model (supports audio transcription)',
      },
      {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        description: 'Fast Anthropic model with strong structured output',
      },
      {
        id: 'openai/gpt-5.4-mini',
        name: 'GPT-5.4 mini',
        description: 'Cost-effective OpenAI model',
      },
    ],
  },

  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'High-quality, realistic voice synthesis.',
    features: ['transcription', 'voice-cloning', 'speech'],
    requires_api_key: true,
    api_key_url: 'https://elevenlabs.io/app/settings/keys',
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
};

export function createAIProviderRegistry(
  includeBrowserLocalProviders = true
): Partial<Record<AIProvider, AIServiceProvider>> {
  return {
    ...PROVIDER_DEFINITIONS,
    ...(includeBrowserLocalProviders ? BROWSER_LOCAL_AI_PROVIDERS : {}),
  };
}

// Vite replaces MODE at build time. Desktop builds therefore expose only the
// providers they can execute; existing provider-driven forms hide the rest.
export const AI_PROVIDERS = createAIProviderRegistry(import.meta.env.MODE !== 'tauri') as Record<
  AIProvider,
  AIServiceProvider
>;

export function resolveAvailableProvider(
  provider: AIProvider,
  feature: AIFeature,
  fallback: AIProvider,
  providers: Partial<Record<AIProvider, AIServiceProvider>> = AI_PROVIDERS
): AIProvider {
  return providers[provider]?.features.includes(feature) ? provider : fallback;
}

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
