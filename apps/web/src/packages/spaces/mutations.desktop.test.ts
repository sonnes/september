import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMessage, createSpace, updateSpace } from './mutations';

const { deleteDesktopRecord, getDesktopRecord, listDesktopRecords, putDesktopRecord, track } =
  vi.hoisted(() => ({
    deleteDesktopRecord: vi.fn(),
    getDesktopRecord: vi.fn(),
    listDesktopRecords: vi.fn(),
    putDesktopRecord: vi.fn(),
    track: vi.fn(),
  }));

vi.mock('@/packages/shared/lib/data', () => ({
  deleteDesktopRecord,
  getDesktopRecord,
  isDesktopRuntime: () => true,
  listDesktopRecords,
  putDesktopRecord,
}));
vi.mock('@/packages/notes', () => ({ deleteNotesForSpace: vi.fn() }));
vi.mock('@/packages/usage', () => ({ track }));
vi.mock('./db', () => ({
  messageCollection: {},
  savedPhraseCollection: {},
  spaceCollection: {},
}));

const SPACE_ID = '00000000-0000-4000-8000-000000000011';
const MESSAGE_ID = '00000000-0000-4000-8000-000000000021';

describe('desktop space mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putDesktopRecord.mockImplementation(async (_collection, _id, data) => data);
  });

  it('creates and updates a space through Rust records', async () => {
    const created = await createSpace('user-1', 'Home');
    getDesktopRecord.mockResolvedValue(created);
    await updateSpace(created.id, { title: 'Renamed' });

    expect(putDesktopRecord).toHaveBeenNthCalledWith(
      1,
      'spaces',
      created.id,
      expect.objectContaining({ title: 'Home' }),
      expect.any(Number)
    );
    expect(putDesktopRecord).toHaveBeenNthCalledWith(
      2,
      'spaces',
      created.id,
      expect.objectContaining({ title: 'Renamed' }),
      expect.any(Number)
    );
  });

  it('writes a message and bumps its parent space through Rust records', async () => {
    getDesktopRecord.mockResolvedValue({
      id: SPACE_ID,
      user_id: 'user-1',
      title: 'Home',
      created_at: new Date(1),
      updated_at: new Date(1),
    });

    await createMessage({
      id: MESSAGE_ID,
      user_id: 'user-1',
      space_id: SPACE_ID,
      text: 'Hello',
      type: 'text',
    });

    expect(putDesktopRecord).toHaveBeenCalledWith(
      'messages',
      MESSAGE_ID,
      expect.objectContaining({ text: 'Hello' }),
      expect.any(Number)
    );
    expect(putDesktopRecord).toHaveBeenCalledWith(
      'spaces',
      SPACE_ID,
      expect.objectContaining({ id: SPACE_ID }),
      expect.any(Number)
    );
    expect(track).toHaveBeenCalled();
  });
});
