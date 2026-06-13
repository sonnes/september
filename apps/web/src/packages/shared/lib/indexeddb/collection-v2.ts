import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  BaseCollectionConfig,
  CollectionConfig,
  DeleteMutationFnParams,
  InferSchemaOutput,
  InsertMutationFnParams,
  PendingMutation,
  SerializationError,
  SyncConfig,
  UpdateMutationFnParams,
  UtilsRecord,
} from '@tanstack/db';

import { KVStore, KVStoreOptions } from './kv-store';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Internal storage format for items in IndexedDB
 * Each item is wrapped with a version key for conflict detection
 */
interface StoredItem<T> {
  versionKey: string;
  data: T;
}

/**
 * Serialization interface for custom JSON parsing/stringifying
 */
export interface Parser {
  parse: (data: string) => unknown;
  stringify: (data: unknown) => string;
}

/**
 * BroadcastChannel message types for multi-tab synchronization
 */
type IndexedDBSyncMessage<TKey extends string | number> =
  | { type: 'change'; key: TKey; versionKey: string }
  | { type: 'clear' };

/**
 * Configuration for IndexedDB-backed collections (v2)
 */
export interface IndexedDBCollectionConfigV2<
  T extends object,
  TSchema extends StandardSchemaV1 = never,
  TKey extends string | number = string | number,
> extends BaseCollectionConfig<T, TKey, TSchema> {
  kvStoreOptions: KVStoreOptions;
  channelName?: string;
  parser?: Parser;
}

/**
 * Utility functions exposed by IndexedDB collections
 */
export interface IndexedDBCollectionUtilsV2 extends UtilsRecord {
  clearStorage: () => Promise<void>;
  getStorageSize: () => Promise<number>;
  acceptMutations: (transaction: {
    mutations: Array<PendingMutation<Record<string, unknown>>>;
  }) => Promise<void>;
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Encode a storage key with type prefix for proper type preservation
 */
function encodeStorageKey(key: string | number): string {
  if (typeof key === 'number') {
    return `n:${key}`;
  }
  return `s:${key}`;
}

/**
 * Decode a storage key back to its original type
 */
function decodeStorageKey(encodedKey: string): string | number {
  if (encodedKey.startsWith('n:')) {
    return Number(encodedKey.slice(2));
  }
  if (encodedKey.startsWith('s:')) {
    return encodedKey.slice(2);
  }
  return encodedKey;
}

// ============================================================================
// Tuple Key Management
// ============================================================================

/**
 * Create a tuple key for an individual item in a collection
 * Format: [collectionId, encodedItemKey]
 *
 * Examples:
 *   - createItemKey('chats', 's:user-123') → ['chats', 's:user-123']
 *   - createItemKey('messages', 'n:42') → ['messages', 'n:42']
 */
function createItemKey(collectionId: string, encodedKey: string): [string, string] {
  return [collectionId, encodedKey];
}

/**
 * Extract the encoded item key from a tuple key
 * Returns the second element of the tuple
 *
 * Examples:
 *   - extractEncodedKey(['chats', 's:user-123']) → 's:user-123'
 *   - extractEncodedKey(['messages', 'n:42']) → 'n:42'
 */
function extractEncodedKey(tupleKey: [string, string]): string {
  return tupleKey[1];
}

/**
 * Generate a unique identifier using the crypto API
 */
function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Validate that a value can be serialized to JSON
 */
function validateJsonSerializable(parser: Parser, value: unknown, operation: string): void {
  try {
    parser.stringify(value);
  } catch (error) {
    throw new SerializationError(operation, error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Load data from IndexedDB using individual tuple keys
 * Scans all items with the collection's prefix
 */
async function loadFromStorage<T extends object>(
  kvStore: KVStore<StoredItem<T>> | null,
  collectionId: string
): Promise<Map<string | number, StoredItem<T>>> {
  if (!kvStore) {
    return new Map();
  }

  try {
    const dataMap = new Map<string | number, StoredItem<T>>();

    // Scan all keys with collection prefix
    for await (const [tupleKey, value] of kvStore.scanByPrefix([collectionId])) {
      if (value && typeof value === 'object' && 'versionKey' in value && 'data' in value) {
        const storedItem = value as StoredItem<T>;
        const encodedKey = extractEncodedKey(tupleKey as [string, string]);
        const decodedKey = decodeStorageKey(encodedKey);
        dataMap.set(decodedKey, storedItem);
      } else {
        console.warn('[IndexedDBCollectionV2] Invalid StoredItem format for key:', tupleKey);
      }
    }

    return dataMap;
  } catch (error) {
    console.warn('[IndexedDBCollectionV2] Error loading data:', error);
    return new Map();
  }
}

/**
 * Save specific items to IndexedDB using tuple keys
 * Uses batch operation for efficiency
 *
 * @param collectionId - The collection's ID for the key prefix
 * @param changedKeys - Optional set of keys that changed (for optimization)
 *                      If not provided, saves all items in dataMap
 */
async function saveToStorage<T extends object>(
  kvStore: KVStore<StoredItem<T>> | null,
  collectionId: string,
  dataMap: Map<string | number, StoredItem<T>>,
  changedKeys?: Set<string | number>
): Promise<void> {
  if (!kvStore) {
    return;
  }

  try {
    const entries: Array<[[string, string], StoredItem<T>]> = [];

    // If changedKeys provided, save only those items
    // Otherwise save all items
    const keysToSave = changedKeys || dataMap.keys();

    for (const key of keysToSave) {
      const storedItem = dataMap.get(key);
      if (storedItem) {
        const encodedKey = encodeStorageKey(key);
        const tupleKey = createItemKey(collectionId, encodedKey);
        entries.push([tupleKey, storedItem]);
      }
    }

    if (entries.length > 0) {
      await kvStore.setMany(entries);
    }
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error saving data:', error);
    throw error;
  }
}

/**
 * Compare two Maps to find differences using version keys
 */
function findChanges<T extends object>(
  oldData: Map<string | number, StoredItem<T>>,
  newData: Map<string | number, StoredItem<T>>
): Array<{
  type: 'insert' | 'update' | 'delete';
  key: string | number;
  value?: T;
}> {
  const changes: Array<{
    type: 'insert' | 'update' | 'delete';
    key: string | number;
    value?: T;
  }> = [];

  oldData.forEach((oldStoredItem, key) => {
    const newStoredItem = newData.get(key);
    if (!newStoredItem) {
      changes.push({ type: 'delete', key, value: oldStoredItem.data });
    } else if (oldStoredItem.versionKey !== newStoredItem.versionKey) {
      changes.push({ type: 'update', key, value: newStoredItem.data });
    }
  });

  newData.forEach((newStoredItem, key) => {
    if (!oldData.has(key)) {
      changes.push({ type: 'insert', key, value: newStoredItem.data });
    }
  });

  return changes;
}

// ============================================================================
// Sync Configuration
// ============================================================================

function createIndexedDBSync<T extends object, TKey extends string | number>(
  kvStore: KVStore<StoredItem<T>> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>,
  collectionId: string
): SyncConfig<T, TKey> & {
  confirmOperationsSync: (mutations: Array<PendingMutation<T>>) => void;
  getCollection: () => unknown;
} {
  let syncParams: Parameters<SyncConfig<T, TKey>['sync']>[0] | null = null;
  let collectionRef: unknown = null;

  /**
   * Process storage changes from other tabs
   * Optimized to read only the specific changed item using tuple key
   */
  const processStorageChanges = async (changedKey?: string | number) => {
    if (!syncParams) return;

    const { begin, write, commit } = syncParams;

    try {
      if (changedKey !== undefined) {
        // Optimized path: Read only the changed item
        const encodedKey = encodeStorageKey(changedKey);
        const tupleKey = createItemKey(collectionId, encodedKey);
        const newStoredItem = await kvStore?.get(tupleKey);

        const oldStoredItem = lastKnownData.get(changedKey);

        // Determine change type
        if (!oldStoredItem && newStoredItem) {
          // Insert
          if (newStoredItem && typeof newStoredItem === 'object' &&
              'versionKey' in newStoredItem && 'data' in newStoredItem) {
            begin();
            write({ type: 'insert', value: newStoredItem.data });
            commit();
            lastKnownData.set(changedKey, newStoredItem as StoredItem<T>);
          }
        } else if (oldStoredItem && newStoredItem) {
          // Update (only if versionKey changed)
          if (newStoredItem && typeof newStoredItem === 'object' &&
              'versionKey' in newStoredItem && 'data' in newStoredItem) {
            const typedNewItem = newStoredItem as StoredItem<T>;
            if (oldStoredItem.versionKey !== typedNewItem.versionKey) {
              begin();
              write({ type: 'update', value: typedNewItem.data });
              commit();
              lastKnownData.set(changedKey, typedNewItem);
            }
          }
        } else if (oldStoredItem && !newStoredItem) {
          // Delete
          begin();
          write({ type: 'delete', value: oldStoredItem.data });
          commit();
          lastKnownData.delete(changedKey);
        }
      } else {
        // Fallback: Full reload (for 'clear' messages or unknown changes)
        const newData = await loadFromStorage<T>(kvStore, collectionId);
        const changes = findChanges(lastKnownData, newData);

        if (changes.length > 0) {
          begin();
          changes.forEach(({ type, value }) => {
            if (value) {
              write({ type: type as 'insert' | 'update' | 'delete', value });
            }
          });
          commit();

          lastKnownData.clear();
          newData.forEach((storedItem, key) => {
            lastKnownData.set(key, storedItem);
          });
        }
      }
    } catch (error) {
      console.error('[IndexedDBCollectionV2] Error processing storage changes:', error);
    }
  };

  const confirmOperationsSync = (mutations: Array<PendingMutation<T>>) => {
    if (!syncParams) return;

    const { begin, write, commit } = syncParams;

    begin();
    mutations.forEach(mutation => {
      write({
        type: mutation.type as 'insert' | 'update' | 'delete',
        value: mutation.type === 'delete' ? (mutation.original as T) : (mutation.modified as T),
      });
    });
    commit();
  };

  return {
    sync: params => {
      const { begin, write, commit, markReady, collection } = params;

      syncParams = params;
      collectionRef = collection;

      // Async initial load
      (async () => {
        try {
          const initialData = await loadFromStorage<T>(kvStore, collectionId);
          if (initialData.size > 0) {
            begin();
            initialData.forEach(storedItem => {
              validateJsonSerializable(parser, storedItem.data, 'load');
              write({ type: 'insert', value: storedItem.data });
            });
            commit();
          }

          lastKnownData.clear();
          initialData.forEach((storedItem, key) => {
            lastKnownData.set(key, storedItem);
          });
        } catch (error) {
          console.error('[IndexedDBCollectionV2] Initial load failed:', error);
        } finally {
          markReady();
        }
      })();

      if (channel) {
        channel.onmessage = async (event: MessageEvent<IndexedDBSyncMessage<string | number>>) => {
          const msg = event.data;
          if (msg.type === 'change') {
            // Optimized: pass the specific changed key
            await processStorageChanges(msg.key);
          } else if (msg.type === 'clear') {
            // Full reload for clear operations
            await processStorageChanges();
          }
        };
      }

      return () => {
        if (channel) {
          channel.close();
        }
      };
    },

    getSyncMetadata: () => ({
      storage: kvStore ? 'indexeddb' : 'ssr-fallback',
      channel: channel ? 'configured' : 'none',
    }),

    confirmOperationsSync,
    getCollection: () => collectionRef,
  };
}

// ============================================================================
// Mutation Handlers
// ============================================================================

function createMutationHandlers<T extends object, TKey extends string | number>(
  config: IndexedDBCollectionConfigV2<T, never, TKey>,
  kvStore: KVStore<StoredItem<T>> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>,
  sync: { confirmOperationsSync: (mutations: Array<PendingMutation<T>>) => void },
  collectionId: string
) {
  const wrappedOnInsert = async (
    params: InsertMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
  ) => {
    params.transaction.mutations.forEach(mutation => {
      validateJsonSerializable(parser, mutation.modified, 'insert');
    });

    let handlerResult: Record<string, unknown> = {};
    if (config.onInsert) {
      handlerResult =
        ((await config.onInsert(params as InsertMutationFnParams<T, TKey, UtilsRecord>)) as Record<
          string,
          unknown
        >) ?? {};
    }

    // Track changed keys for optimization
    const changedKeys = new Set<string | number>();

    params.transaction.mutations.forEach(mutation => {
      const storedItem: StoredItem<T> = {
        versionKey: generateUuid(),
        data: mutation.modified,
      };
      lastKnownData.set(mutation.key, storedItem);
      changedKeys.add(mutation.key);
    });

    // Save only changed items with tuple keys
    await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);

    if (channel) {
      params.transaction.mutations.forEach(mutation => {
        const storedItem = lastKnownData.get(mutation.key);
        if (storedItem) {
          channel.postMessage({
            type: 'change',
            key: mutation.key,
            versionKey: storedItem.versionKey,
          } as IndexedDBSyncMessage<TKey>);
        }
      });
    }

    sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

    return handlerResult;
  };

  const wrappedOnUpdate = async (
    params: UpdateMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
  ) => {
    params.transaction.mutations.forEach(mutation => {
      validateJsonSerializable(parser, mutation.modified, 'update');
    });

    let handlerResult: Record<string, unknown> = {};
    if (config.onUpdate) {
      handlerResult =
        ((await config.onUpdate(params as UpdateMutationFnParams<T, TKey, UtilsRecord>)) as Record<
          string,
          unknown
        >) ?? {};
    }

    // Track changed keys for optimization
    const changedKeys = new Set<string | number>();

    params.transaction.mutations.forEach(mutation => {
      const storedItem: StoredItem<T> = {
        versionKey: generateUuid(),
        data: mutation.modified,
      };
      lastKnownData.set(mutation.key, storedItem);
      changedKeys.add(mutation.key);
    });

    // Save only changed items with tuple keys
    await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);

    if (channel) {
      params.transaction.mutations.forEach(mutation => {
        const storedItem = lastKnownData.get(mutation.key);
        if (storedItem) {
          channel.postMessage({
            type: 'change',
            key: mutation.key,
            versionKey: storedItem.versionKey,
          } as IndexedDBSyncMessage<TKey>);
        }
      });
    }

    sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

    return handlerResult;
  };

  const wrappedOnDelete = async (
    params: DeleteMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
  ) => {
    let handlerResult: Record<string, unknown> = {};
    if (config.onDelete) {
      handlerResult =
        ((await config.onDelete(params as DeleteMutationFnParams<T, TKey, UtilsRecord>)) as Record<
          string,
          unknown
        >) ?? {};
    }

    // Track deleted keys
    const deletedKeys: Array<string | number> = [];

    params.transaction.mutations.forEach(mutation => {
      lastKnownData.delete(mutation.key);
      deletedKeys.push(mutation.key);
    });

    // Delete items from storage using tuple keys
    if (kvStore && deletedKeys.length > 0) {
      const tupleKeysToDelete = deletedKeys.map(key =>
        createItemKey(collectionId, encodeStorageKey(key))
      );
      await kvStore.deleteMany(tupleKeysToDelete);
    }

    if (channel) {
      params.transaction.mutations.forEach(mutation => {
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: '',
        } as IndexedDBSyncMessage<TKey>);
      });
    }

    sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

    return handlerResult;
  };

  return {
    wrappedOnInsert,
    wrappedOnUpdate,
    wrappedOnDelete,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function createUtilities<T extends object, TKey extends string | number>(
  kvStore: KVStore<StoredItem<T>> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>,
  sync: {
    confirmOperationsSync: (mutations: Array<PendingMutation<T>>) => void;
    getCollection: () => unknown;
  },
  collectionId: string
): IndexedDBCollectionUtilsV2 {
  const clearStorage = async (): Promise<void> => {
    if (!kvStore) return;

    try {
      // Scan and delete only items for this collection
      const keysToDelete: Array<[string, string]> = [];

      for await (const [tupleKey] of kvStore.scanByPrefix([collectionId])) {
        keysToDelete.push(tupleKey as [string, string]);
      }

      if (keysToDelete.length > 0) {
        await kvStore.deleteMany(keysToDelete);
      }

      lastKnownData.clear();

      if (channel) {
        channel.postMessage({ type: 'clear' } as IndexedDBSyncMessage<TKey>);
      }
    } catch (error) {
      console.error('[IndexedDBCollectionV2] Error clearing storage:', error);
      throw error;
    }
  };

  const getStorageSize = async (): Promise<number> => {
    if (!kvStore) return 0;

    try {
      // Load all items for this collection
      const data = await loadFromStorage<T>(kvStore, collectionId);

      // Calculate total size by stringifying all items
      let totalSize = 0;

      data.forEach((storedItem, key) => {
        const encodedKey = encodeStorageKey(key);
        const tupleKey = createItemKey(collectionId, encodedKey);

        // Size = key size + value size
        const serializedKey = parser.stringify(tupleKey);
        const serializedItem = parser.stringify(storedItem);
        totalSize += new Blob([serializedKey]).size;
        totalSize += new Blob([serializedItem]).size;
      });

      return totalSize;
    } catch (error) {
      console.error('[IndexedDBCollectionV2] Error getting storage size:', error);
      return 0;
    }
  };

  const acceptMutations = async (transaction: {
    mutations: Array<PendingMutation<Record<string, unknown>>>;
  }): Promise<void> => {
    const collection = sync.getCollection();
    const collectionMutations = transaction.mutations.filter(m => {
      if (collection && m.collection === collection) {
        return true;
      }
      return (m.collection as { id?: string }).id === collectionId;
    });

    if (collectionMutations.length === 0) {
      return;
    }

    // Validate all mutations can be serialized
    for (const mutation of collectionMutations) {
      if (mutation.type === 'insert' || mutation.type === 'update') {
        validateJsonSerializable(parser, mutation.modified, mutation.type);
      }
    }

    // Track changes for optimization
    const changedKeys = new Set<string | number>();
    const deletedKeys: Array<string | number> = [];

    // Apply mutations to lastKnownData
    for (const mutation of collectionMutations) {
      if (mutation.type === 'insert' || mutation.type === 'update') {
        const storedItem: StoredItem<Record<string, unknown>> = {
          versionKey: generateUuid(),
          data: mutation.modified,
        };
        lastKnownData.set(mutation.key as string | number, storedItem as StoredItem<T>);
        changedKeys.add(mutation.key as string | number);
      } else if (mutation.type === 'delete') {
        lastKnownData.delete(mutation.key as string | number);
        deletedKeys.push(mutation.key as string | number);
      }
    }

    // Save changed items with tuple keys
    if (changedKeys.size > 0) {
      await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);
    }

    // Delete removed items with tuple keys
    if (kvStore && deletedKeys.length > 0) {
      const tupleKeysToDelete = deletedKeys.map(key =>
        createItemKey(collectionId, encodeStorageKey(key))
      );
      await kvStore.deleteMany(tupleKeysToDelete);
    }

    // Broadcast changes
    if (channel) {
      for (const mutation of collectionMutations) {
        const storedItem = lastKnownData.get(mutation.key as string | number);
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: storedItem?.versionKey ?? '',
        } as IndexedDBSyncMessage<string | number>);
      }
    }

    sync.confirmOperationsSync(collectionMutations as unknown as Array<PendingMutation<T>>);
  };

  return {
    clearStorage,
    getStorageSize,
    acceptMutations,
  };
}

// ============================================================================
// Main Factory Function
// ============================================================================

// Overload 1: With schema
export function indexedDBCollectionOptionsV2<
  T extends StandardSchemaV1,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<InferSchemaOutput<T>, T, TKey> & {
    schema: T;
  }
): CollectionConfig<InferSchemaOutput<T>, TKey, T, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema: T;
};

// Overload 2: Without schema
export function indexedDBCollectionOptionsV2<
  T extends object,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<T, never, TKey> & {
    schema?: never;
  }
): CollectionConfig<T, TKey, never, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema?: never;
};

// Implementation
export function indexedDBCollectionOptionsV2<
  T extends object,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<T, never, TKey>
): CollectionConfig<T, TKey, never, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
} {
  const kvStore =
    typeof indexedDB !== 'undefined'
      ? new KVStore<StoredItem<T>>(config.kvStoreOptions)
      : null;

  const channel =
    typeof BroadcastChannel !== 'undefined' && config.channelName
      ? new BroadcastChannel(config.channelName)
      : null;

  const parser = config.parser ?? JSON;

  const lastKnownData = new Map<string | number, StoredItem<T>>();

  const collectionId = config.id ?? `indexeddb-collection:${config.kvStoreOptions.dbName}`;

  const sync = createIndexedDBSync<T, TKey>(kvStore, channel, parser, lastKnownData, collectionId);

  const { wrappedOnInsert, wrappedOnUpdate, wrappedOnDelete } = createMutationHandlers<T, TKey>(
    config,
    kvStore,
    channel,
    parser,
    lastKnownData,
    sync,
    collectionId
  );

  const utils = createUtilities<T, TKey>(
    kvStore,
    channel,
    parser,
    lastKnownData,
    sync,
    collectionId
  );

  const {
    kvStoreOptions: _kvStoreOptions,
    channelName: _channelName,
    parser: _parser,
    onInsert: _onInsert,
    onUpdate: _onUpdate,
    onDelete: _onDelete,
    id: _id,
    ...restConfig
  } = config;

  return {
    ...restConfig,
    id: collectionId,
    sync,
    onInsert: wrappedOnInsert,
    onUpdate: wrappedOnUpdate,
    onDelete: wrappedOnDelete,
    utils,
  } as CollectionConfig<T, TKey, never, IndexedDBCollectionUtilsV2> & {
    id: string;
    utils: IndexedDBCollectionUtilsV2;
  };
}
