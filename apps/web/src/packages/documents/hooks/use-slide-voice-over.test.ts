import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGenerateSpeech = vi.fn();
vi.mock('@september/speech/hooks/use-speech', () => ({
  useSpeech: () => ({ generateSpeech: mockGenerateSpeech }),
}));

const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
let lastAudioSrc = '';

class MockAudio {
  src: string;
  constructor(src: string) {
    this.src = src;
    lastAudioSrc = src;
  }
  play = mockPlay;
  pause = mockPause;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

vi.stubGlobal('Audio', MockAudio);

const mockSpeechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);

// ── Minimal speak logic (mirrors useSlideVoiceOver) ──────────────────────────

function speak(text: string, onEnd?: () => void): { stop: () => void } {
  let pendingOnEnd = onEnd;

  const stop = () => {
    mockPause();
    mockSpeechSynthesis.cancel();
    pendingOnEnd = undefined;
  };

  if (!text.trim()) return { stop };

  const promise = mockGenerateSpeech(text);
  if (!promise) {
    onEnd?.();
    return { stop };
  }

  promise.then((response: {
    blob?: string;
    utterance?: { onend?: (() => void); onerror?: unknown; onstart?: unknown };
    alignment?: unknown;
  }) => {
    if (response.utterance) {
      response.utterance.onend = () => {
        const cb = pendingOnEnd;
        pendingOnEnd = undefined;
        cb?.();
      };
      mockSpeechSynthesis.speak(response.utterance);
    } else if (response.blob) {
      const src = response.blob.startsWith('data:')
        ? response.blob
        : `data:audio/mp3;base64,${response.blob}`;
      const audio = new Audio(src);
      audio.addEventListener('ended', () => {
        const cb = pendingOnEnd;
        pendingOnEnd = undefined;
        cb?.();
      });
      audio.play();
    }
  });

  return { stop };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useSlideVoiceOver logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastAudioSrc = '';
  });

  it('fires onEnd immediately when no TTS engine is configured', () => {
    mockGenerateSpeech.mockReturnValue(undefined);
    const onEnd = vi.fn();
    speak('Hello', onEnd);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('does not call generateSpeech or fire onEnd for empty text', () => {
    const onEnd = vi.fn();
    speak('', onEnd);
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('calls generateSpeech with the provided text', () => {
    mockGenerateSpeech.mockReturnValue(Promise.resolve({ blob: 'data:audio/mp3;base64,AAAA' }));
    speak('Once upon a time');
    expect(mockGenerateSpeech).toHaveBeenCalledWith('Once upon a time');
  });

  it('constructs Audio with correct src for blob response', async () => {
    const blobPromise = Promise.resolve({ blob: 'data:audio/mp3;base64,AAAA' });
    mockGenerateSpeech.mockReturnValue(blobPromise);
    speak('Hello');
    await blobPromise;
    expect(lastAudioSrc).toBe('data:audio/mp3;base64,AAAA');
    expect(mockPlay).toHaveBeenCalled();
  });

  it('prefixes bare base64 blob with data URI scheme', async () => {
    const blobPromise = Promise.resolve({ blob: 'AAAA==' });
    mockGenerateSpeech.mockReturnValue(blobPromise);
    speak('Hello');
    await blobPromise;
    expect(lastAudioSrc).toMatch(/^data:audio\/mp3;base64,/);
  });

  it('calls play() on the audio element for blob responses', async () => {
    const blobPromise = Promise.resolve({ blob: 'data:audio/mp3;base64,AAAA' });
    mockGenerateSpeech.mockReturnValue(blobPromise);
    speak('Hello');
    await blobPromise;
    expect(mockPlay).toHaveBeenCalled();
  });

  it('calls speechSynthesis.speak() for utterance response', async () => {
    const utt = {} as SpeechSynthesisUtterance;
    const utterancePromise = Promise.resolve({ utterance: utt });
    mockGenerateSpeech.mockReturnValue(utterancePromise);
    speak('Hello');
    await utterancePromise;
    expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(utt);
  });

  it('fires onEnd via utterance.onend', async () => {
    const utt = {} as SpeechSynthesisUtterance;
    const utterancePromise = Promise.resolve({ utterance: utt });
    mockGenerateSpeech.mockReturnValue(utterancePromise);
    const onEnd = vi.fn();
    speak('Hello', onEnd);
    await utterancePromise;
    (utt as unknown as { onend: () => void }).onend();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('stop() calls speechSynthesis.cancel()', async () => {
    const utt = {} as SpeechSynthesisUtterance;
    const utterancePromise = Promise.resolve({ utterance: utt });
    mockGenerateSpeech.mockReturnValue(utterancePromise);
    const { stop } = speak('Hello');
    await utterancePromise;
    stop();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it('stop() clears pending onEnd so it does not fire', async () => {
    const utt = {} as SpeechSynthesisUtterance;
    const utterancePromise = Promise.resolve({ utterance: utt });
    mockGenerateSpeech.mockReturnValue(utterancePromise);
    const onEnd = vi.fn();
    const { stop } = speak('Hello', onEnd);
    await utterancePromise;
    stop();
    // onend fires after stop
    (utt as unknown as { onend: () => void }).onend?.();
    expect(onEnd).not.toHaveBeenCalled();
  });
});
