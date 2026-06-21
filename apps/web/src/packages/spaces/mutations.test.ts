import { beforeEach, describe, expect, it, vi } from 'vitest';

import { track } from '@/packages/usage';

// Import after mocks
import {
  DEFAULT_SPACE_SEED,
  addManualPhrase,
  createDefaultSpace,
  createMessage,
  createSpace,
  deleteSpace,
  removePhrase,
  replaceAiPhrases,
  setPhrasePinned,
  updateSpace,
} from './mutations';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const {
  mockSpaceInsert,
  mockSpaceUpdate,
  mockSpaceDelete,
  mockMessageInsert,
  mockMessageDelete,
  mockSavedInsert,
  mockSavedUpdate,
  mockSavedDelete,
  mockDeleteNotesForSpace,
} = vi.hoisted(() => {
  const mockSpaceInsert = vi.fn();
  const mockSpaceUpdate = vi.fn();
  const mockSpaceDelete = vi.fn();
  const mockMessageInsert = vi.fn();
  const mockMessageDelete = vi.fn();
  const mockSavedInsert = vi.fn();
  const mockSavedUpdate = vi.fn();
  const mockSavedDelete = vi.fn();
  const mockDeleteNotesForSpace = vi.fn();
  return {
    mockSpaceInsert,
    mockSpaceUpdate,
    mockSpaceDelete,
    mockMessageInsert,
    mockMessageDelete,
    mockSavedInsert,
    mockSavedUpdate,
    mockSavedDelete,
    mockDeleteNotesForSpace,
  };
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
const savedPhraseCollectionState: { state: Map<string, Record<string, unknown>> } = {
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
  savedPhraseCollection: {
    insert: (data: { id: string }) => {
      savedPhraseCollectionState.state.set(data.id, data);
      return makeTx(mockSavedInsert(data));
    },
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(savedPhraseCollectionState.state.get(id) || {}) };
      fn(draft);
      savedPhraseCollectionState.state.set(id, draft);
      return makeTx(mockSavedUpdate(id, draft));
    },
    delete: (id: string) => {
      savedPhraseCollectionState.state.delete(id);
      return makeTx(mockSavedDelete(id));
    },
    get toArray() {
      return Array.from(savedPhraseCollectionState.state.values());
    },
  },
}));

vi.mock('@/packages/usage', () => ({
  track: vi.fn(),
}));

vi.mock('@/packages/notes', () => ({
  deleteNotesForSpace: mockDeleteNotesForSpace,
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid-1234'),
}));

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
    expect(inserted.title).toBe('General');
    expect(inserted.created_at).toBeInstanceOf(Date);
    expect(inserted.updated_at).toBeInstanceOf(Date);
    expect(space).toMatchObject({
      id: 'fixed-uuid-1234',
      user_id: 'user-1',
      title: 'General',
    });
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

describe('createDefaultSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    savedPhraseCollectionState.state.clear();
    mockSpaceInsert.mockResolvedValue(undefined);
    mockSavedInsert.mockResolvedValue(undefined);
  });

  it('creates the default space with starter saved phrases', async () => {
    const space = await createDefaultSpace('user-1');

    expect(mockSpaceInsert).toHaveBeenCalledOnce();
    expect(mockSpaceInsert.mock.calls[0][0]).toMatchObject({
      id: space.id,
      user_id: 'user-1',
      title: DEFAULT_SPACE_SEED.title,
    });

    const insertedPhrases = mockSavedInsert.mock.calls.map(
      (call: unknown[]) => call[0] as { text: string; pinned: boolean; space_id: string }
    );
    expect(insertedPhrases.map(phrase => phrase.text)).toEqual(
      DEFAULT_SPACE_SEED.phrases.map(phrase => phrase.text)
    );
    expect(insertedPhrases.map(phrase => phrase.pinned)).toEqual(
      DEFAULT_SPACE_SEED.phrases.map(phrase => phrase.pinned)
    );
    expect(insertedPhrases.every(phrase => phrase.space_id === space.id)).toBe(true);
  });

  it('uses generic greeting and reply starter phrases', () => {
    const texts = DEFAULT_SPACE_SEED.phrases.map(phrase => phrase.text);

    expect(texts).not.toContain('Reyu');
    expect(texts).toEqual([
      'Hello',
      'Please',
      'Thank you',
      'Help',
      'Good morning',
      'Yes, please.',
      'No, thank you.',
    ]);
    expect(DEFAULT_SPACE_SEED.phrases.filter(phrase => phrase.pinned)).toHaveLength(4);
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
    savedPhraseCollectionState.state.clear();
    mockSpaceDelete.mockResolvedValue(undefined);
    mockMessageDelete.mockResolvedValue(undefined);
    mockSavedDelete.mockResolvedValue(undefined);
    mockDeleteNotesForSpace.mockResolvedValue(undefined);
  });

  it('deletes the space and all its messages, saved phrases, and notes', async () => {
    spaceCollectionState.state.set('space-1', { id: 'space-1' });
    messageCollectionState.state.set('msg-1', { id: 'msg-1', space_id: 'space-1' });
    messageCollectionState.state.set('msg-2', { id: 'msg-2', space_id: 'space-1' });
    messageCollectionState.state.set('msg-3', { id: 'msg-3', space_id: 'other-space' });
    savedPhraseCollectionState.state.set('ph-1', { id: 'ph-1', space_id: 'space-1' });
    savedPhraseCollectionState.state.set('ph-2', { id: 'ph-2', space_id: 'other-space' });

    await deleteSpace('space-1');

    expect(mockMessageDelete).toHaveBeenCalledTimes(2);
    const deletedIds = mockMessageDelete.mock.calls.map((c: unknown[]) => c[0]).sort();
    expect(deletedIds).toEqual(['msg-1', 'msg-2']);
    expect(mockSavedDelete).toHaveBeenCalledTimes(1);
    expect(mockSavedDelete).toHaveBeenCalledWith('ph-1');
    expect(mockDeleteNotesForSpace).toHaveBeenCalledWith('space-1');
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
    await expect(createMessage({ text: 'Hi', type: 'user', user_id: 'user-1' })).rejects.toThrow(
      'insert failed'
    );
  });
});

describe('addManualPhrase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedPhraseCollectionState.state.clear();
    mockSavedInsert.mockResolvedValue(undefined);
    mockSavedUpdate.mockResolvedValue(undefined);
  });

  it('inserts a new pinned phrase (trimmed)', async () => {
    await addManualPhrase('space-1', 'user-1', '  I need water  ');

    expect(mockSavedInsert).toHaveBeenCalledOnce();
    const row = mockSavedInsert.mock.calls[0][0];
    expect(row).toMatchObject({
      space_id: 'space-1',
      user_id: 'user-1',
      text: 'I need water',
      pinned: true,
    });
    expect(row.created_at).toBeInstanceOf(Date);
  });

  it('promotes an existing AI phrase to pinned instead of inserting', async () => {
    savedPhraseCollectionState.state.set('p1', {
      id: 'p1',
      space_id: 'space-1',
      user_id: 'u',
      text: 'I need water',
      pinned: false,
      created_at: new Date(0),
    });

    await addManualPhrase('space-1', 'user-1', 'i need WATER');

    expect(mockSavedInsert).not.toHaveBeenCalled();
    expect(mockSavedUpdate).toHaveBeenCalledOnce();
    expect(savedPhraseCollectionState.state.get('p1')?.pinned).toBe(true);
  });

  it('is a no-op when an identical pinned phrase already exists', async () => {
    savedPhraseCollectionState.state.set('p1', {
      id: 'p1',
      space_id: 'space-1',
      user_id: 'u',
      text: 'I need water',
      pinned: true,
      created_at: new Date(0),
    });

    await addManualPhrase('space-1', 'user-1', 'I need water');

    expect(mockSavedInsert).not.toHaveBeenCalled();
    expect(mockSavedUpdate).not.toHaveBeenCalled();
  });

  it('ignores blank text', async () => {
    await addManualPhrase('space-1', 'user-1', '   ');
    expect(mockSavedInsert).not.toHaveBeenCalled();
  });
});

describe('removePhrase / setPhrasePinned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedPhraseCollectionState.state.clear();
    mockSavedDelete.mockResolvedValue(undefined);
    mockSavedUpdate.mockResolvedValue(undefined);
  });

  it('removePhrase deletes by id', async () => {
    await removePhrase('p1');
    expect(mockSavedDelete).toHaveBeenCalledWith('p1');
  });

  it('setPhrasePinned toggles the flag', async () => {
    savedPhraseCollectionState.state.set('p1', { id: 'p1', pinned: true });
    await setPhrasePinned('p1', false);
    expect(savedPhraseCollectionState.state.get('p1')?.pinned).toBe(false);
  });
});

describe('replaceAiPhrases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spaceCollectionState.state.clear();
    savedPhraseCollectionState.state.clear();
    mockSavedInsert.mockResolvedValue(undefined);
    mockSavedDelete.mockResolvedValue(undefined);
    mockSpaceUpdate.mockResolvedValue(undefined);
  });

  it('replaces only AI rows, keeps pinned, dedups against pinned, and bumps synced count', async () => {
    spaceCollectionState.state.set('space-1', { id: 'space-1', updated_at: new Date(0) });
    savedPhraseCollectionState.state.set('pin', {
      id: 'pin',
      space_id: 'space-1',
      user_id: 'u',
      text: 'Call the nurse',
      pinned: true,
      created_at: new Date(0),
    });
    savedPhraseCollectionState.state.set('ai-old', {
      id: 'ai-old',
      space_id: 'space-1',
      user_id: 'u',
      text: 'old ai',
      pinned: false,
      created_at: new Date(0),
    });
    // A phrase in another space must be untouched.
    savedPhraseCollectionState.state.set('other', {
      id: 'other',
      space_id: 'space-2',
      user_id: 'u',
      text: 'x',
      pinned: false,
      created_at: new Date(0),
    });

    await replaceAiPhrases('space-1', 'user-1', ['Fresh one', 'call the NURSE', 'Another'], 7);

    // Deletes only this space's old AI row.
    expect(mockSavedDelete).toHaveBeenCalledTimes(1);
    expect(mockSavedDelete).toHaveBeenCalledWith('ai-old');

    // Inserts the fresh AI texts minus the one duplicating the pinned phrase.
    const insertedTexts = mockSavedInsert.mock.calls.map(
      (c: unknown[]) => (c[0] as { text: string }).text
    );
    expect(insertedTexts).toEqual(['Fresh one', 'Another']);
    for (const c of mockSavedInsert.mock.calls) {
      expect(c[0]).toMatchObject({ space_id: 'space-1', pinned: false });
    }

    // Pinned row left untouched.
    expect(savedPhraseCollectionState.state.get('pin')?.pinned).toBe(true);

    // Synced count persisted on the space.
    expect(mockSpaceUpdate).toHaveBeenCalledWith(
      'space-1',
      expect.objectContaining({ phrases_synced_count: 7 })
    );
  });
});
