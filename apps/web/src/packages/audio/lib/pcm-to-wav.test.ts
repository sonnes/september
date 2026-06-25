import { describe, expect, it } from 'vitest';

import { pcmToWavDataUri } from './pcm-to-wav';

/** Decode a `data:audio/wav;base64,...` URI back to bytes for inspection. */
function decode(uri: string): { mime: string; bytes: Uint8Array } {
  const [header, b64] = uri.split(',');
  const mime = header.slice('data:'.length, header.indexOf(';'));
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, bytes };
}

function ascii(bytes: Uint8Array, offset: number, len: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + len));
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint32(offset, true);
}

function u16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint16(offset, true);
}

describe('pcmToWavDataUri', () => {
  it('produces an audio/wav data URI', () => {
    const uri = pcmToWavDataUri([new Int16Array([1, 2, 3, 4])], 22050);
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(decode(uri).mime).toBe('audio/wav');
  });

  it('writes a valid 44-byte PCM WAV header', () => {
    const samples = new Int16Array([0, -1, 32767, -32768]); // 4 samples = 8 data bytes
    const { bytes } = decode(pcmToWavDataUri([samples], 22050));

    expect(ascii(bytes, 0, 4)).toBe('RIFF');
    expect(ascii(bytes, 8, 4)).toBe('WAVE');
    expect(ascii(bytes, 12, 4)).toBe('fmt ');
    expect(ascii(bytes, 36, 4)).toBe('data');

    expect(u32(bytes, 16)).toBe(16); // fmt chunk size
    expect(u16(bytes, 20)).toBe(1); // PCM
    expect(u16(bytes, 22)).toBe(1); // mono
    expect(u32(bytes, 24)).toBe(22050); // sample rate
    expect(u32(bytes, 28)).toBe(22050 * 2); // byte rate (mono, 16-bit)
    expect(u16(bytes, 32)).toBe(2); // block align
    expect(u16(bytes, 34)).toBe(16); // bits per sample

    expect(u32(bytes, 40)).toBe(8); // data length in bytes
    expect(u32(bytes, 4)).toBe(36 + 8); // RIFF chunk size
    expect(bytes.length).toBe(44 + 8);
  });

  it('concatenates multiple chunks in order', () => {
    const { bytes } = decode(
      pcmToWavDataUri([new Int16Array([1, 2]), new Int16Array([3])], 16000)
    );
    expect(u32(bytes, 40)).toBe(6); // 3 samples * 2 bytes
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(1);
    expect(view.getInt16(46, true)).toBe(2);
    expect(view.getInt16(48, true)).toBe(3);
  });
});
