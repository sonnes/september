import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteDesktopFile,
  exportDesktopFile,
  listDesktopFiles,
  readDesktopFile,
  writeDesktopFile,
} from './file-client';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop file RPC client', () => {
  beforeEach(() => invoke.mockReset());

  it('writes raw bytes and content metadata without a path argument', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const metadata = {
      id: 'opaque-file-id',
      kind: 'audio',
      mediaType: 'audio/mpeg',
      size: 3,
      createdAt: 10,
      updatedAt: 10,
    };
    invoke.mockResolvedValue(metadata);

    await expect(writeDesktopFile(bytes, 'audio/mpeg', 'audio')).resolves.toEqual(metadata);
    expect(invoke).toHaveBeenCalledWith('file_write', bytes, {
      headers: {
        'content-type': 'audio/mpeg',
        'x-september-file-kind': 'audio',
      },
    });
  });

  it('reads, lists, and deletes only by opaque id or kind', async () => {
    invoke
      .mockResolvedValueOnce(new Uint8Array([4, 5]))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(true);

    await expect(readDesktopFile('opaque-file-id')).resolves.toEqual(new Uint8Array([4, 5]));
    await expect(listDesktopFiles('audio')).resolves.toEqual([]);
    await expect(deleteDesktopFile('opaque-file-id')).resolves.toBe(true);

    expect(invoke.mock.calls).toEqual([
      ['file_read', { request: { id: 'opaque-file-id' } }],
      ['file_list', { request: { kind: 'audio' } }],
      ['file_delete', { request: { id: 'opaque-file-id' } }],
    ]);
  });

  it('exports raw bytes through a native Rust save dialog without a path argument', async () => {
    const bytes = new Uint8Array([7, 8, 9]);
    invoke.mockResolvedValue(true);

    await expect(exportDesktopFile(bytes, 'notes/report.mp4', 'video/mp4')).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith('file_export', bytes, {
      headers: {
        'content-type': 'video/mp4',
        'x-september-suggested-name': 'notes/report.mp4',
      },
    });
  });
});
