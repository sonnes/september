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

function fakeCollection(id: string, parse: (d: unknown) => unknown = (d) => d) {
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
  it('applies upserts to the matching collection and advances the cursor', async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const client = fakeClient({ changes: [change({ data: { id: 's1', title: 'Hi' } })], cursor: 7 });
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
    expect(spaces.accepted[0]).toMatchObject({ type: 'update', key: 's1', collection: { id: 'spaces' } });
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
    const spaces = fakeCollection('spaces', (d) => ({
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
