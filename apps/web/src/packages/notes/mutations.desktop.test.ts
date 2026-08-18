import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNote, deleteNotesForSpace, updateNote } from './mutations';

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
vi.mock('./db', () => ({ noteCollection: {} }));

const NOTE_1 = '00000000-0000-4000-8000-000000000001';
const NOTE_2 = '00000000-0000-4000-8000-000000000002';
const SPACE_1 = '00000000-0000-4000-8000-000000000011';
const SPACE_2 = '00000000-0000-4000-8000-000000000012';

describe('desktop note mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putDesktopRecord.mockImplementation(async (_collection, _id, data) => data);
  });

  it('creates and updates notes through Rust records', async () => {
    const created = await createNote({ id: NOTE_1, content: 'Hello' });
    getDesktopRecord.mockResolvedValue(created);
    await updateNote(NOTE_1, { content: 'Updated' });

    expect(putDesktopRecord).toHaveBeenNthCalledWith(
      1,
      'documents',
      NOTE_1,
      expect.objectContaining({ id: NOTE_1, content: 'Hello' }),
      expect.any(Number)
    );
    expect(putDesktopRecord).toHaveBeenNthCalledWith(
      2,
      'documents',
      NOTE_1,
      expect.objectContaining({ id: NOTE_1, content: 'Updated' }),
      expect.any(Number)
    );
  });

  it('lists then deletes only the notes in a space', async () => {
    listDesktopRecords.mockResolvedValue([
      {
        id: NOTE_1,
        space_id: SPACE_1,
        content: '',
        created_at: new Date(1),
        updated_at: new Date(1),
      },
      {
        id: NOTE_2,
        space_id: SPACE_2,
        content: '',
        created_at: new Date(1),
        updated_at: new Date(1),
      },
    ]);

    await deleteNotesForSpace(SPACE_1);

    expect(deleteDesktopRecord).toHaveBeenCalledOnce();
    expect(deleteDesktopRecord).toHaveBeenCalledWith('documents', NOTE_1);
  });
});
