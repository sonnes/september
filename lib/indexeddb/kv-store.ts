/**
 * Simple IndexedDB Key-Value Store
 *
 * A lightweight wrapper around IndexedDB for key-value storage operations.
 */

const DEFAULT_STORE_NAME = 'kv-store'
const DEFAULT_DB_VERSION = 1

export interface KVStoreOptions {
  /** Name of the IndexedDB database */
  dbName: string
  /** Name of the object store (default: 'kv-store') */
  storeName?: string
  /** Database version (default: 1) */
  version?: number
}

export class KVStore<T = unknown> {
  private db: Promise<IDBDatabase>
  private readonly storeName: string
  private readonly dbName: string

  constructor(options: KVStoreOptions) {
    this.dbName = options.dbName
    this.storeName = options.storeName ?? DEFAULT_STORE_NAME

    this.db = this.openDatabase(options.version ?? DEFAULT_DB_VERSION)
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
  async get(key: string): Promise<T | undefined> {
    const db = await this.db
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
  async set(key: string, value: T): Promise<void> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value, key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<void> {
    const db = await this.db
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
  async has(key: string): Promise<boolean> {
    const db = await this.db
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
  async keys(): Promise<string[]> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAllKeys()

      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all values
   */
  async values(): Promise<T[]> {
    const db = await this.db
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
  async entries(): Promise<Array<[string, T]>> {
    const db = await this.db
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)

      const keysRequest = store.getAllKeys()
      const valuesRequest = store.getAll()

      const results: { keys?: string[]; values?: T[] } = {}

      keysRequest.onsuccess = () => {
        results.keys = keysRequest.result as string[]
        if (results.values) {
          resolve(
            results.keys.map((key, i) => [key, results.values![i]] as [string, T])
          )
        }
      }

      valuesRequest.onsuccess = () => {
        results.values = valuesRequest.result as T[]
        if (results.keys) {
          resolve(
            results.keys.map((key, i) => [key, results.values![i]] as [string, T])
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
    const db = await this.db
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
    const db = await this.db
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
  async getMany(keys: string[]): Promise<Array<T | undefined>> {
    const db = await this.db
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
  async setMany(entries: Array<[string, T]>): Promise<void> {
    const db = await this.db
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
  async deleteMany(keys: string[]): Promise<void> {
    const db = await this.db
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
    const db = await this.db
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
   * Close the database connection
   */
  async close(): Promise<void> {
    const db = await this.db
    db.close()
  }

  /**
   * Delete the entire database
   */
  async destroy(): Promise<void> {
    const db = await this.db
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
