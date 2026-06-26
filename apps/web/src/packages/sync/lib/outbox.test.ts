import { describe, expect, it, vi } from 'vitest';

import { createOutbox, toMutation } from './outbox';

describe('toMutation', () => {
  it('maps an upsert using updated_at as the LWW clock', () => {
    const item = { id: 's1', title: 'Hi', updated_at: new Date('2026-01-01T00:00:00Z') };
    const m = toMutation('spaces', 'upsert', item);
    expect(m).toMatchObject({ collection: 'spaces', id: 's1', op: 'upsert', data: item });
    expect(m.updatedAt).toBe(new Date('2026-01-01T00:00:00Z').getTime());
  });

  it('falls back to created_at when updated_at is absent', () => {
    const item = { id: 'm1', text: 'hi', created_at: new Date('2026-02-02T00:00:00Z') };
    expect(toMutation('messages', 'upsert', item).updatedAt).toBe(
      new Date('2026-02-02T00:00:00Z').getTime(),
    );
  });

  it('maps a delete with no data', () => {
    const m = toMutation('spaces', 'delete', { id: 's1' });
    expect(m).toMatchObject({ collection: 'spaces', id: 's1', op: 'delete' });
    expect(m.data).toBeUndefined();
  });
});

describe('createOutbox', () => {
  it('buffers mutations and drains them', () => {
    const outbox = createOutbox();
    outbox.capture(toMutation('spaces', 'upsert', { id: 's1', updated_at: new Date(1000) }));
    outbox.capture(toMutation('messages', 'upsert', { id: 'm1', updated_at: new Date(1000) }));
    expect(outbox.size()).toBe(2);

    const drained = outbox.drain();
    expect(drained).toHaveLength(2);
    expect(outbox.size()).toBe(0);
  });

  it('collapses repeated edits of the same record to the latest', () => {
    const outbox = createOutbox();
    outbox.capture(toMutation('spaces', 'upsert', { id: 's1', title: 'a', updated_at: new Date(1000) }));
    outbox.capture(toMutation('spaces', 'upsert', { id: 's1', title: 'b', updated_at: new Date(2000) }));
    const drained = outbox.drain();
    expect(drained).toHaveLength(1);
    expect((drained[0].data as { title: string }).title).toBe('b');
  });

  it('notifies a listener when something is captured', () => {
    const outbox = createOutbox();
    const cb = vi.fn();
    outbox.onFlushNeeded(cb);
    outbox.capture(toMutation('notes', 'upsert', { id: 'n1', updated_at: new Date(1) }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
