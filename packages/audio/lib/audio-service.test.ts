/**
 * Regression tests for AudioService
 *
 * REGRESSION: uploadAudioBinary must accept a Blob/ArrayBuffer and store it without
 * the base64 `String.fromCharCode(...new Uint8Array(buf))` spread that overflows the
 * call stack for any file larger than ~65 KB (V8 argument limit).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';

import { AudioService } from './audio-service';

describe('AudioService', () => {
  let service: AudioService;

  beforeEach(() => {
    service = new AudioService();
  });

  // REGRESSION: The original uploadAudio(base64 string) path does:
  //   btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  // This blows the call stack for any real audio file.
  // uploadAudioBinary must round-trip without throwing.
  it('uploadAudioBinary stores and retrieves a 1 MB Blob without stack overflow', async () => {
    const oneMB = new Uint8Array(1024 * 1024).fill(42);
    const blob = new Blob([oneMB], { type: 'audio/webm' });

    await expect(
      service.uploadAudioBinary({
        path: 'voice-samples/user/upload/test.webm',
        blob,
        contentType: 'audio/webm',
      })
    ).resolves.toBe('voice-samples/user/upload/test.webm');
  });

  it('uploadAudioBinary round-trips the blob content correctly', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([data], { type: 'audio/webm' });

    await service.uploadAudioBinary({
      path: 'test/sample.webm',
      blob,
      contentType: 'audio/webm',
    });

    const retrieved = await service.downloadAudio('test/sample.webm');
    const buf = await retrieved.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(data);
  });

  it('uploadAudioBinary stores metadata and is listed by prefix', async () => {
    const blob = new Blob([new Uint8Array(16)], { type: 'audio/webm' });

    await service.uploadAudioBinary({
      path: 'voice-samples/user123/recording/sample-a.webm',
      blob,
      contentType: 'audio/webm',
      metadata: { user_id: 'user123', type: 'recording', sample_id: 'sample-a' },
    });

    const files = await service.listAudio('voice-samples/user123/recording');
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0].metadata.user_id).toBe('user123');
    expect(files[0].metadata.sample_id).toBe('sample-a');
  });

  it('uploadAudioBinary accepts ArrayBuffer as well as Blob', async () => {
    const buffer = new Uint8Array([10, 20, 30]).buffer;

    await expect(
      service.uploadAudioBinary({
        path: 'test/arraybuffer.webm',
        blob: buffer,
        contentType: 'audio/webm',
      })
    ).resolves.toBe('test/arraybuffer.webm');
  });

  // Keep legacy uploadAudio (base64 string) working for existing callers (TTS, chats)
  it('legacy uploadAudio(base64 string) still works for small payloads', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const base64 = btoa(String.fromCharCode(...data));

    await service.uploadAudio({
      path: 'test/small.mp3',
      blob: base64,
      contentType: 'audio/mp3',
    });

    const retrieved = await service.downloadAudio('test/small.mp3');
    const buf = await retrieved.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(data);
  });
});
