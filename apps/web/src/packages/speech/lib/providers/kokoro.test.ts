import { describe, expect, it } from 'vitest';

import type { KokoroEngineClient, KokoroGenerateRequest } from './kokoro';
import { KokoroSpeechProvider } from './kokoro';

// Two 24 kHz chunks: 0.5 s of "Hello." then 0.25 s of "World."
function fakeClient(calls: KokoroGenerateRequest[] = []): KokoroEngineClient {
  return {
    load: async () => {},
    generate: async (request, onChunk) => {
      calls.push(request);
      onChunk({ text: 'Hello.', samples: new Float32Array(12000), sampleRate: 24000 });
      onChunk({ text: 'World.', samples: new Float32Array(6000), sampleRate: 24000 });
    },
  };
}

describe('KokoroSpeechProvider', () => {
  it('generates a WAV data URI with estimated alignment', async () => {
    const provider = new KokoroSpeechProvider(fakeClient());
    const response = await provider.generateSpeech({
      text: 'Hello. World.',
      voice: { id: 'af_heart', name: 'Heart', language: 'en-us' },
    });

    expect(response.blob).toMatch(/^data:audio\/wav;base64,/);
    expect(response.alignment).toBeDefined();
    expect(response.alignment!.characters.join('')).toBe('Hello. World.');
    // Second chunk (its joining space) starts when the first 0.5 s of audio ends.
    const joiningSpace = response.alignment!.characters.join('').indexOf(' W');
    expect(response.alignment!.start_times[joiningSpace]).toBeCloseTo(0.5, 5);
    // Total duration = 0.75 s.
    expect(response.alignment!.end_times.at(-1)).toBeCloseTo(0.75, 5);
  });

  it('passes voice and speed through to the engine', async () => {
    const calls: KokoroGenerateRequest[] = [];
    const provider = new KokoroSpeechProvider(fakeClient(calls));
    await provider.generateSpeech({
      text: 'Hi',
      voice: { id: 'bm_george', name: 'George', language: 'en-gb' },
      options: { speed: 1.5 },
    });
    expect(calls).toEqual([{ text: 'Hi', voice: 'bm_george', speed: 1.5 }]);
  });

  it('defaults the voice when none is selected', async () => {
    const calls: KokoroGenerateRequest[] = [];
    const provider = new KokoroSpeechProvider(fakeClient(calls));
    await provider.generateSpeech({ text: 'Hi' });
    expect(calls[0].voice).toBe('af_heart');
  });

  it('streams Int16 chunks to hooks and resolves with the full response', async () => {
    const provider = new KokoroSpeechProvider(fakeClient());
    const chunks: Int16Array[] = [];
    let started = 0;

    const response = await provider.generateSpeechStream!(
      { text: 'Hello. World.' },
      { onAudioChunk: c => chunks.push(c), onStart: () => started++ }
    );

    expect(started).toBe(1);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(12000);
    expect(chunks[1]).toHaveLength(6000);
    expect(response.blob).toMatch(/^data:audio\/wav;base64,/);
    expect(response.alignment).toBeDefined();
  });

  it('lists the static voice catalog with filters', async () => {
    const provider = new KokoroSpeechProvider(fakeClient());
    const all = await provider.listVoices({});
    expect(all.length).toBe(28);

    const gb = await provider.listVoices({ language: 'en-gb' });
    expect(gb.every(v => v.language === 'en-gb')).toBe(true);
    expect(gb.length).toBe(8);

    const search = await provider.listVoices({ search: 'heart' });
    expect(search.map(v => v.id)).toEqual(['af_heart']);
  });
});
