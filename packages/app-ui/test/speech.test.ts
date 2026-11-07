import { act, createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterruptedSpeech } from '@september/app-ui/platform';
import { loadSettings, savedSpeech, setup } from '@september/app-ui/services/settings';
import {
  soundFile,
  speak,
  speechSettings,
  stopSpeaking,
  updateSpeech,
  useSpeaking,
  useSpokenWord,
  useVoiceFallback,
} from '@september/app-ui/services/speech';
import type { SpeechSettings } from '@september/core/rules/voice';
import { DEFAULT_ANSWERS } from '@september/core/rules/onboarding';

import { platform } from './platform';
import { renderPart } from './render';

type Heard = { fromCache: boolean; latencyMs: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** What a screen sees of the speech, read by a mounted part. */
const shown = {
  word: null as ReturnType<typeof useSpokenWord>,
  speaking: null as string | null,
  fallback: null as string | null,
};

function Probe() {
  shown.word = useSpokenWord();
  shown.speaking = useSpeaking();
  shown.fallback = useVoiceFallback();
  return null;
}

let stream = vi.mocked(platform.voice.stream);
let speakSystem = vi.mocked(platform.voice.speakSystem);

/** The usage events written so far, as their data. */
const usage = () => vi.mocked(platform.store.putUsageEvent).mock.calls.map(([event]) => event.data);

const say = (text: string, id?: string) => act(() => speak(text, id));

async function chooseSpeech(settings: Partial<SpeechSettings>) {
  await savedSpeech.set({
    provider: 'elevenlabs',
    voiceId: 'voice-1',
    modelId: 'eleven_flash_v2_5',
    stability: 0.5,
    similarity: 0.75,
    speed: 1,
    ...settings,
  });
}

beforeEach(async () => {
  stream = vi.mocked(platform.voice.stream);
  speakSystem = vi.mocked(platform.voice.speakSystem);
  stopSpeaking();
  await chooseSpeech({});
  await renderPart(createElement(Probe));
});

describe('the speech settings', () => {
  it('use the system voice before anyone chooses one', async () => {
    await savedSpeech.set(null);
    expect(speechSettings()).toMatchObject({ provider: 'system', modelId: 'eleven_flash_v2_5' });
  });

  it('take the cloud voice that an older setup named', async () => {
    await platform.store.putSetting('setup', { ...DEFAULT_ANSWERS, id: 'ravi', voiceService: 'elevenlabs' });
    await platform.store.putSetting('speech', null);
    await loadSettings();
    expect(speechSettings().provider).toBe('elevenlabs');
    expect(await platform.store.getSetting('speech')).toMatchObject({ provider: 'elevenlabs' });
    expect(setup.get()).not.toHaveProperty('voiceService');
  });

  it('read a saved Turbo v2.5 model as Flash v2.5', async () => {
    await chooseSpeech({ modelId: 'eleven_turbo_v2_5' });
    expect(speechSettings().modelId).toBe('eleven_flash_v2_5');
  });

  it('keep a saved model that ElevenLabs still offers', async () => {
    await chooseSpeech({ modelId: 'eleven_v3' });
    expect(speechSettings().modelId).toBe('eleven_v3');
  });

  it('change one field and keep the rest', async () => {
    await updateSpeech({ speed: 1.2 });
    expect(speechSettings()).toMatchObject({ voiceId: 'voice-1', speed: 1.2 });
    expect(await platform.store.getSetting('speech')).toMatchObject({ speed: 1.2 });
  });

  it('keep the old settings when the store refuses the write', async () => {
    vi.mocked(platform.store.putSetting).mockRejectedValueOnce(new Error('disk full'));
    await expect(updateSpeech({ speed: 1.2 })).rejects.toThrow('disk full');
    expect(speechSettings().speed).toBe(1);
  });
});

describe('speaking', () => {
  it('tells which word the system voice is reading, and forgets it at the end', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    const sentence = 'Thursday is the physio appointment.';
    const reading = deferred<void>();
    speakSystem.mockImplementation(async (text, _speed, onWord) => {
      onWord?.(text.indexOf('physio'));
      await reading.promise;
    });

    let spoken!: Promise<boolean>;
    await act(async () => {
      spoken = speak(sentence, 'message-1');
    });
    expect(shown.word).toEqual({ id: 'message-1', word: 3 });
    expect(shown.speaking).toBe('message-1');

    await act(async () => {
      reading.resolve();
      await spoken;
    });
    expect(shown.word).toBeNull();
    expect(shown.speaking).toBeNull();
  });

  it('settles Stop at once and ignores a late cloud result', async () => {
    const pending = deferred<Heard>();
    stream.mockReturnValue(pending.promise);
    await act(async () => {
      const spoken = speak('old words');
      expect(stream).toHaveBeenCalled();
      stopSpeaking();
      expect(await spoken).toBe(false);
      pending.resolve({ fromCache: false, latencyMs: 10 });
      await pending.promise;
    });
    expect(speakSystem).not.toHaveBeenCalled();
    expect(shown.fallback).toBeNull();
    expect(usage()).not.toContainEqual(expect.objectContaining({ success: true }));
  });

  it('does not fall back when a stopped request fails', async () => {
    const pending = deferred<never>();
    stream.mockReturnValue(pending.promise);
    await act(async () => {
      const spoken = speak('old words');
      stopSpeaking();
      pending.reject(new Error('offline'));
      await spoken;
    });
    expect(speakSystem).not.toHaveBeenCalled();
    expect(shown.fallback).toBeNull();
  });

  it('keeps the speaking state of a newer request when an older one ends', async () => {
    const first = deferred<Heard>();
    const second = deferred<Heard>();
    stream.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    let current!: Promise<boolean>;
    await act(async () => {
      const old = speak('first');
      current = speak('second', 'message-2');
      first.resolve({ fromCache: false, latencyMs: 10 });
      await old;
    });
    expect(shown.speaking).toBe('message-2');

    await act(async () => {
      second.resolve({ fromCache: false, latencyMs: 10 });
      expect(await current).toBe(true);
    });
    expect(shown.speaking).toBeNull();
  });

  it('streams the trimmed sentence in the chosen cloud voice', async () => {
    stream.mockResolvedValue({ fromCache: false, latencyMs: 120 });
    expect(await say('  hello there  ')).toBe(true);
    const [text, voice, parts, signal] = stream.mock.calls[0]!;
    expect(text).toBe('hello there');
    expect(voice).toEqual({
      voiceId: 'voice-1',
      modelId: 'eleven_flash_v2_5',
      stability: 0.5,
      similarity: 0.75,
      speed: 1,
    });
    expect(parts).toBeUndefined();
    expect(signal.aborted).toBe(false);
    expect(speakSystem).not.toHaveBeenCalled();
    expect(usage()).toContainEqual(
      expect.objectContaining({ provider: 'elevenlabs', model: 'eleven_flash_v2_5', success: true }),
    );
  });

  it('reports a failure of the system voice', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    speakSystem.mockRejectedValue(new Error('no voice'));
    expect(await say('hello')).toBe(false);
    expect(shown.fallback).toContain('could not play');
    expect(shown.speaking).toBeNull();
  });

  it('falls back when the cloud voice fails before any sound, then clears the notice', async () => {
    stream.mockRejectedValueOnce(new Error('offline'));
    expect(await say('hello')).toBe(true);
    expect(speakSystem).toHaveBeenCalled();
    expect(shown.fallback).toContain('device spoke instead');
    stream.mockResolvedValue({ fromCache: false, latencyMs: 10 });
    expect(await say('hello again')).toBe(true);
    expect(shown.fallback).toBeNull();
  });

  it('falls back to the system voice when no cloud voice is chosen', async () => {
    await chooseSpeech({ voiceId: null });
    expect(await say('hello')).toBe(true);
    expect(stream).not.toHaveBeenCalled();
    expect(speakSystem.mock.calls[0]![0]).toBe('hello');
  });

  it('streams the Dialogue voice in parts with Eleven v3, and records that model', async () => {
    await chooseSpeech({ provider: 'dialogue', stability: 0.45 });
    stream.mockResolvedValue({ fromCache: false, latencyMs: 300 });

    expect(await say('[laughs] hello')).toBe(true);

    const [text, voice, parts] = stream.mock.calls[0]!;
    expect(text).toBe('[laughs] hello');
    expect(voice.modelId).toBe('eleven_v3');
    expect(voice.stability).toBe(0.5);
    expect(parts).toEqual(['[laughs] hello']);
    expect(usage()).toContainEqual(
      expect.objectContaining({ provider: 'elevenlabs', model: 'eleven_v3', success: true }),
    );
  });

  it('gives the platform the settings in use, which name its voice file', async () => {
    await chooseSpeech({ provider: 'dialogue', stability: 0.45, speed: 1.2 });
    stream.mockResolvedValue({ fromCache: false, latencyMs: 300 });

    await say('hello');

    expect(stream.mock.calls[0]![4]).toEqual(speechSettings());
  });

  it('streams Eleven v3 Conversational with a stability mode, and records that model', async () => {
    await chooseSpeech({ provider: 'dialogue', dialogueModelId: 'eleven_v3_conversational', stability: 0.62 });
    stream.mockResolvedValue({ fromCache: false, latencyMs: 200 });

    await say('hello');

    expect(stream.mock.calls[0]![1]).toMatchObject({ modelId: 'eleven_v3_conversational', stability: 0.5 });
    expect(usage()).toContainEqual(
      expect.objectContaining({ model: 'eleven_v3_conversational', success: true }),
    );
  });

  it('gives the fallback voice the words without the tags', async () => {
    await chooseSpeech({ provider: 'dialogue', modelId: 'eleven_v3' });
    stream.mockRejectedValueOnce(new Error('offline'));

    expect(await say('[sighs] I am tired.')).toBe(true);
    expect(speakSystem.mock.calls[0]![0]).toBe('I am tired.');
  });

  it('never gives a tag to the system voice', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    await say('[laughs] That is funny.');
    expect(speakSystem.mock.calls[0]![0]).toBe('That is funny.');
  });

  it('removes the tags for an ElevenLabs model that reads them aloud', async () => {
    stream.mockResolvedValue({ fromCache: false, latencyMs: 10 });
    await say('[whispers] Quiet now.');
    expect(stream.mock.calls[0]![0]).toBe('Quiet now.');
  });

  it('does not repeat the words in a second voice after the cloud voice broke mid-sentence', async () => {
    stream.mockRejectedValueOnce(new InterruptedSpeech('the voice closed early'));
    expect(await say('hello')).toBe(false);
    expect(speakSystem).not.toHaveBeenCalled();
    expect(shown.fallback).toContain('could not play');
  });

  it('says so when the voice could not stop', async () => {
    vi.mocked(platform.voice.stop).mockRejectedValueOnce(new Error('busy'));
    await act(async () => stopSpeaking());
    await vi.waitFor(() => expect(shown.fallback).toContain('could not stop'));
  });
});

describe('a sound file', () => {
  it('removes the tags for a model that reads them aloud', () => {
    expect(soundFile('[sighs] A long day.')).toEqual({
      text: 'A long day.',
      voice: {
        voiceId: 'voice-1',
        modelId: 'eleven_flash_v2_5',
        stability: 0.5,
        similarity: 0.75,
        speed: 1,
      },
    });
  });

  it('keeps the tags and uses Eleven v3 at its own speed for the Dialogue voice', async () => {
    await chooseSpeech({
      provider: 'dialogue',
      dialogueModelId: 'eleven_v3_conversational',
      speed: 1.2,
      stability: 0.45,
    });
    expect(soundFile('[laughs] Hello there.')).toEqual({
      text: '[laughs] Hello there.',
      voice: {
        voiceId: 'voice-1',
        modelId: 'eleven_v3',
        stability: 0.5,
        similarity: 0.75,
        speed: 1,
      },
    });
  });

  it('needs a cloud voice', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    expect(() => soundFile('Hello.')).toThrow('Choose an ElevenLabs voice first.');
  });
});
