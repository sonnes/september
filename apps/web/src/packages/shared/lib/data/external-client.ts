import { invoke } from '@tauri-apps/api/core';

export function openDesktopExternalUrl(url: string): Promise<void> {
  return invoke('open_external', { request: { url } });
}
