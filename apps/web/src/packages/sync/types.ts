// Wire types — mirror the server's sync protocol (apps/server). Kept as a local
// copy so the web app doesn't depend on the server package.

export type SyncOp = 'upsert' | 'delete';

export interface Mutation {
  collection: string;
  id: string;
  op: SyncOp;
  data?: unknown; // present for upsert (JSON-serializable entity)
  version?: string; // opaque versionKey echo
  updatedAt: number; // LWW clock (ms)
}

export interface Change {
  collection: string;
  id: string;
  op: SyncOp;
  data: unknown | null;
  version: string | null;
  updatedAt: number;
  seq: number;
}

export interface PushResult {
  cursor: number;
  applied: number;
}

export interface PullResult {
  changes: Change[];
  cursor: number;
}

export interface LoginResult {
  token: string;
  userId: string;
}

// Minimal shape of a mutation accepted by collection-v2's `acceptMutations`
// util (it only reads type/key/modified/collection).
export interface PendingLike {
  type: 'insert' | 'update' | 'delete';
  key: string;
  modified?: unknown;
  collection: { id: string };
}

// A collection the engine can sync: an id, a parser to revive remote JSON into
// the entity's runtime shape (e.g. Zod coercing ISO strings back to Dates), and
// the `acceptMutations` util from the IndexedDB collection.
export interface SyncCollection {
  id: string;
  parse: (data: unknown) => unknown;
  acceptMutations: (tx: { mutations: PendingLike[] }) => Promise<void>;
}
