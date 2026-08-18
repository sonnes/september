import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDesktopSyncStorage } from './desktop-rpc';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop durable sync RPC', () => {
  beforeEach(() => invoke.mockReset());

  it('lists and acknowledges Rust-owned outbox entries', async () => {
    invoke.mockResolvedValueOnce([
      {
        outboxId: 7,
        collection: 'spaces',
        id: 'space-1',
        op: 'upsert',
        data: { id: 'space-1' },
        version: null,
        updatedAt: 10,
      },
    ]);
    invoke.mockResolvedValueOnce(1);
    const storage = createDesktopSyncStorage();

    const entries = await storage.listOutbox(100);
    await expect(storage.ackOutbox(entries.map(item => item.outboxId))).resolves.toBe(1);

    expect(invoke.mock.calls).toEqual([
      ['sync_outbox_list', { request: { limit: 100 } }],
      ['sync_outbox_ack', { request: { outboxIds: [7] } }],
    ]);
  });

  it('reads the Rust-owned cloud cursor', async () => {
    invoke.mockResolvedValue(42);
    const storage = createDesktopSyncStorage();

    await expect(storage.getCursor()).resolves.toBe(42);
    expect(invoke).toHaveBeenCalledWith('sync_metadata_get', {
      request: { key: 'cloud_cursor' },
    });
  });

  it('applies remote mutations atomically without the local write commands', async () => {
    invoke.mockResolvedValue({ applied: 1, collections: ['spaces'] });
    const storage = createDesktopSyncStorage();
    const mutations = [
      {
        collection: 'spaces',
        id: 'space-1',
        op: 'delete' as const,
        data: null,
        version: 'v2',
        updatedAt: 20,
      },
    ];

    await expect(storage.applyRemote(mutations, 5)).resolves.toEqual({
      applied: 1,
      collections: ['spaces'],
    });
    expect(invoke).toHaveBeenCalledWith('sync_apply_remote', {
      request: { mutations, cursor: 5 },
    });
  });
});
