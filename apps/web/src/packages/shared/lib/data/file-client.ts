import { invoke } from '@tauri-apps/api/core';

export interface DesktopFileMetadata {
  id: string;
  kind: string;
  mediaType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

export function writeDesktopFile(
  bytes: Uint8Array,
  mediaType = 'application/octet-stream',
  kind = 'attachment'
): Promise<DesktopFileMetadata> {
  return invoke('file_write', bytes, {
    headers: {
      'content-type': mediaType,
      'x-september-file-kind': kind,
    },
  });
}

export function getDesktopFile(id: string): Promise<DesktopFileMetadata | null> {
  return invoke('file_get', { request: { id } });
}

export async function readDesktopFile(id: string): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer | Uint8Array | number[]>('file_read', {
    request: { id },
  });
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export function deleteDesktopFile(id: string): Promise<boolean> {
  return invoke('file_delete', { request: { id } });
}

export function listDesktopFiles(kind?: string): Promise<DesktopFileMetadata[]> {
  return invoke('file_list', { request: { kind: kind ?? null } });
}

export function exportDesktopFile(
  bytes: Uint8Array,
  suggestedName: string,
  mediaType = 'application/octet-stream'
): Promise<boolean> {
  return invoke('file_export', bytes, {
    headers: {
      'content-type': mediaType,
      'x-september-suggested-name': suggestedName,
    },
  });
}
