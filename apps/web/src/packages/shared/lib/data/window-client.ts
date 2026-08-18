import { type EventCallback, type UnlistenFn, emitTo, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export interface DesktopAppWindowOptions {
  label: string;
  url: string;
  title: string;
  width: number;
  height: number;
}

export async function openDesktopAppWindow(
  options: DesktopAppWindowOptions
): Promise<WebviewWindow> {
  const existing = await WebviewWindow.getByLabel(options.label);
  if (existing) {
    await existing.setFocus();
    return existing;
  }
  return new WebviewWindow(options.label, {
    url: options.url,
    title: options.title,
    width: options.width,
    height: options.height,
    x: 100,
    y: 100,
  });
}

export function emitDesktopWindowEvent<T>(label: string, event: string, payload: T): Promise<void> {
  return emitTo(label, event, payload);
}

export function listenDesktopWindowEvent<T>(
  event: string,
  handler: EventCallback<T>
): Promise<UnlistenFn> {
  return listen(event, handler);
}
