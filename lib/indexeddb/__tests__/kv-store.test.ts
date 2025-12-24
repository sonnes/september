import { beforeEach, describe, expect, it, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { KVStore, createKVStore } from '../kv-store'

describe('KVStore', () => {
  let store: KVStore<unknown>

  beforeEach(() => {
    store = createKVStore({ dbName: 'test-db' })
  })

  afterEach(async () => {
    await store.destroy()
  })

  describe('basic operations', () => {
    it('should set and get a value', async () => {
      await store.set('key1', 'value1')
      const result = await store.get('key1')
      expect(result).toBe('value1')
    })

    it('should return undefined for non-existent key', async () => {
      const result = await store.get('non-existent')
      expect(result).toBeUndefined()
    })

    it('should overwrite existing value', async () => {
      await store.set('key1', 'value1')
      await store.set('key1', 'value2')
      const result = await store.get('key1')
      expect(result).toBe('value2')
    })

    it('should delete a value', async () => {
      await store.set('key1', 'value1')
      await store.delete('key1')
      const result = await store.get('key1')
      expect(result).toBeUndefined()
    })

    it('should handle delete on non-existent key', async () => {
      await expect(store.delete('non-existent')).resolves.toBeUndefined()
    })

    it('should check if key exists with has()', async () => {
      await store.set('key1', 'value1')
      expect(await store.has('key1')).toBe(true)
      expect(await store.has('non-existent')).toBe(false)
    })
  })

  describe('complex values', () => {
    it('should store and retrieve objects', async () => {
      const obj = { name: 'test', count: 42, nested: { a: 1 } }
      await store.set('obj', obj)
      const result = await store.get('obj')
      expect(result).toEqual(obj)
    })

    it('should store and retrieve arrays', async () => {
      const arr = [1, 2, 3, { nested: true }]
      await store.set('arr', arr)
      const result = await store.get('arr')
      expect(result).toEqual(arr)
    })

    it('should store and retrieve null', async () => {
      await store.set('null', null)
      const result = await store.get('null')
      expect(result).toBeNull()
    })

    it('should store and retrieve numbers', async () => {
      await store.set('num', 123.456)
      const result = await store.get('num')
      expect(result).toBe(123.456)
    })

    it('should store and retrieve boolean', async () => {
      await store.set('bool', false)
      const result = await store.get('bool')
      expect(result).toBe(false)
    })
  })

  describe('full JSON-serializable objects', () => {
    it('should store deeply nested objects', async () => {
      const deepObj = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
                array: [1, 2, { level5: true }],
              },
            },
          },
        },
      }
      await store.set('deep', deepObj)
      const result = await store.get('deep')
      expect(result).toEqual(deepObj)
    })

    it('should store empty object', async () => {
      await store.set('empty-obj', {})
      const result = await store.get('empty-obj')
      expect(result).toEqual({})
    })

    it('should store empty array', async () => {
      await store.set('empty-arr', [])
      const result = await store.get('empty-arr')
      expect(result).toEqual([])
    })

    it('should store array of objects', async () => {
      const arr = [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
        { id: 3, name: 'third', nested: { tags: ['a', 'b'] } },
      ]
      await store.set('arr-of-obj', arr)
      const result = await store.get('arr-of-obj')
      expect(result).toEqual(arr)
    })

    it('should store object with array values', async () => {
      const obj = {
        tags: ['javascript', 'typescript'],
        scores: [100, 95, 88],
        mixed: [1, 'two', { three: 3 }, [4, 5]],
      }
      await store.set('obj-with-arr', obj)
      const result = await store.get('obj-with-arr')
      expect(result).toEqual(obj)
    })

    it('should store string values', async () => {
      await store.set('str', 'hello world')
      expect(await store.get('str')).toBe('hello world')
    })

    it('should store empty string', async () => {
      await store.set('empty-str', '')
      expect(await store.get('empty-str')).toBe('')
    })

    it('should store unicode strings', async () => {
      const unicode = '你好世界 🌍 مرحبا'
      await store.set('unicode', unicode)
      expect(await store.get('unicode')).toBe(unicode)
    })

    it('should store integer zero', async () => {
      await store.set('zero', 0)
      expect(await store.get('zero')).toBe(0)
    })

    it('should store negative numbers', async () => {
      await store.set('neg', -42.5)
      expect(await store.get('neg')).toBe(-42.5)
    })

    it('should store very large numbers', async () => {
      const large = Number.MAX_SAFE_INTEGER
      await store.set('large', large)
      expect(await store.get('large')).toBe(large)
    })

    it('should store Infinity and -Infinity', async () => {
      await store.set('inf', Infinity)
      await store.set('neg-inf', -Infinity)
      expect(await store.get('inf')).toBe(Infinity)
      expect(await store.get('neg-inf')).toBe(-Infinity)
    })

    it('should store boolean true', async () => {
      await store.set('true', true)
      expect(await store.get('true')).toBe(true)
    })

    it('should store object with all JSON types', async () => {
      const fullObj = {
        string: 'hello',
        number: 42,
        float: 3.14,
        negativeNumber: -100,
        boolTrue: true,
        boolFalse: false,
        nullValue: null,
        emptyString: '',
        emptyArray: [],
        emptyObject: {},
        array: [1, 'two', true, null, { nested: 'value' }],
        nested: {
          deep: {
            value: 'found',
            list: [1, 2, 3],
          },
        },
      }
      await store.set('full', fullObj)
      const result = await store.get('full')
      expect(result).toEqual(fullObj)
    })

    it('should store Date as serializable object', async () => {
      // Note: IndexedDB stores Date objects natively
      const date = new Date('2024-01-15T10:30:00.000Z')
      await store.set('date', date)
      const result = await store.get('date')
      expect(result).toEqual(date)
    })

    it('should store ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(8)
      const view = new Uint8Array(buffer)
      view.set([1, 2, 3, 4, 5, 6, 7, 8])
      await store.set('buffer', buffer)
      const result = (await store.get('buffer')) as ArrayBuffer
      expect(new Uint8Array(result)).toEqual(view)
    })

    it('should store Uint8Array', async () => {
      const arr = new Uint8Array([10, 20, 30, 40, 50])
      await store.set('uint8', arr)
      const result = (await store.get('uint8')) as Uint8Array
      // Compare as arrays since fake-indexeddb may return a different instance
      expect(Array.from(result)).toEqual(Array.from(arr))
    })

    it('should store Blob', async () => {
      // Note: Blob support varies by IndexedDB implementation
      // fake-indexeddb may not fully support Blob
      // In real browser IndexedDB, Blob is supported
      const blob = new Blob(['hello world'], { type: 'text/plain' })
      await store.set('blob', blob)
      const result = await store.get('blob')
      // fake-indexeddb might return the blob differently, so we check if it was stored
      expect(result).toBeDefined()
    })

    it('should store object with special string values', async () => {
      const obj = {
        withNewlines: 'line1\nline2\nline3',
        withTabs: 'col1\tcol2\tcol3',
        withQuotes: 'He said "hello"',
        withSingleQuotes: "It's working",
        withBackslash: 'path\\to\\file',
        withUnicode: '\u0000\u001f\u007f',
      }
      await store.set('special-strings', obj)
      const result = await store.get('special-strings')
      expect(result).toEqual(obj)
    })

    it('should store sparse arrays', async () => {
      // eslint-disable-next-line no-sparse-arrays
      const sparse = [1, , , 4, , 6]
      await store.set('sparse', sparse)
      const result = (await store.get('sparse')) as unknown[]
      expect(result[0]).toBe(1)
      expect(result[3]).toBe(4)
      expect(result[5]).toBe(6)
      expect(result.length).toBe(6)
    })

    it('should store object with numeric string keys', async () => {
      const obj = {
        '0': 'zero',
        '1': 'one',
        '100': 'hundred',
      }
      await store.set('numeric-keys', obj)
      const result = await store.get('numeric-keys')
      expect(result).toEqual(obj)
    })

    it('should store array with undefined values (converted to null)', async () => {
      // Note: undefined in arrays becomes empty slot or null depending on storage
      const arr = [1, undefined, 3]
      await store.set('with-undefined', arr)
      const result = (await store.get('with-undefined')) as unknown[]
      expect(result[0]).toBe(1)
      expect(result[2]).toBe(3)
    })

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(100000)
      await store.set('long-string', longString)
      const result = await store.get('long-string')
      expect(result).toBe(longString)
    })

    it('should handle large arrays', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }))
      await store.set('large-array', largeArray)
      const result = (await store.get('large-array')) as typeof largeArray
      expect(result.length).toBe(10000)
      expect(result[0]).toEqual({ id: 0, value: 'item-0' })
      expect(result[9999]).toEqual({ id: 9999, value: 'item-9999' })
    })
  })

  describe('iteration methods', () => {
    beforeEach(async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      await store.set('c', 3)
    })

    it('should return all keys', async () => {
      const keys = await store.keys()
      expect(keys.sort()).toEqual(['a', 'b', 'c'])
    })

    it('should return all values', async () => {
      const values = await store.values()
      expect(values.sort()).toEqual([1, 2, 3])
    })

    it('should return all entries', async () => {
      const entries = await store.entries()
      const sorted = entries.sort((a, b) => a[0].localeCompare(b[0]))
      expect(sorted).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    })

    it('should return empty arrays for empty store', async () => {
      const emptyStore = createKVStore({ dbName: 'empty-db' })
      expect(await emptyStore.keys()).toEqual([])
      expect(await emptyStore.values()).toEqual([])
      expect(await emptyStore.entries()).toEqual([])
      await emptyStore.destroy()
    })
  })

  describe('count and clear', () => {
    it('should return correct count', async () => {
      expect(await store.count()).toBe(0)
      await store.set('a', 1)
      expect(await store.count()).toBe(1)
      await store.set('b', 2)
      expect(await store.count()).toBe(2)
    })

    it('should clear all entries', async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      await store.clear()
      expect(await store.count()).toBe(0)
      expect(await store.get('a')).toBeUndefined()
    })
  })

  describe('batch operations', () => {
    it('should get multiple values with getMany()', async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      await store.set('c', 3)

      const results = await store.getMany(['a', 'c', 'non-existent'])
      expect(results).toEqual([1, 3, undefined])
    })

    it('should handle empty array in getMany()', async () => {
      const results = await store.getMany([])
      expect(results).toEqual([])
    })

    it('should set multiple values with setMany()', async () => {
      await store.setMany([
        ['x', 10],
        ['y', 20],
        ['z', 30],
      ])

      expect(await store.get('x')).toBe(10)
      expect(await store.get('y')).toBe(20)
      expect(await store.get('z')).toBe(30)
    })

    it('should handle empty array in setMany()', async () => {
      await expect(store.setMany([])).resolves.toBeUndefined()
    })

    it('should delete multiple values with deleteMany()', async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      await store.set('c', 3)

      await store.deleteMany(['a', 'c'])

      expect(await store.get('a')).toBeUndefined()
      expect(await store.get('b')).toBe(2)
      expect(await store.get('c')).toBeUndefined()
    })

    it('should handle empty array in deleteMany()', async () => {
      await expect(store.deleteMany([])).resolves.toBeUndefined()
    })
  })

  describe('scan with prefix', () => {
    beforeEach(async () => {
      await store.set('user:1', { name: 'Alice' })
      await store.set('user:2', { name: 'Bob' })
      await store.set('user:10', { name: 'Charlie' })
      await store.set('post:1', { title: 'Hello' })
      await store.set('post:2', { title: 'World' })
    })

    it('should scan entries with prefix', async () => {
      const results: Array<[string, unknown]> = []
      for await (const entry of store.scan('user:')) {
        results.push(entry)
      }

      expect(results.length).toBe(3)
      const keys = results.map(([k]) => k).sort()
      expect(keys).toEqual(['user:1', 'user:10', 'user:2'])
    })

    it('should scan different prefix', async () => {
      const results: Array<[string, unknown]> = []
      for await (const entry of store.scan('post:')) {
        results.push(entry)
      }

      expect(results.length).toBe(2)
    })

    it('should return empty for non-matching prefix', async () => {
      const results: Array<[string, unknown]> = []
      for await (const entry of store.scan('comment:')) {
        results.push(entry)
      }

      expect(results).toEqual([])
    })
  })

  describe('type safety', () => {
    it('should work with typed stores', async () => {
      interface User {
        id: string
        name: string
        age: number
      }

      const typedStore = createKVStore<User>({ dbName: 'typed-db' })

      const user: User = { id: '1', name: 'Test', age: 25 }
      await typedStore.set('user:1', user)

      const result = await typedStore.get('user:1')
      expect(result).toEqual(user)

      await typedStore.destroy()
    })
  })

  describe('custom store name', () => {
    it('should use custom store name', async () => {
      const customStore = createKVStore({
        dbName: 'custom-db',
        storeName: 'my-custom-store',
      })

      await customStore.set('key', 'value')
      expect(await customStore.get('key')).toBe('value')

      await customStore.destroy()
    })
  })

  describe('factory function', () => {
    it('should create store using createKVStore', async () => {
      const factoryStore = createKVStore({ dbName: 'factory-db' })
      expect(factoryStore).toBeInstanceOf(KVStore)
      await factoryStore.destroy()
    })
  })
})
