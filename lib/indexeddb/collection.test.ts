import { describe, it, expect, beforeEach, vi } from 'vitest'
import { indexedDBCollectionOptions } from './collection'
import { KVStore } from './kv-store'

// Mock IndexedDB
import 'fake-indexeddb/auto'

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  static instances: Map<string, MockBroadcastChannel[]> = new Map()

  constructor(name: string) {
    this.name = name
    const instances = MockBroadcastChannel.instances.get(name) || []
    instances.push(this)
    MockBroadcastChannel.instances.set(name, instances)
  }

  postMessage(data: any) {
    const instances = MockBroadcastChannel.instances.get(this.name) || []
    instances.forEach((instance) => {
      if (instance !== this && instance.onmessage) {
        instance.onmessage({ data } as MessageEvent)
      }
    })
  }

  close() {
    const instances = MockBroadcastChannel.instances.get(this.name) || []
    const index = instances.indexOf(this)
    if (index > -1) {
      instances.splice(index, 1)
    }
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)

describe('indexedDBCollectionOptions', () => {
  const dbName = 'test-collection-db'
  const channelName = 'test-channel'
  
  interface TestItem {
    id: string
    name: string
  }

  beforeEach(() => {
    MockBroadcastChannel.instances.clear()
  })

  it('should initialize with existing data from IndexedDB', async () => {
    const kvStore = new KVStore<TestItem>({ dbName, storeName: 'items' })
    await kvStore.set('1', { id: '1', name: 'Existing' })

    const options = indexedDBCollectionOptions<TestItem>({
      id: 'test',
      kvStoreOptions: { dbName, storeName: 'items' },
      getKey: (item) => item.id,
    })

    const begin = vi.fn()
    const write = vi.fn()
    const commit = vi.fn()
    const markReady = vi.fn()

    // Manually trigger sync to test it
    const cleanup = options.sync.sync({ begin, write, commit, markReady, collection: {} as any, truncate: vi.fn() })

    // Wait for initial sync
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(write).toHaveBeenCalledWith({
      type: 'insert',
      value: { id: '1', name: 'Existing' }
    })
    expect(markReady).toHaveBeenCalled()
    
    if (typeof cleanup === 'function') cleanup()
  })

  it('should broadcast inserts to other tabs', async () => {
    const options = indexedDBCollectionOptions<TestItem>({
      id: 'test',
      kvStoreOptions: { dbName: 'db2', storeName: 'items' },
      channelName,
      getKey: (item) => item.id,
    })

    const otherTabChannel = new MockBroadcastChannel(channelName)
    const onMessage = vi.fn()
    otherTabChannel.onmessage = onMessage

    const mutation = {
      modified: { id: '2', name: 'New Item' },
      type: 'insert' as const,
    }

    await options.onInsert!({
      transaction: {
        mutations: [mutation as any],
      } as any,
      collection: {} as any
    })

    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        type: 'insert',
        key: '2',
        value: { id: '2', name: 'New Item' }
      }
    }))
  })

  it('should handle incoming messages from other tabs', async () => {
    const options = indexedDBCollectionOptions<TestItem>({
      id: 'test',
      kvStoreOptions: { dbName: 'db3', storeName: 'items' },
      channelName,
      getKey: (item) => item.id,
    })

    const begin = vi.fn()
    const write = vi.fn()
    const commit = vi.fn()
    const markReady = vi.fn()

    options.sync.sync({ begin, write, commit, markReady, collection: {} as any, truncate: vi.fn() })

    // Simulate message from another tab
    const otherTabChannel = new MockBroadcastChannel(channelName)
    otherTabChannel.postMessage({
      type: 'update',
      key: '1',
      value: { id: '1', name: 'Remote Update' }
    })

    expect(begin).toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith({
      type: 'update',
      value: { id: '1', name: 'Remote Update' }
    })
    expect(commit).toHaveBeenCalled()
  })
})
