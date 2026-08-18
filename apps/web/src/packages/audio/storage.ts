import {
  deleteDesktopFile,
  deleteDesktopRecord,
  getDesktopFile,
  getDesktopRecord,
  isDesktopRuntime,
  listDesktopRecords,
  putDesktopRecord,
  readDesktopFile,
  writeDesktopFile,
} from '@/packages/shared/lib/data';
import { KVStore } from '@/packages/shared/lib/indexeddb';
import { fetchRemoteBlob, mirrorBlobDelete, mirrorBlobPut } from '@/packages/sync/blob-bridge';

import type { Alignment } from './types';

interface StoredAudioItem {
  blob: ArrayBuffer;
  contentType: string;
  metadata: Record<string, unknown>;
  created_at: string;
  name: string;
}

interface DesktopAudioAlias {
  id: string;
  fileId: string;
  contentType: string;
  metadata: Record<string, unknown>;
  created_at: string;
  name: string;
}

const DESKTOP_ALIAS_COLLECTION = 'audio-file-aliases';

// IndexedDB layout: dbName `september-audio`, storeName `audio-files`
// Must not change without a migration — existing stored audio depends on these keys.
const kvStore =
  !isDesktopRuntime() && typeof indexedDB !== 'undefined'
    ? new KVStore<StoredAudioItem>({ dbName: 'september-audio', storeName: 'audio-files' })
    : null;

async function toArrayBuffer(blob: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (blob instanceof ArrayBuffer) return blob;
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();

  // Fallback for stripped Blob polyfills (vitest node env uses a BlobImpl with _buffer).
  const sym = Object.getOwnPropertySymbols(blob).find(s => s.toString() === 'Symbol(impl)');
  if (sym) {
    const impl = (blob as unknown as Record<symbol, { _buffer?: Uint8Array }>)[sym];
    if (impl._buffer) {
      return impl._buffer.buffer.slice(
        impl._buffer.byteOffset,
        impl._buffer.byteOffset + impl._buffer.byteLength
      ) as ArrayBuffer;
    }
  }
  throw new Error('Cannot convert Blob to ArrayBuffer: no arrayBuffer() method');
}

async function saveDesktopAudio(
  path: string,
  buffer: ArrayBuffer,
  contentType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const previous = await getDesktopAlias(path);
  const file = await writeDesktopFile(new Uint8Array(buffer), contentType, 'audio');
  const createdAt = new Date().toISOString();
  const alias: DesktopAudioAlias = {
    id: path,
    fileId: file.id,
    contentType,
    metadata,
    created_at: createdAt,
    name: path.split('/').pop() || path,
  };
  try {
    await putDesktopRecord(DESKTOP_ALIAS_COLLECTION, path, alias, new Date(createdAt).getTime());
  } catch (error) {
    await deleteDesktopFile(file.id).catch(() => false);
    throw error;
  }
  if (previous && previous.fileId !== file.id) {
    await deleteDesktopFile(previous.fileId);
  }
}

async function getDesktopAlias(path: string): Promise<DesktopAudioAlias | null> {
  return getDesktopRecord<DesktopAudioAlias>(DESKTOP_ALIAS_COLLECTION, path);
}

/**
 * Store a Blob or ArrayBuffer directly — no base64 encoding.
 *
 * Prefer over uploadAudio() for callers with binary data (file uploads,
 * MediaRecorder blobs, fetch responses). uploadAudio() is the legacy path
 * for TTS callers that produce base64 strings.
 */
export async function uploadAudioBinary({
  path,
  blob,
  contentType = 'audio/webm',
  metadata = {},
}: {
  path: string;
  blob: Blob | ArrayBuffer;
  contentType?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const buffer = await toArrayBuffer(blob);
  if (isDesktopRuntime()) {
    await saveDesktopAudio(path, buffer, contentType, metadata);
    void mirrorBlobPut(path, buffer, contentType);
    return path;
  }
  if (!kvStore) return path;

  const item: StoredAudioItem = {
    blob: buffer,
    contentType,
    metadata,
    created_at: new Date().toISOString(),
    name: path.split('/').pop() || path,
  };

  await kvStore.set(path, item);
  void mirrorBlobPut(path, buffer, contentType); // back up to R2 when signed in
  return path;
}

/** Write remote bytes into the local store so subsequent reads are local. */
async function cacheRemote(path: string, data: ArrayBuffer, contentType: string): Promise<void> {
  if (isDesktopRuntime()) {
    await saveDesktopAudio(path, data, contentType, {});
    return;
  }
  if (!kvStore) return;
  await kvStore.set(path, {
    blob: data,
    contentType,
    metadata: {},
    created_at: new Date().toISOString(),
    name: path.split('/').pop() || path,
  });
}

/**
 * Legacy upload path for callers that produce base64 strings (TTS, chats).
 * New callers should use uploadAudioBinary() instead.
 */
export async function uploadAudio({
  path,
  blob,
  alignment,
  contentType = 'audio/mp3',
  metadata = {},
}: {
  path: string;
  blob: string;
  alignment?: Alignment;
  contentType?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | undefined> {
  if (!isDesktopRuntime() && !kvStore) return undefined;

  const base64 = blob.startsWith('data:') ? blob.split(',')[1] : blob;
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }

  return uploadAudioBinary({
    path,
    blob: buffer,
    contentType,
    metadata: { ...metadata, alignment },
  });
}

export async function downloadAudio(path: string): Promise<Blob> {
  if (isDesktopRuntime()) {
    const alias = await getDesktopAlias(path);
    if (alias) {
      const file = await getDesktopFile(alias.fileId);
      if (file) {
        const bytes = await readDesktopFile(alias.fileId);
        return new Blob([new Uint8Array(bytes)], { type: file.mediaType });
      }
    }
  } else if (!kvStore) {
    return new Blob();
  }

  const item = isDesktopRuntime() ? undefined : await kvStore?.get(path);
  if (item) return new Blob([item.blob], { type: item.contentType });

  // Not local (e.g. another device) — pull from R2 and cache.
  const remote = await fetchRemoteBlob(path);
  if (remote) {
    await cacheRemote(path, remote.data, remote.contentType);
    return new Blob([remote.data], { type: remote.contentType });
  }
  throw new Error(`Audio not found: ${path}`);
}

export async function getAudio(
  path: string
): Promise<{ blob: Blob; alignment?: Alignment } | null> {
  if (isDesktopRuntime()) {
    const alias = await getDesktopAlias(path);
    if (alias) {
      const file = await getDesktopFile(alias.fileId);
      if (file) {
        const bytes = await readDesktopFile(alias.fileId);
        return {
          blob: new Blob([new Uint8Array(bytes)], { type: file.mediaType }),
          alignment: alias.metadata.alignment as Alignment | undefined,
        };
      }
    }
  } else if (!kvStore) {
    return null;
  }

  const item = isDesktopRuntime() ? undefined : await kvStore?.get(path);
  if (item) {
    return {
      blob: new Blob([item.blob], { type: item.contentType }),
      alignment: item.metadata?.alignment as Alignment | undefined,
    };
  }

  const remote = await fetchRemoteBlob(path);
  if (remote) {
    await cacheRemote(path, remote.data, remote.contentType);
    return { blob: new Blob([remote.data], { type: remote.contentType }) };
  }
  return null;
}

export async function deleteAudio(path: string): Promise<void> {
  if (isDesktopRuntime()) {
    const alias = await getDesktopAlias(path);
    if (alias) await deleteDesktopFile(alias.fileId);
    await deleteDesktopRecord(DESKTOP_ALIAS_COLLECTION, path);
  } else {
    if (!kvStore) return;
    await kvStore.delete(path);
  }
  void mirrorBlobDelete(path); // remove from R2 when signed in
}

export async function listAudio(
  prefix: string
): Promise<Array<{ name: string; created_at: string; metadata: Record<string, unknown> }>> {
  if (isDesktopRuntime()) {
    const aliases = await listDesktopRecords<DesktopAudioAlias>(DESKTOP_ALIAS_COLLECTION);
    return aliases
      .filter(alias => alias.id.startsWith(prefix))
      .map(alias => ({
        name: alias.name,
        created_at: alias.created_at,
        metadata: alias.metadata,
      }));
  }
  if (!kvStore) return [];

  const results: Array<{ name: string; created_at: string; metadata: Record<string, unknown> }> =
    [];
  for await (const [, item] of kvStore.scan(prefix)) {
    results.push({
      name: item.name,
      created_at: item.created_at,
      metadata: item.metadata,
    });
  }
  return results;
}
