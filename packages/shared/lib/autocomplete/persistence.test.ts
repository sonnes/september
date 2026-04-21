import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NgramModel } from './ngram-model';
import {
  AutocompletePersistence,
  type EngineSnapshot,
  isCompatibleSnapshot,
  toSnapshot,
} from './persistence';

describe('toSnapshot / isCompatibleSnapshot', () => {
  it('produces a versioned snapshot from an NgramModel', () => {
    const m = new NgramModel({ order: 3 });
    m.observe(['<s>', 'hello', 'world', '</s>']);
    const snap = toSnapshot(m);
    expect(snap.version).toBe(1);
    expect(snap.ngram.order).toBe(3);
    expect(snap.ngram.totalTokens).toBe(m.stats.totalTokens);
    expect(typeof snap.createdAt).toBe('number');
  });

  it('accepts only matching version', () => {
    const snap: EngineSnapshot = {
      version: 1,
      createdAt: Date.now(),
      ngram: new NgramModel().serialize(),
    };
    expect(isCompatibleSnapshot(snap)).toBe(true);
    expect(
      isCompatibleSnapshot({ ...snap, version: 2 as unknown as 1 }),
    ).toBe(false);
    expect(isCompatibleSnapshot(null)).toBe(false);
    expect(isCompatibleSnapshot({})).toBe(false);
  });
});

describe('AutocompletePersistence (IndexedDB)', () => {
  let store: AutocompletePersistence;

  beforeEach(() => {
    store = new AutocompletePersistence({ dbName: 'autocomplete-test-db' });
  });

  afterEach(async () => {
    await store.destroy();
  });

  it('returns undefined when key is missing', async () => {
    expect(await store.load('user-42')).toBeUndefined();
  });

  it('round-trips a snapshot through IDB', async () => {
    const m = new NgramModel({ order: 3 });
    m.observe(['<s>', 'hello', 'world', '</s>']);
    const snap = toSnapshot(m);

    await store.save('user-42', snap);
    const loaded = await store.load('user-42');

    expect(loaded).toBeDefined();
    expect(loaded?.version).toBe(1);
    expect(loaded?.ngram.totalTokens).toBe(m.stats.totalTokens);

    const m2 = NgramModel.deserialize(loaded!.ngram);
    expect(m2.topK(['hello'], 3)).toEqual(m.topK(['hello'], 3));
  });

  it('overwrites an existing snapshot at the same key', async () => {
    const m1 = new NgramModel();
    m1.observe(['a', 'b']);
    const m2 = new NgramModel();
    m2.observe(['x', 'y', 'z']);

    await store.save('user-42', toSnapshot(m1));
    await store.save('user-42', toSnapshot(m2));
    const loaded = await store.load('user-42');
    expect(loaded?.ngram.totalTokens).toBe(3);
  });

  it('clears a stored snapshot on clear(key)', async () => {
    const m = new NgramModel();
    m.observe(['a', 'b']);
    await store.save('user-42', toSnapshot(m));
    await store.clear('user-42');
    expect(await store.load('user-42')).toBeUndefined();
  });

  it('returns undefined and does not throw for incompatible stored data', async () => {
    // Plant an older-version snapshot directly via the underlying KV store
    // on the same instance (two instances on the same DB deadlock
    // fake-indexeddb during teardown).
    const kv = (store as unknown as { kv: { set: (k: string, v: unknown) => Promise<void> } }).kv;
    await kv.set('user-42', { version: 999, createdAt: 0, ngram: {} });
    expect(await store.load('user-42')).toBeUndefined();
  });
});
