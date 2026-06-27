import { describe, expect, it } from 'vitest';

import type { AIProvidersFormData } from '@/packages/ai';

import { buildProviderConfig, getProviderDefaultValues } from './provider-config';

describe('buildProviderConfig', () => {
  it('keeps only providers that have a key, including optional base_url', () => {
    const data = {
      gemini_api_key: 'g-key',
      gemini_base_url: '',
      openrouter_api_key: 'or-key',
      openrouter_base_url: 'https://proxy.example',
      elevenlabs_api_key: '',
      elevenlabs_base_url: '',
    } as unknown as AIProvidersFormData;

    expect(buildProviderConfig(data)).toEqual({
      gemini: { api_key: 'g-key' },
      openrouter: { api_key: 'or-key', base_url: 'https://proxy.example' },
    });
  });

  it('returns an empty object when no keys are provided', () => {
    expect(buildProviderConfig({} as AIProvidersFormData)).toEqual({});
  });
});

describe('getProviderDefaultValues', () => {
  it('seeds form fields from existing provider config', () => {
    const values = getProviderDefaultValues({ openrouter: { api_key: 'or-key' } });
    expect(values.openrouter_api_key).toBe('or-key');
    expect(values.gemini_api_key).toBe('');
  });
});
