import { KVStore } from '@september/shared/lib/indexeddb/kv-store';
import { Alignment } from '@september/audio/types';

interface StoredAudioItem {
  blob: ArrayBuffer;
  contentType: string;
  metadata: Record<string, unknown>;
  created_at: string;
  name: string;
}

const kvStore = typeof indexedDB !== 'undefined'
  ? new KVStore<StoredAudioItem>({ dbName: 'september-audio', storeName: 'audio-files' })
  : null;

export class AudioService {
  async uploadAudio({
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

    const binary = atob(blob);
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

  async downloadAudio(path: string): Promise<Blob> {
    if (!kvStore) return new Blob();

    const item = await kvStore.get(path);
    if (!item) throw new Error(`Audio not found: ${path}`);
    return new Blob([item.blob], { type: item.contentType });
  }

  async deleteAudio(path: string): Promise<void> {
    if (!kvStore) return;
    await kvStore.delete(path);
  }

  async listAudio(prefix: string): Promise<Array<{ name: string; created_at: string; metadata: Record<string, unknown> }>> {
    if (!kvStore) return [];

    const results: Array<{ name: string; created_at: string; metadata: Record<string, unknown> }> = [];
    for await (const [key, item] of kvStore.scan(prefix)) {
      results.push({
        name: item.name,
        created_at: item.created_at,
        metadata: item.metadata,
      });
    }
    return results;
  }
}
