import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const { mockSpaceInsert, mockSpaceUpdate, mockSpaceDelete, mockMessageInsert, mockMessageDelete } =
  vi.hoisted(() => {
    const mockSpaceInsert = vi.fn();
    const mockSpaceUpdate = vi.fn();
    const mockSpaceDelete = vi.fn();
    const mockMessageInsert = vi.fn();
    const mockMessageDelete = vi.fn();
    return { mockSpaceInsert, mockSpaceUpdate, mockSpaceDelete, mockMessageInsert, mockMessageDelete };
  });

// Simulate a Transaction with isPersisted.promise
function makeTx(promise: Promise<unknown> = Promise.resolve()) {
  return { isPersisted: { promise } };
}

// Stable mock collections with a loaded state we can populate per-test
const spaceCollectionState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};
const messageCollectionState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};

vi.mock('./db', () => ({
  spaceCollection: {
    insert: (data: unknown) => makeTx(mockSpaceInsert(data)),
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(spaceCollectionState.state.get(id) || {}) };
      fn(draft);
      spaceCollectionState.state.set(id, draft);
      return makeTx(mockSpaceUpdate(id, draft));
    },
    delete: (id: string) => {
      spaceCollectionState.state.delete(id);
      return makeTx(mockSpaceDelete(id));
    },
    get toArray() {
      return Array.from(spaceCollectionState.state.values());
    },
  },
  messageCollection: {
    insert: (data: unknown) => makeTx(mockMessageInsert(data)),
    delete: (id: string) => {
      messageCollectionState.state.delete(id);
      return makeTx(mockMessageDelete(id));
    },
    get toArray() {
      return Array.from(messageCollectionState.state.values());
    },
  },
}));

vi.mock('@/packages/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid-1234'),
}));

// Import after mocks
import { createSpace, createMessage, deleteSpace, updateSpace } from './mutations';
import { track } from '@/packages/analytics';

describe('createSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockSpaceInsert.mockResolvedValue(undefined);
  });

  it('inserts a space with correct shape', async () => {
    const space = await createSpace('user-1');

    expect(mockSpaceInsert).toHaveBeenCalledOnce();
    const inserted = mockSpaceInsert.mock.calls[0][0];
    expect(inserted.id).toBe('fixed-uuid-1234');
    expect(inserted.user_id).toBe('user-1');
    expect(inserted.title).toBe('New Space');
    expect(inserted.created_at).toBeInstanceOf(Date);
    expect(inserted.updated_at).toBeInstanceOf(Date);
    expect(space).toMatchObject({ id: 'fixed-uuid-1234', user_id: 'user-1', title: 'New Space' });
  });

  it('accepts a custom title', async () => {
    await createSpace('user-1', 'My Custom Space');
    const inserted = mockSpaceInsert.mock.calls[0][0];
    expect(inserted.title).toBe('My Custom Space');
  });

  it('propagates insert errors', async () => {
    mockSpaceInsert.mockRejectedValue(new Error('DB failure'));
    await expect(createSpace('user-1')).rejects.toThrow('DB failure');
  });
});

describe('updateSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockSpaceUpdate.mockResolvedValue(undefined);
  });

  it('applies updates and bumps updated_at', async () => {
    const before = new Date(2020, 0, 1);
    spaceCollectionState.state.set('space-1', { id: 'space-1', title: 'Old', updated_at: before });

    await updateSpace('space-1', { title: 'New Title' });

    const updated = spaceCollectionState.state.get('space-1');
    expect(updated?.title).toBe('New Title');
    expect(updated?.updated_at).toBeInstanceOf(Date);
    expect((updated?.updated_at as Date) > before).toBe(true);
  });

  it('propagates errors', async () => {
    mockSpaceUpdate.mockRejectedValue(new Error('update failed'));
    await expect(updateSpace('space-1', {})).rejects.toThrow('update failed');
  });
});

describe('deleteSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockSpaceDelete.mockResolvedValue(undefined);
    mockMessageDelete.mockResolvedValue(undefined);
  });

  it('deletes the space and all its messages', async () => {
    spaceCollectionState.state.set('space-1', { id: 'space-1' });
    messageCollectionState.state.set('msg-1', { id: 'msg-1', space_id: 'space-1' });
    messageCollectionState.state.set('msg-2', { id: 'msg-2', space_id: 'space-1' });
    messageCollectionState.state.set('msg-3', { id: 'msg-3', space_id: 'other-space' });

    await deleteSpace('space-1');

    expect(mockMessageDelete).toHaveBeenCalledTimes(2);
    const deletedIds = mockMessageDelete.mock.calls.map((c: unknown[]) => c[0]).sort();
    expect(deletedIds).toEqual(['msg-1', 'msg-2']);
    expect(mockSpaceDelete).toHaveBeenCalledWith('space-1');
  });

  it('works when space has no messages', async () => {
    spaceCollectionState.state.set('space-empty', { id: 'space-empty' });

    await deleteSpace('space-empty');

    expect(mockMessageDelete).not.toHaveBeenCalled();
    expect(mockSpaceDelete).toHaveBeenCalledWith('space-empty');
  });

  it('propagates errors', async () => {
    spaceCollectionState.state.set('space-err', { id: 'space-err' });
    mockSpaceDelete.mockRejectedValue(new Error('delete failed'));
    await expect(deleteSpace('space-err')).rejects.toThrow('delete failed');
  });
});

describe('createMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockMessageInsert.mockResolvedValue(undefined);
    mockSpaceUpdate.mockResolvedValue(undefined);
  });

  it('fills id and created_at when omitted', async () => {
    const msg = await createMessage({ text: 'Hello', type: 'user', user_id: 'user-1' });

    expect(msg.id).toBe('fixed-uuid-1234');
    expect(msg.created_at).toBeInstanceOf(Date);
  });

  it('bumps space updated_at when space_id is present', async () => {
    spaceCollectionState.state.set('space-1', { id: 'space-1', updated_at: new Date(2020, 0, 1) });

    await createMessage({ text: 'Hi', type: 'user', user_id: 'user-1', space_id: 'space-1' });

    expect(mockSpaceUpdate).toHaveBeenCalledWith('space-1', expect.any(Object));
  });

  it('does not bump space when space_id is absent', async () => {
    await createMessage({ text: 'Hi', type: 'user', user_id: 'user-1' });
    expect(mockSpaceUpdate).not.toHaveBeenCalled();
  });

  it('calls track with correct data', async () => {
    await createMessage({
      text: 'Hello world',
      type: 'user',
      user_id: 'user-1',
      space_id: 'space-1',
      editorStats: { keysTyped: 5, charsSaved: 2 },
    });

    expect(track).toHaveBeenCalledWith('user-1', {
      type: 'message_sent',
      text_length: 11,
      space_id: 'space-1',
      keys_typed: 5,
    });
  });

  it('propagates insert errors', async () => {
    mockMessageInsert.mockRejectedValue(new Error('insert failed'));
    await expect(
      createMessage({ text: 'Hi', type: 'user', user_id: 'user-1' })
    ).rejects.toThrow('insert failed');
  });
});
