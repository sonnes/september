import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NgramModel } from './ngram-model';
import { AutocompletePersistence, toSnapshot } from './persistence';

const { deleteDesktopRecord, getDesktopRecord, listDesktopRecords, putDesktopRecord } = vi.hoisted(
  () => ({
    deleteDesktopRecord: vi.fn(),
    getDesktopRecord: vi.fn(),
    listDesktopRecords: vi.fn(),
    putDesktopRecord: vi.fn(),
  })
);

vi.mock('@/packages/shared/lib/data', () => ({
  deleteDesktopRecord,
  getDesktopRecord,
  isDesktopRuntime: () => true,
  listDesktopRecords,
  putDesktopRecord,
}));
vi.mock('../indexeddb/kv-store', () => ({
  KVStore: class {},
  createKVStore: vi.fn(() => {
    throw new Error('IndexedDB must not initialize in desktop mode');
  }),
}));

describe('desktop autocomplete persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads, saves, clears, and destroys snapshots through local-only Rust records', async () => {
    const store = new AutocompletePersistence();
    const snapshot = toSnapshot(new NgramModel());
    getDesktopRecord.mockResolvedValue({ id: 'user:u1', value: snapshot });

    await store.save('user:u1', snapshot);
    await expect(store.load('user:u1')).resolves.toEqual(snapshot);
    await store.clear('user:u1');

    expect(putDesktopRecord).toHaveBeenCalledWith(
      'autocomplete-snapshots',
      'user:u1',
      { id: 'user:u1', value: snapshot },
      snapshot.createdAt
    );
    expect(deleteDesktopRecord).toHaveBeenCalledWith('autocomplete-snapshots', 'user:u1');

    listDesktopRecords.mockResolvedValue([
      { id: 'chat:u1:c1', value: snapshot },
      { id: 'user:u1', value: snapshot },
    ]);
    await store.destroy();
    expect(deleteDesktopRecord).toHaveBeenCalledWith('autocomplete-snapshots', 'chat:u1:c1');
  });
});
