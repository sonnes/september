import {
  CollectionConfig,
  SyncConfig,
  BaseCollectionConfig,
  UtilsRecord,
} from '@tanstack/db'
import { KVStore, KVStoreOptions } from './kv-store'

/**
 * Message types for multi-tab synchronization via BroadcastChannel
 */
type SyncMessage<T, TKey> =
  | { type: 'insert'; key: TKey; value: T }
  | { type: 'update'; key: TKey; value: T }
  | { type: 'delete'; key: TKey }

export interface IndexedDBCollectionConfig<
  T extends object,
  TKey extends string | number = string,
  TSchema = any,
> extends Omit<
    BaseCollectionConfig<T, TKey, any>,
    'onInsert' | 'onUpdate' | 'onDelete'
  > {
  /** Options for the underlying IndexedDB KVStore */
  kvStoreOptions: KVStoreOptions
  /** Name of the BroadcastChannel for multi-tab sync */
  channelName?: string
  schema?: TSchema
}

/**
 * Creates a TanStack DB collection configuration that persists to IndexedDB
 * and synchronizes across multiple tabs using BroadcastChannel.
 */
export function indexedDBCollectionOptions<
  T extends object,
  TKey extends string | number = string,
  TSchema = any,
>(
  config: IndexedDBCollectionConfig<T, TKey, TSchema>
): CollectionConfig<T, TKey, any> & { utils: UtilsRecord } {
  const { kvStoreOptions, channelName, getKey, ...rest } = config

  const kvStore = new KVStore<T>(kvStoreOptions)
  const channel =
    typeof window !== 'undefined' && channelName
      ? new BroadcastChannel(channelName)
      : null

  const sync: SyncConfig<T, TKey>['sync'] = (params) => {
    const { begin, write, commit, markReady } = params

    // 1. Listen for changes from other tabs
    if (channel) {
      channel.onmessage = (event: MessageEvent<SyncMessage<T, TKey>>) => {
        const msg = event.data
        begin()
        switch (msg.type) {
          case 'insert':
            write({ type: 'insert', value: msg.value })
            break
          case 'update':
            write({ type: 'update', value: msg.value })
            break
          case 'delete':
            write({ type: 'delete', key: msg.key })
            break
        }
        commit()
      }
    }

    // 2. Initial fetch from IndexedDB
    async function initialSync() {
      try {
        const entries = await kvStore.entries()
        begin()
        for (const [_, value] of entries) {
          write({ type: 'insert', value })
        }
        commit()
      } catch (error) {
        console.error('IndexedDB initial sync failed:', error)
      } finally {
        markReady()
      }
    }

    if (typeof window !== 'undefined') {
      initialSync()
    } else {
      markReady()
    }

    // 3. Cleanup
    return () => {
      if (channel) {
        channel.close()
      }
    }
  }

  return {
    ...rest,
    getKey,
    sync: {
      sync,
      rowUpdateMode: 'partial',
    },
    onInsert: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const key = getKey(mutation.modified)
        const value = mutation.modified
        await kvStore.set(String(key), value)
        channel?.postMessage({ type: 'insert', key, value })
      }
    },
    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const key = getKey(mutation.modified)
        const changes = mutation.changes
        
        await kvStore.update(String(key), (oldValue) => {
          if (!oldValue) return mutation.modified
          return { ...oldValue, ...changes }
        })
        
        // We broadcast the full modified object to ensure other tabs have the complete state
        channel?.postMessage({ 
          type: 'update', 
          key, 
          value: mutation.modified 
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const key = mutation.key
        await kvStore.delete(String(key))
        channel?.postMessage({ type: 'delete', key })
      }
    },
    utils: {
      clear: async () => {
        await kvStore.clear()
        // Optionally broadcast a clear event if needed, 
        // but usually handled by individual deletes or full sync
      },
    },
  }
}
