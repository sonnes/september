import { getDesktopRecord, listDesktopRecords } from './record-client';
import { isDesktopRuntime } from './runtime';

export interface ReadableBrowserCollection<T> {
  preload: () => Promise<void>;
  get: (id: string) => T | undefined;
  readonly toArray: T[];
}

interface ParseSchema<T> {
  parse: (value: unknown) => T;
}

export async function listLocalRecords<T>(
  collection: string,
  browserCollection: ReadableBrowserCollection<T>,
  schema: ParseSchema<T>
): Promise<T[]> {
  if (isDesktopRuntime()) {
    const rows = await listDesktopRecords(collection);
    return rows.map(row => schema.parse(row));
  }
  await browserCollection.preload();
  return browserCollection.toArray.map(row => schema.parse(row));
}

export async function getLocalRecord<T>(
  collection: string,
  id: string,
  browserCollection: ReadableBrowserCollection<T>,
  schema: ParseSchema<T>
): Promise<T | null> {
  if (isDesktopRuntime()) {
    const row = await getDesktopRecord(collection, id);
    return row === null ? null : schema.parse(row);
  }
  await browserCollection.preload();
  const row = browserCollection.get(id);
  return row === undefined ? null : schema.parse(row);
}
