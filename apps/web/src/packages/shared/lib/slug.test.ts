import { describe, expect, it } from 'vitest';

import { entitySlug, idFromSlug } from './slug';

describe('entitySlug', () => {
  it('slugifies the label without embedding an id', () => {
    expect(entitySlug('Morning Notes')).toBe('morning-notes');
  });

  it('falls back when the label has no URL-safe words', () => {
    expect(entitySlug('', 'space')).toBe('space');
  });
});

describe('idFromSlug', () => {
  it('reads a legacy UUID suffix from an old slug', () => {
    expect(idFromSlug('general-8720d2fc-787c-421b-8984-0e0eeb9138cb')).toBe(
      '8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });

  it('keeps raw ids working', () => {
    expect(idFromSlug('8720d2fc-787c-421b-8984-0e0eeb9138cb')).toBe(
      '8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });

  it('passes an id-free slug through unchanged', () => {
    expect(idFromSlug('morning-notes')).toBe('morning-notes');
  });
});
