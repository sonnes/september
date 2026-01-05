import { AIFeature, AIProvider, AIServiceProvider } from '@/types/ai-config';

/**
 * Registry of all supported AI providers
 */
export const AI_PROVIDERS: Record<AIProvider, AIServiceProvider> = {
  browser: {
    id: 'browser',
    name: 'Browser',
    description: 'Native browser text-to-speech. No API key required.',
    features: ['speech'],
    requires_api_key: false,
  },

  webllm: {
    id: 'webllm',
    name: 'Browser AI (Local)',
    description: 'Open-source, browser-based AI provider. No API key required.',
    features: ['ai', 'transcription', 'speech'],
    requires_api_key: false,
    models: [
      {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 1B (Fast)',
        description: 'Very fast, good for simple tasks (880MB VRAM)',
      },
      {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 3B (Balanced)',
        description: 'Better reasoning, still fast (2.3GB VRAM)',
      },
      {
        id: 'SmolLM2-135M-Instruct-q0f16-MLC',
        name: 'SmolLM2 135M (Tiny)',
        description: 'Instant, extremely low resource (360MB VRAM)',
      },
      {
        id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
        name: 'SmolLM2 360M (Very Small)',
        description: 'Very fast, basic tasks (380MB VRAM)',
      },
      {
        id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
        name: 'SmolLM2 1.7B',
        description: 'Good small model (1.8GB VRAM)',
      },
      {
        id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        name: 'Qwen 2.5 0.5B',
        description: 'High performance for size (950MB VRAM)',
      },
      {
        id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        name: 'Qwen 2.5 1.5B',
        description: 'Strong small model (1.6GB VRAM)',
      },
      {
        id: 'gemma-2-2b-it-q4f16_1-MLC-1k',
        name: 'Gemma 2 2B',
        description: 'Google open model (1.6GB VRAM)',
      },
      {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k',
        name: 'Phi 3.5 Mini',
        description: 'Microsoft efficient model (2.5GB VRAM)',
      },
      {
        id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k',
        name: 'TinyLlama 1.1B',
        description: 'Classic small model (680MB VRAM)',
      },
    ],
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

  kokoro: {
    id: 'kokoro',
    name: 'Kokoro TTS',
    description: 'Client-side text-to-speech using Kokoro model. Runs locally via WebGPU, no API key required.',
    features: ['speech'],
    requires_api_key: false,
    models: [
      {
        id: 'kokoro-82m-v1.0',
        name: 'Kokoro 82M v1.0',
        description: 'High-quality English TTS model (28 voices, US & UK)',
      },
    ],
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
