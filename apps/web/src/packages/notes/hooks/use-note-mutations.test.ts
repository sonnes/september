import { describe, expect, it } from 'vitest';

import { optimisticDeleteNote, optimisticUpdateNote } from './use-note-mutations';

describe('note mutation cache updates', () => {
  it('updates and deletes notes without mutating the current cache', () => {
    const current = [
      { id: 'n1', content: 'Old' },
      { id: 'n2', content: 'Other' },
    ];
    const updated = optimisticUpdateNote(current as never, {
      id: 'n1',
      updates: { content: 'New' },
    });
    expect(updated).toEqual([
      expect.objectContaining({ id: 'n1', content: 'New', updated_at: expect.any(Date) }),
      { id: 'n2', content: 'Other' },
    ]);
    expect(current[0].content).toBe('Old');
    expect(optimisticDeleteNote(updated as never, 'n1')).toEqual([{ id: 'n2', content: 'Other' }]);
  });
});
