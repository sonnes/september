import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRecordApiCall } = vi.hoisted(() => ({ mockRecordApiCall: vi.fn() }));

vi.mock('@/packages/usage', () => ({ recordApiCall: mockRecordApiCall }));

import { meterSpeech, speechModelId } from './meter';

describe('speechModelId', () => {
  it('uses the configured ElevenLabs model, defaulting to the one the provider sends', () => {
    expect(speechModelId('elevenlabs', { model_id: 'eleven_multilingual_v2' })).toBe(
      'eleven_multilingual_v2'
    );
    expect(speechModelId('elevenlabs', {})).toBe('eleven_flash_v2_5');
  });

  it('names the on-device engines so their calls are not attributed to a paid one', () => {
    expect(speechModelId('kokoro', {})).toBe('kokoro-82m-v1.0');
    expect(speechModelId('browser', {})).toBe('system');
  });

  it('uses the configured Gemini speech model', () => {
    expect(speechModelId('gemini', { model_id: 'gemini-2.5-pro-preview-tts' })).toBe(
      'gemini-2.5-pro-preview-tts'
    );
  });
});

describe('meterSpeech', () => {
  beforeEach(() => vi.clearAllMocks());

  const call = {
    provider: 'elevenlabs',
    model: 'eleven_flash_v2_5',
    voiceId: 'voice-xyz',
    text: 'a'.repeat(96),
  };

  it('records the call and resolves with the original result', async () => {
    const result = { blob: 'audio' };

    await expect(meterSpeech('user-1', call, Promise.resolve(result))).resolves.toBe(result);

    expect(mockRecordApiCall).toHaveBeenCalledOnce();
    const [userId, recorded] = mockRecordApiCall.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(recorded).toMatchObject({
      kind: 'speech',
      provider: 'elevenlabs',
      model: 'eleven_flash_v2_5',
      voice_id: 'voice-xyz',
      characters: 96,
      success: true,
    });
  });

  it('records the real provider for on-device speech', async () => {
    await meterSpeech(
      'user-1',
      { provider: 'kokoro', model: 'kokoro-82m-v1.0', text: 'hello' },
      Promise.resolve({})
    );

    const [, recorded] = mockRecordApiCall.mock.calls[0];
    expect(recorded.provider).toBe('kokoro');
    expect(recorded.characters).toBe(5);
  });

  it('records a failure and still rejects for the caller to handle', async () => {
    await expect(
      meterSpeech('user-1', call, Promise.reject(new Error('Socket closed')))
    ).rejects.toThrow('Socket closed');

    const [, recorded] = mockRecordApiCall.mock.calls[0];
    expect(recorded.success).toBe(false);
    expect(recorded.error_message).toBe('Socket closed');
  });

  it('records nothing when there is no signed-in user', async () => {
    await meterSpeech(undefined, call, Promise.resolve({}));

    expect(mockRecordApiCall).not.toHaveBeenCalled();
  });
});
