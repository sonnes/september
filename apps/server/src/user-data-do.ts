import { DurableObject } from 'cloudflare:workers';

import type { Env } from './types';

export type SyncOp = 'upsert' | 'delete';

// JSON value — RPC-serializable, unlike `unknown`. Kept non-recursive (`object`
// covers nested objects/arrays) so the Durable Object RPC stub type doesn't
// instantiate infinitely; structured clone still carries nested data at runtime.
// The DO treats record bodies as opaque; only the client interprets their shape.
export type Json = string | number | boolean | null | object;

export interface Mutation {
  collection: string;
  id: string;
  op: SyncOp;
  data?: Json; // present for upsert
  version?: string; // opaque versionKey echo from the client
  updatedAt: number; // LWW clock (client ms)
}

export interface Change {
  collection: string;
  id: string;
  op: SyncOp;
  data: Json | null; // null for deletes
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

type Row = {
  collection: string;
  id: string;
  data: string | null;
  version: string | null;
  updated_at: number;
  deleted: number;
  seq: number;
};

/**
 * One Durable Object per user (`idFromName(userId)`) — that user's private
 * SQLite. Stores all synced collections in a single generic `records` table
 * keyed by (collection, id): opaque JSON + a versionKey echo + an `updated_at`
 * LWW clock + a monotonic `seq` that drives the pull cursor. Deletes are kept
 * as tombstones so other devices learn of them.
 */
export class UserDataDO extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT,
        version TEXT,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        seq INTEGER NOT NULL,
        PRIMARY KEY (collection, id)
      )`,
    );
    this.sql.exec('CREATE INDEX IF NOT EXISTS records_seq ON records(seq)');
  }

  private nextSeq(): number {
    const row = this.sql.exec<{ next: number }>('SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM records').one();
    return row.next;
  }

  /** Apply a batch of client mutations under last-write-wins. */
  async push(mutations: Mutation[]): Promise<PushResult> {
    let applied = 0;
    for (const m of mutations) {
      const existing = this.sql
        .exec<{ updated_at: number }>(
          'SELECT updated_at FROM records WHERE collection = ? AND id = ?',
          m.collection,
          m.id,
        )
        .toArray();

      // LWW: keep the stored row unless the incoming write is strictly newer.
      if (existing.length > 0 && existing[0].updated_at >= m.updatedAt) continue;

      const seq = this.nextSeq();
      const deleted = m.op === 'delete' ? 1 : 0;
      const data = m.op === 'delete' ? null : JSON.stringify(m.data ?? null);
      this.sql.exec(
        `INSERT INTO records (collection, id, data, version, updated_at, deleted, seq)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(collection, id) DO UPDATE SET
           data = excluded.data,
           version = excluded.version,
           updated_at = excluded.updated_at,
           deleted = excluded.deleted,
           seq = excluded.seq`,
        m.collection,
        m.id,
        data,
        m.version ?? null,
        m.updatedAt,
        deleted,
        seq,
      );
      applied++;
    }
    return { cursor: this.currentCursor(), applied };
  }

  /** Return all changes with seq greater than `since`, oldest first. */
  pull(since: number): PullResult {
    const rows = this.sql
      .exec<Row>('SELECT * FROM records WHERE seq > ? ORDER BY seq ASC', since)
      .toArray();

    const changes: Change[] = rows.map((r) => ({
      collection: r.collection,
      id: r.id,
      op: r.deleted ? 'delete' : 'upsert',
      data: r.deleted ? null : JSON.parse(r.data ?? 'null'),
      version: r.version,
      updatedAt: r.updated_at,
      seq: r.seq,
    }));

    return { changes, cursor: changes.length > 0 ? changes[changes.length - 1].seq : since };
  }

  private currentCursor(): number {
    return this.sql.exec<{ max: number }>('SELECT COALESCE(MAX(seq), 0) AS max FROM records').one().max;
  }
}
