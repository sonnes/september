import { describe, expect, it } from 'vitest';

import { entitySlug, idFromSlug } from './slug';

describe('entitySlug', () => {
  it('adds a readable label before the id', () => {
    expect(entitySlug('Morning Notes', '8720d2fc-787c-421b-8984-0e0eeb9138cb')).toBe(
      'morning-notes-8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });

  it('falls back when the label has no URL-safe words', () => {
    expect(entitySlug('', '8720d2fc-787c-421b-8984-0e0eeb9138cb', 'space')).toBe(
      'space-8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });
});

describe('idFromSlug', () => {
  it('reads the UUID suffix from a slug', () => {
    expect(idFromSlug('general-8720d2fc-787c-421b-8984-0e0eeb9138cb')).toBe(
      '8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });

  it('keeps old raw ids working', () => {
    expect(idFromSlug('8720d2fc-787c-421b-8984-0e0eeb9138cb')).toBe(
      '8720d2fc-787c-421b-8984-0e0eeb9138cb'
    );
  });
});
