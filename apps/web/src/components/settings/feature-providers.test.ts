import { describe, expect, it } from 'vitest';

import {
  defaultModelFor,
  featureProviderOptions,
  poweredByNote,
} from './feature-providers';

const accountWith = (providers: Record<string, { api_key?: string }>) =>
  ({ ai_providers: providers }) as never;

describe('featureProviderOptions', () => {
  it('lists voice providers with on-device options first', () => {
    const options = featureProviderOptions('voice', accountWith({}));
    expect(options.map(o => o.id)).toEqual(['browser', 'kokoro', 'elevenlabs', 'gemini']);
  });

  it('marks keyless providers as always connected', () => {
    const options = featureProviderOptions('voice', accountWith({}));
    expect(options.find(o => o.id === 'browser')?.connected).toBe(true);
    expect(options.find(o => o.id === 'kokoro')?.connected).toBe(true);
    expect(options.find(o => o.id === 'elevenlabs')?.connected).toBe(false);
  });

  it('marks key-based providers connected only when a key exists', () => {
    const options = featureProviderOptions(
      'writing',
      accountWith({ openrouter: { api_key: 'or' } })
    );
    expect(options.find(o => o.id === 'openrouter')?.connected).toBe(true);
    expect(options.find(o => o.id === 'gemini')?.connected).toBe(false);
    expect(options.find(o => o.id === 'webllm')?.connected).toBe(true);
  });

  it('flags on-device providers', () => {
    const voice = featureProviderOptions('voice', accountWith({}));
    const listening = featureProviderOptions('listening', accountWith({}));
    expect(voice.find(o => o.id === 'kokoro')?.onDevice).toBe(true);
    expect(voice.find(o => o.id === 'elevenlabs')?.onDevice).toBe(false);
    expect(listening.find(o => o.id === 'whisper')?.onDevice).toBe(true);
  });

  it('lists listening providers with whisper first', () => {
    const options = featureProviderOptions('listening', accountWith({}));
    expect(options.map(o => o.id)).toEqual(['whisper', 'gemini', 'openrouter']);
  });
});

describe('poweredByNote', () => {
  it('names the mode that made the choice', () => {
    expect(poweredByNote('privacy')).toContain('Privacy mode');
    expect(poweredByNote('free')).toContain('Free AI mode');
    expect(poweredByNote('advanced')).toContain('your choice');
  });
});

describe('defaultModelFor', () => {
  it('returns the first registry model for a provider', () => {
    expect(defaultModelFor('gemini')).toBe('gemini-2.5-flash-lite');
    expect(defaultModelFor('whisper')).toBe('onnx-community/whisper-base');
    expect(defaultModelFor('webllm')).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
  });

  it('returns undefined for providers without models', () => {
    expect(defaultModelFor('browser')).toBeUndefined();
  });
});
