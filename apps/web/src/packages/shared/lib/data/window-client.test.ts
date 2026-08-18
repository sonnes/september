import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emitDesktopWindowEvent,
  listenDesktopWindowEvent,
  openDesktopAppWindow,
} from './window-client';

const { emitTo, existing, listen, setFocus, WebviewWindow } = vi.hoisted(() => ({
  emitTo: vi.fn(),
  existing: { current: null as null | { setFocus: () => Promise<void> } },
  listen: vi.fn(),
  setFocus: vi.fn(),
  WebviewWindow: vi.fn(),
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
    existing.current = null;
    setFocus.mockResolvedValue(undefined);
    WebviewWindow.mockImplementation(function MockWindow(label, options) {
      return { label, options, setFocus };
    });
  });

  it('creates a named webview window for an app route', async () => {
    const opened = await openDesktopAppWindow({
      label: 'present-note-1',
      url: '/present/note-1',
      title: 'Presentation',
      width: 1280,
      height: 720,
    });

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
