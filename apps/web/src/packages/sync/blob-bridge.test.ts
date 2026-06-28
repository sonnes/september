import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRemoteBlob, mirrorBlobDelete, mirrorBlobPut, setBlobClient } from './blob-bridge';

afterEach(() => setBlobClient(null));

describe('blob bridge', () => {
  it('is a no-op when no client is active', async () => {
    await expect(mirrorBlobPut('a/b.mp3', new Uint8Array([1]), 'audio/mpeg')).resolves.toBeUndefined();
    expect(await fetchRemoteBlob('a/b.mp3')).toBeNull();
  });

  it('mirrors writes under the audio/ prefix', async () => {
    const putBlob = vi.fn(async () => {});
    setBlobClient({ putBlob, getBlobResponse: vi.fn(), deleteBlob: vi.fn() });

    await mirrorBlobPut('space/note/out.mp3', new Uint8Array([1, 2]), 'audio/mpeg');
    expect(putBlob).toHaveBeenCalledWith('audio/space/note/out.mp3', expect.anything(), 'audio/mpeg');
  });

  it('reads remote blobs with their content type', async () => {
    setBlobClient({
      putBlob: vi.fn(),
      getBlobResponse: vi.fn(async () => new Response(new Uint8Array([5, 6]), { headers: { 'content-type': 'audio/webm' } })),
      deleteBlob: vi.fn(),
    });

    const remote = await fetchRemoteBlob('x.webm');
    expect(remote?.contentType).toBe('audio/webm');
    expect(new Uint8Array(remote!.data)).toEqual(new Uint8Array([5, 6]));
  });

  it('returns null and swallows errors on a failed fetch', async () => {
    setBlobClient({
      putBlob: vi.fn(),
      getBlobResponse: vi.fn(async () => {
        throw new Error('offline');
      }),
      deleteBlob: vi.fn(),
    });
    expect(await fetchRemoteBlob('x')).toBeNull();
  });

  it('mirrors deletes under the audio/ prefix', async () => {
    const deleteBlob = vi.fn(async () => {});
    setBlobClient({ putBlob: vi.fn(), getBlobResponse: vi.fn(), deleteBlob });
    await mirrorBlobDelete('gone.mp3');
    expect(deleteBlob).toHaveBeenCalledWith('audio/gone.mp3');
  });
});
