import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as voice from '@september/core/rules/voice';
import * as audioTags from '@september/core/rules/audio-tags';

const os = vi.hoisted(() => ({
  currentSetup: vi.fn(() => ({ voiceService: 'elevenlabs' })),
  currentSpeech: vi.fn(() => null),
  streamSpeech: vi.fn(),
  speakSystem: vi.fn(),
  stopNativeSpeech: vi.fn(async () => undefined),
  InterruptedSpeech: class InterruptedSpeech extends Error {},
}));
const recordTtsUsage = vi.hoisted(() => vi.fn(async (_record: Record<string, unknown>) => undefined));
type Streamed = { from_cache: boolean; latency_ms: number };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

for (const platform of ['web', 'desktop']) {
  describe(`${platform} speech`, () => {
    let speech: typeof import('./speech');
    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      os.currentSetup.mockReturnValue({ voiceService: 'elevenlabs' });
      os.currentSpeech.mockReturnValue(null);
      os.speakSystem.mockResolvedValue(undefined);
      const source = readFileSync(resolve(process.cwd(), '..', platform, 'src/services/speech.ts'), 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      const exports = {};
      runInNewContext(code, {
        exports, AbortController, URL,
        require: (id: string) => {
          if (id === 'react') return { useSyncExternalStore: (_: unknown, snapshot: () => unknown) => snapshot() };
          if (id.endsWith('/os')) return os;
          if (id === '@september/core/rules/voice') return voice;
          if (id === '@september/core/rules/audio-tags') return audioTags;
          if (id.endsWith('/usage')) return { recordTtsUsage };
          if (id.endsWith('/usage-summary')) return { elevenLabsCredits: () => 0 };
          throw new Error(`Unexpected import: ${id}`);
        },
      });
      speech = exports as typeof speech;
    });

    it('settles Stop immediately and ignores a late cloud result', async () => {
      const pending = deferred<Streamed>();
      os.streamSpeech.mockReturnValue(pending.promise);
      const spoken = speech.speak('old words');
      expect(os.streamSpeech).toHaveBeenCalled();
      speech.stopSpeaking();
      expect(await spoken).toBe(false);
      pending.resolve({ from_cache: false, latency_ms: 10 });
      await pending.promise;
      expect(os.speakSystem).not.toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toBeNull();
    });

    it('does not fall back when a cancelled request fails', async () => {
      const pending = deferred<never>();
      os.streamSpeech.mockReturnValue(pending.promise);
      const spoken = speech.speak('old words');
      speech.stopSpeaking();
      pending.reject(new Error('offline'));
      await spoken;
      expect(os.speakSystem).not.toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toBeNull();
    });

    it('an older composer request cannot clear the newer speaking state', async () => {
      const first = deferred<Streamed>();
      const second = deferred<Streamed>();
      os.streamSpeech.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      const old = speech.speak('first');
      const current = speech.speak('second');
      first.resolve({ from_cache: false, latency_ms: 10 });
      await old;
      expect(speech.useSpeaking()).toBe('composer');
      second.resolve({ from_cache: false, latency_ms: 10 });
      expect(await current).toBe(true);
    });

    it('streams the trimmed sentence with the settings in use', async () => {
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 120 });
      expect(await speech.speak('  hello there  ')).toBe(true);
      const [text, settings, signal] = os.streamSpeech.mock.calls[0];
      expect(text).toBe('hello there');
      expect(settings.provider).toBe('elevenlabs');
      expect(signal.aborted).toBe(false);
      expect(os.speakSystem).not.toHaveBeenCalled();
    });

    it('reports system failure instead of successful speech', async () => {
      os.currentSetup.mockReturnValue({ voiceService: 'system' });
      os.speakSystem.mockRejectedValue(new Error('no voice'));
      expect(await speech.speak('hello')).toBe(false);
      expect(speech.useVoiceFallback()).toContain('could not play');
      expect(speech.useSpeaking()).toBeNull();
    });

    it('falls back when the cloud voice fails before any sound, then clears the notice', async () => {
      os.streamSpeech.mockRejectedValueOnce(new Error('offline'));
      expect(await speech.speak('hello')).toBe(true);
      expect(os.speakSystem).toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toContain('device spoke instead');
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 10 });
      expect(await speech.speak('hello again')).toBe(true);
      expect(speech.useVoiceFallback()).toBeNull();
    });

    it('streams the Dialogue voice and records Eleven v3 as its model', async () => {
      os.currentSpeech.mockReturnValue({
        provider: 'dialogue', voiceId: 'voice-1', modelId: 'eleven_flash_v2_5',
        stability: 0.5, similarity: 0.75, speed: 1,
      } as never);
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 300 });

      expect(await speech.speak('[laughs] hello')).toBe(true);

      const [, settings] = os.streamSpeech.mock.calls[0];
      expect(settings.provider).toBe('dialogue');
      expect(recordTtsUsage).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'elevenlabs', model: 'eleven_v3', success: true })
      );
    });

    it('records Eleven v3 Conversational when the Dialogue voice uses it', async () => {
      os.currentSpeech.mockReturnValue({
        provider: 'dialogue', voiceId: 'voice-1', modelId: 'eleven_flash_v2_5',
        dialogueModelId: 'eleven_v3_conversational', stability: 0.5, similarity: 0.75, speed: 1,
      } as never);
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 200 });

      await speech.speak('hello');

      expect(recordTtsUsage).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'eleven_v3_conversational', success: true })
      );
    });

    it('falls back to the system voice when the Dialogue voice fails before any sound', async () => {
      os.currentSpeech.mockReturnValue({
        provider: 'dialogue', voiceId: 'voice-1', modelId: 'eleven_v3',
        stability: 0.5, similarity: 0.75, speed: 1,
      } as never);
      os.streamSpeech.mockRejectedValueOnce(new Error('offline'));

      expect(await speech.speak('hello')).toBe(true);
      expect(os.speakSystem).toHaveBeenCalled();
    });

    it('keeps the tags for the Dialogue voice', async () => {
      os.currentSpeech.mockReturnValue({
        provider: 'dialogue', voiceId: 'voice-1', modelId: 'eleven_flash_v2_5',
        stability: 0.5, similarity: 0.75, speed: 1,
      } as never);
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 300 });

      await speech.speak('[laughs] That is funny.');

      expect(os.streamSpeech.mock.calls[0][0]).toBe('[laughs] That is funny.');
    });

    it('never gives a tag to the system voice', async () => {
      os.currentSetup.mockReturnValue({ voiceService: 'system' });

      await speech.speak('[laughs] That is funny.');

      expect(os.speakSystem.mock.calls[0][0]).toBe('That is funny.');
    });

    it('removes the tags for an ElevenLabs model that reads them aloud', async () => {
      os.streamSpeech.mockResolvedValue({ from_cache: false, latency_ms: 10 });

      await speech.speak('[whispers] Quiet now.');

      expect(os.streamSpeech.mock.calls[0][0]).toBe('Quiet now.');
    });

    it('never gives a tag to the fallback voice', async () => {
      os.currentSpeech.mockReturnValue({
        provider: 'dialogue', voiceId: 'voice-1', modelId: 'eleven_v3',
        stability: 0.5, similarity: 0.75, speed: 1,
      } as never);
      os.streamSpeech.mockRejectedValueOnce(new Error('offline'));

      await speech.speak('[sighs] I am tired.');

      expect(os.speakSystem.mock.calls[0][0]).toBe('I am tired.');
    });

    it('does not repeat the words in a second voice after the cloud voice broke mid-sentence', async () => {
      os.streamSpeech.mockRejectedValueOnce(new os.InterruptedSpeech('the voice closed early'));
      expect(await speech.speak('hello')).toBe(false);
      expect(os.speakSystem).not.toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toContain('could not play');
    });
  });
}
