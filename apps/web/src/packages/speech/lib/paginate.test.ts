import { describe, expect, it } from 'vitest';

import type { Voice } from '@/packages/shared';

import { paginateVoices, sortClonedFirst } from './paginate';

const voice = (id: string, category?: Voice['category']): Voice => ({
  id,
  name: id,
  language: 'en',
  category,
});

describe('paginateVoices', () => {
  const list = Array.from({ length: 10 }, (_, i) => voice(`v${i + 1}`));

  it('returns the first page-sized slice', () => {
    const result = paginateVoices(list, 1, 4);
    expect(result.items.map(v => v.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(result).toMatchObject({ page: 1, pageCount: 3, total: 10 });
  });

  it('returns a middle page', () => {
    expect(paginateVoices(list, 2, 4).items.map(v => v.id)).toEqual(['v5', 'v6', 'v7', 'v8']);
  });

  it('returns the short final page', () => {
    const result = paginateVoices(list, 3, 4);
    expect(result.items.map(v => v.id)).toEqual(['v9', 'v10']);
    expect(result.pageCount).toBe(3);
  });

  it('clamps a page above the range to the last page', () => {
    expect(paginateVoices(list, 99, 4).page).toBe(3);
  });

  it('clamps a page below 1 to the first page', () => {
    expect(paginateVoices(list, 0, 4).page).toBe(1);
  });

  it('reports a single empty page for an empty list', () => {
    expect(paginateVoices([], 1, 4)).toMatchObject({ items: [], page: 1, pageCount: 1, total: 0 });
  });
});

describe('sortClonedFirst', () => {
  it('moves cloned voices ahead of the rest', () => {
    const input = [voice('a'), voice('mine', 'cloned'), voice('b')];
    expect(sortClonedFirst(input).map(v => v.id)).toEqual(['mine', 'a', 'b']);
  });

  it('preserves relative order within each group (stable)', () => {
    const input = [voice('a'), voice('c1', 'cloned'), voice('b'), voice('c2', 'cloned')];
    expect(sortClonedFirst(input).map(v => v.id)).toEqual(['c1', 'c2', 'a', 'b']);
  });

  it('does not mutate the input', () => {
    const input = [voice('a'), voice('mine', 'cloned')];
    sortClonedFirst(input);
    expect(input.map(v => v.id)).toEqual(['a', 'mine']);
  });
});
