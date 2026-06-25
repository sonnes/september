import { describe, expect, it, vi } from 'vitest';

import {
  base64ToInt16,
  mergeStreamAlignment,
  streamElevenLabsSpeech,
} from './elevenlabs-stream';

/** Minimal WebSocket stand-in that records sends and lets a test emit frames. */
class MockSocket extends EventTarget {
  static OPEN = 1;
  readyState = 1;
  sent: unknown[] = [];
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  emit(obj: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(obj) }));
  }
}

/** base64 of one Int16 sample = `value` (little-endian). */
function pcm(value: number): string {
  const b = new Uint8Array(new Int16Array([value]).buffer);
  return btoa(String.fromCharCode(b[0], b[1]));
}

describe('mergeStreamAlignment', () => {
  it('converts ms to seconds and offsets each chunk by cumulative duration', () => {
    const merged = mergeStreamAlignment([
      {
        alignment: { chars: ['h', 'i'], charStartTimesMs: [0, 100], charDurationsMs: [100, 100] },
        offsetMs: 0,
      },
      {
        alignment: { chars: ['!'], charStartTimesMs: [0], charDurationsMs: [50] },
        offsetMs: 200,
      },
    ]);

    expect(merged.characters).toEqual(['h', 'i', '!']);
    expect(merged.start_times).toEqual([0, 0.1, 0.2]);
    expect(merged.end_times).toEqual([0.1, 0.2, 0.25]);
  });

  it('returns empty alignment for no parts', () => {
    expect(mergeStreamAlignment([])).toEqual({
      characters: [],
      start_times: [],
      end_times: [],
    });
  });
});

describe('base64ToInt16', () => {
  it('decodes little-endian 16-bit PCM', () => {
    // bytes: 01 00 -> 1, 00 80 -> -32768
    const b64 = btoa(String.fromCharCode(0x01, 0x00, 0x00, 0x80));
    const out = base64ToInt16(b64);
    expect(Array.from(out)).toEqual([1, -32768]);
  });
});

describe('streamElevenLabsSpeech', () => {
  it('sends BOS/text/EOS and resolves with blob + alignment from streamed chunks', async () => {
    const socket = new MockSocket();
    const onAudioChunk = vi.fn();

    const promise = streamElevenLabsSpeech(
      socket as unknown as WebSocket,
      {
        text: 'hi',
        previousText: 'before',
        apiKey: 'key-1',
        voiceSettings: { stability: 0.5 },
        sampleRate: 22050,
      },
      { onAudioChunk }
    );

    // BOS carries auth, voice settings, and previous_text.
    expect(socket.sent[0]).toMatchObject({
      text: ' ',
      'xi-api-key': 'key-1',
      voice_settings: { stability: 0.5 },
      previous_text: 'before',
    });
    expect(socket.sent[1]).toEqual({ text: 'hi ' });
    expect(socket.sent[2]).toEqual({ text: '' });

    socket.emit({
      audio: pcm(1000),
      alignment: { chars: ['h'], charStartTimesMs: [0], charDurationsMs: [100] },
    });
    socket.emit({
      audio: pcm(2000),
      alignment: { chars: ['i'], charStartTimesMs: [0], charDurationsMs: [100] },
    });
    socket.emit({ isFinal: true });

    const res = await promise;
    expect(onAudioChunk).toHaveBeenCalledTimes(2);
    expect(res.blob?.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(res.alignment?.characters).toEqual(['h', 'i']);
    // Second char offset by the first chunk's duration (1 sample / 22050 Hz).
    expect(res.alignment?.start_times[1]).toBeCloseTo(1 / 22050, 5);
  });

  it('rejects when no audio arrives before the first-chunk timeout', async () => {
    const socket = new MockSocket();
    await expect(
      streamElevenLabsSpeech(
        socket as unknown as WebSocket,
        { text: 'x', apiKey: 'k', sampleRate: 22050, firstChunkTimeoutMs: 5 },
        { onAudioChunk: () => {} }
      )
    ).rejects.toThrow(/No audio chunk/);
  });

  it('rejects when the socket closes before any audio', async () => {
    const socket = new MockSocket();
    const promise = streamElevenLabsSpeech(
      socket as unknown as WebSocket,
      { text: 'x', apiKey: 'k', sampleRate: 22050 },
      { onAudioChunk: () => {} }
    );
    socket.dispatchEvent(new Event('close'));
    await expect(promise).rejects.toThrow(/closed before audio/);
  });
});
