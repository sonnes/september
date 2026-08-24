/**
 * Serializable snapshots for the predictive autocomplete engine.
 *
 * Design notes:
 *
 *  - Backwards compat: Phase 1 snapshots are `version: 1` with a single
 *    `ngram` field. Phase 2 writers emit `version: 2` with per-layer
 *    `base` / `user` / `chats`. Readers accept both.
 */
import type { LayeredAutocomplete } from './layered-autocomplete.ts';
import { NgramModel, type SerializedNgram } from './ngram-model.ts';

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
    return typeof v.createdAt === 'number' && !!v.base && !!v.user && typeof v.chats === 'object';
  }
  return false;
}
