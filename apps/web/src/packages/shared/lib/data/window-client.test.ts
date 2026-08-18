import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitDesktopWindowEvent,
  listenDesktopWindowEvent,
  openDesktopAppWindow,
} from './window-client';

const { emitTo, existing, listen, setFocus, WebviewWindow, windowEvents } = vi.hoisted(() => ({
  emitTo: vi.fn(),
  existing: { current: null as null | { setFocus: () => Promise<void> } },
  listen: vi.fn(),
  setFocus: vi.fn(),
  WebviewWindow: vi.fn(),
  windowEvents: new Map<string, (event: { payload?: unknown }) => void>(),
}));

vi.mock('@tauri-apps/api/event', () => ({ emitTo, listen }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: Object.assign(WebviewWindow, {
    getByLabel: vi.fn(async () => existing.current),
  }),
}));

describe('desktop app windows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    windowEvents.clear();
    existing.current = null;
    setFocus.mockResolvedValue(undefined);
    WebviewWindow.mockImplementation(function MockWindow(label, options) {
      return {
        label,
        options,
        setFocus,
        once: vi.fn(async (event, handler) => {
          windowEvents.set(event, handler);
          return vi.fn();
        }),
      };
    });
    listen.mockImplementation(async (event, handler) => {
      windowEvents.set(event, handler);
      return vi.fn();
    });
  });

  it('waits for Tauri to confirm a new window was created', async () => {
    let settled = false;
    const opening = openDesktopAppWindow({
      label: 'present-note-1',
      url: '/present/note-1',
      title: 'Presentation',
      width: 1280,
      height: 720,
    });
    void opening.finally(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(windowEvents.has('tauri://created')).toBe(true));
    expect(settled).toBe(false);
    windowEvents.get('tauri://created')?.({});
    const opened = await opening;

    expect(WebviewWindow).toHaveBeenCalledWith('present-note-1', {
      url: '/present/note-1',
      title: 'Presentation',
      width: 1280,
      height: 720,
      x: 100,
      y: 100,
    });
    expect(opened).toEqual(expect.objectContaining({ label: 'present-note-1' }));
  });

  it('rejects when Tauri reports a window creation error', async () => {
    const opening = openDesktopAppWindow({
      label: 'display-space-1',
      url: '/display/space-1',
      title: 'Display',
      width: 375,
      height: 667,
    });

    await vi.waitFor(() => expect(windowEvents.has('tauri://error')).toBe(true));
    windowEvents.get('tauri://error')?.({ payload: 'creation failed' });

    await expect(opening).rejects.toThrow('creation failed');
  });

  it('can wait until the new route has installed its event listeners', async () => {
    let settled = false;
    const opening = openDesktopAppWindow({
      label: 'display-space-1',
      url: '/display/space-1',
      title: 'Display',
      width: 375,
      height: 667,
      waitUntilReady: true,
    });
    void opening.finally(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(windowEvents.has('tauri://created')).toBe(true));
    windowEvents.get('tauri://created')?.({});
    await Promise.resolve();
    expect(settled).toBe(false);

    windowEvents.get('september://window-ready')?.({
      payload: { label: 'display-space-1' },
    });
    await expect(opening).resolves.toEqual(expect.objectContaining({ label: 'display-space-1' }));
  });

  it('focuses an existing named window', async () => {
    existing.current = { setFocus };
    await openDesktopAppWindow({
      label: 'display-space-1',
      url: '/display/space-1',
      title: 'Display',
      width: 375,
      height: 667,
    });

    expect(WebviewWindow).not.toHaveBeenCalled();
    expect(setFocus).toHaveBeenCalledOnce();
  });

  it('sends and listens for targeted window events', async () => {
    const handler = vi.fn();
    emitTo.mockResolvedValue(undefined);
    listen.mockResolvedValue(vi.fn());

    await emitDesktopWindowEvent('display-space-1', 'september://display-message', { id: 'm1' });
    await listenDesktopWindowEvent('september://display-message', handler);

    expect(emitTo).toHaveBeenCalledWith('display-space-1', 'september://display-message', {
      id: 'm1',
    });
    expect(listen).toHaveBeenCalledWith('september://display-message', handler);
  });
});
