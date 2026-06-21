import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import after mocks
import { createNote, deleteNote, deleteNotesForSpace, updateNote } from './mutations';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const { mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  return { mockInsert, mockUpdate, mockDelete };
});

// Simulate a Transaction with isPersisted.promise
function makeTx(promise: Promise<unknown> = Promise.resolve()) {
  return { isPersisted: { promise } };
}

// Stable mock collection with in-memory state
const noteState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};

vi.mock('./db', () => ({
  noteCollection: {
    insert: (data: unknown) => makeTx(mockInsert(data)),
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(noteState.state.get(id) || {}) };
      fn(draft);
      noteState.state.set(id, draft);
      return makeTx(mockUpdate(id, draft));
    },
    delete: (id: string) => {
      noteState.state.delete(id);
      return makeTx(mockDelete(id));
    },
    get toArray() {
      return Array.from(noteState.state.values());
    },
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid-note'),
}));

describe('createNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteState.state.clear();
    mockInsert.mockResolvedValue(undefined);
  });

  it('inserts a note with correct shape', async () => {
    const note = await createNote({ content: 'Hello' });

    expect(mockInsert).toHaveBeenCalledOnce();
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.id).toBe('fixed-uuid-note');
    expect(inserted.content).toBe('Hello');
    expect(inserted.created_at).toBeInstanceOf(Date);
    expect(inserted.updated_at).toBeInstanceOf(Date);
    expect(note).toMatchObject({ id: 'fixed-uuid-note', content: 'Hello' });
  });

  it('accepts an optional name', async () => {
    await createNote({ content: '', name: 'My Note' });
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.name).toBe('My Note');
  });

  it('accepts a space id for notes inside a space', async () => {
    await createNote({ content: '', name: 'Morning update', space_id: 'space-1' });
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.space_id).toBe('space-1');
  });

  it('propagates insert errors', async () => {
    mockInsert.mockRejectedValue(new Error('DB failure'));
    await expect(createNote({ content: '' })).rejects.toThrow('DB failure');
  });
});

describe('updateNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteState.state.clear();
    mockUpdate.mockResolvedValue(undefined);
  });

  it('applies updates and bumps updated_at', async () => {
    const before = new Date(2020, 0, 1);
    noteState.state.set('note-1', { id: 'note-1', content: 'Old', updated_at: before });

    await updateNote('note-1', { content: 'New content' });

    const updated = noteState.state.get('note-1');
    expect(updated?.content).toBe('New content');
    expect(updated?.updated_at).toBeInstanceOf(Date);
    expect((updated?.updated_at as Date) > before).toBe(true);
  });

  it('propagates errors', async () => {
    mockUpdate.mockRejectedValue(new Error('update failed'));
    await expect(updateNote('note-1', {})).rejects.toThrow('update failed');
  });
});

describe('deleteNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteState.state.clear();
    mockDelete.mockResolvedValue(undefined);
  });

  it('deletes the note', async () => {
    noteState.state.set('note-1', { id: 'note-1' });

    await deleteNote('note-1');

    expect(mockDelete).toHaveBeenCalledWith('note-1');
  });

  it('propagates errors', async () => {
    noteState.state.set('note-err', { id: 'note-err' });
    mockDelete.mockRejectedValue(new Error('delete failed'));
    await expect(deleteNote('note-err')).rejects.toThrow('delete failed');
  });
});

describe('deleteNotesForSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noteState.state.clear();
    mockDelete.mockResolvedValue(undefined);
  });

  it('deletes only notes scoped to the given space', async () => {
    noteState.state.set('note-1', { id: 'note-1', space_id: 'space-1' });
    noteState.state.set('note-2', { id: 'note-2', space_id: 'space-1' });
    noteState.state.set('note-3', { id: 'note-3', space_id: 'space-2' });
    noteState.state.set('note-4', { id: 'note-4' });

    await deleteNotesForSpace('space-1');

    const deletedIds = mockDelete.mock.calls.map((call: unknown[]) => call[0]).sort();
    expect(deletedIds).toEqual(['note-1', 'note-2']);
  });

  it('does not delete global notes when no notes match the space', async () => {
    noteState.state.set('note-1', { id: 'note-1' });

    await deleteNotesForSpace('space-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
