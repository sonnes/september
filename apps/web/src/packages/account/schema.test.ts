import { describe, expect, it } from 'vitest';

import { SpeechConfigSchema, TranscriptionConfigSchema } from './schema';

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
