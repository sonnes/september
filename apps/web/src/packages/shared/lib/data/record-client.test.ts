import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteDesktopRecord,
  getDesktopRecord,
  listDesktopRecords,
  putDesktopRecord,
  writeDesktopRecordBatch,
} from './record-client';

const { invoke, notifyCollectionChanged } = vi.hoisted(() => ({
  invoke: vi.fn(),
  notifyCollectionChanged: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('./query', () => ({ notifyCollectionChanged }));

describe('desktop record RPC client', () => {
  beforeEach(() => {
    invoke.mockReset();
    notifyCollectionChanged.mockReset();
  });

  it('unwraps live record data returned by record_list', async () => {
    invoke.mockResolvedValue([
      {
        collection: 'spaces',
        id: 'space-1',
        data: { id: 'space-1', title: 'Home' },
        version: 'v1',
        updatedAt: 10,
        deleted: false,
        sequence: 1,
      },
    ]);

    await expect(listDesktopRecords('spaces')).resolves.toEqual([{ id: 'space-1', title: 'Home' }]);
    expect(invoke).toHaveBeenCalledWith('record_list', {
      request: { collection: 'spaces', includeDeleted: false },
    });
  });

  it('gets, writes, and deletes records with camel-case request envelopes', async () => {
    invoke
      .mockResolvedValueOnce({
        collection: 'spaces',
        id: 'space-1',
        data: { id: 'space-1' },
        version: null,
        updatedAt: 10,
        deleted: false,
        sequence: 1,
      })
      .mockResolvedValueOnce({
        collection: 'spaces',
        id: 'space-1',
        data: { id: 'space-1', title: 'Home' },
        version: null,
        updatedAt: 11,
        deleted: false,
        sequence: 2,
      })
      .mockResolvedValueOnce({
        collection: 'spaces',
        id: 'space-1',
        data: null,
        version: null,
        updatedAt: 12,
        deleted: true,
        sequence: 3,
      });

    await expect(getDesktopRecord('spaces', 'space-1')).resolves.toEqual({ id: 'space-1' });
    await expect(
      putDesktopRecord('spaces', 'space-1', { id: 'space-1', title: 'Home' }, 11)
    ).resolves.toEqual({ id: 'space-1', title: 'Home' });
    await expect(deleteDesktopRecord('spaces', 'space-1', 12)).resolves.toBeUndefined();

    expect(invoke.mock.calls).toEqual([
      ['record_get', { request: { collection: 'spaces', id: 'space-1', includeDeleted: false } }],
      [
        'record_put',
        {
          request: {
            collection: 'spaces',
            id: 'space-1',
            data: { id: 'space-1', title: 'Home' },
            version: null,
            updatedAt: 11,
          },
        },
      ],
      [
        'record_delete',
        {
          request: {
            collection: 'spaces',
            id: 'space-1',
            version: null,
            updatedAt: 12,
          },
        },
      ],
    ]);
    expect(notifyCollectionChanged).toHaveBeenNthCalledWith(1, 'spaces');
    expect(notifyCollectionChanged).toHaveBeenNthCalledWith(2, 'spaces');
  });

  it('writes a record batch through one Rust transaction and invalidates each collection', async () => {
    invoke.mockResolvedValue([]);

    await writeDesktopRecordBatch([
      {
        op: 'delete',
        collection: 'saved-phrases',
        id: 'old-1',
        updatedAt: 20,
      },
      {
        op: 'put',
        collection: 'saved-phrases',
        id: 'new-1',
        data: { id: 'new-1', text: 'Hello' },
        updatedAt: 20,
      },
      {
        op: 'put',
        collection: 'spaces',
        id: 'space-1',
        data: { id: 'space-1', phrases_synced_count: 3 },
        updatedAt: 20,
      },
    ]);
    expect(invoke).toHaveBeenCalledWith('record_batch', {
      request: {
        writes: [
          {
            op: 'delete',
            collection: 'saved-phrases',
            id: 'old-1',
            updatedAt: 20,
          },
          {
            op: 'put',
            collection: 'saved-phrases',
            id: 'new-1',
            data: { id: 'new-1', text: 'Hello' },
            updatedAt: 20,
          },
          {
            op: 'put',
            collection: 'spaces',
            id: 'space-1',
            data: { id: 'space-1', phrases_synced_count: 3 },
            updatedAt: 20,
          },
        ],
      },
    });
    expect(notifyCollectionChanged.mock.calls).toEqual([['saved-phrases'], ['spaces']]);
  });
});
