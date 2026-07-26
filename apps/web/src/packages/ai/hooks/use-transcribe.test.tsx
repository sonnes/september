import { beforeEach, describe, expect, it, vi } from 'vitest';

import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mockRecordApiCall, mockTranscribeLocally } = vi.hoisted(() => ({
  mockRecordApiCall: vi.fn(),
  mockTranscribeLocally: vi.fn(),
}));

vi.mock('@/packages/usage', () => ({ recordApiCall: mockRecordApiCall }));
vi.mock('@/packages/account', () => ({ useAccount: () => ({ user: { id: 'user-1' } }) }));
vi.mock('../lib/whisper', () => ({ transcribeLocally: mockTranscribeLocally }));
vi.mock('./use-ai-settings', () => ({
  useAISettings: () => ({
    transcriptionConfig: { provider: 'whisper', model: 'onnx-community/whisper-base' },
  }),
}));
vi.mock('./use-generate', () => ({
  useGenerate: () => ({ generate: vi.fn(), isGenerating: false, isReady: true }),
}));

import { useTranscribe, type UseTranscribeReturn } from './use-transcribe';

function mountHook(): () => UseTranscribeReturn {
  let latest: UseTranscribeReturn | undefined;

  function Probe() {
    latest = useTranscribe();
    return null;
  }

  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));

  return () => latest!;
}

describe('useTranscribe — on-device path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records the call as free, with the audio it transcribed', async () => {
    mockTranscribeLocally.mockResolvedValue({ text: ' hello there ', audio_seconds: 14 });
    const hook = mountHook();

    let text: string | undefined;
    await act(async () => {
      text = await hook().transcribe(new Blob(['audio']));
    });

    expect(text).toBe('hello there');
    expect(mockRecordApiCall).toHaveBeenCalledOnce();

    const [userId, call] = mockRecordApiCall.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(call).toMatchObject({
      kind: 'llm',
      provider: 'whisper',
      model: 'onnx-community/whisper-base',
      feature: 'transcription',
      audio_seconds: 14,
      success: true,
    });
  });

  it('records a failed transcription and still throws', async () => {
    mockTranscribeLocally.mockRejectedValue(new Error('Model failed to load'));
    const hook = mountHook();

    await expect(
      act(async () => {
        await hook().transcribe(new Blob(['audio']));
      })
    ).rejects.toThrow('Model failed to load');

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.success).toBe(false);
    expect(call.error_message).toBe('Model failed to load');
  });
});
