import { invoke } from '@tauri-apps/api/core';

import { notifyCollectionChanged } from './query';

type DesktopRecordWriteListener = (collection: string) => void;
const writeListeners = new Set<DesktopRecordWriteListener>();

export function subscribeDesktopRecordWrites(listener: DesktopRecordWriteListener): () => void {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

function notifyWritten(collection: string): void {
  notifyCollectionChanged(collection);
  writeListeners.forEach(listener => listener(collection));
}

export interface DesktopRecord<T = unknown> {
  collection: string;
  id: string;
  data: T | null;
  version: string | null;
  updatedAt: number;
  deleted: boolean;
  sequence: number;
}

function liveData<T>(record: DesktopRecord<T> | null): T | null {
  if (!record || record.deleted || record.data === null) return null;
  return record.data;
}

export async function listDesktopRecords<T>(collection: string): Promise<T[]> {
  const records = await invoke<Array<DesktopRecord<T>>>('record_list', {
    request: { collection, includeDeleted: false },
  });
  return records.flatMap(record => {
    const data = liveData(record);
    return data === null ? [] : [data];
  });
}

export async function getDesktopRecord<T>(collection: string, id: string): Promise<T | null> {
  const record = await invoke<DesktopRecord<T> | null>('record_get', {
    request: { collection, id, includeDeleted: false },
  });
  return liveData(record);
}

export async function putDesktopRecord<T>(
  collection: string,
  id: string,
  data: T,
  updatedAt = Date.now(),
  version: string | null = null
): Promise<T> {
  const record = await invoke<DesktopRecord<T>>('record_put', {
    request: { collection, id, data, version, updatedAt },
  });
  const stored = liveData(record);
  if (stored === null)
    throw new Error(`Rust returned a deleted record after writing ${collection}:${id}`);
  notifyWritten(collection);
  return stored;
}

export async function deleteDesktopRecord(
  collection: string,
  id: string,
  updatedAt = Date.now(),
  version: string | null = null
): Promise<void> {
  await invoke<DesktopRecord>('record_delete', {
    request: { collection, id, version, updatedAt },
  });
  notifyWritten(collection);
}
