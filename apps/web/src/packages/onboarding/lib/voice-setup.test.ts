import { describe, expect, it } from 'vitest';

import { shouldShowVoiceOptionDescription, shouldShowVoiceProviderConfig } from './voice-setup';

describe('voice setup', () => {
  it('shows provider config for extra voice services', () => {
    expect(shouldShowVoiceProviderConfig('browser')).toBe(false);
    expect(shouldShowVoiceProviderConfig('elevenlabs')).toBe(true);
    expect(shouldShowVoiceProviderConfig('gemini')).toBe(true);
  });

  it('keeps the voice picker compact by describing only the selected option', () => {
    expect(shouldShowVoiceOptionDescription('browser', 'elevenlabs')).toBe(false);
    expect(shouldShowVoiceOptionDescription('elevenlabs', 'elevenlabs')).toBe(true);
    expect(shouldShowVoiceOptionDescription('gemini', 'elevenlabs')).toBe(false);
  });
});
