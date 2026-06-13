import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const { mockChatInsert, mockChatUpdate, mockChatDelete, mockMessageInsert, mockMessageDelete } =
  vi.hoisted(() => {
    const mockChatInsert = vi.fn();
    const mockChatUpdate = vi.fn();
    const mockChatDelete = vi.fn();
    const mockMessageInsert = vi.fn();
    const mockMessageDelete = vi.fn();
    return { mockChatInsert, mockChatUpdate, mockChatDelete, mockMessageInsert, mockMessageDelete };
  });

// Simulate a Transaction with isPersisted.promise
function makeTx(promise: Promise<unknown> = Promise.resolve()) {
  return { isPersisted: { promise } };
}

// Stable mock collections with a loaded state we can populate per-test
const chatCollectionState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};
const messageCollectionState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};

vi.mock('./db', () => ({
  chatCollection: {
    insert: (data: unknown) => makeTx(mockChatInsert(data)),
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(chatCollectionState.state.get(id) || {}) };
      fn(draft);
      chatCollectionState.state.set(id, draft);
      return makeTx(mockChatUpdate(id, draft));
    },
    delete: (id: string) => {
      chatCollectionState.state.delete(id);
      return makeTx(mockChatDelete(id));
    },
    get toArray() {
      return Array.from(chatCollectionState.state.values());
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
import { createChat, createMessage, deleteChat, updateChat } from './mutations';
import { track } from '@/packages/analytics';

describe('createChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockChatInsert.mockResolvedValue(undefined);
  });

  it('inserts a chat with correct shape', async () => {
    const chat = await createChat('user-1');

    expect(mockChatInsert).toHaveBeenCalledOnce();
    const inserted = mockChatInsert.mock.calls[0][0];
    expect(inserted.id).toBe('fixed-uuid-1234');
    expect(inserted.user_id).toBe('user-1');
    expect(inserted.title).toBe('New Chat');
    expect(inserted.created_at).toBeInstanceOf(Date);
    expect(inserted.updated_at).toBeInstanceOf(Date);
    expect(chat).toMatchObject({ id: 'fixed-uuid-1234', user_id: 'user-1', title: 'New Chat' });
  });

  it('accepts a custom title', async () => {
    await createChat('user-1', 'My Custom Chat');
    const inserted = mockChatInsert.mock.calls[0][0];
    expect(inserted.title).toBe('My Custom Chat');
  });

  it('propagates insert errors', async () => {
    mockChatInsert.mockRejectedValue(new Error('DB failure'));
    await expect(createChat('user-1')).rejects.toThrow('DB failure');
  });
});

describe('updateChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockChatUpdate.mockResolvedValue(undefined);
  });

  it('applies updates and bumps updated_at', async () => {
    const before = new Date(2020, 0, 1);
    chatCollectionState.state.set('chat-1', { id: 'chat-1', title: 'Old', updated_at: before });

    await updateChat('chat-1', { title: 'New Title' });

    const updated = chatCollectionState.state.get('chat-1');
    expect(updated?.title).toBe('New Title');
    expect(updated?.updated_at).toBeInstanceOf(Date);
    expect((updated?.updated_at as Date) > before).toBe(true);
  });

  it('propagates errors', async () => {
    mockChatUpdate.mockRejectedValue(new Error('update failed'));
    await expect(updateChat('chat-1', {})).rejects.toThrow('update failed');
  });
});

describe('deleteChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockChatDelete.mockResolvedValue(undefined);
    mockMessageDelete.mockResolvedValue(undefined);
  });

  it('deletes the chat and all its messages', async () => {
    chatCollectionState.state.set('chat-1', { id: 'chat-1' });
    messageCollectionState.state.set('msg-1', { id: 'msg-1', chat_id: 'chat-1' });
    messageCollectionState.state.set('msg-2', { id: 'msg-2', chat_id: 'chat-1' });
    messageCollectionState.state.set('msg-3', { id: 'msg-3', chat_id: 'other-chat' });

    await deleteChat('chat-1');

    expect(mockMessageDelete).toHaveBeenCalledTimes(2);
    const deletedIds = mockMessageDelete.mock.calls.map((c: unknown[]) => c[0]).sort();
    expect(deletedIds).toEqual(['msg-1', 'msg-2']);
    expect(mockChatDelete).toHaveBeenCalledWith('chat-1');
  });

  it('works when chat has no messages', async () => {
    chatCollectionState.state.set('chat-empty', { id: 'chat-empty' });

    await deleteChat('chat-empty');

    expect(mockMessageDelete).not.toHaveBeenCalled();
    expect(mockChatDelete).toHaveBeenCalledWith('chat-empty');
  });

  it('propagates errors', async () => {
    chatCollectionState.state.set('chat-err', { id: 'chat-err' });
    mockChatDelete.mockRejectedValue(new Error('delete failed'));
    await expect(deleteChat('chat-err')).rejects.toThrow('delete failed');
  });
});

describe('createMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatCollectionState.state.clear();
    messageCollectionState.state.clear();
    mockMessageInsert.mockResolvedValue(undefined);
    mockChatUpdate.mockResolvedValue(undefined);
  });

  it('fills id and created_at when omitted', async () => {
    const msg = await createMessage({ text: 'Hello', type: 'user', user_id: 'user-1' });

    expect(msg.id).toBe('fixed-uuid-1234');
    expect(msg.created_at).toBeInstanceOf(Date);
  });

  it('bumps chat updated_at when chat_id is present', async () => {
    chatCollectionState.state.set('chat-1', { id: 'chat-1', updated_at: new Date(2020, 0, 1) });

    await createMessage({ text: 'Hi', type: 'user', user_id: 'user-1', chat_id: 'chat-1' });

    expect(mockChatUpdate).toHaveBeenCalledWith('chat-1', expect.any(Object));
  });

  it('does not bump chat when chat_id is absent', async () => {
    await createMessage({ text: 'Hi', type: 'user', user_id: 'user-1' });
    expect(mockChatUpdate).not.toHaveBeenCalled();
  });

  it('calls track with correct data', async () => {
    await createMessage({
      text: 'Hello world',
      type: 'user',
      user_id: 'user-1',
      chat_id: 'chat-1',
      editorStats: { keysTyped: 5, charsSaved: 2 },
    });

    expect(track).toHaveBeenCalledWith('user-1', {
      type: 'message_sent',
      text_length: 11,
      chat_id: 'chat-1',
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
