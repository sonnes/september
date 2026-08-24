import { describe, expect, it } from 'vitest';

import { LayeredAutocomplete } from './layered-autocomplete.ts';
import { NgramModel } from './ngram-model.ts';
import {
  type EngineSnapshot,
  type EngineSnapshotV1,
  isCompatibleSnapshot,
  toEngineSnapshot,
  toSnapshot,
} from './persistence.ts';

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
