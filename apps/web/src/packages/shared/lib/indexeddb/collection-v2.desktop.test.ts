import { describe, expect, it, vi } from 'vitest';

import { indexedDBCollectionOptionsV2 } from './collection-v2';

const { KVStore, BroadcastChannel } = vi.hoisted(() => ({
  KVStore: vi.fn(),
  BroadcastChannel: vi.fn(),
}));

vi.mock('@/packages/shared/lib/data/runtime', () => ({ isDesktopRuntime: () => true }));
vi.mock('./kv-store', () => ({ KVStore }));
vi.stubGlobal('indexedDB', {});
vi.stubGlobal('BroadcastChannel', BroadcastChannel);

describe('indexedDBCollectionOptionsV2 in desktop mode', () => {
  it('uses the inert fallback without opening IndexedDB or BroadcastChannel', () => {
    const options = indexedDBCollectionOptionsV2<{ id: string }>({
      id: 'spaces',
      getKey: row => row.id,
      kvStoreOptions: { dbName: 'app-spaces' },
      channelName: 'app-spaces',
    });

    expect(KVStore).not.toHaveBeenCalled();
    expect(BroadcastChannel).not.toHaveBeenCalled();
    expect(options.sync.getSyncMetadata?.()).toEqual({
      storage: 'ssr-fallback',
      channel: 'none',
    });
  });
});
