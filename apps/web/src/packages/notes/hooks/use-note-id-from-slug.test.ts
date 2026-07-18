import { describe, expect, it } from 'vitest';

import { noteIdFromSlug } from './use-note-id-from-slug';
import type { Note } from '../types';

const notes = [
  { id: 'cccccccc-1111-4111-8111-111111111111', name: 'Appointment Prep' },
  { id: 'dddddddd-2222-4222-8222-222222222222', name: 'History Project' },
] as Note[];

describe('noteIdFromSlug', () => {
  it('resolves an id-free slug by matching the note name', () => {
    expect(noteIdFromSlug('appointment-prep', notes)).toBe(notes[0].id);
    expect(noteIdFromSlug('history-project', notes)).toBe(notes[1].id);
  });

  it('resolves a legacy slug that still carries the UUID suffix', () => {
    expect(noteIdFromSlug(`appointment-prep-${notes[0].id}`, notes)).toBe(notes[0].id);
  });

  it('returns undefined when nothing matches', () => {
    expect(noteIdFromSlug('unknown-note', notes)).toBeUndefined();
    expect(noteIdFromSlug('appointment-prep', [])).toBeUndefined();
  });
});
