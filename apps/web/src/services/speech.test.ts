import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const os = vi.hoisted(() => ({
  currentSetup: vi.fn(() => ({ voiceService: 'elevenlabs' })),
  currentSpeech: vi.fn(() => null),
  synthesizeSpeech: vi.fn(),
  playSpeechFile: vi.fn(),
  speakSystem: vi.fn(),
  stopNativeSpeech: vi.fn(async () => undefined),
}));
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
      os.playSpeechFile.mockResolvedValue(undefined);
      os.speakSystem.mockResolvedValue(undefined);
      const source = readFileSync(resolve(process.cwd(), '..', platform, 'src/services/speech.ts'), 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      const exports = {};
      runInNewContext(code, {
        exports, AbortController, URL,
        require: (id: string) => {
          if (id === 'react') return { useSyncExternalStore: (_: unknown, snapshot: () => unknown) => snapshot() };
          if (id.endsWith('/os')) return os;
          if (id.endsWith('/usage')) return { recordTtsUsage: async () => undefined };
          if (id.endsWith('/usage-summary')) return { elevenLabsCredits: () => 0 };
          throw new Error(`Unexpected import: ${id}`);
        },
      });
      speech = exports as typeof speech;
    });

    it('settles Stop immediately and discards delayed cloud audio', async () => {
      const pending = deferred<{ path: string; from_cache: boolean }>();
      os.synthesizeSpeech.mockReturnValue(pending.promise);
      expect(speech.speechSettings().provider).toBe('elevenlabs');
      const spoken = speech.speak('old words');
      expect(os.synthesizeSpeech).toHaveBeenCalled();
      speech.stopSpeaking();
      expect(await spoken).toBe(false);
      pending.resolve({ path: 'old-audio', from_cache: false });
      await pending.promise;
      expect(os.playSpeechFile).not.toHaveBeenCalled();
    });

    it('does not fall back when a cancelled request fails', async () => {
      const pending = deferred<never>();
      os.synthesizeSpeech.mockReturnValue(pending.promise);
      expect(speech.speechSettings().provider).toBe('elevenlabs');
      const spoken = speech.speak('old words');
      expect(os.synthesizeSpeech).toHaveBeenCalled();
      speech.stopSpeaking();
      pending.reject(new Error('offline'));
      await spoken;
      expect(os.speakSystem).not.toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toBeNull();
    });

    it('an older composer request cannot play or clear the newer speaking state', async () => {
      const first = deferred<{ path: string; from_cache: boolean }>();
      const second = deferred<{ path: string; from_cache: boolean }>();
      os.synthesizeSpeech.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      const old = speech.speak('first');
      const current = speech.speak('second');
      first.resolve({ path: 'first', from_cache: false });
      await old;
      expect(speech.useSpeaking()).toBe('composer');
      second.resolve({ path: 'second', from_cache: false });
      expect(await current).toBe(true);
      expect(os.playSpeechFile.mock.calls).toEqual([['second']]);
    });

    it('reports system failure instead of successful speech', async () => {
      os.currentSetup.mockReturnValue({ voiceService: 'system' });
      os.speakSystem.mockRejectedValue(new Error('no voice'));
      expect(await speech.speak('hello')).toBe(false);
      expect(speech.useVoiceFallback()).toContain('could not play');
      expect(speech.useSpeaking()).toBeNull();
    });

    it('falls back on a real cloud error and clears the notice on the next success', async () => {
      os.synthesizeSpeech.mockRejectedValueOnce(new Error('offline'));
      expect(await speech.speak('hello')).toBe(true);
      expect(os.speakSystem).toHaveBeenCalled();
      expect(speech.useVoiceFallback()).toContain('device spoke instead');
      os.synthesizeSpeech.mockResolvedValue({ path: 'audio', from_cache: false });
      expect(await speech.speak('hello again')).toBe(true);
      expect(speech.useVoiceFallback()).toBeNull();
    });
  });
}
