/**
 * Snapshot serialization for the autocomplete engine.
 *
 * ponytail: the web app also has an `AutocompletePersistence` class that
 * writes these snapshots to IndexedDB or to SQLite. The desktop app keeps
 * only the pure half. The engine trains from the seed corpus and the
 * messages on each start, which costs milliseconds. Add a store when a
 * measurement shows that the start is slow.
 *
 * A snapshot has two shapes. Version 1 holds one n-gram model. Version 2
 * holds the base layer, the user layer, and one layer for each space.
 * Readers accept both.
 */
import type { LayeredAutocomplete } from './layered-autocomplete.ts';
import type { NgramModel, SerializedNgram } from './ngram-model.ts';

/** A snapshot of one model. */
export interface EngineSnapshotV1 {
  version: 1;
  /** The time that the snapshot was made, in milliseconds. */
  createdAt: number;
  ngram: SerializedNgram;
  /**
   * A fingerprint of the seed corpus, made by the caller. When the engine
   * reads a snapshot, the caller compares this value with the fingerprint of
   * the corpus in use. Different values cause a new training of the base
   * layer. The user layer and the space layers stay. The engine does not
   * read this value.
   */
  seedDigest?: string;
}

/** A snapshot of all the layers. New snapshots always have this shape. */
export interface EngineSnapshotV2 {
  version: 2;
  createdAt: number;
  /** The layer of the seed corpus. */
  base: SerializedNgram;
  /** The layer of all the words of the user. */
  user: SerializedNgram;
  /** One layer for each space. Empty when no space has words. */
  chats: Record<string, SerializedNgram>;
  seedDigest?: string;
}

export type EngineSnapshot = EngineSnapshotV2;
export type AnyEngineSnapshot = EngineSnapshotV1 | EngineSnapshotV2;

/** Makes a version 1 snapshot of one model. */
export function toSnapshot(model: NgramModel): EngineSnapshotV1 {
  return {
    version: 1,
    createdAt: Date.now(),
    ngram: model.serialize(),
  };
}

/** Makes a version 2 snapshot of all the layers of an engine. */
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

/** Tells if a value is a snapshot that this version can read. */
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
