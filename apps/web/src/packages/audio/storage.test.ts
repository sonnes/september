/**
 * Tests for storage.ts plain functions.
 *
 * REGRESSION: uploadAudioBinary must accept a Blob/ArrayBuffer and store it without
 * the base64 `String.fromCharCode(...new Uint8Array(buf))` spread that overflows the
 * call stack for any file larger than ~65 KB (V8 argument limit).
 */

import { Blob as NodeBlob } from 'node:buffer';

import { afterEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

/** Read a Blob's bytes in any JS environment (handles stripped vitest Blob polyfill). */
async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  // vitest node env uses a stripped Blob (BlobImpl) that lacks arrayBuffer().
  // The raw bytes live at blob[Symbol('impl')]._buffer (a Node Buffer).
  const sym = Object.getOwnPropertySymbols(blob).find(s => s.toString() === 'Symbol(impl)');
  if (sym) {
    const impl = (blob as unknown as Record<symbol, { _buffer?: Buffer }>)[sym];
    if (impl._buffer) return new Uint8Array(impl._buffer);
  }
  throw new Error('Cannot extract bytes from Blob: no arrayBuffer() and no impl._buffer');
}

import { setBlobClient } from '@/packages/sync/blob-bridge';

import {
  uploadAudio,
  uploadAudioBinary,
  downloadAudio,
  getAudio,
  deleteAudio,
  listAudio,
} from './storage';

// Isolate IndexedDB state between tests by patching the module-level store
// (fake-indexeddb auto-installs a fresh global indexedDB for each test file run)

describe('uploadAudioBinary', () => {
  it('stores and retrieves a 1 MB Blob without stack overflow', async () => {
    const oneMB = new Uint8Array(1024 * 1024).fill(42);
    const blob = new Blob([oneMB], { type: 'audio/webm' });

    await expect(
      uploadAudioBinary({
        path: 'voice-samples/user/upload/test.webm',
        blob,
        contentType: 'audio/webm',
      })
    ).resolves.toBe('voice-samples/user/upload/test.webm');
  });

  it('round-trips the blob content correctly', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([data], { type: 'audio/webm' });

    await uploadAudioBinary({
      path: 'test/binary-roundtrip.webm',
      blob,
      contentType: 'audio/webm',
    });

    const retrieved = await downloadAudio('test/binary-roundtrip.webm');
    expect(await blobToUint8(retrieved)).toEqual(data);
  });

  it('stores metadata and is listed by prefix', async () => {
    const blob = new Blob([new Uint8Array(16)], { type: 'audio/webm' });

    await uploadAudioBinary({
      path: 'voice-samples/user123/recording/sample-a.webm',
      blob,
      contentType: 'audio/webm',
      metadata: { user_id: 'user123', type: 'recording', sample_id: 'sample-a' },
    });

    const files = await listAudio('voice-samples/user123/recording');
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0].metadata.user_id).toBe('user123');
    expect(files[0].metadata.sample_id).toBe('sample-a');
  });

  it('accepts ArrayBuffer as well as Blob', async () => {
    const buffer = new Uint8Array([10, 20, 30]).buffer;

    await expect(
      uploadAudioBinary({
        path: 'test/arraybuffer.webm',
        blob: buffer,
        contentType: 'audio/webm',
      })
    ).resolves.toBe('test/arraybuffer.webm');
  });
});

describe('uploadAudio (base64 string)', () => {
  it('stores and retrieves for small payloads', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const base64 = btoa(String.fromCharCode(...data));

    await uploadAudio({
      path: 'test/small.mp3',
      blob: base64,
      contentType: 'audio/mp3',
    });

    const retrieved = await downloadAudio('test/small.mp3');
    expect(await blobToUint8(retrieved)).toEqual(data);
  });

  it('stores alignment in metadata', async () => {
    const data = new Uint8Array([1]);
    const base64 = btoa(String.fromCharCode(...data));
    const alignment = {
      characters: ['h', 'i'],
      start_times: [0, 0.5],
      end_times: [0.5, 1],
    };

    await uploadAudio({
      path: 'test/with-alignment.mp3',
      blob: base64,
      alignment,
    });

    const result = await getAudio('test/with-alignment.mp3');
    expect(result).not.toBeNull();
    expect(result?.alignment).toEqual(alignment);
  });

  it('handles data: URI prefix', async () => {
    const data = new Uint8Array([9, 8, 7]);
    const base64 = btoa(String.fromCharCode(...data));
    const dataUri = `data:audio/mp3;base64,${base64}`;

    await uploadAudio({ path: 'test/data-uri.mp3', blob: dataUri });

    const retrieved = await downloadAudio('test/data-uri.mp3');
    expect(await blobToUint8(retrieved)).toEqual(data);
  });
});

describe('getAudio', () => {
  it('returns null for missing path', async () => {
    const result = await getAudio('does/not/exist.mp3');
    expect(result).toBeNull();
  });
});

describe('deleteAudio', () => {
  it('removes a stored item', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
    await uploadAudioBinary({ path: 'test/to-delete.webm', blob });

    await deleteAudio('test/to-delete.webm');

    const result = await getAudio('test/to-delete.webm');
    expect(result).toBeNull();
  });
});

describe('R2 sync fallback', () => {
  afterEach(() => setBlobClient(null));

  it('downloadAudio falls back to R2 when the blob is not local, then caches it', async () => {
    const getBlobResponse = vi.fn(async (key: string) => {
      expect(key).toBe('audio/remote/only.mp3');
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } });
    });
    setBlobClient({ putBlob: vi.fn(), getBlobResponse, deleteBlob: vi.fn() });

    const blob = await downloadAudio('remote/only.mp3');
    expect(await blobToUint8(blob)).toEqual(new Uint8Array([1, 2, 3]));

    // Now cached locally — a second read does not hit R2 again.
    setBlobClient(null);
    const again = await downloadAudio('remote/only.mp3');
    expect(await blobToUint8(again)).toEqual(new Uint8Array([1, 2, 3]));
    expect(getBlobResponse).toHaveBeenCalledTimes(1);
  });

  it('getAudio returns null when neither local nor remote has it', async () => {
    setBlobClient({
      putBlob: vi.fn(),
      getBlobResponse: vi.fn(async () => null),
      deleteBlob: vi.fn(),
    });
    expect(await getAudio('nowhere.mp3')).toBeNull();
  });

  it('uploadAudioBinary mirrors the write to R2', async () => {
    const putBlob = vi.fn(async () => {});
    setBlobClient({ putBlob, getBlobResponse: vi.fn(), deleteBlob: vi.fn() });

    await uploadAudioBinary({
      path: 'mirror/me.webm',
      blob: new Blob([new Uint8Array([9])], { type: 'audio/webm' }),
      contentType: 'audio/webm',
    });
    expect(putBlob).toHaveBeenCalledWith('audio/mirror/me.webm', expect.anything(), 'audio/webm');
  });
});

describe('listAudio', () => {
  it('returns items matching prefix only', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'audio/webm' });
    await uploadAudioBinary({ path: 'prefix-a/file1.webm', blob });
    await uploadAudioBinary({ path: 'prefix-b/file2.webm', blob });

    const results = await listAudio('prefix-a');
    expect(results.every(r => r.name.endsWith('file1.webm') || r.name === 'file1.webm')).toBe(true);
    // prefix-b should not appear
    for (const r of results) {
      expect(r.name).not.toContain('file2');
    }
  });
});
