import type { Mutation, SyncOp } from '../types';

function clockOf(item: Record<string, unknown>): number {
  const stamp = item.updated_at ?? item.created_at;
  if (stamp) {
    const ms = new Date(stamp as string | number | Date).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return Date.now();
}

/** Map a local collection mutation to a wire mutation. */
export function toMutation(collection: string, op: SyncOp, item: Record<string, unknown>): Mutation {
  const id = String(item.id);
  if (op === 'delete') {
    return { collection, id, op, updatedAt: Date.now() };
  }
  return { collection, id, op, data: item, updatedAt: clockOf(item) };
}

export interface Outbox {
  capture: (mutation: Mutation) => void;
  drain: () => Mutation[];
  size: () => number;
  onFlushNeeded: (cb: () => void) => void;
}

/**
 * In-memory buffer of pending local mutations awaiting push. Repeated edits of
 * the same record collapse to the latest (keyed by collection+id), so a burst of
 * keystrokes pushes once.
 */
export function createOutbox(): Outbox {
  const buffer = new Map<string, Mutation>();
  let listener: (() => void) | null = null;

  return {
    capture(mutation) {
      buffer.set(`${mutation.collection}:${mutation.id}`, mutation);
      listener?.();
    },
    drain() {
      const items = [...buffer.values()];
      buffer.clear();
      return items;
    },
    size: () => buffer.size,
    onFlushNeeded: (cb) => {
      listener = cb;
    },
  };
}
