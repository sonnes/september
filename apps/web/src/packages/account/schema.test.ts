import { describe, expect, it } from 'vitest';

import { AccountSchema, SpeechConfigSchema, TranscriptionConfigSchema } from './schema';

describe('AccountSchema', () => {
  it('accepts an optional setup_mode', () => {
    const base = { id: 'a1', name: 'Ravi' };
    expect(AccountSchema.parse(base).setup_mode).toBeUndefined();
    expect(AccountSchema.parse({ ...base, setup_mode: 'privacy' }).setup_mode).toBe('privacy');
    expect(AccountSchema.parse({ ...base, setup_mode: 'free' }).setup_mode).toBe('free');
    expect(AccountSchema.parse({ ...base, setup_mode: 'advanced' }).setup_mode).toBe('advanced');
    expect(() => AccountSchema.parse({ ...base, setup_mode: 'nope' })).toThrow();
  });
});

describe('SpeechConfigSchema', () => {
  it('preserves Kokoro settings keys (voice, speed, language)', () => {
    const parsed = SpeechConfigSchema.parse({
      provider: 'kokoro',
      voice_id: 'af_heart',
      voice_name: 'Heart',
      settings: { voice: 'af_heart', speed: 1.2, language: 'en-us' },
    });
    expect(parsed.settings).toEqual({ voice: 'af_heart', speed: 1.2, language: 'en-us' });
  });
});

describe('TranscriptionConfigSchema', () => {
  it('accepts the local whisper provider', () => {
    const parsed = TranscriptionConfigSchema.parse({
      enabled: true,
      provider: 'whisper',
      settings: {},
    });
    expect(parsed.provider).toBe('whisper');
  });
});
