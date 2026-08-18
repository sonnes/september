import { getDesktopSetting, isDesktopRuntime, putDesktopSetting } from '@/packages/shared/lib/data';

export const AUDIO_OUTPUT_STORAGE_KEY = 'september:audio-output-device';
const DESKTOP_AUDIO_OUTPUT_KEY = 'audio-output-device';

export async function readAudioOutputDevice(): Promise<string | null> {
  if (isDesktopRuntime()) {
    const value = await getDesktopSetting<unknown>(DESKTOP_AUDIO_OUTPUT_KEY);
    return typeof value === 'string' && value ? value : null;
  }
  return localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY) || null;
}

export async function writeAudioOutputDevice(id: string): Promise<void> {
  if (isDesktopRuntime()) {
    await putDesktopSetting(DESKTOP_AUDIO_OUTPUT_KEY, id);
    return;
  }
  localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, id);
}
