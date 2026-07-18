import { describe, expect, it } from 'vitest';

import { spaceIdFromSlug } from './use-space-id-from-slug';
import type { Space } from '../types';

const spaces = [
  { id: 'aaaaaaaa-1111-4111-8111-111111111111', title: 'School Homework Help' },
  { id: 'bbbbbbbb-2222-4222-8222-222222222222', title: 'Teaching Scratch Jr' },
] as Space[];

describe('spaceIdFromSlug', () => {
  it('resolves an id-free slug by matching the title', () => {
    expect(spaceIdFromSlug('school-homework-help', spaces)).toBe(spaces[0].id);
    expect(spaceIdFromSlug('teaching-scratch-jr', spaces)).toBe(spaces[1].id);
  });

  it('resolves a legacy slug that still carries the UUID suffix', () => {
    expect(spaceIdFromSlug(`school-homework-help-${spaces[0].id}`, spaces)).toBe(spaces[0].id);
  });

  it('returns undefined when nothing matches (e.g. still loading)', () => {
    expect(spaceIdFromSlug('unknown-space', spaces)).toBeUndefined();
    expect(spaceIdFromSlug('school-homework-help', [])).toBeUndefined();
  });
});
