import { describe, expect, it, vi } from 'vitest';

import type { Change, PendingLike, PushResult, SyncCollection } from '../types';
import { createCursorStore } from './cursor';
import { createSyncEngine } from './engine';
import { createOutbox, toMutation } from './outbox';
import { memoryStorage } from './test-storage';

function fakeClient(pull: { changes: Change[]; cursor: number }) {
  const pushed: unknown[] = [];
  return {
    pushed,
    push: vi.fn(async (m: unknown[]): Promise<PushResult> => {
      pushed.push(...m);
      return { cursor: 1, applied: m.length };
    }),
    pull: vi.fn(async () => pull),
  };
}

function fakeCollection(id: string, parse: (d: unknown) => unknown = d => d) {
  const accepted: PendingLike[] = [];
  const col: SyncCollection & { accepted: PendingLike[] } = {
    id,
    parse,
    accepted,
    acceptMutations: vi.fn(async ({ mutations }) => {
      accepted.push(...mutations);
    }),
  };
  return col;
}

const change = (over: Partial<Change>): Change => ({
  collection: 'spaces',
  id: 's1',
  op: 'upsert',
  data: { id: 's1' },
  version: null,
  updatedAt: 1000,
  seq: 1,
  ...over,
});

describe('sync engine flush', () => {
  it('flushes a durable desktop outbox when the engine starts', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [], cursor: 0 });
    const desktopStorage = {
      listOutbox: vi.fn(async () => [
        {
          outboxId: 7,
          collection: 'spaces',
          id: 's1',
          op: 'upsert' as const,
          data: { id: 's1' },
          version: null,
          updatedAt: 10,
        },
      ]),
      ackOutbox: vi.fn(async () => 1),
      getCursor: vi.fn(async () => 0),
      applyRemote: vi.fn(async () => ({ applied: 0, collections: [] })),
    };
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: {},
      desktopStorage,
    });

    engine.start();
    await vi.waitFor(() => expect(desktopStorage.ackOutbox).toHaveBeenCalledWith([7]));
    engine.stop();
  });

  it('pushes then acknowledges the Rust-owned durable outbox', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [], cursor: 0 });
    const desktopStorage = {
      listOutbox: vi.fn(async () => [
        {
          outboxId: 7,
          collection: 'spaces',
          id: 's1',
          op: 'upsert' as const,
          data: { id: 's1' },
          version: null,
          updatedAt: 10,
        },
      ]),
      ackOutbox: vi.fn(async () => 1),
      getCursor: vi.fn(async () => 0),
      applyRemote: vi.fn(),
    };
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: {},
      desktopStorage,
    });

    await engine.flush();

    expect(client.push).toHaveBeenCalledWith([
      {
        collection: 'spaces',
        id: 's1',
        op: 'upsert',
        data: { id: 's1' },
        version: null,
        updatedAt: 10,
      },
    ]);
    expect(desktopStorage.ackOutbox).toHaveBeenCalledWith([7]);
  });

  it('pushes drained mutations', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [], cursor: 0 });
    const outbox = createOutbox();
    outbox.capture(toMutation('spaces', 'upsert', { id: 's1', updated_at: new Date(1000) }));
    const engine = createSyncEngine({
      client: client as never,
      outbox,
      cursor: createCursorStore('u1'),
      collections: {},
    });

    await engine.flush();
    expect(client.push).toHaveBeenCalledOnce();
    expect(client.pushed).toHaveLength(1);
    expect(outbox.size()).toBe(0);
  });

  it('does not push when the outbox is empty', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [], cursor: 0 });
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: {},
    });
    await engine.flush();
    expect(client.push).not.toHaveBeenCalled();
  });

  it('re-queues mutations if the push fails', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const outbox = createOutbox();
    outbox.capture(toMutation('spaces', 'upsert', { id: 's1', updated_at: new Date(1000) }));
    const client = {
      push: vi.fn(async () => {
        throw new Error('offline');
      }),
      pull: vi.fn(),
    };
    const engine = createSyncEngine({
      client: client as never,
      outbox,
      cursor: createCursorStore('u1'),
      collections: {},
    });
    await expect(engine.flush()).rejects.toThrow('offline');
    expect(outbox.size()).toBe(1); // not lost
  });
});

describe('sync engine pull', () => {
  it('applies parsed remote changes atomically through Rust without collection echo', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({
      changes: [change({ data: { id: 's1', created_at: '2026-01-01T00:00:00Z' } })],
      cursor: 8,
    });
    const spaces = fakeCollection('spaces', data => ({
      ...(data as object),
      created_at: new Date((data as { created_at: string }).created_at),
    }));
    const desktopStorage = {
      listOutbox: vi.fn(async () => []),
      ackOutbox: vi.fn(async () => 0),
      getCursor: vi.fn(async () => 4),
      applyRemote: vi.fn(async () => ({ applied: 1, collections: ['spaces'] })),
    };
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: { spaces },
      desktopStorage,
    });

    await engine.pullOnce();

    expect(client.pull).toHaveBeenCalledWith(4);
    expect(desktopStorage.applyRemote).toHaveBeenCalledWith(
      [expect.objectContaining({ collection: 'spaces', id: 's1', op: 'upsert' })],
      8
    );
    expect(spaces.acceptMutations).not.toHaveBeenCalled();
  });

  it('applies upserts to the matching collection and advances the cursor', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({
      changes: [change({ data: { id: 's1', title: 'Hi' } })],
      cursor: 7,
    });
    const spaces = fakeCollection('spaces');
    const cursor = createCursorStore('u1');
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor,
      collections: { spaces },
    });

    await engine.pullOnce();
    expect(spaces.accepted).toHaveLength(1);
    expect(spaces.accepted[0]).toMatchObject({
      type: 'update',
      key: 's1',
      collection: { id: 'spaces' },
    });
    expect(cursor.get()).toBe(7);
  });

  it('maps deletes to delete mutations', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [change({ op: 'delete', data: null })], cursor: 2 });
    const spaces = fakeCollection('spaces');
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: { spaces },
    });
    await engine.pullOnce();
    expect(spaces.accepted[0]).toMatchObject({ type: 'delete', key: 's1' });
  });

  it('revives remote data through the collection parser', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({
      changes: [change({ data: { id: 's1', created_at: '2026-01-01T00:00:00Z' } })],
      cursor: 3,
    });
    const spaces = fakeCollection('spaces', d => ({
      ...(d as object),
      created_at: new Date((d as { created_at: string }).created_at),
    }));
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor: createCursorStore('u1'),
      collections: { spaces },
    });
    await engine.pullOnce();
    expect((spaces.accepted[0].modified as { created_at: Date }).created_at).toBeInstanceOf(Date);
  });

  it('ignores changes for unknown collections but still advances the cursor', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [change({ collection: 'mystery' })], cursor: 5 });
    const cursor = createCursorStore('u1');
    const engine = createSyncEngine({
      client: client as never,
      outbox: createOutbox(),
      cursor,
      collections: {},
    });
    await engine.pullOnce();
    expect(cursor.get()).toBe(5);
  });
});
