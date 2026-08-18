import { type EventCallback, type UnlistenFn, emitTo, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export interface DesktopAppWindowOptions {
  label: string;
  url: string;
  title: string;
  width: number;
  height: number;
  waitUntilReady?: boolean;
}

interface DesktopWindowReadyPayload {
  label: string;
}

function creationError(payload: unknown): Error {
  return new Error(typeof payload === 'string' ? payload : 'Tauri failed to create the window');
}

function waitForWindowCreated(window: WebviewWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stopCreated: UnlistenFn | undefined;
    let stopError: UnlistenFn | undefined;
    const cleanup = () => {
      stopCreated?.();
      stopError?.();
    };
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    void Promise.all([
      window.once('tauri://created', () => settle(resolve)),
      window.once('tauri://error', event => settle(() => reject(creationError(event.payload)))),
    ])
      .then(([created, error]) => {
        stopCreated = created;
        stopError = error;
        if (settled) cleanup();
      })
      .catch(error => settle(() => reject(error)));
  });
}

async function waitForWindowReady(label: string): Promise<{
  ready: Promise<void>;
  cancel: () => void;
}> {
  let resolveReady: () => void = () => {};
  let rejectReady: (error: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const stop = await listen<DesktopWindowReadyPayload>('september://window-ready', event => {
    if (event.payload.label !== label) return;
    clearTimeout(timer);
    stop();
    resolveReady();
  });
  const timer = setTimeout(() => {
    stop();
    rejectReady(new Error(`Window did not become ready: ${label}`));
  }, 10_000);
  return {
    ready,
    cancel: () => {
      clearTimeout(timer);
      stop();
    },
  };
}

export async function openDesktopAppWindow(
  options: DesktopAppWindowOptions
): Promise<WebviewWindow> {
  const existing = await WebviewWindow.getByLabel(options.label);
  if (existing) {
    await existing.setFocus();
    return existing;
  }
  const readyWait = options.waitUntilReady ? await waitForWindowReady(options.label) : null;
  try {
    const window = new WebviewWindow(options.label, {
      url: options.url,
      title: options.title,
      width: options.width,
      height: options.height,
      x: 100,
      y: 100,
    });
    await waitForWindowCreated(window);
    await readyWait?.ready;
    return window;
  } catch (error) {
    readyWait?.cancel();
    throw error;
  }
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
