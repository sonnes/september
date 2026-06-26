import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import type { Json, Mutation } from './user-data-do';

function userData(name: string) {
  return env.USER_DATA.get(env.USER_DATA.idFromName(name));
}

const upsert = (
  collection: string,
  id: string,
  data: Json,
  updatedAt: number,
  version = String(updatedAt),
): Mutation => ({ collection, id, op: 'upsert', data, updatedAt, version });

describe('UserDataDO sync', () => {
  it('pushes records and pulls them back from cursor 0', async () => {
    const u = userData('basic');
    const res = await u.push([
      upsert('spaces', 's1', { title: 'Home' }, 1000),
      upsert('messages', 'm1', { text: 'hi' }, 1001),
    ]);
    expect(res.applied).toBe(2);

    const { changes, cursor } = await u.pull(0);
    expect(changes.map((c) => c.id)).toEqual(['s1', 'm1']);
    expect(changes[0]).toMatchObject({ collection: 'spaces', op: 'upsert', data: { title: 'Home' } });
    expect(cursor).toBeGreaterThan(0);
  });

  it('returns nothing for an up-to-date cursor', async () => {
    const u = userData('uptodate');
    await u.push([upsert('notes', 'n1', { content: 'x' }, 2000)]);
    const { cursor } = await u.pull(0);
    const second = await u.pull(cursor);
    expect(second.changes).toEqual([]);
    expect(second.cursor).toBe(cursor);
  });

  it('applies last-write-wins by updatedAt', async () => {
    const u = userData('lww');
    await u.push([upsert('account', 'a1', { name: 'old' }, 5000)]);
    // Older write must be ignored.
    const ignored = await u.push([upsert('account', 'a1', { name: 'stale' }, 4000)]);
    expect(ignored.applied).toBe(0);
    // Newer write wins.
    await u.push([upsert('account', 'a1', { name: 'new' }, 6000)]);

    const { changes } = await u.pull(0);
    const a1 = changes.find((c) => c.id === 'a1');
    expect(a1?.data).toEqual({ name: 'new' });
  });

  it('represents deletes as tombstones', async () => {
    const u = userData('delete');
    await u.push([upsert('spaces', 's1', { title: 'gone soon' }, 1000)]);
    await u.push([{ collection: 'spaces', id: 's1', op: 'delete', updatedAt: 2000, version: '2000' }]);

    const { changes } = await u.pull(0);
    const s1 = changes.find((c) => c.id === 's1');
    expect(s1).toMatchObject({ op: 'delete', data: null });
  });

  it('pulls only changes after the given cursor', async () => {
    const u = userData('incremental');
    await u.push([upsert('messages', 'm1', { text: 'one' }, 1000)]);
    const afterFirst = await u.pull(0);
    await u.push([upsert('messages', 'm2', { text: 'two' }, 1001)]);

    const delta = await u.pull(afterFirst.cursor);
    expect(delta.changes.map((c) => c.id)).toEqual(['m2']);
  });

  it('re-pushing the same mutation is idempotent (no cursor churn)', async () => {
    const u = userData('idempotent');
    const m = upsert('notes', 'n1', { content: 'x' }, 3000);
    await u.push([m]);
    const first = await u.pull(0);
    const again = await u.push([m]);
    expect(again.applied).toBe(0);
    const second = await u.pull(0);
    expect(second.cursor).toBe(first.cursor);
  });

  it('keeps each user’s data isolated', async () => {
    const a = userData('userA');
    const b = userData('userB');
    await a.push([upsert('spaces', 's1', { title: 'A only' }, 1000)]);
    const bChanges = await b.pull(0);
    expect(bChanges.changes).toEqual([]);
  });
});
