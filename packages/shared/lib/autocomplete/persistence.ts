/**
 * Client-side persistence for the predictive autocomplete engine.
 *
 * Design notes:
 *
 *  - The only state that needs to persist is the `NgramModel` snapshot. The
 *    trie is fully reconstructible from the unigram row of the ngram model,
 *    so we don't serialize it separately — less data, no drift risk between
 *    two copies of "which words exist".
 *
 *  - Storage is a thin typed facade over the existing
 *    `@september/shared/lib/indexeddb` `KVStore`. One DB, one store, one
 *    key per persistence scope (e.g. `"user:<id>"`). Keeping everything
 *    pool-keyed lets Phase 2 add per-chat scopes (`"chat:<id>"`) without
 *    schema migration.
 *
 *  - Writes happen *through* this class, not through React state, so we can
 *    debounce / throttle from callers (e.g. the hook) without the persistence
 *    layer needing to know about it.
 *
 *  - On any schema / version mismatch we silently return `undefined`. The
 *    caller (autocomplete engine) retrains from the seed corpus — that's
 *    cheap (one `train()`), matches the current cold-start behavior, and
 *    prevents a broken snapshot from bricking prediction entirely.
 */

import { KVStore, createKVStore } from '../indexeddb/kv-store';

import { NgramModel, type SerializedNgram } from './ngram-model';

export interface EngineSnapshot {
  version: 1;
  /** Epoch millis when the snapshot was produced. For TTL / cache busting. */
  createdAt: number;
  ngram: SerializedNgram;
  /**
   * Opaque, caller-defined fingerprint of the seed corpus used at train
   * time. When rehydrating, callers compare this to the current corpus
   * fingerprint; a mismatch forces a full retrain. The engine itself never
   * interprets this value.
   */
  seedDigest?: string;
}

const CURRENT_VERSION = 1 as const;
const DEFAULT_DB_NAME = 'september-autocomplete';

export function toSnapshot(model: NgramModel): EngineSnapshot {
  return {
    version: CURRENT_VERSION,
    createdAt: Date.now(),
    ngram: model.serialize(),
  };
}

export function isCompatibleSnapshot(value: unknown): value is EngineSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<EngineSnapshot>;
  return (
    v.version === CURRENT_VERSION &&
    typeof v.createdAt === 'number' &&
    !!v.ngram &&
    typeof v.ngram === 'object'
  );
}

export interface AutocompletePersistenceOptions {
  /** IndexedDB database name. Default `september-autocomplete`. */
  dbName?: string;
}

export class AutocompletePersistence {
  private readonly kv: KVStore<EngineSnapshot>;

  constructor(opts: AutocompletePersistenceOptions = {}) {
    this.kv = createKVStore<EngineSnapshot>({
      dbName: opts.dbName ?? DEFAULT_DB_NAME,
    });
  }

  async load(key: string): Promise<EngineSnapshot | undefined> {
    try {
      const raw = await this.kv.get(key);
      if (!isCompatibleSnapshot(raw)) return undefined;
      return raw;
    } catch {
      // IDB unavailable (SSR, private mode, quota) → treat as cold start.
      return undefined;
    }
  }

  async save(key: string, snapshot: EngineSnapshot): Promise<void> {
    try {
      await this.kv.set(key, snapshot);
    } catch {
      // Non-fatal: engine keeps working in-memory.
    }
  }

  async clear(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch {
      // Ignore — not being able to clear is not a correctness issue.
    }
  }

  async destroy(): Promise<void> {
    await this.kv.destroy();
  }
}
