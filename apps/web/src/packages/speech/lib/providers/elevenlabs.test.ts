import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElevenLabsSpeechProvider } from './elevenlabs';

const voice = { id: 'voice-123', name: 'Test', language: 'en-US' };

function mockFetchOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ audio_base64: 'AAAA', alignment: undefined }),
  } as unknown as Response);
}

describe('ElevenLabsSpeechProvider.generateSpeech', () => {
  let fetchMock: ReturnType<typeof mockFetchOk>;

  beforeEach(() => {
    fetchMock = mockFetchOk();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function bodyOf() {
    return JSON.parse(fetchMock.mock.calls[0][1].body as string);
  }

  it('includes previous_text in the request body when supplied', async () => {
    const provider = new ElevenLabsSpeechProvider('key');
    await provider.generateSpeech({
      text: 'Second message',
      voice,
      options: {},
      previous_text: 'First message',
    });

    expect(bodyOf().previous_text).toBe('First message');
  });

  it('omits previous_text when not supplied', async () => {
    const provider = new ElevenLabsSpeechProvider('key');
    await provider.generateSpeech({ text: 'Hello', voice, options: {} });

    expect(bodyOf()).not.toHaveProperty('previous_text');
  });
});
