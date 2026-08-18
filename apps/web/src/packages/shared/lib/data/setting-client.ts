import { invoke } from '@tauri-apps/api/core';

export function getDesktopSetting<T>(key: string): Promise<T | null> {
  return invoke('setting_get', { request: { key } });
}

export function putDesktopSetting<T>(key: string, value: T): Promise<T> {
  return invoke('setting_put', { request: { key, value } });
}

export function deleteDesktopSetting(key: string): Promise<boolean> {
  return invoke('setting_delete', { request: { key } });
}
