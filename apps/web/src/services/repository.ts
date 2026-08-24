import type { UsageEventType } from '@/rules/usage-summary';

export const DATABASE_NAME = 'september';
const DATABASE_VERSION = 2;

export const DEFAULT_BLOB_CACHE_BYTES = 100 * 1024 * 1024;
export const DEFAULT_BLOB_CHUNK_BYTES = 1024 * 1024;

export const LEGACY_DATABASES = [
  'app-user-account',
  'app-spaces',
  'app-messages',
  'app-documents',
  'app-saved-phrases',
  'analytics',
  'september-autocomplete',
  'september-audio',
] as const;

const STORES = {
  settings: 'settings',
  spaces: 'spaces',
  messages: 'messages',
  notes: 'notes',
  phrases: 'saved_phrases',
  analytics: 'analytics_events',
  blobs: 'blobs',
  blobChunks: 'blob_chunks',
} as const;

export interface Space {
  id: string;
  user_id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  created_at: number;
  updated_at: number;
}

export interface SpacePatch {
  id: string;
  title?: string;
  context?: string;
  phrases_synced_count?: number;
  updated_at: number;
}

export interface Message {
  id: string;
  space_id?: string;
  user_id: string;
  text: string;
  type: string;
  audio_path?: string;
  created_at: number;
}

export interface Note {
  id: string;
  space_id?: string;
  name?: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface SavedPhrase {
  id: string;
  space_id: string;
  text: string;
  kind: 'phrase' | 'starter';
  code?: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  /** One list, in `@september/core/rules/usage-summary`, read by both apps. */
  event_type: UsageEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

interface SettingRow {
  key: string;
  value: unknown;
}

interface BlobRow {
  id: string;
  type: string;
  size: number;
  chunk_count: number;
  created_at: number;
  accessed_at: number;
}

interface BlobChunkRow {
  blob_id: string;
  index: number;
  size: number;
  data: ArrayBuffer;
}

export interface PutBlobOptions {
  maxBytes?: number;
  chunkBytes?: number;
  accessedAt?: number;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

async function blobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('Could not read blob bytes'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob bytes'));
    reader.readAsArrayBuffer(blob);
  });
}

function createSchema(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(STORES.settings)) {
    database.createObjectStore(STORES.settings, { keyPath: 'key' });
  }

  if (!database.objectStoreNames.contains(STORES.spaces)) {
    const store = database.createObjectStore(STORES.spaces, { keyPath: 'id' });
    store.createIndex('user_id', 'user_id');
    store.createIndex('updated_at', 'updated_at');
  }

  if (!database.objectStoreNames.contains(STORES.messages)) {
    const store = database.createObjectStore(STORES.messages, { keyPath: 'id' });
    store.createIndex('space_id', 'space_id');
    store.createIndex('created_at', 'created_at');
  }

  if (!database.objectStoreNames.contains(STORES.notes)) {
    const store = database.createObjectStore(STORES.notes, { keyPath: 'id' });
    store.createIndex('space_id', 'space_id');
    store.createIndex('updated_at', 'updated_at');
  }

  if (!database.objectStoreNames.contains(STORES.phrases)) {
    const store = database.createObjectStore(STORES.phrases, { keyPath: 'id' });
    store.createIndex('space_id', 'space_id');
    store.createIndex('created_at', 'created_at');
  }

  if (!database.objectStoreNames.contains(STORES.analytics)) {
    const store = database.createObjectStore(STORES.analytics, { keyPath: 'id' });
    store.createIndex('timestamp', 'timestamp');
    store.createIndex('user_timestamp', ['user_id', 'timestamp']);
  }

  if (!database.objectStoreNames.contains(STORES.blobs)) {
    const store = database.createObjectStore(STORES.blobs, { keyPath: 'id' });
    store.createIndex('accessed_at', 'accessed_at');
  }

  if (!database.objectStoreNames.contains(STORES.blobChunks)) {
    const store = database.createObjectStore(STORES.blobChunks, {
      keyPath: ['blob_id', 'index'],
    });
    store.createIndex('blob_id', 'blob_id');
  }
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => createSchema(request.result);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'));
    request.onblocked = () => reject(new Error('September is open in another browser tab. Close that tab and try again.'));
  });
}

function newestFirst<T extends { updated_at: number; id: string }>(a: T, b: T): number {
  return b.updated_at - a.updated_at || a.id.localeCompare(b.id);
}

function oldestFirst<T extends { created_at: number; id: string }>(a: T, b: T): number {
  return a.created_at - b.created_at || a.id.localeCompare(b.id);
}

export class BrowserRepository {
  constructor(private readonly database: IDBDatabase) {}

  close(): void {
    this.database.close();
  }

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const transaction = this.database.transaction(STORES.settings, 'readonly');
    const row = await requestResult<SettingRow | undefined>(
      transaction.objectStore(STORES.settings).get(key)
    );
    return (row?.value as T | undefined) ?? null;
  }

  async putSetting(key: string, value: unknown): Promise<void> {
    const transaction = this.database.transaction(STORES.settings, 'readwrite');
    transaction.objectStore(STORES.settings).put({ key, value } satisfies SettingRow);
    await transactionDone(transaction);
  }

  async getBlob(id: string, accessedAt = Date.now()): Promise<Blob | null> {
    const transaction = this.database.transaction(
      [STORES.blobs, STORES.blobChunks],
      'readwrite'
    );
    const done = transactionDone(transaction);
    const blobs = transaction.objectStore(STORES.blobs);
    const chunks = transaction.objectStore(STORES.blobChunks);
    const row = await requestResult<BlobRow | undefined>(blobs.get(id));
    if (!row) {
      await done;
      return null;
    }

    const held = await requestResult<BlobChunkRow[]>(chunks.index('blob_id').getAll(id));
    held.sort((a, b) => a.index - b.index);
    const complete =
      held.length === row.chunk_count &&
      held.every((chunk, index) => chunk.index === index && chunk.size === chunk.data.byteLength);
    const restored = complete ? new Blob(held.map(chunk => chunk.data), { type: row.type }) : null;

    if (!restored || restored.size !== row.size) {
      blobs.delete(id);
      for (const chunk of held) chunks.delete([chunk.blob_id, chunk.index]);
      await done;
      return null;
    }

    blobs.put({ ...row, accessed_at: accessedAt } satisfies BlobRow);
    await done;
    return restored;
  }

  async putBlob(id: string, blob: Blob, options: PutBlobOptions = {}): Promise<boolean> {
    if (!id) throw new Error('a blob ID is required');
    const maxBytes = options.maxBytes ?? DEFAULT_BLOB_CACHE_BYTES;
    const chunkBytes = options.chunkBytes ?? DEFAULT_BLOB_CHUNK_BYTES;
    const accessedAt = options.accessedAt ?? Date.now();
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      throw new Error('the blob cache byte limit must be a non-negative integer');
    }
    if (!Number.isSafeInteger(chunkBytes) || chunkBytes <= 0) {
      throw new Error('the blob chunk size must be a positive integer');
    }
    if (blob.size > maxBytes) {
      await this.deleteBlob(id);
      return false;
    }

    const contents = await blobArrayBuffer(blob);
    const parts: ArrayBuffer[] = [];
    for (let offset = 0; offset < contents.byteLength; offset += chunkBytes) {
      parts.push(contents.slice(offset, offset + chunkBytes));
    }

    const transaction = this.database.transaction(
      [STORES.blobs, STORES.blobChunks],
      'readwrite'
    );
    const done = transactionDone(transaction);
    const blobs = transaction.objectStore(STORES.blobs);
    const chunks = transaction.objectStore(STORES.blobChunks);
    const held = await requestResult<BlobRow[]>(blobs.getAll());
    const existing = held.find(row => row.id === id);
    const victims = held
      .filter(row => row.id !== id)
      .sort((a, b) => a.accessed_at - b.accessed_at || a.id.localeCompare(b.id));
    let heldBytes = held.reduce((total, row) => total + (row.id === id ? 0 : row.size), 0);
    const removedIds = [id];
    while (heldBytes + blob.size > maxBytes) {
      const victim = victims.shift();
      if (!victim) break;
      heldBytes -= victim.size;
      removedIds.push(victim.id);
    }

    for (const removedId of removedIds) {
      blobs.delete(removedId);
      const keys = await requestResult<IDBValidKey[]>(
        chunks.index('blob_id').getAllKeys(removedId)
      );
      for (const key of keys) chunks.delete(key);
    }

    blobs.put({
      id,
      type: blob.type,
      size: blob.size,
      chunk_count: parts.length,
      created_at: existing?.created_at ?? accessedAt,
      accessed_at: accessedAt,
    } satisfies BlobRow);
    parts.forEach((data, index) => {
      chunks.put({ blob_id: id, index, size: data.byteLength, data } satisfies BlobChunkRow);
    });
    await done;
    return true;
  }

  async deleteBlob(id: string): Promise<boolean> {
    const transaction = this.database.transaction(
      [STORES.blobs, STORES.blobChunks],
      'readwrite'
    );
    const done = transactionDone(transaction);
    const blobs = transaction.objectStore(STORES.blobs);
    const chunks = transaction.objectStore(STORES.blobChunks);
    const found = (await requestResult<BlobRow | undefined>(blobs.get(id))) !== undefined;
    blobs.delete(id);
    const keys = await requestResult<IDBValidKey[]>(chunks.index('blob_id').getAllKeys(id));
    for (const key of keys) chunks.delete(key);
    await done;
    return found;
  }

  async getBlobCacheSize(): Promise<number> {
    const transaction = this.database.transaction(STORES.blobs, 'readonly');
    const rows = await requestResult<BlobRow[]>(transaction.objectStore(STORES.blobs).getAll());
    return rows.reduce((total, row) => total + row.size, 0);
  }

  async listSpaces(userId: string): Promise<Space[]> {
    const transaction = this.database.transaction(STORES.spaces, 'readonly');
    const rows = await requestResult<Space[]>(
      transaction.objectStore(STORES.spaces).index('user_id').getAll(userId)
    );
    return rows.sort(newestFirst);
  }

  async getSpace(id: string): Promise<Space | null> {
    const transaction = this.database.transaction(STORES.spaces, 'readonly');
    return (
      (await requestResult<Space | undefined>(transaction.objectStore(STORES.spaces).get(id))) ?? null
    );
  }

  async putSpace(space: Space): Promise<Space> {
    const transaction = this.database.transaction(STORES.spaces, 'readwrite');
    transaction.objectStore(STORES.spaces).put(space);
    await transactionDone(transaction);
    return space;
  }

  async patchSpace(patch: SpacePatch): Promise<Space> {
    const transaction = this.database.transaction(STORES.spaces, 'readwrite');
    const store = transaction.objectStore(STORES.spaces);
    const held = await requestResult<Space | undefined>(store.get(patch.id));
    if (!held) {
      transaction.abort();
      throw new Error(`no space holds the ID ${patch.id}`);
    }
    const updated: Space = {
      ...held,
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.context === undefined ? {} : { context: patch.context }),
      ...(patch.phrases_synced_count === undefined
        ? {}
        : { phrases_synced_count: patch.phrases_synced_count }),
      updated_at: patch.updated_at,
    };
    store.put(updated);
    await transactionDone(transaction);
    return updated;
  }

  async deleteSpace(id: string): Promise<boolean> {
    const storeNames = [STORES.spaces, STORES.messages, STORES.notes, STORES.phrases];
    const transaction = this.database.transaction(storeNames, 'readwrite');
    const spaces = transaction.objectStore(STORES.spaces);
    const found = (await requestResult<Space | undefined>(spaces.get(id))) !== undefined;
    if (!found) return false;

    spaces.delete(id);
    for (const storeName of [STORES.messages, STORES.notes, STORES.phrases] as const) {
      const store = transaction.objectStore(storeName);
      const childIds = await requestResult<IDBValidKey[]>(store.index('space_id').getAllKeys(id));
      for (const childId of childIds) store.delete(childId);
    }
    await transactionDone(transaction);
    return true;
  }

  async listMessages(spaceId?: string): Promise<Message[]> {
    const transaction = this.database.transaction(STORES.messages, 'readonly');
    const store = transaction.objectStore(STORES.messages);
    const rows = await requestResult<Message[]>(
      spaceId === undefined ? store.getAll() : store.index('space_id').getAll(spaceId)
    );
    return rows.sort(oldestFirst);
  }

  async putMessage(message: Message): Promise<Message> {
    const transaction = this.database.transaction([STORES.messages, STORES.spaces], 'readwrite');
    transaction.objectStore(STORES.messages).put(message);
    if (message.space_id) {
      const spaces = transaction.objectStore(STORES.spaces);
      const held = await requestResult<Space | undefined>(spaces.get(message.space_id));
      if (held) spaces.put({ ...held, updated_at: Math.max(held.updated_at, message.created_at) });
    }
    await transactionDone(transaction);
    return message;
  }

  async listNotes(spaceId?: string): Promise<Note[]> {
    const transaction = this.database.transaction(STORES.notes, 'readonly');
    const store = transaction.objectStore(STORES.notes);
    const rows = await requestResult<Note[]>(
      spaceId === undefined ? store.getAll() : store.index('space_id').getAll(spaceId)
    );
    return rows.sort(newestFirst);
  }

  async getNote(id: string): Promise<Note | null> {
    const transaction = this.database.transaction(STORES.notes, 'readonly');
    return (
      (await requestResult<Note | undefined>(transaction.objectStore(STORES.notes).get(id))) ?? null
    );
  }

  async putNote(note: Note): Promise<Note> {
    const transaction = this.database.transaction(STORES.notes, 'readwrite');
    transaction.objectStore(STORES.notes).put(note);
    await transactionDone(transaction);
    return note;
  }

  async deleteNote(id: string): Promise<boolean> {
    const transaction = this.database.transaction(STORES.notes, 'readwrite');
    const store = transaction.objectStore(STORES.notes);
    const found = (await requestResult<Note | undefined>(store.get(id))) !== undefined;
    if (found) store.delete(id);
    await transactionDone(transaction);
    return found;
  }

  async listPhrases(spaceId?: string): Promise<SavedPhrase[]> {
    const transaction = this.database.transaction(STORES.phrases, 'readonly');
    const store = transaction.objectStore(STORES.phrases);
    const rows = await requestResult<SavedPhrase[]>(
      spaceId === undefined ? store.getAll() : store.index('space_id').getAll(spaceId)
    );
    return rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || oldestFirst(a, b));
  }

  async putPhrase(phrase: SavedPhrase): Promise<SavedPhrase> {
    const transaction = this.database.transaction(STORES.phrases, 'readwrite');
    transaction.objectStore(STORES.phrases).put(phrase);
    await transactionDone(transaction);
    return phrase;
  }

  async deletePhrase(id: string): Promise<boolean> {
    const transaction = this.database.transaction(STORES.phrases, 'readwrite');
    const store = transaction.objectStore(STORES.phrases);
    const found = (await requestResult<SavedPhrase | undefined>(store.get(id))) !== undefined;
    if (found) store.delete(id);
    await transactionDone(transaction);
    return found;
  }

  async replaceAiPhrases(spaceId: string, phrases: SavedPhrase[]): Promise<SavedPhrase[]> {
    if (phrases.some(phrase => phrase.pinned || phrase.space_id !== spaceId)) {
      throw new Error('replacement phrases must be unpinned rows of the named space');
    }

    const transaction = this.database.transaction(STORES.phrases, 'readwrite');
    const store = transaction.objectStore(STORES.phrases);
    const held = await requestResult<SavedPhrase[]>(store.index('space_id').getAll(spaceId));
    for (const row of held) {
      if (!row.pinned) store.delete(row.id);
    }
    for (const phrase of phrases) store.put(phrase);
    await transactionDone(transaction);
    return phrases;
  }

  async putAnalyticsEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    const transaction = this.database.transaction(STORES.analytics, 'readwrite');
    transaction.objectStore(STORES.analytics).put(event);
    await transactionDone(transaction);
    return event;
  }

  async listAnalyticsEvents(userId: string, startAt: number, endAt: number): Promise<AnalyticsEvent[]> {
    const transaction = this.database.transaction(STORES.analytics, 'readonly');
    const range = IDBKeyRange.bound([userId, startAt], [userId, endAt]);
    const rows = await requestResult<AnalyticsEvent[]>(
      transaction.objectStore(STORES.analytics).index('user_timestamp').getAll(range)
    );
    return rows.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  }

  async deleteAnalyticsEventsBefore(cutoff: number): Promise<number> {
    const transaction = this.database.transaction(STORES.analytics, 'readwrite');
    const store = transaction.objectStore(STORES.analytics);
    const ids = await requestResult<IDBValidKey[]>(
      store.index('timestamp').getAllKeys(IDBKeyRange.upperBound(cutoff, true))
    );
    for (const id of ids) store.delete(id);
    await transactionDone(transaction);
    return ids.length;
  }
}

interface OpenRepositoryOptions {
  migrate?: boolean;
}

export async function openRepository({ migrate = true }: OpenRepositoryOptions = {}): Promise<BrowserRepository> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available');
  const repository = new BrowserRepository(await openDatabase());
  if (migrate) await migrateLegacyData(repository);
  return repository;
}

let sharedRepository: Promise<BrowserRepository> | null = null;

/** The one browser repository used by the running application. */
export function getRepository(): Promise<BrowserRepository> {
  sharedRepository ??= openRepository();
  return sharedRepository;
}

interface LegacyStoredRow<T> {
  versionKey: string;
  data: T;
}

async function existingDatabaseNames(): Promise<Set<string>> {
  if (!indexedDB.databases) return new Set(LEGACY_DATABASES);
  const databases = await indexedDB.databases();
  return new Set(databases.flatMap(database => (database.name ? [database.name] : [])));
}

async function readLegacyRows<T>(
  databaseName: string,
  collection: string,
  storeName = 'kv-store'
): Promise<T[]> {
  const names = await existingDatabaseNames();
  if (!names.has(databaseName)) return [];

  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!database.objectStoreNames.contains(storeName)) {
    database.close();
    return [];
  }

  const transaction = database.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const rows: T[] = [];
  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const key = cursor.key;
      const value = cursor.value as LegacyStoredRow<T>;
      if (Array.isArray(key) && key[0] === collection && value && 'data' in value) rows.push(value.data);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
  database.close();
  return rows;
}

function timestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(String(value)).getTime();
  if (!Number.isFinite(parsed)) throw new Error(`invalid legacy timestamp: ${String(value)}`);
  return parsed;
}

function migratedSpace(row: Record<string, unknown>): Space {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    ...(typeof row.title === 'string' ? { title: row.title } : {}),
    ...(typeof row.context === 'string' ? { context: row.context } : {}),
    ...(typeof row.phrases_synced_count === 'number'
      ? { phrases_synced_count: row.phrases_synced_count }
      : {}),
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

function migratedMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    ...(typeof row.space_id === 'string' ? { space_id: row.space_id } : {}),
    user_id: String(row.user_id),
    text: String(row.text),
    type: String(row.type),
    ...(typeof row.audio_path === 'string' ? { audio_path: row.audio_path } : {}),
    created_at: timestamp(row.created_at),
  };
}

function migratedNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    ...(typeof row.space_id === 'string' ? { space_id: row.space_id } : {}),
    ...(typeof row.name === 'string' ? { name: row.name } : {}),
    content: String(row.content ?? ''),
    created_at: timestamp(row.created_at),
    updated_at: timestamp(row.updated_at),
  };
}

function migratedPhrase(row: Record<string, unknown>): SavedPhrase {
  const createdAt = timestamp(row.created_at);
  return {
    id: String(row.id),
    space_id: String(row.space_id),
    text: String(row.text),
    kind: row.kind === 'starter' ? 'starter' : 'phrase',
    ...(typeof row.code === 'string' ? { code: row.code } : {}),
    pinned: Boolean(row.pinned),
    created_at: createdAt,
    updated_at: row.updated_at === undefined ? createdAt : timestamp(row.updated_at),
  };
}

function migratedAnalytics(row: Record<string, unknown>): AnalyticsEvent {
  const eventType = row.event_type;
  if (
    eventType !== 'message_sent' &&
    eventType !== 'ai_generation' &&
    eventType !== 'tts_generation'
  ) {
    throw new Error(`invalid legacy usage event: ${String(eventType)}`);
  }
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    event_type: eventType,
    timestamp: timestamp(row.timestamp),
    data:
      row.data && typeof row.data === 'object'
        ? (row.data as Record<string, unknown>)
        : {},
  };
}

function setupFromAccount(account: Record<string, unknown>): Record<string, unknown> {
  const suggestions = (account.ai_suggestions ?? {}) as Record<string, unknown>;
  const speech = (account.ai_speech ?? {}) as Record<string, unknown>;
  return {
    id: String(account.id ?? 'local-user'),
    name: String(account.name ?? ''),
    speakingStyle: '',
    personalWords: typeof account.context === 'string' ? account.context : '',
    mode: account.setup_mode === 'advanced' ? 'advanced' : 'free',
    writingService:
      suggestions.enabled === true && suggestions.provider === 'openrouter' ? 'openrouter' : 'none',
    writingModel: typeof suggestions.model === 'string' ? suggestions.model : '',
    voiceService: speech.provider === 'elevenlabs' ? 'elevenlabs' : 'system',
  };
}

function providerKeysFromAccount(account: Record<string, unknown>): Record<string, string> {
  const providers = (account.ai_providers ?? {}) as Record<string, Record<string, unknown>>;
  return Object.fromEntries(
    ['openrouter', 'elevenlabs'].flatMap(provider => {
      const key = providers[provider]?.api_key;
      return typeof key === 'string' && key ? [[provider, key]] : [];
    })
  );
}

function speechFromAccount(account: Record<string, unknown>): Record<string, unknown> {
  const speech = (account.ai_speech ?? {}) as Record<string, unknown>;
  const settings = (speech.settings ?? {}) as Record<string, unknown>;
  const similarity = settings.similarity ?? settings.similarity_boost;
  return {
    provider: speech.enabled === true && speech.provider === 'elevenlabs' ? 'elevenlabs' : 'system',
    voiceId: typeof speech.voice_id === 'string' ? speech.voice_id : null,
    modelId:
      typeof speech.model_id === 'string' ? speech.model_id : 'eleven_turbo_v2_5',
    stability: typeof settings.stability === 'number' ? settings.stability : 0.5,
    similarity: typeof similarity === 'number' ? similarity : 0.75,
    speed: typeof settings.speed === 'number' ? settings.speed : 1,
  };
}

async function deleteLegacyDatabase(name: string): Promise<boolean> {
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  });
}

const LEGACY_STORAGE_KEYS = [
  'september:chat-panel',
  'september:mined-dismissed',
  'september:audio-output-device',
] as const;
const LEGACY_MODE_PREFIX = 'september:space-mode:';

function legacyStorageKeys(): string[] | null {
  if (typeof localStorage === 'undefined') return [];
  const keys: string[] = [...LEGACY_STORAGE_KEYS];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(LEGACY_MODE_PREFIX)) keys.push(key);
    }
  } catch {
    return null;
  }
  return [...new Set<string>(keys)];
}

function storedJson(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

async function importLegacyBrowserSettings(repository: BrowserRepository): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  const panel = storedJson('september:chat-panel');
  if (panel && typeof panel === 'object') {
    const saved = panel as { state?: unknown; open?: unknown; activeTab?: unknown };
    await repository.putSetting('panel-open', {
      open: saved.state === 'expanded' || saved.open === true,
      tab: saved.activeTab === 'voice' ? 'voice' : 'phrases',
    });
  }

  const dismissed = storedJson('september:mined-dismissed');
  if (Array.isArray(dismissed)) {
    await repository.putSetting(
      'dismissed-ideas',
      dismissed.filter((value): value is string => typeof value === 'string')
    );
  }

  try {
    const output = localStorage.getItem('september:audio-output-device');
    if (output) await repository.putSetting('audio-output', output);
  } catch {
    // A browser that denies storage access still completes the row migration.
  }

  const modes: Record<string, 'talk' | 'notes'> = {};
  for (const key of legacyStorageKeys() ?? []) {
    if (!key.startsWith(LEGACY_MODE_PREFIX)) continue;
    try {
      const mode = localStorage.getItem(key);
      if (mode === 'talk' || mode === 'notes') {
        modes[key.slice(LEGACY_MODE_PREFIX.length)] = mode;
      }
    } catch {
      // Keep any modes already read.
    }
  }
  if (Object.keys(modes).length) await repository.putSetting('space-modes', modes);
}

function deleteLegacyBrowserSettings(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const keys = legacyStorageKeys();
    if (keys === null) return false;
    for (const key of keys) localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function cleanupLegacyData(): Promise<boolean> {
  const deleted = await Promise.all(LEGACY_DATABASES.map(deleteLegacyDatabase));
  return deleted.every(Boolean) && deleteLegacyBrowserSettings();
}

async function validateIds<T extends { id: string }>(
  label: string,
  source: T[],
  target: T[]
): Promise<void> {
  const targetIds = new Set(target.map(row => row.id));
  const missing = source.filter(row => !targetIds.has(row.id));
  if (missing.length) throw new Error(`${label} migration lost ${missing.length} rows`);
}

export async function migrateLegacyData(repository: BrowserRepository): Promise<void> {
  const state = await repository.getSetting<string>('legacy-migration');
  if (state === 'clean') return;
  if (state === 'imported') {
    if (await cleanupLegacyData()) await repository.putSetting('legacy-migration', 'clean');
    return;
  }

  await repository.putSetting('legacy-migration', 'copying');
  const [accounts, spaces, messages, notes, phrases, events] = await Promise.all([
    readLegacyRows<Record<string, unknown>>('app-user-account', 'user-account'),
    readLegacyRows<Record<string, unknown>>('app-spaces', 'spaces'),
    readLegacyRows<Record<string, unknown>>('app-messages', 'messages'),
    readLegacyRows<Record<string, unknown>>('app-documents', 'documents'),
    readLegacyRows<Record<string, unknown>>('app-saved-phrases', 'saved-phrases'),
    readLegacyRows<Record<string, unknown>>('analytics', 'analytics-events', 'analytics_events'),
  ]);

  const migratedSpaces = spaces.map(migratedSpace);
  const migratedMessages = messages.map(migratedMessage);
  const migratedNotes = notes.map(migratedNote);
  const migratedPhrases = phrases.map(migratedPhrase);
  const migratedEvents = events.map(migratedAnalytics);

  for (const row of migratedSpaces) await repository.putSpace(row);
  for (const row of migratedMessages) await repository.putMessage(row);
  for (const row of migratedNotes) await repository.putNote(row);
  for (const row of migratedPhrases) await repository.putPhrase(row);
  for (const row of migratedEvents) await repository.putAnalyticsEvent(row);

  const account = accounts[0];
  if (account) {
    await repository.putSetting('setup', setupFromAccount(account));
    await repository.putSetting('provider-keys', providerKeysFromAccount(account));
    await repository.putSetting('speech', speechFromAccount(account));
  }
  await importLegacyBrowserSettings(repository);

  await validateIds('space', migratedSpaces, await repository.listSpaces(account ? String(account.id) : 'local-user'));
  await validateIds('message', migratedMessages, await repository.listMessages());
  await validateIds('note', migratedNotes, await repository.listNotes());
  await validateIds('phrase', migratedPhrases, await repository.listPhrases());
  if (migratedEvents.length) {
    const first = Math.min(...migratedEvents.map(row => row.timestamp));
    const last = Math.max(...migratedEvents.map(row => row.timestamp));
    await validateIds(
      'analytics',
      migratedEvents,
      await repository.listAnalyticsEvents(migratedEvents[0].user_id, first, last)
    );
  }

  await repository.putSetting('legacy-migration', 'imported');
  if (await cleanupLegacyData()) await repository.putSetting('legacy-migration', 'clean');
}
