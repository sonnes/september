import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterruptedSpeech } from '@september/app-ui/platform';
import { savedSpeech, setup } from '@september/app-ui/services/settings';
import {
  soundFile,
  speak,
  speechSettings,
  stopSpeaking,
  updateSpeech,
  useSpeaking,
  useSpokenWord,
  useVoiceFallback,
  type SpeechSettings,
} from '@september/app-ui/services/speech';
import { DEFAULT_DRAFT, type VoiceService } from '@september/core/rules/onboarding';

import { platform } from '../test/platform';

// The hooks read the held value directly, so a test reads them without a renderer.
vi.mock('react', async original => ({
  ...(await original<typeof import('react')>()),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

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

// The setup file gives the platform fresh members before each test.
let stream = vi.mocked(platform.voice.stream);
let speakSystem = vi.mocked(platform.voice.speakSystem);

/** The usage events written so far, as their data. */
const usage = () => vi.mocked(platform.store.putUsageEvent).mock.calls.map(([event]) => event.data);

async function chooseSetupVoice(voiceService: VoiceService) {
  await setup.set({ ...DEFAULT_DRAFT, id: 'ravi', name: 'Ravi', voiceService });
}

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
  await chooseSetupVoice('elevenlabs');
  await chooseSpeech({});
});

describe('the speech settings', () => {
  it('follow the voice of setup before the user chooses one', async () => {
    await savedSpeech.set(null);
    expect(speechSettings()).toMatchObject({
      provider: 'elevenlabs',
      modelId: 'eleven_flash_v2_5',
    });
    await chooseSetupVoice('system');
    expect(speechSettings().provider).toBe('system');
  });

  it('read a saved Turbo v2.5 model as Flash v2.5, because Turbo is deprecated', async () => {
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
    let heard: unknown = 'nothing';
    speakSystem.mockImplementation(async (text, _voice, onWord) => {
      onWord?.(text.indexOf('physio'));
      heard = useSpokenWord();
    });
    await speak(sentence, 'message-1');
    expect(heard).toEqual({ id: 'message-1', word: 3 });
    expect(useSpokenWord()).toBeNull();
  });

  it('settles Stop at once and ignores a late cloud result', async () => {
    const pending = deferred<Heard>();
    stream.mockReturnValue(pending.promise);
    const spoken = speak('old words');
    expect(stream).toHaveBeenCalled();
    stopSpeaking();
    expect(await spoken).toBe(false);
    pending.resolve({ fromCache: false, latencyMs: 10 });
    await pending.promise;
    expect(speakSystem).not.toHaveBeenCalled();
    expect(useVoiceFallback()).toBeNull();
    expect(usage()).not.toContainEqual(expect.objectContaining({ success: true }));
  });

  it('does not fall back when a stopped request fails', async () => {
    const pending = deferred<never>();
    stream.mockReturnValue(pending.promise);
    const spoken = speak('old words');
    stopSpeaking();
    pending.reject(new Error('offline'));
    await spoken;
    expect(speakSystem).not.toHaveBeenCalled();
    expect(useVoiceFallback()).toBeNull();
  });

  it('keeps the speaking state of a newer request when an older one ends', async () => {
    const first = deferred<Heard>();
    const second = deferred<Heard>();
    stream.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = speak('first');
    const current = speak('second');
    first.resolve({ fromCache: false, latencyMs: 10 });
    await old;
    expect(useSpeaking()).toBe('composer');
    second.resolve({ fromCache: false, latencyMs: 10 });
    expect(await current).toBe(true);
  });

  it('streams the trimmed sentence in the chosen cloud voice', async () => {
    stream.mockResolvedValue({ fromCache: false, latencyMs: 120 });
    expect(await speak('  hello there  ')).toBe(true);
    const [text, voice, parts, signal] = stream.mock.calls[0];
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
      expect.objectContaining({ provider: 'elevenlabs', model: 'eleven_flash_v2_5', success: true })
    );
  });

  it('reports a failure of the system voice', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    speakSystem.mockRejectedValue(new Error('no voice'));
    expect(await speak('hello')).toBe(false);
    expect(useVoiceFallback()).toContain('could not play');
    expect(useSpeaking()).toBeNull();
  });

  it('falls back when the cloud voice fails before any sound, then clears the notice', async () => {
    stream.mockRejectedValueOnce(new Error('offline'));
    expect(await speak('hello')).toBe(true);
    expect(speakSystem).toHaveBeenCalled();
    expect(useVoiceFallback()).toContain('device spoke instead');
    stream.mockResolvedValue({ fromCache: false, latencyMs: 10 });
    expect(await speak('hello again')).toBe(true);
    expect(useVoiceFallback()).toBeNull();
  });

  it('falls back to the system voice when no cloud voice is chosen', async () => {
    await chooseSpeech({ voiceId: null });
    expect(await speak('hello')).toBe(true);
    expect(stream).not.toHaveBeenCalled();
    expect(speakSystem.mock.calls[0][0]).toBe('hello');
  });

  it('gives the fallback voice no cloud voice ID', async () => {
    stream.mockRejectedValueOnce(new Error('offline'));
    await speak('hello');
    expect(speakSystem.mock.calls[0][1].voiceId).toBeNull();
  });

  it('streams the Dialogue voice in parts with Eleven v3, and records that model', async () => {
    await chooseSpeech({ provider: 'dialogue', stability: 0.45 });
    stream.mockResolvedValue({ fromCache: false, latencyMs: 300 });

    expect(await speak('[laughs] hello')).toBe(true);

    const [text, voice, parts] = stream.mock.calls[0];
    expect(text).toBe('[laughs] hello');
    expect(voice.modelId).toBe('eleven_v3');
    expect(voice.stability).toBe(0.5);
    expect(parts).toEqual(['[laughs] hello']);
    expect(usage()).toContainEqual(
      expect.objectContaining({ provider: 'elevenlabs', model: 'eleven_v3', success: true })
    );
  });

  it('records Eleven v3 Conversational when the Dialogue voice uses it', async () => {
    await chooseSpeech({ provider: 'dialogue', dialogueModelId: 'eleven_v3_conversational' });
    stream.mockResolvedValue({ fromCache: false, latencyMs: 200 });

    await speak('hello');

    expect(stream.mock.calls[0][1].modelId).toBe('eleven_v3_conversational');
    expect(usage()).toContainEqual(
      expect.objectContaining({ model: 'eleven_v3_conversational', success: true })
    );
  });

  it('gives the fallback voice the words without the tags', async () => {
    await chooseSpeech({ provider: 'dialogue', modelId: 'eleven_v3' });
    stream.mockRejectedValueOnce(new Error('offline'));

    expect(await speak('[sighs] I am tired.')).toBe(true);
    expect(speakSystem.mock.calls[0][0]).toBe('I am tired.');
  });

  it('never gives a tag to the system voice', async () => {
    await chooseSpeech({ provider: 'system', voiceId: null });
    await speak('[laughs] That is funny.');
    expect(speakSystem.mock.calls[0][0]).toBe('That is funny.');
  });

  it('removes the tags for an ElevenLabs model that reads them aloud', async () => {
    stream.mockResolvedValue({ fromCache: false, latencyMs: 10 });
    await speak('[whispers] Quiet now.');
    expect(stream.mock.calls[0][0]).toBe('Quiet now.');
  });

  it('does not repeat the words in a second voice after the cloud voice broke mid-sentence', async () => {
    stream.mockRejectedValueOnce(new InterruptedSpeech('the voice closed early'));
    expect(await speak('hello')).toBe(false);
    expect(speakSystem).not.toHaveBeenCalled();
    expect(useVoiceFallback()).toContain('could not play');
  });

  it('says so when the voice could not stop', async () => {
    vi.mocked(platform.voice.stop).mockRejectedValueOnce(new Error('busy'));
    stopSpeaking();
    await vi.waitFor(() => expect(useVoiceFallback()).toContain('could not stop'));
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
    await chooseSpeech({ provider: 'dialogue', speed: 1.2, stability: 0.45 });
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
