import type { PendingLike, PushResult, SyncCollection } from '../types';
import type { SyncClient } from './api-client';
import type { CursorStore } from './cursor';
import type { Outbox } from './outbox';

export interface SyncEngineOptions {
  client: SyncClient;
  outbox: Outbox;
  cursor: CursorStore;
  collections: Record<string, SyncCollection>;
  pullIntervalMs?: number;
  flushDebounceMs?: number;
}

export interface SyncEngine {
  flush: () => Promise<PushResult | undefined>;
  pullOnce: () => Promise<{ applied: number }>;
  start: () => void;
  stop: () => void;
}

/**
 * Orchestrates local-first sync: drains the outbox to the server (push) and
 * applies server changes into the IndexedDB collections (pull). Framework-free;
 * the React SyncProvider just calls start()/stop().
 */
export function createSyncEngine(opts: SyncEngineOptions): SyncEngine {
  const { client, outbox, cursor, collections } = opts;
  const pullIntervalMs = opts.pullIntervalMs ?? 8000;
  const flushDebounceMs = opts.flushDebounceMs ?? 400;

  let pullTimer: ReturnType<typeof setInterval> | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  async function flush(): Promise<PushResult | undefined> {
    const batch = outbox.drain();
    if (batch.length === 0) return undefined;
    try {
      return await client.push(batch);
    } catch (err) {
      batch.forEach((m) => outbox.capture(m)); // don't lose mutations on failure
      throw err;
    }
  }

  async function pullOnce(): Promise<{ applied: number }> {
    const { changes, cursor: next } = await client.pull(cursor.get());

    const grouped = new Map<string, PendingLike[]>();
    for (const c of changes) {
      const collection = collections[c.collection];
      if (!collection) continue; // unknown collection (e.g. server-only data)
      const list = grouped.get(c.collection) ?? [];
      list.push(
        c.op === 'delete'
          ? { type: 'delete', key: c.id, collection: { id: collection.id } }
          : { type: 'update', key: c.id, modified: collection.parse(c.data), collection: { id: collection.id } },
      );
      grouped.set(c.collection, list);
    }

    for (const [collectionId, mutations] of grouped) {
      await collections[collectionId].acceptMutations({ mutations });
    }

    cursor.set(next);
    return { applied: changes.length };
  }

  function scheduleFlush(): void {
    if (!running) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      void flush().catch((err) => console.error('[sync] flush failed', err));
    }, flushDebounceMs);
  }

  return {
    flush,
    pullOnce,
    start() {
      if (running) return;
      running = true;
      outbox.onFlushNeeded(scheduleFlush);
      void pullOnce().catch((err) => console.error('[sync] initial pull failed', err));
      pullTimer = setInterval(() => {
        void pullOnce().catch((err) => console.error('[sync] pull failed', err));
      }, pullIntervalMs);
    },
    stop() {
      running = false;
      if (pullTimer) clearInterval(pullTimer);
      if (flushTimer) clearTimeout(flushTimer);
      pullTimer = null;
      flushTimer = null;
    },
  };
}
