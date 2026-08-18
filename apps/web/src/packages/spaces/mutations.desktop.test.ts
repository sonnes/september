import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMessage,
  createSpace,
  deleteSpace,
  replaceAiPhrases,
  updateSpace,
} from './mutations';

const {
  deleteDesktopRecord,
  deleteNotesForSpace,
  getDesktopRecord,
  listDesktopRecords,
  putDesktopRecord,
  track,
  writeDesktopRecordBatch,
} = vi.hoisted(() => ({
    deleteDesktopRecord: vi.fn(),
    deleteNotesForSpace: vi.fn(),
    getDesktopRecord: vi.fn(),
    listDesktopRecords: vi.fn(),
    putDesktopRecord: vi.fn(),
    track: vi.fn(),
    writeDesktopRecordBatch: vi.fn(),
  }));

vi.mock('@/packages/shared/lib/data', () => ({
  deleteDesktopRecord,
  getDesktopRecord,
  isDesktopRuntime: () => true,
  listDesktopRecords,
  putDesktopRecord,
  writeDesktopRecordBatch,
}));
vi.mock('@/packages/notes', () => ({ deleteNotesForSpace }));
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

  it('deletes a space and its children through one Rust transaction', async () => {
    listDesktopRecords.mockImplementation(async collection => {
      if (collection === 'messages') {
        return [
          {
            id: MESSAGE_ID,
            user_id: 'user-1',
            space_id: SPACE_ID,
            text: 'Hello',
            type: 'text',
            created_at: new Date(1),
          },
        ];
      }
      if (collection === 'saved-phrases') {
        return [
          {
            id: '00000000-0000-4000-8000-000000000031',
            user_id: 'user-1',
            space_id: SPACE_ID,
            text: 'Hi',
            pinned: false,
            created_at: new Date(1),
          },
        ];
      }
      if (collection === 'documents') {
        return [
          {
            id: '00000000-0000-4000-8000-000000000041',
            space_id: SPACE_ID,
            content: '',
            created_at: new Date(1),
            updated_at: new Date(1),
          },
        ];
      }
      return [];
    });

    await deleteSpace(SPACE_ID);

    expect(writeDesktopRecordBatch).toHaveBeenCalledOnce();
    expect(writeDesktopRecordBatch.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'delete', collection: 'messages', id: MESSAGE_ID }),
        expect.objectContaining({
          op: 'delete',
          collection: 'saved-phrases',
          id: '00000000-0000-4000-8000-000000000031',
        }),
        expect.objectContaining({
          op: 'delete',
          collection: 'documents',
          id: '00000000-0000-4000-8000-000000000041',
        }),
        expect.objectContaining({ op: 'delete', collection: 'spaces', id: SPACE_ID }),
      ])
    );
    expect(deleteDesktopRecord).not.toHaveBeenCalled();
    expect(deleteNotesForSpace).not.toHaveBeenCalled();
  });

  it('replaces generated phrases and updates the space through one Rust transaction', async () => {
    listDesktopRecords.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000031',
        user_id: 'user-1',
        space_id: SPACE_ID,
        text: 'Old phrase',
        pinned: false,
        created_at: new Date(1),
      },
    ]);
    getDesktopRecord.mockResolvedValue({
      id: SPACE_ID,
      user_id: 'user-1',
      title: 'Home',
      created_at: new Date(1),
      updated_at: new Date(1),
    });

    await replaceAiPhrases(
      SPACE_ID,
      'user-1',
      { phrases: ['Fresh phrase'], starters: ['Could you please'] },
      4
    );

    expect(writeDesktopRecordBatch).toHaveBeenCalledOnce();
    const writes = writeDesktopRecordBatch.mock.calls[0][0];
    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: 'delete',
          collection: 'saved-phrases',
          id: '00000000-0000-4000-8000-000000000031',
        }),
        expect.objectContaining({
          op: 'put',
          collection: 'saved-phrases',
          data: expect.objectContaining({ text: 'Fresh phrase', pinned: false }),
        }),
        expect.objectContaining({
          op: 'put',
          collection: 'saved-phrases',
          data: expect.objectContaining({ text: 'Could you please', kind: 'starter' }),
        }),
        expect.objectContaining({
          op: 'put',
          collection: 'spaces',
          id: SPACE_ID,
          data: expect.objectContaining({ phrases_synced_count: 4 }),
        }),
      ])
    );
    expect(deleteDesktopRecord).not.toHaveBeenCalled();
  });
});
