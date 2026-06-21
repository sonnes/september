import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import after mocks
import {
  createDocument,
  deleteDocument,
  deleteDocumentsForSpace,
  updateDocument,
} from './mutations';

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
const documentState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};

vi.mock('./db', () => ({
  documentCollection: {
    insert: (data: unknown) => makeTx(mockInsert(data)),
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(documentState.state.get(id) || {}) };
      fn(draft);
      documentState.state.set(id, draft);
      return makeTx(mockUpdate(id, draft));
    },
    delete: (id: string) => {
      documentState.state.delete(id);
      return makeTx(mockDelete(id));
    },
    get toArray() {
      return Array.from(documentState.state.values());
    },
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid-doc'),
}));

describe('createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentState.state.clear();
    mockInsert.mockResolvedValue(undefined);
  });

  it('inserts a document with correct shape', async () => {
    const doc = await createDocument({ content: 'Hello' });

    expect(mockInsert).toHaveBeenCalledOnce();
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.id).toBe('fixed-uuid-doc');
    expect(inserted.content).toBe('Hello');
    expect(inserted.created_at).toBeInstanceOf(Date);
    expect(inserted.updated_at).toBeInstanceOf(Date);
    expect(doc).toMatchObject({ id: 'fixed-uuid-doc', content: 'Hello' });
  });

  it('accepts an optional name', async () => {
    await createDocument({ content: '', name: 'My Doc' });
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.name).toBe('My Doc');
  });

  it('accepts a space id for notes inside a space', async () => {
    await createDocument({ content: '', name: 'Morning update', space_id: 'space-1' });
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.space_id).toBe('space-1');
  });

  it('propagates insert errors', async () => {
    mockInsert.mockRejectedValue(new Error('DB failure'));
    await expect(createDocument({ content: '' })).rejects.toThrow('DB failure');
  });
});

describe('updateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentState.state.clear();
    mockUpdate.mockResolvedValue(undefined);
  });

  it('applies updates and bumps updated_at', async () => {
    const before = new Date(2020, 0, 1);
    documentState.state.set('doc-1', { id: 'doc-1', content: 'Old', updated_at: before });

    await updateDocument('doc-1', { content: 'New content' });

    const updated = documentState.state.get('doc-1');
    expect(updated?.content).toBe('New content');
    expect(updated?.updated_at).toBeInstanceOf(Date);
    expect((updated?.updated_at as Date) > before).toBe(true);
  });

  it('propagates errors', async () => {
    mockUpdate.mockRejectedValue(new Error('update failed'));
    await expect(updateDocument('doc-1', {})).rejects.toThrow('update failed');
  });
});

describe('deleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentState.state.clear();
    mockDelete.mockResolvedValue(undefined);
  });

  it('deletes the document', async () => {
    documentState.state.set('doc-1', { id: 'doc-1' });

    await deleteDocument('doc-1');

    expect(mockDelete).toHaveBeenCalledWith('doc-1');
  });

  it('propagates errors', async () => {
    documentState.state.set('doc-err', { id: 'doc-err' });
    mockDelete.mockRejectedValue(new Error('delete failed'));
    await expect(deleteDocument('doc-err')).rejects.toThrow('delete failed');
  });
});

describe('deleteDocumentsForSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentState.state.clear();
    mockDelete.mockResolvedValue(undefined);
  });

  it('deletes only documents scoped to the given space', async () => {
    documentState.state.set('doc-1', { id: 'doc-1', space_id: 'space-1' });
    documentState.state.set('doc-2', { id: 'doc-2', space_id: 'space-1' });
    documentState.state.set('doc-3', { id: 'doc-3', space_id: 'space-2' });
    documentState.state.set('doc-4', { id: 'doc-4' });

    await deleteDocumentsForSpace('space-1');

    const deletedIds = mockDelete.mock.calls.map((call: unknown[]) => call[0]).sort();
    expect(deletedIds).toEqual(['doc-1', 'doc-2']);
  });

  it('does not delete global documents when no documents match the space', async () => {
    documentState.state.set('doc-1', { id: 'doc-1' });

    await deleteDocumentsForSpace('space-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
