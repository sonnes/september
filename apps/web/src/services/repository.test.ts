import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DATABASE_NAME,
  LEGACY_DATABASES,
  openRepository,
  type AnalyticsEvent,
  type Message,
  type Note,
  type SavedPhrase,
  type Space,
} from './repository';

async function rowsFromStore<T>(storeName: string): Promise<T[]> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const transaction = database.transaction(storeName, 'readonly');
  const rows = await new Promise<T[]>((resolve, reject) => {
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return rows;
}

async function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function deleteDatabase(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`database ${name} is blocked`));
  });
}

async function clearDatabases(): Promise<void> {
  const databases = await indexedDB.databases();
  await Promise.all(databases.flatMap(database => (database.name ? [deleteDatabase(database.name)] : [])));
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function space(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    user_id: 'local-user',
    title: 'General',
    context: 'At home',
    phrases_synced_count: 0,
    created_at: 10,
    updated_at: 20,
    ...overrides,
  };
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    space_id: 'space-1',
    user_id: 'local-user',
    text: 'Hello',
    type: 'user',
    created_at: 30,
    ...overrides,
  };
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    space_id: 'space-1',
    name: 'Greeting',
    content: 'Hello there',
    created_at: 40,
    updated_at: 50,
    ...overrides,
  };
}

function phrase(overrides: Partial<SavedPhrase> = {}): SavedPhrase {
  return {
    id: 'phrase-1',
    space_id: 'space-1',
    text: 'How are you?',
    kind: 'phrase',
    pinned: true,
    created_at: 60,
    updated_at: 60,
    ...overrides,
  };
}

function analytics(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    id: 'event-1',
    user_id: 'local-user',
    event_type: 'message_sent',
    timestamp: 70,
    data: { text_length: 5, keys_typed: 2 },
    ...overrides,
  };
}

beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  await clearDatabases();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await clearDatabases();
});

describe('BrowserRepository', () => {
  it('adds blob stores to an existing version-one database without losing rows', async () => {
    const versionOne = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('settings', { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = versionOne.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put({ key: 'lastPath', value: '/dashboard' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    versionOne.close();

    const repository = await openRepository({ migrate: false });

    expect(await repository.getSetting('lastPath')).toBe('/dashboard');
    await repository.putBlob('speech-1', new Blob(['audio']));
    expect(await repository.getBlob('speech-1')).not.toBeNull();
    repository.close();
  });

  it('stores the desktop row model and patches a space without losing other fields', async () => {
    const repository = await openRepository({ migrate: false });

    await repository.putSetting('lastPath', '/spaces');
    await repository.putSpace(space());
    await repository.patchSpace({ id: 'space-1', title: 'Home', updated_at: 80 });
    await repository.putMessage(message());
    await repository.putNote(note());
    await repository.putPhrase(phrase());
    await repository.putAnalyticsEvent(analytics());

    expect(await repository.getSetting('/missing')).toBeNull();
    expect(await repository.getSetting('lastPath')).toBe('/spaces');
    expect(await repository.listSpaces('local-user')).toEqual([
      space({ title: 'Home', updated_at: 80 }),
    ]);
    expect(await repository.listMessages('space-1')).toEqual([message()]);
    expect(await repository.listNotes('space-1')).toEqual([note()]);
    expect(await repository.listPhrases('space-1')).toEqual([phrase()]);
    expect(await repository.listAnalyticsEvents('local-user', 0, 100)).toEqual([analytics()]);

    repository.close();
  });

  it('deletes a space and all of its child rows in one operation', async () => {
    const repository = await openRepository({ migrate: false });
    await repository.putSpace(space());
    await repository.putMessage(message());
    await repository.putNote(note());
    await repository.putPhrase(phrase());
    await repository.putNote(note({ id: 'unscoped', space_id: undefined }));

    expect(await repository.deleteSpace('space-1')).toBe(true);
    expect(await repository.listSpaces('local-user')).toEqual([]);
    expect(await repository.listMessages('space-1')).toEqual([]);
    expect(await repository.listNotes('space-1')).toEqual([]);
    expect(await repository.listPhrases('space-1')).toEqual([]);
    expect(await repository.getNote('unscoped')).toEqual(note({ id: 'unscoped', space_id: undefined }));

    repository.close();
  });

  it('replaces only unpinned AI phrases', async () => {
    const repository = await openRepository({ migrate: false });
    await repository.putPhrase(phrase());
    await repository.putPhrase(phrase({ id: 'old-ai', text: 'Old', pinned: false }));

    await repository.replaceAiPhrases('space-1', [
      phrase({ id: 'new-ai', text: 'New', pinned: false, created_at: 90, updated_at: 90 }),
    ]);

    expect((await repository.listPhrases('space-1')).map(row => row.id)).toEqual([
      'phrase-1',
      'new-ai',
    ]);
    repository.close();
  });

  it('stores a blob as ordered chunks and reconstructs the original file', async () => {
    const repository = await openRepository({ migrate: false });
    const file = new Blob(['abcdefgh'], { type: 'audio/mpeg' });

    expect(
      await repository.putBlob('speech-1', file, {
        maxBytes: 64,
        chunkBytes: 3,
        accessedAt: 10,
      })
    ).toBe(true);

    const chunks = await rowsFromStore<{ data: ArrayBuffer }>('blob_chunks');
    expect(chunks.map(chunk => chunk.data.byteLength)).toEqual([3, 3, 2]);
    const restored = await repository.getBlob('speech-1', 20);
    expect(restored?.type).toBe('audio/mpeg');
    expect(restored && (await blobText(restored))).toBe('abcdefgh');
    expect(await repository.getBlobCacheSize()).toBe(8);

    repository.close();
  });

  it('evicts the least recently used files before the blob cache exceeds its byte limit', async () => {
    const repository = await openRepository({ migrate: false });
    const options = { maxBytes: 8, chunkBytes: 2 };

    await repository.putBlob('oldest', new Blob(['aaaa']), { ...options, accessedAt: 1 });
    await repository.putBlob('newer', new Blob(['bbbb']), { ...options, accessedAt: 2 });
    expect(await repository.getBlob('oldest', 3)).not.toBeNull();

    await repository.putBlob('incoming', new Blob(['cccc']), { ...options, accessedAt: 4 });

    expect(await repository.getBlob('newer', 5)).toBeNull();
    expect(await repository.getBlob('oldest', 5)).not.toBeNull();
    expect(await repository.getBlob('incoming', 5)).not.toBeNull();
    expect(await repository.getBlobCacheSize()).toBe(8);
    expect(
      await repository.putBlob('too-large', new Blob(['123456789']), {
        ...options,
        accessedAt: 6,
      })
    ).toBe(false);
    expect(await repository.getBlobCacheSize()).toBe(8);

    repository.close();
  });
});

async function putLegacyRows(
  databaseName: string,
  collection: string,
  rows: Array<{ id: string; value: unknown }>,
  storeName = 'kv-store'
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    for (const row of rows) {
      store.put({ versionKey: `version-${row.id}`, data: row.value }, [collection, `s:${row.id}`]);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function createDerivedDatabase(name: string, storeName: string): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
}

describe('legacy migration', () => {
  it('imports user data once, converts dates, and drops every old database', async () => {
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    const updatedAt = new Date('2026-08-02T00:00:00.000Z');

    await putLegacyRows('app-user-account', 'user-account', [
      {
        id: 'local-user',
        value: {
          id: 'local-user',
          name: 'Ravi',
          context: 'Use short sentences.',
          setup_mode: 'advanced',
          onboarding_completed: true,
          ai_suggestions: { enabled: true, provider: 'openrouter', model: 'model/free' },
          ai_speech: {
            enabled: true,
            provider: 'elevenlabs',
            voice_id: 'voice-1',
            model_id: 'eleven_turbo_v2_5',
            settings: { speed: 1.1, stability: 0.4, similarity: 0.7 },
          },
          ai_providers: {
            openrouter: { api_key: 'openrouter-key' },
            elevenlabs: { api_key: 'elevenlabs-key' },
          },
          created_at: createdAt,
          updated_at: updatedAt,
        },
      },
    ]);
    await putLegacyRows('app-spaces', 'spaces', [
      { id: 'space-1', value: space({ created_at: createdAt as unknown as number, updated_at: updatedAt as unknown as number }) },
    ]);
    await putLegacyRows('app-messages', 'messages', [
      { id: 'message-1', value: message({ created_at: updatedAt as unknown as number }) },
    ]);
    await putLegacyRows('app-documents', 'documents', [
      { id: 'note-1', value: note({ created_at: createdAt as unknown as number, updated_at: updatedAt as unknown as number }) },
    ]);
    await putLegacyRows('app-saved-phrases', 'saved-phrases', [
      {
        id: 'phrase-1',
        value: {
          id: 'phrase-1',
          space_id: 'space-1',
          user_id: 'local-user',
          text: 'How are you?',
          pinned: true,
          created_at: createdAt,
        },
      },
    ]);
    await putLegacyRows(
      'analytics',
      'analytics-events',
      [{ id: 'event-1', value: analytics({ timestamp: updatedAt as unknown as number }) }],
      'analytics_events'
    );
    await createDerivedDatabase('september-autocomplete', 'kv-store');
    await createDerivedDatabase('september-audio', 'audio-files');
    localStorage.setItem(
      'september:chat-panel',
      JSON.stringify({ state: 'expanded', activeTab: 'phrases' })
    );
    localStorage.setItem('september:mined-dismissed', JSON.stringify(['not now']));
    localStorage.setItem('september:audio-output-device', 'speaker-1');
    localStorage.setItem('september:space-mode:general', 'notes');

    const repository = await openRepository();

    expect(await repository.getSetting('setup')).toMatchObject({
      id: 'local-user',
      name: 'Ravi',
      mode: 'advanced',
      personalWords: 'Use short sentences.',
      writingService: 'openrouter',
      writingModel: 'model/free',
      voiceService: 'elevenlabs',
    });
    expect(await repository.getSetting('provider-keys')).toEqual({
      openrouter: 'openrouter-key',
      elevenlabs: 'elevenlabs-key',
    });
    expect(await repository.getSetting('speech')).toEqual({
      provider: 'elevenlabs',
      voiceId: 'voice-1',
      modelId: 'eleven_turbo_v2_5',
      stability: 0.4,
      similarity: 0.7,
      speed: 1.1,
    });
    expect(await repository.getSetting('panel-open')).toEqual({
      open: true,
      tab: 'phrases',
    });
    expect(await repository.getSetting('dismissed-ideas')).toEqual(['not now']);
    expect(await repository.getSetting('audio-output')).toBe('speaker-1');
    expect(await repository.getSetting('space-modes')).toEqual({ general: 'notes' });
    expect(await repository.getSetting('legacy-migration')).toBe('clean');
    expect(await repository.listSpaces('local-user')).toEqual([
      space({ created_at: createdAt.getTime(), updated_at: updatedAt.getTime() }),
    ]);
    expect(await repository.listPhrases('space-1')).toEqual([
      phrase({ created_at: createdAt.getTime(), updated_at: createdAt.getTime() }),
    ]);
    expect(await repository.listAnalyticsEvents('local-user', 0, Date.now())).toEqual([
      analytics({ timestamp: updatedAt.getTime() }),
    ]);

    const databaseNames = (await indexedDB.databases()).flatMap(database =>
      database.name ? [database.name] : []
    );
    expect(databaseNames).toContain('september');
    expect(databaseNames).not.toEqual(expect.arrayContaining([...LEGACY_DATABASES]));
    expect(localStorage.getItem('september:chat-panel')).toBeNull();
    expect(localStorage.getItem('september:mined-dismissed')).toBeNull();
    expect(localStorage.getItem('september:audio-output-device')).toBeNull();
    expect(localStorage.getItem('september:space-mode:general')).toBeNull();

    repository.close();
  });

  it('retries cleanup when the browser denies local-storage access', async () => {
    const denied = {
      get length() {
        throw new Error('storage is denied');
      },
      clear: () => undefined,
      getItem: () => {
        throw new Error('storage is denied');
      },
      key: () => null,
      removeItem: () => {
        throw new Error('storage is denied');
      },
      setItem: () => {
        throw new Error('storage is denied');
      },
    } as Storage;
    vi.stubGlobal('localStorage', denied);

    const interrupted = await openRepository();
    expect(await interrupted.getSetting('legacy-migration')).toBe('imported');
    interrupted.close();

    vi.stubGlobal('localStorage', memoryStorage());
    const retried = await openRepository();
    expect(await retried.getSetting('legacy-migration')).toBe('clean');
    retried.close();
  });
});
