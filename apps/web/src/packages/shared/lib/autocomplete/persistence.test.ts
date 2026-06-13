import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LayeredAutocomplete } from './layered-autocomplete';
import { NgramModel } from './ngram-model';
import {
  AutocompletePersistence,
  type EngineSnapshot,
  type EngineSnapshotV1,
  isCompatibleSnapshot,
  toEngineSnapshot,
  toSnapshot,
} from './persistence';

describe('toSnapshot / toEngineSnapshot / isCompatibleSnapshot', () => {
  it('toSnapshot produces a v1 single-ngram snapshot', () => {
    const m = new NgramModel({ order: 3 });
    m.observe(['<s>', 'hello', 'world', '</s>']);
    const snap = toSnapshot(m);
    expect(snap.version).toBe(1);
    expect(snap.ngram.order).toBe(3);
    expect(snap.ngram.totalTokens).toBe(m.stats.totalTokens);
    expect(typeof snap.createdAt).toBe('number');
  });

  it('toEngineSnapshot produces a v2 layered snapshot', () => {
    const base = new NgramModel({ order: 3 });
    base.observe(['<s>', 'base', '</s>']);
    const user = new NgramModel({ order: 3 });
    user.observe(['<s>', 'user', '</s>']);
    const layered = new LayeredAutocomplete({ base, user });
    layered.observe(['hello'], { chatId: 'A' });

    const snap = toEngineSnapshot(layered);
    expect(snap.version).toBe(2);
    expect(snap.base.totalTokens).toBe(3);
    expect(snap.user.totalTokens).toBe(user.stats.totalTokens);
    expect(Object.keys(snap.chats)).toEqual(['A']);
  });

  it('isCompatibleSnapshot accepts v1 and v2; rejects everything else', () => {
    const v1: EngineSnapshotV1 = {
      version: 1,
      createdAt: Date.now(),
      ngram: new NgramModel().serialize(),
    };
    const v2: EngineSnapshot = {
      version: 2,
      createdAt: Date.now(),
      base: new NgramModel().serialize(),
      user: new NgramModel().serialize(),
      chats: {},
    };
    expect(isCompatibleSnapshot(v1)).toBe(true);
    expect(isCompatibleSnapshot(v2)).toBe(true);
    expect(isCompatibleSnapshot({ version: 999 })).toBe(false);
    expect(isCompatibleSnapshot({ version: 2 })).toBe(false); // missing fields
    expect(isCompatibleSnapshot(null)).toBe(false);
    expect(isCompatibleSnapshot({})).toBe(false);
  });
});

describe('AutocompletePersistence key helpers', () => {
  it('builds schema-consistent keys', () => {
    expect(AutocompletePersistence.userKey('u1')).toBe('user:u1');
    expect(AutocompletePersistence.chatKey('u1', 'c1')).toBe('chat:u1:c1');
    expect(AutocompletePersistence.chatLruKey('u1')).toBe('user:u1:chat-lru');
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

  it('round-trips a v1 snapshot through IDB', async () => {
    const m = new NgramModel({ order: 3 });
    m.observe(['<s>', 'hello', 'world', '</s>']);
    const snap = toSnapshot(m);

    await store.save('user-42', snap);
    const loaded = await store.load('user-42');
    expect(loaded?.version).toBe(1);
    if (loaded?.version === 1) {
      const m2 = NgramModel.deserialize(loaded.ngram);
      expect(m2.topK(['hello'], 3)).toEqual(m.topK(['hello'], 3));
    }
  });

  it('round-trips a v2 engine snapshot through IDB', async () => {
    const base = new NgramModel({ order: 3 });
    base.observe(['<s>', 'hi', 'there', '</s>']);
    const user = new NgramModel({ order: 3 });
    user.observe(['<s>', 'yo', '</s>']);
    const layered = new LayeredAutocomplete({ base, user });
    layered.observe(['<s>', 'pool', '</s>'], { chatId: 'chat-1' });

    await store.save('user-42', toEngineSnapshot(layered));
    const loaded = await store.load('user-42');
    expect(loaded?.version).toBe(2);
    if (loaded?.version === 2) {
      expect(loaded.chats['chat-1']).toBeDefined();
      expect(loaded.user.totalTokens).toBe(user.stats.totalTokens);
    }
  });

  it('overwrites an existing snapshot at the same key', async () => {
    const m1 = new NgramModel();
    m1.observe(['a', 'b']);
    const m2 = new NgramModel();
    m2.observe(['x', 'y', 'z']);

    await store.save('user-42', toSnapshot(m1));
    await store.save('user-42', toSnapshot(m2));
    const loaded = await store.load('user-42');
    if (loaded?.version === 1) {
      expect(loaded.ngram.totalTokens).toBe(3);
    } else {
      throw new Error('expected v1');
    }
  });

  it('clears a stored snapshot on clear(key)', async () => {
    const m = new NgramModel();
    m.observe(['a', 'b']);
    await store.save('user-42', toSnapshot(m));
    await store.clear('user-42');
    expect(await store.load('user-42')).toBeUndefined();
  });

  it('returns undefined and does not throw for incompatible stored data', async () => {
    const kv = (store as unknown as { kv: { set: (k: string, v: unknown) => Promise<void> } }).kv;
    await kv.set('user-42', { version: 999, createdAt: 0, ngram: {} });
    expect(await store.load('user-42')).toBeUndefined();
  });

  it('saveChatModel / loadChatModel round-trip a single-ngram chat layer', async () => {
    const m = new NgramModel({ order: 3 });
    m.observe(['<s>', 'pool', '</s>']);
    const serialized = m.serialize();
    const key = AutocompletePersistence.chatKey('u1', 'c1');
    await store.saveChatModel(key, serialized);
    const loaded = await store.loadChatModel(key);
    expect(loaded).toBeDefined();
    if (loaded) {
      const m2 = NgramModel.deserialize(loaded);
      expect(m2.stats.totalTokens).toBe(m.stats.totalTokens);
    }
  });
});
