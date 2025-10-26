/**
 * AI Provider Registry
 * Central configuration for all AI providers used in September
 */

export interface AIProviderMetadata {
  /** Unique identifier for the provider */
  id: string;

  /** Display name */
  name: string;

  /** Brief description of what this provider is used for */
  description: string;

  /** URL where users can get an API key */
  apiKeyUrl: string;

  /** Field name for API key in the form */
  apiKeyField: string;

  /** Field name for base URL in the form */
  baseUrlField: string;

  /** Field name in ai_providers config */
  configKey: 'gemini' | 'eleven_labs' | 'openai' | 'anthropic' | 'whisper' | 'assembly_ai';

  /** Whether this provider requires an API key */
  requiresApiKey: boolean;

  /** Default base URL (optional) */
  defaultBaseUrl?: string;
}

/**
 * Registry of all supported AI providers
 * To add a new provider, simply add an entry here
 */
export const AI_PROVIDER_REGISTRY: AIProviderMetadata[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Used for AI-powered suggestions and transcription',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyField: 'gemini_api_key',
    baseUrlField: 'gemini_base_url',
    configKey: 'gemini',
    requiresApiKey: true,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Used for high-quality text-to-speech synthesis',
    apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    apiKeyField: 'elevenlabs_api_key',
    baseUrlField: 'elevenlabs_base_url',
    configKey: 'eleven_labs',
    requiresApiKey: true,
  },
  // Adding new providers is as simple as adding entries here:
  // {
  //   id: 'openai',
  //   name: 'OpenAI',
  //   description: 'Used for GPT-powered suggestions and Whisper transcription',
  //   apiKeyUrl: 'https://platform.openai.com/api-keys',
  //   apiKeyField: 'openai_api_key',
  //   baseUrlField: 'openai_base_url',
  //   configKey: 'openai',
  //   requiresApiKey: true,
  // },
];

/**
 * Get provider metadata by ID
 */
export function getProviderById(id: string): AIProviderMetadata | undefined {
  return AI_PROVIDER_REGISTRY.find(p => p.id === id);
}

/**
 * Get all providers that require API keys
 */
export function getProvidersWithApiKeys(): AIProviderMetadata[] {
  return AI_PROVIDER_REGISTRY.filter(p => p.requiresApiKey);
}
