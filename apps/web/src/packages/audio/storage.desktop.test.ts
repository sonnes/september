import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteAudio, downloadAudio, getAudio, listAudio, uploadAudioBinary } from './storage';

const {
  deleteDesktopFile,
  deleteDesktopRecord,
  getDesktopFile,
  getDesktopRecord,
  listDesktopRecords,
  putDesktopRecord,
  readDesktopFile,
  writeDesktopFile,
} = vi.hoisted(() => ({
  deleteDesktopFile: vi.fn(),
  deleteDesktopRecord: vi.fn(),
  getDesktopFile: vi.fn(),
  getDesktopRecord: vi.fn(),
  listDesktopRecords: vi.fn(),
  putDesktopRecord: vi.fn(),
  readDesktopFile: vi.fn(),
  writeDesktopFile: vi.fn(),
}));
const { KVStore } = vi.hoisted(() => ({ KVStore: vi.fn() }));

vi.mock('@/packages/shared/lib/data', () => ({
  deleteDesktopFile,
  deleteDesktopRecord,
  getDesktopFile,
  getDesktopRecord,
  isDesktopRuntime: () => true,
  listDesktopRecords,
  putDesktopRecord,
  readDesktopFile,
  writeDesktopFile,
}));
vi.mock('@/packages/shared/lib/indexeddb', () => ({ KVStore }));
vi.stubGlobal('indexedDB', {});
vi.mock('@/packages/sync/blob-bridge', () => ({
  fetchRemoteBlob: vi.fn(async () => null),
  mirrorBlobDelete: vi.fn(),
  mirrorBlobPut: vi.fn(),
}));

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  const sym = Object.getOwnPropertySymbols(blob).find(value => value.toString() === 'Symbol(impl)');
  const buffer = sym
    ? (blob as unknown as Record<symbol, { _buffer?: Uint8Array }>)[sym]._buffer
    : undefined;
  if (!buffer) throw new Error('Blob bytes unavailable');
  return new Uint8Array(buffer);
}

describe('desktop audio storage', () => {
  it('does not open the browser audio database', () => {
    expect(KVStore).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getDesktopRecord.mockResolvedValue(null);
    deleteDesktopFile.mockResolvedValue(true);
    writeDesktopFile.mockResolvedValue({
      id: 'opaque-1',
      kind: 'audio',
      mediaType: 'audio/webm',
      size: 3,
      createdAt: 10,
      updatedAt: 10,
    });
    putDesktopRecord.mockImplementation(async (_collection, _id, data) => data);
  });

  it('deletes the previous opaque file when a logical key is replaced', async () => {
    getDesktopRecord.mockResolvedValue({
      id: 'notes/n1.mp3',
      fileId: 'opaque-old',
      contentType: 'audio/webm',
      metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      name: 'n1.mp3',
    });

    await uploadAudioBinary({ path: 'notes/n1.mp3', blob: new Uint8Array([1]).buffer });

    expect(deleteDesktopFile).toHaveBeenCalledWith('opaque-old');
  });

  it('deletes a newly written file when alias persistence fails', async () => {
    putDesktopRecord.mockRejectedValue(new Error('sqlite failed'));

    await expect(
      uploadAudioBinary({ path: 'notes/n1.mp3', blob: new Uint8Array([1]).buffer })
    ).rejects.toThrow('sqlite failed');

    expect(deleteDesktopFile).toHaveBeenCalledWith('opaque-1');
  });

  it('stores bytes as a Rust file and logical-key metadata as a local record', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await expect(
      uploadAudioBinary({
        path: 'notes/n1.mp3',
        blob: bytes.buffer,
        contentType: 'audio/webm',
        metadata: { alignment: { characters: ['a'], start_times: [0], end_times: [1] } },
      })
    ).resolves.toBe('notes/n1.mp3');

    expect(writeDesktopFile).toHaveBeenCalledWith(bytes, 'audio/webm', 'audio');
    expect(putDesktopRecord).toHaveBeenCalledWith(
      'audio-file-aliases',
      'notes/n1.mp3',
      expect.objectContaining({ id: 'notes/n1.mp3', fileId: 'opaque-1', name: 'n1.mp3' }),
      expect.any(Number)
    );
  });

  it('reads by logical key through its opaque Rust file id', async () => {
    getDesktopRecord.mockResolvedValue({
      id: 'notes/n1.mp3',
      fileId: 'opaque-1',
      contentType: 'audio/webm',
      metadata: { alignment: { characters: ['a'], start_times: [0], end_times: [1] } },
      created_at: '2026-01-01T00:00:00.000Z',
      name: 'n1.mp3',
    });
    getDesktopFile.mockResolvedValue({ mediaType: 'audio/webm' });
    readDesktopFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const result = await getAudio('notes/n1.mp3');
    expect(result?.alignment?.characters).toEqual(['a']);
    expect(await blobBytes(result!.blob)).toEqual(new Uint8Array([1, 2, 3]));
    await expect(downloadAudio('notes/n1.mp3')).resolves.toBeInstanceOf(Blob);
    expect(readDesktopFile).toHaveBeenCalledWith('opaque-1');
  });

  it('lists aliases by logical prefix and deletes both alias and file', async () => {
    const alias = {
      id: 'voice/user/sample.webm',
      fileId: 'opaque-1',
      contentType: 'audio/webm',
      metadata: { user_id: 'user' },
      created_at: '2026-01-01T00:00:00.000Z',
      name: 'sample.webm',
    };
    listDesktopRecords.mockResolvedValue([alias, { ...alias, id: 'other/file.webm' }]);
    getDesktopRecord.mockResolvedValue(alias);

    await expect(listAudio('voice/user')).resolves.toEqual([
      { name: 'sample.webm', created_at: alias.created_at, metadata: alias.metadata },
    ]);
    await deleteAudio(alias.id);

    expect(deleteDesktopFile).toHaveBeenCalledWith('opaque-1');
    expect(deleteDesktopRecord).toHaveBeenCalledWith('audio-file-aliases', alias.id);
  });
});
