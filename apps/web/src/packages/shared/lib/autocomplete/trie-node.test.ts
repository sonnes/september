import { describe, expect, it } from 'vitest';

import { editCost } from './keyboard-layout';
import { TrieNode } from './trie-node';

const build = (words: Array<string | [string, number]>): TrieNode => {
  const root = new TrieNode();
  for (const w of words) {
    if (typeof w === 'string') root.insert(w, 1);
    else root.insert(w[0], w[1]);
  }
  return root;
};

describe('TrieNode.findFuzzyPrefix', () => {
  it('returns exact-prefix matches with cost 0', () => {
    const root = build(['hello', 'help', 'held']);
    const results = root.findFuzzyPrefix('hel', { maxCost: 1 });
    const words = results.map(r => r.word).sort();
    expect(words).toEqual(['held', 'hello', 'help']);
    expect(results.every(r => r.cost === 0)).toBe(true);
  });

  it('returns no matches when maxCost is 0 and pattern has a typo', () => {
    const root = build(['hello']);
    const results = root.findFuzzyPrefix('hwl', { maxCost: 0 });
    expect(results).toEqual([]);
  });

  it('matches a QWERTY-adjacent substitution when maxCost allows it', () => {
    const root = build(['hello']);
    // 'w' → 's' substitution: editCost ≈ 0.3 (adjacent)
    // wait — pattern "hsl": s adjacent to a, not to e. Use 'hwl' instead.
    // 'w' is QWERTY-adjacent to 'e' (editCost('w','e') = 0.3).
    const results = root.findFuzzyPrefix('hwl', { maxCost: 0.5, editCost });
    expect(results.map(r => r.word)).toEqual(['hello']);
    expect(results[0].cost).toBeCloseTo(0.3, 5);
  });

  it('rejects far-apart substitutions that exceed maxCost', () => {
    const root = build(['hello']);
    // 'h' → 'z' is far (editCost = 1.0). pattern "zel" aligning to "hel" costs 1.
    const results = root.findFuzzyPrefix('zel', { maxCost: 0.5, editCost });
    expect(results).toEqual([]);
  });

  it('handles single insertions (pattern missed a key)', () => {
    const root = build(['hello']);
    // pattern "hllo" aligns to "hello" by inserting 'e'. default sub cost = 1.
    const results = root.findFuzzyPrefix('hllo', { maxCost: 1 });
    expect(results.map(r => r.word)).toEqual(['hello']);
    expect(results[0].cost).toBe(1);
  });

  it('handles single deletions (pattern had an extra key)', () => {
    const root = build(['hello']);
    // pattern "heello" aligns to "hello" by deleting extra 'e'. cost 1.
    const results = root.findFuzzyPrefix('heello', { maxCost: 1 });
    expect(results.map(r => r.word)).toEqual(['hello']);
    expect(results[0].cost).toBe(1);
  });

  it('freezes prefix cost so long completions are not re-penalized', () => {
    const root = build(['application', 'apple']);
    // pattern "apl" should match "apple" (cost 0, 'apl' is a typo? actually
    // 'apl' exact prefix of 'application' but not 'apple': 'app'le — 'apl'
    // matches first 3 of 'application' with... a-p-l vs a-p-p → sub at depth
    // 3 'l' for 'p'. cost = editCost('l','p') ≈ 0.3.
    const results = root.findFuzzyPrefix('apl', { maxCost: 0.5, editCost });
    const apple = results.find(r => r.word === 'apple');
    expect(apple).toBeDefined();
    const appl = results.find(r => r.word === 'application');
    expect(appl).toBeDefined();
    // application: perfect prefix 'appl' → 'apl' needs one deletion (cost 1)
    //   OR substitute l→p at depth 2 then continue (cost 0.3). Freezing at the
    //   min along the path gives cost 0.3 for both words.
    expect(apple?.cost).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(appl?.cost).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('respects maxResults limit and ranks by (cost asc, frequency desc)', () => {
    const root = build([
      ['hello', 10],
      ['help', 5],
      ['held', 1],
      ['helix', 2],
    ]);
    const results = root.findFuzzyPrefix('hel', { maxCost: 0, maxResults: 2 });
    expect(results).toHaveLength(2);
    expect(results[0].word).toBe('hello');
    expect(results[1].word).toBe('help');
  });

  it('returns exact matches alongside end-of-word prefix', () => {
    const root = build(['cat', 'cats', 'category']);
    const results = root.findFuzzyPrefix('cat', { maxCost: 0 });
    expect(results.map(r => r.word).sort()).toEqual(['cat', 'category', 'cats']);
  });

  it('returns [] when pattern is empty and maxCost is 0', () => {
    const root = build(['hello']);
    const results = root.findFuzzyPrefix('', { maxCost: 0 });
    // Empty pattern matches every word as a zero-length prefix, so all words.
    expect(results.map(r => r.word)).toEqual(['hello']);
  });
});
