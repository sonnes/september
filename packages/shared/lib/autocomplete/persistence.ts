/**
 * Client-side persistence for the predictive autocomplete engine.
 *
 * Design notes:
 *
 *  - Storage is a thin typed facade over the existing
 *    `@september/shared/lib/indexeddb` `KVStore`. One DB, one store, one
 *    key per persistence scope:
 *      - `user:<accountId>`              whole engine snapshot (v2)
 *      - `chat:<accountId>:<chatId>`     individual chat layer (single ngram)
 *      - `user:<accountId>:chat-lru`     LRU ordering of recently-used chats
 *    Everything is pool-keyed so Phase 2 per-chat scopes coexist with the
 *    Phase 1 user snapshot without schema migration.
 *
 *  - Writes happen *through* this class, not through React state, so we can
 *    debounce / throttle from callers (e.g. the hook) without the persistence
 *    layer needing to know about it.
 *
 *  - On any schema / version mismatch we silently return `undefined`. The
 *    caller (autocomplete engine) retrains from the seed corpus — that's
 *    cheap (one `train()`), matches the current cold-start behavior, and
 *    prevents a broken snapshot from bricking prediction entirely.
 *
 *  - Backwards compat: Phase 1 snapshots are `version: 1` with a single
 *    `ngram` field. Phase 2 writers emit `version: 2` with per-layer
 *    `base` / `user` / `chats`. Readers accept both.
 */

import { KVStore, createKVStore } from '../indexeddb/kv-store';

import type { LayeredAutocomplete } from './layered-autocomplete';
import { NgramModel, type SerializedNgram } from './ngram-model';

/** Phase 1 single-ngram snapshot. Kept for low-level single-model persistence. */
export interface EngineSnapshotV1 {
  version: 1;
  /** Epoch millis when the snapshot was produced. For TTL / cache busting. */
  createdAt: number;
  ngram: SerializedNgram;
  /**
   * Opaque, caller-defined fingerprint of the seed corpus used at train
   * time. When rehydrating, callers compare this to the current corpus
   * fingerprint; a mismatch forces a full retrain of the base layer (the
   * user / chat layers survive). The engine itself never interprets this
   * value.
   */
  seedDigest?: string;
}

/** Phase 2 layered snapshot. Current writers always produce this shape. */
export interface EngineSnapshotV2 {
  version: 2;
  createdAt: number;
  /** Shared seed corpus layer. */
  base: SerializedNgram;
  /** User's aggregate history (every `observe()` call). */
  user: SerializedNgram;
  /** Per-chat history, keyed by chatId. Empty object if no chats observed. */
  chats: Record<string, SerializedNgram>;
  seedDigest?: string;
}

export type EngineSnapshot = EngineSnapshotV2;
export type AnyEngineSnapshot = EngineSnapshotV1 | EngineSnapshotV2;

const DEFAULT_DB_NAME = 'september-autocomplete';

/** Low-level: snapshot a single NgramModel as v1. */
export function toSnapshot(model: NgramModel): EngineSnapshotV1 {
  return {
    version: 1,
    createdAt: Date.now(),
    ngram: model.serialize(),
  };
}

/** Snapshot a LayeredAutocomplete engine as v2. */
export function toEngineSnapshot(layered: LayeredAutocomplete): EngineSnapshotV2 {
  const chats: Record<string, SerializedNgram> = {};
  for (const chatId of layered.chatIds()) {
    const m = layered.getChat(chatId);
    if (m) chats[chatId] = m.serialize();
  }
  return {
    version: 2,
    createdAt: Date.now(),
    base: layered.base.serialize(),
    user: layered.user.serialize(),
    chats,
  };
}

export function isCompatibleSnapshot(value: unknown): value is AnyEngineSnapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AnyEngineSnapshot>;
  if (v.version === 1) {
    return typeof v.createdAt === 'number' && !!v.ngram && typeof v.ngram === 'object';
  }
  if (v.version === 2) {
    return (
      typeof v.createdAt === 'number' &&
      !!v.base &&
      !!v.user &&
      typeof v.chats === 'object'
    );
  }
  return false;
}

export interface AutocompletePersistenceOptions {
  /** IndexedDB database name. Default `september-autocomplete`. */
  dbName?: string;
}

/**
 * Thin wrapper around a single IDB store that persists engine snapshots and
 * per-chat models. Callers form their own key strings (see module header
 * for the conventions).
 */
export class AutocompletePersistence {
  private readonly kv: KVStore<unknown>;

  constructor(opts: AutocompletePersistenceOptions = {}) {
    this.kv = createKVStore<unknown>({
      dbName: opts.dbName ?? DEFAULT_DB_NAME,
    });
  }

  async load(key: string): Promise<AnyEngineSnapshot | undefined> {
    try {
      const raw = await this.kv.get(key);
      if (!isCompatibleSnapshot(raw)) return undefined;
      return raw;
    } catch {
      // IDB unavailable (SSR, private mode, quota) → treat as cold start.
      return undefined;
    }
  }

  async save(key: string, snapshot: AnyEngineSnapshot): Promise<void> {
    try {
      await this.kv.set(key, snapshot);
    } catch {
      // Non-fatal: engine keeps working in-memory.
    }
  }

  /** Load a raw per-chat model snapshot. Single ngram, not an engine snapshot. */
  async loadChatModel(key: string): Promise<SerializedNgram | undefined> {
    try {
      const raw = await this.kv.get(key);
      if (!raw || typeof raw !== 'object') return undefined;
      const candidate = raw as { version?: unknown };
      if (candidate.version !== 1 && candidate.version !== 2) return undefined;
      return raw as SerializedNgram;
    } catch {
      return undefined;
    }
  }

  async saveChatModel(key: string, ngram: SerializedNgram): Promise<void> {
    try {
      await this.kv.set(key, ngram);
    } catch {
      // Non-fatal.
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

  // ─── Key helpers ────────────────────────────────────────────────────────
  // Kept alongside the store so callers don't hand-roll strings that drift
  // out of sync with the documented schema.

  static userKey(accountId: string): string {
    return `user:${accountId}`;
  }

  static chatKey(accountId: string, chatId: string): string {
    return `chat:${accountId}:${chatId}`;
  }

  static chatLruKey(accountId: string): string {
    return `user:${accountId}:chat-lru`;
  }
}
