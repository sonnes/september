import { beforeEach, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => ({ speech: null as Record<string, unknown> | null }));

vi.mock('./os', async original => ({
  ...(await original<typeof import('./os')>()),
  currentSpeech: () => saved.speech,
  currentSetup: () => ({ voiceService: 'elevenlabs' }),
}));

import { speechSettings } from './speech';

beforeEach(() => {
  saved.speech = null;
});

it('speaks with Eleven Flash v2.5 before the user chooses a model', () => {
  expect(speechSettings().modelId).toBe('eleven_flash_v2_5');
});

it('reads a saved Turbo v2.5 model as Flash v2.5, because Turbo is deprecated', () => {
  saved.speech = { provider: 'elevenlabs', voiceId: 'voice-1', modelId: 'eleven_turbo_v2_5' };
  expect(speechSettings().modelId).toBe('eleven_flash_v2_5');
});

it('keeps a saved model that ElevenLabs still offers', () => {
  saved.speech = { provider: 'elevenlabs', voiceId: 'voice-1', modelId: 'eleven_v3' };
  expect(speechSettings().modelId).toBe('eleven_v3');
});
