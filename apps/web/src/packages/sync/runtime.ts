// Leaf module: the shared outbox singleton and the capture helper that
// collections call from their onInsert/onUpdate/onDelete hooks. Kept free of any
// collection imports so the collection modules can import it without a cycle.

import { createOutbox } from './lib/outbox';
import { toMutation } from './lib/outbox';
import type { SyncOp } from './types';

export const outbox = createOutbox();

interface LocalMutation {
  key: string | number;
  modified?: unknown;
}

/**
 * Capture local collection mutations into the outbox for later push. Only local
 * (optimistic) mutations flow through the collection's on*-hooks; server changes
 * applied via `acceptMutations` do not, so there is no echo back to the server.
 */
export function captureLocal(
  collectionId: string,
  op: SyncOp,
  mutations: ReadonlyArray<LocalMutation>,
): void {
  for (const m of mutations) {
    if (op === 'delete') {
      outbox.capture(toMutation(collectionId, 'delete', { id: m.key }));
    } else {
      outbox.capture(toMutation(collectionId, 'upsert', m.modified as Record<string, unknown>));
    }
  }
}
