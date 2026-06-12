import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that transitively use them
// ---------------------------------------------------------------------------

const { mockInsert, mockUpdate, mockDelete, mockNanoid } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockNanoid = vi.fn();
  return { mockInsert, mockUpdate, mockDelete, mockNanoid };
});

// Simulate a Transaction with isPersisted.promise
function makeTx(promise: Promise<unknown> = Promise.resolve()) {
  return { isPersisted: { promise } };
}

// Stable mock collection with loadable state per-test
const collectionState: { state: Map<string, Record<string, unknown>> } = {
  state: new Map(),
};

vi.mock('./db', () => ({
  customKeyboardCollection: {
    insert: (data: unknown) => {
      const key = (data as Record<string, unknown>).id as string;
      collectionState.state.set(key, data as Record<string, unknown>);
      return makeTx(mockInsert(data));
    },
    update: (id: string, fn: (d: Record<string, unknown>) => void) => {
      const draft = { ...(collectionState.state.get(id) || {}) };
      fn(draft);
      collectionState.state.set(id, draft);
      return makeTx(mockUpdate(id, draft));
    },
    delete: (id: string) => {
      collectionState.state.delete(id);
      return makeTx(mockDelete(id));
    },
  },
}));

vi.mock('nanoid', () => ({
  nanoid: mockNanoid,
}));

// Import after mocks
import { createKeyboard, deleteKeyboard, updateKeyboard } from './mutations';

describe('createKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionState.state.clear();
    mockInsert.mockResolvedValue(undefined);
    // Default: keyboard-id first, then button ids
    mockNanoid
      .mockReturnValueOnce('keyboard-id-1')
      .mockReturnValueOnce('btn-id-0')
      .mockReturnValueOnce('btn-id-1')
      .mockReturnValue('btn-id-extra');
  });

  it('assigns nanoid id to keyboard and each button', async () => {
    const kb = await createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      columns: 3,
      buttons: [{ text: 'Hello' }, { text: 'World' }],
    });

    expect(kb.id).toBe('keyboard-id-1');
    expect(kb.buttons[0].id).toBe('btn-id-0');
    expect(kb.buttons[1].id).toBe('btn-id-1');
  });

  it('assigns order to buttons (0-indexed)', async () => {
    mockNanoid
      .mockReturnValueOnce('kb-id')
      .mockReturnValueOnce('b0')
      .mockReturnValueOnce('b1')
      .mockReturnValueOnce('b2');

    const kb = await createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      buttons: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    });

    expect(kb.buttons[0].order).toBe(0);
    expect(kb.buttons[1].order).toBe(1);
    expect(kb.buttons[2].order).toBe(2);
  });

  it('defaults columns to 4 when not provided', async () => {
    const kb = await createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      buttons: [{ text: 'A' }],
    });

    expect(kb.columns).toBe(4);
  });

  it('uses provided columns value', async () => {
    const kb = await createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      columns: 3,
      buttons: [{ text: 'A' }],
    });

    expect(kb.columns).toBe(3);
  });

  it('sets created_at and updated_at as Dates', async () => {
    const kb = await createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      buttons: [{ text: 'A' }],
    });

    expect(kb.created_at).toBeInstanceOf(Date);
    expect(kb.updated_at).toBeInstanceOf(Date);
  });

  it('awaits isPersisted.promise before returning', async () => {
    let resolve!: () => void;
    const persistPromise = new Promise<void>(r => {
      resolve = r;
    });
    mockInsert.mockReturnValue(persistPromise);

    let resolved = false;
    const promise = createKeyboard({
      name: 'Test KB',
      user_id: 'user-1',
      buttons: [{ text: 'A' }],
    }).then(() => {
      resolved = true;
    });

    // Not resolved yet
    await Promise.resolve();
    expect(resolved).toBe(false);

    resolve();
    await promise;
    expect(resolved).toBe(true);
  });

  it('propagates insert errors', async () => {
    mockInsert.mockRejectedValue(new Error('DB write failed'));

    await expect(
      createKeyboard({ name: 'Test KB', user_id: 'user-1', buttons: [{ text: 'A' }] })
    ).rejects.toThrow('DB write failed');
  });

  it('uses provided id when given', async () => {
    const kb = await createKeyboard({
      id: 'custom-id-xyz',
      name: 'Test KB',
      user_id: 'user-1',
      buttons: [{ text: 'A' }],
    });

    expect(kb.id).toBe('custom-id-xyz');
  });
});

describe('updateKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionState.state.clear();
    mockUpdate.mockResolvedValue(undefined);
  });

  it('bumps updated_at to a newer date', async () => {
    const before = new Date(2020, 0, 1);
    collectionState.state.set('kb-1', {
      id: 'kb-1',
      name: 'Old Name',
      updated_at: before,
    });

    const result = await updateKeyboard('kb-1', { name: 'New Name' });

    expect(result.name).toBe('New Name');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect((result.updated_at as Date) > before).toBe(true);
  });

  it('returns the updated keyboard state', async () => {
    collectionState.state.set('kb-1', {
      id: 'kb-1',
      name: 'Old',
      columns: 3,
      updated_at: new Date(),
    });

    const result = await updateKeyboard('kb-1', { columns: 5 });

    expect(result.columns).toBe(5);
    expect(result.id).toBe('kb-1');
  });

  it('awaits isPersisted.promise before returning', async () => {
    collectionState.state.set('kb-1', { id: 'kb-1', name: 'x', updated_at: new Date() });

    let resolve!: () => void;
    const persistPromise = new Promise<void>(r => {
      resolve = r;
    });
    mockUpdate.mockReturnValue(persistPromise);

    let resolved = false;
    const promise = updateKeyboard('kb-1', { name: 'New' }).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    resolve();
    await promise;
    expect(resolved).toBe(true);
  });

  it('propagates update errors', async () => {
    collectionState.state.set('kb-1', { id: 'kb-1', name: 'x', updated_at: new Date() });
    mockUpdate.mockRejectedValue(new Error('update failed'));

    await expect(updateKeyboard('kb-1', { name: 'y' })).rejects.toThrow('update failed');
  });
});

describe('deleteKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionState.state.clear();
    mockDelete.mockResolvedValue(undefined);
  });

  it('deletes the keyboard by id', async () => {
    collectionState.state.set('kb-1', { id: 'kb-1' });

    await deleteKeyboard('kb-1');

    expect(mockDelete).toHaveBeenCalledWith('kb-1');
  });

  it('awaits isPersisted.promise before resolving', async () => {
    collectionState.state.set('kb-1', { id: 'kb-1' });

    let resolve!: () => void;
    const persistPromise = new Promise<void>(r => {
      resolve = r;
    });
    mockDelete.mockReturnValue(persistPromise);

    let resolved = false;
    const promise = deleteKeyboard('kb-1').then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    resolve();
    await promise;
    expect(resolved).toBe(true);
  });

  it('propagates delete errors', async () => {
    collectionState.state.set('kb-1', { id: 'kb-1' });
    mockDelete.mockRejectedValue(new Error('delete failed'));

    await expect(deleteKeyboard('kb-1')).rejects.toThrow('delete failed');
  });
});
