/**
 * Simple IndexedDB Key-Value Store
 *
 * A lightweight wrapper around IndexedDB for key-value storage operations.
 */

const DEFAULT_STORE_NAME = 'kv-store'
const DEFAULT_DB_VERSION = 1

/**
 * Valid IndexedDB key types
 * Supports string, number, and arrays (tuples) for compound keys
 *
 * Examples:
 *   - "simple-key"           // String key
 *   - 42                     // Number key
 *   - ["chats", "s:id1"]     // Tuple key for collection items
 */
export type IDBValidKey = string | number | Array<string | number>;

export interface KVStoreOptions {
  /** Name of the IndexedDB database */
  dbName: string
  /** Name of the object store (default: 'kv-store') */
  storeName?: string
  /** Database version (default: 1) */
  version?: number
}

export class KVStore<T = unknown> {
  private db: Promise<IDBDatabase> | null = null
  private readonly storeName: string
  private readonly dbName: string
  private readonly version: number

  constructor(options: KVStoreOptions) {
    this.dbName = options.dbName
    this.storeName = options.storeName ?? DEFAULT_STORE_NAME
    this.version = options.version ?? DEFAULT_DB_VERSION
  }

  private getDB(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'))
    }
    if (!this.db) {
      this.db = this.openDatabase(this.version)
    }
    return this.db
  }

  private openDatabase(version: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, version)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const database = (event.target as IDBOpenDBRequest).result
        this.setupSchema(database)
      }

      request.onsuccess = (event: Event) => {
        const database = (event.target as IDBOpenDBRequest).result
        resolve(database)
      }

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error
        console.error(`Error opening database: ${error}`)
        reject(error)
      }
    })
  }

  private setupSchema(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      db.createObjectStore(this.storeName)
    }
  }

  /**
   * Get a value by key
   */
  async get(key: IDBValidKey): Promise<T | undefined> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Set a value by key
   */
  async set(key: IDBValidKey, value: T): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value, key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Atomic update of a value by key
   */
  async update(
    key: IDBValidKey,
    updater: (oldValue: T | undefined) => T
  ): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        try {
          const newValue = updater(request.result as T | undefined)
          const putRequest = store.put(newValue, key)
          putRequest.onerror = () => reject(putRequest.error)
        } catch (err) {
          reject(err)
        }
      }

      transaction.oncomplete = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a value by key
   */
  async delete(key: IDBValidKey): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Check if a key exists
   */
  async has(key: IDBValidKey): Promise<boolean> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count(IDBKeyRange.only(key))

      request.onsuccess = () => resolve(request.result > 0)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all keys
   */
  async keys(): Promise<IDBValidKey[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAllKeys()

      request.onsuccess = () => resolve(request.result as IDBValidKey[])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all values
   */
  async values(): Promise<T[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all entries as key-value pairs
   */
  async entries(): Promise<Array<[IDBValidKey, T]>> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)

      const keysRequest = store.getAllKeys()
      const valuesRequest = store.getAll()

      const results: { keys?: IDBValidKey[]; values?: T[] } = {}

      keysRequest.onsuccess = () => {
        results.keys = keysRequest.result as IDBValidKey[]
        if (results.values) {
          resolve(
            results.keys.map((key, i) => [key, results.values![i]] as [IDBValidKey, T])
          )
        }
      }

      valuesRequest.onsuccess = () => {
        results.values = valuesRequest.result as T[]
        if (results.keys) {
          resolve(
            results.keys.map((key, i) => [key, results.values![i]] as [IDBValidKey, T])
          )
        }
      }

      keysRequest.onerror = () => reject(keysRequest.error)
      valuesRequest.onerror = () => reject(valuesRequest.error)
    })
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get the count of entries
   */
  async count(): Promise<number> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get multiple values by keys
   */
  async getMany(keys: IDBValidKey[]): Promise<Array<T | undefined>> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const results: Array<T | undefined> = new Array(keys.length)
      let completed = 0
      let hasError = false

      if (keys.length === 0) {
        resolve([])
        return
      }

      keys.forEach((key, index) => {
        const request = store.get(key)

        request.onsuccess = () => {
          if (hasError) return
          results[index] = request.result as T | undefined
          completed++
          if (completed === keys.length) {
            resolve(results)
          }
        }

        request.onerror = () => {
          if (hasError) return
          hasError = true
          reject(request.error)
        }
      })
    })
  }

  /**
   * Set multiple key-value pairs
   */
  async setMany(entries: Array<[IDBValidKey, T]>): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)

      if (entries.length === 0) {
        resolve()
        return
      }

      let lastRequest: IDBRequest | null = null

      for (const [key, value] of entries) {
        lastRequest = store.put(value, key)
      }

      if (lastRequest) {
        lastRequest.onsuccess = () => resolve()
        lastRequest.onerror = () => reject(lastRequest!.error)
      } else {
        resolve()
      }
    })
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: IDBValidKey[]): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)

      if (keys.length === 0) {
        resolve()
        return
      }

      let lastRequest: IDBRequest | null = null

      for (const key of keys) {
        lastRequest = store.delete(key)
      }

      if (lastRequest) {
        lastRequest.onsuccess = () => resolve()
        lastRequest.onerror = () => reject(lastRequest!.error)
      } else {
        resolve()
      }
    })
  }

  /**
   * Iterate over all entries with a prefix
   */
  async *scan(prefix: string): AsyncIterable<[string, T]> {
    const db = await this.getDB()
    const transaction = db.transaction(this.storeName, 'readonly')
    const store = transaction.objectStore(this.storeName)

    // Create a key range that matches the prefix
    const lower = prefix
    const upper = prefix + '\uffff'
    const keyRange = IDBKeyRange.bound(lower, upper, false, true)

    const keys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys(keyRange)
      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })

    const values = await new Promise<T[]>((resolve, reject) => {
      const request = store.getAll(keyRange)
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })

    for (let i = 0; i < keys.length; i++) {
      yield [keys[i], values[i]]
    }
  }

  /**
   * Iterate over all entries with an array key prefix
   * Uses IDBKeyRange to efficiently scan keys starting with the prefix
   *
   * Example:
   *   // Scan all items in the "chats" collection
   *   for await (const [key, value] of kvStore.scanByPrefix(['chats'])) {
   *     console.log(key, value); // key = ['chats', 's:id1'], value = {...}
   *   }
   */
  async *scanByPrefix(prefix: Array<string | number>): AsyncIterable<[IDBValidKey, T]> {
    const db = await this.getDB()
    const transaction = db.transaction(this.storeName, 'readonly')
    const store = transaction.objectStore(this.storeName)

    // Create key range for array prefix
    // Lower bound: prefix array (e.g., ['chats'])
    // Upper bound: prefix array with max value appended (e.g., ['chats', []])
    // In IndexedDB, arrays are compared element by element, and [] is greater than any string/number
    const lower = prefix
    const upper = [...prefix, []]
    const keyRange = IDBKeyRange.bound(lower, upper, false, true)

    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys(keyRange)
      request.onsuccess = () => resolve(request.result as IDBValidKey[])
      request.onerror = () => reject(request.error)
    })

    const values = await new Promise<T[]>((resolve, reject) => {
      const request = store.getAll(keyRange)
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })

    for (let i = 0; i < keys.length; i++) {
      yield [keys[i], values[i]]
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    const db = await this.getDB()
    db.close()
  }

  /**
   * Delete the entire database
   */
  async destroy(): Promise<void> {
    const db = await this.getDB()
    db.close()

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

/**
 * Create a new KVStore instance
 */
export function createKVStore<T = unknown>(options: KVStoreOptions): KVStore<T> {
  return new KVStore<T>(options)
}
