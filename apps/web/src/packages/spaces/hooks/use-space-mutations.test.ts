import { describe, expect, it } from 'vitest';

import {
  optimisticDeleteSpace,
  optimisticInsertMessage,
  optimisticUpdateSpace,
} from './use-space-mutations';

describe('space mutation cache updates', () => {
  it('updates and deletes spaces without mutating the current cache', () => {
    const current = [
      { id: 's1', title: 'Old' },
      { id: 's2', title: 'Other' },
    ];
    const updated = optimisticUpdateSpace(current as never, {
      id: 's1',
      updates: { title: 'New' },
    });
    expect(updated).toEqual([
      expect.objectContaining({ id: 's1', title: 'New', updated_at: expect.any(Date) }),
      { id: 's2', title: 'Other' },
    ]);
    expect(current[0].title).toBe('Old');
    expect(optimisticDeleteSpace(updated as never, 's1')).toEqual([{ id: 's2', title: 'Other' }]);
  });

  it('inserts a fully identified message optimistically', () => {
    const created = new Date();
    expect(
      optimisticInsertMessage([], {
        id: 'm1',
        text: 'Hello',
        type: 'text',
        user_id: 'u1',
        space_id: 's1',
        created_at: created,
      } as never)
    ).toEqual([expect.objectContaining({ id: 'm1', text: 'Hello', created_at: created })]);
  });
});
