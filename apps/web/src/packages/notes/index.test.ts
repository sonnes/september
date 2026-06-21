import { describe, expect, it } from 'vitest';

import { createNote, deleteNotesForSpace, updateNote, useNote, useNotes } from './index';

describe('@/packages/notes public API', () => {
  it('exports note-named APIs', () => {
    expect(createNote).toBeTypeOf('function');
    expect(updateNote).toBeTypeOf('function');
    expect(deleteNotesForSpace).toBeTypeOf('function');
    expect(useNote).toBeTypeOf('function');
    expect(useNotes).toBeTypeOf('function');
  });
});
