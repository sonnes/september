import { KVStore } from '@/packages/shared/lib/indexeddb';

import type { Alignment } from './types';

interface StoredAudioItem {
  blob: ArrayBuffer;
  contentType: string;
  metadata: Record<string, unknown>;
  created_at: string;
  name: string;
}

// IndexedDB layout: dbName `september-audio`, storeName `audio-files`
// Must not change without a migration — existing stored audio depends on these keys.
const kvStore =
  typeof indexedDB !== 'undefined'
    ? new KVStore<StoredAudioItem>({ dbName: 'september-audio', storeName: 'audio-files' })
    : null;

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
  if (!kvStore) return path;

  let buffer: ArrayBuffer;
  if (blob instanceof ArrayBuffer) {
    buffer = blob;
  } else if (typeof (blob as Blob).arrayBuffer === 'function') {
    buffer = await (blob as Blob).arrayBuffer();
  } else {
    // Fallback for stripped Blob polyfills (vitest node env uses a BlobImpl with _buffer).
    // In production (browser), Blob always has arrayBuffer().
    const sym = Object.getOwnPropertySymbols(blob as object).find(
      s => s.toString() === 'Symbol(impl)'
    );
    if (sym) {
      const impl = (blob as unknown as Record<symbol, { _buffer?: Uint8Array }>)[sym];
      if (impl._buffer) {
        buffer = impl._buffer.buffer.slice(
          impl._buffer.byteOffset,
          impl._buffer.byteOffset + impl._buffer.byteLength
        ) as ArrayBuffer;
      } else {
        throw new Error('Cannot convert Blob to ArrayBuffer: no arrayBuffer() and no _buffer');
      }
    } else {
      throw new Error('Cannot convert Blob to ArrayBuffer: no arrayBuffer() method');
    }
  }
  const item: StoredAudioItem = {
    blob: buffer,
    contentType,
    metadata,
    created_at: new Date().toISOString(),
    name: path.split('/').pop() || path,
  };

  await kvStore.set(path, item);
  return path;
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
  if (!kvStore) return undefined;

  const base64 = blob.startsWith('data:') ? blob.split(',')[1] : blob;
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }

  const item: StoredAudioItem = {
    blob: buffer,
    contentType,
    metadata: { ...metadata, alignment },
    created_at: new Date().toISOString(),
    name: path.split('/').pop() || path,
  };

  await kvStore.set(path, item);
  return path;
}

export async function downloadAudio(path: string): Promise<Blob> {
  if (!kvStore) return new Blob();

  const item = await kvStore.get(path);
  if (!item) throw new Error(`Audio not found: ${path}`);
  return new Blob([item.blob], { type: item.contentType });
}

export async function getAudio(
  path: string
): Promise<{ blob: Blob; alignment?: Alignment } | null> {
  if (!kvStore) return null;

  const item = await kvStore.get(path);
  if (!item) return null;
  return {
    blob: new Blob([item.blob], { type: item.contentType }),
    alignment: item.metadata?.alignment as Alignment | undefined,
  };
}

export async function deleteAudio(path: string): Promise<void> {
  if (!kvStore) return;
  await kvStore.delete(path);
}

export async function listAudio(
  prefix: string
): Promise<Array<{ name: string; created_at: string; metadata: Record<string, unknown> }>> {
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
