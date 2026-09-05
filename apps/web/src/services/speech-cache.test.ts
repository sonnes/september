import 'fake-indexeddb/auto';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { bootstrapBrowserServices, chooseOutput, playSpeechFile, stopNativeSpeech, synthesizeSpeech } from './os';
import { BrowserRepository, openRepository } from './repository';
import type { SpeechSettings } from './speech';

const settings: SpeechSettings = {
  provider: 'elevenlabs',
  voiceId: 'voice-1',
  modelId: 'eleven_turbo_v2_5',
  stability: 0.5,
  similarity: 0.75,
  speed: 1,
};

beforeAll(async () => {
  const repository = await openRepository({ migrate: false });
  await repository.putSetting('provider-keys', { elevenlabs: 'secret' });
  repository.close();
  await bootstrapBrowserServices();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('speech file cache', () => {
  it('reuses a saved ElevenLabs file when the text and sound settings match', async () => {
    const fetchSpeech = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['speech bytes'], { type: 'audio/mpeg' }),
    }));
    vi.stubGlobal('fetch', fetchSpeech);
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:cached');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
      }
    );

    const first = await synthesizeSpeech('Please open the door.', settings);
    const second = await synthesizeSpeech('Please open the door.', settings);

    expect(first).toEqual({ path: 'blob:first', from_cache: false });
    expect(second).toEqual({ path: 'blob:cached', from_cache: true });
    expect(fetchSpeech).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('releases a temporary blob URL after playback ends', async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static revokeObjectURL = revokeObjectURL;
      }
    );
    vi.stubGlobal(
      'Audio',
      class {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        play = vi.fn(async () => queueMicrotask(() => this.onended?.()));
      }
    );

    await playSpeechFile('blob:speech');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:speech');
  });

  it('does not start audio after Stop while the output device is being selected', async () => {
    await chooseOutput('speaker');
    let ready!: () => void;
    const selected = new Promise<void>((resolve) => { ready = resolve; });
    const play = vi.fn(async () => undefined);
    vi.stubGlobal('Audio', class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      setSinkId = () => selected;
      pause = vi.fn();
      play = async () => { await play(); this.onended?.(); };
    });
    const pending = playSpeechFile('audio-file');
    await stopNativeSpeech();
    ready();
    await pending;
    expect(play).not.toHaveBeenCalled();
  });

  it('settles an interrupted audio file without needing an ended event', async () => {
    vi.stubGlobal('Audio', class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = async () => undefined;
    });
    const pending = playSpeechFile('audio-file');
    await stopNativeSpeech();
    await expect(pending).resolves.toBeUndefined();
  });

  it('still returns new speech when the browser cannot cache the file', async () => {
    vi.spyOn(BrowserRepository.prototype, 'putBlob').mockRejectedValueOnce(
      new Error('storage quota reached')
    );
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['uncached speech'], { type: 'audio/mpeg' }),
    })));
    const createObjectURL = vi.fn(() => 'blob:uncached');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL;
      }
    );

    await expect(synthesizeSpeech('This file cannot be cached.', settings)).resolves.toEqual({
      path: 'blob:uncached',
      from_cache: false,
    });
  });
});
