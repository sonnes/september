import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteDesktopRecord,
  getDesktopRecord,
  listDesktopRecords,
  putDesktopRecord,
  subscribeDesktopRecordWrites,
} from './record-client';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop record RPC client', () => {
  beforeEach(() => invoke.mockReset());

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
    const onWrite = vi.fn();
    const unsubscribe = subscribeDesktopRecordWrites(onWrite);
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
    unsubscribe();

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
    expect(onWrite).toHaveBeenNthCalledWith(1, 'spaces');
    expect(onWrite).toHaveBeenNthCalledWith(2, 'spaces');
  });
});
