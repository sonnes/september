import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as voice from '@september/core/rules/voice';

const os = vi.hoisted(() => ({
  currentSetup: vi.fn(() => ({ voiceService: 'elevenlabs' })),
  currentSpeech: vi.fn(() => null),
  streamSpeech: vi.fn(),
  speakSystem: vi.fn(),
  stopNativeSpeech: vi.fn(async () => undefined),
  InterruptedSpeech: class InterruptedSpeech extends Error {},
}));
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
          if (id.endsWith('/usage')) return { recordTtsUsage: async () => undefined };
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

    it('does not repeat the words in a second voice after the cloud voice broke mid-sentence', async () => {
      os.streamSpeech.mockRejectedValueOnce(new os.InterruptedSpeech('the voice closed early'));
      expect(await speech.speak('hello')).toBe(false);
      expect(os.speakSystem).not.toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toContain('could not play');
    });
  });
}
