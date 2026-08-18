// @vitest-environment jsdom
import React, { act } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataQueryProvider } from './provider';
import { notifyCollectionChanged } from './query';

const { eventHandlers, openDesktopExternalUrl, unlisten } = vi.hoisted(() => ({
  eventHandlers: new Map<string, (event: { payload: unknown }) => void>(),
  openDesktopExternalUrl: vi.fn(),
  unlisten: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers.set(name, handler);
    return unlisten;
  }),
}));
vi.mock('./runtime', () => ({ isDesktopRuntime: () => true }));
vi.mock('./external-client', () => ({ openDesktopExternalUrl }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let currentClient: ReturnType<typeof useQueryClient>;

function Probe() {
  currentClient = useQueryClient();
  return null;
}

beforeEach(() => {
  eventHandlers.clear();
  unlisten.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DataQueryProvider', () => {
  it('keeps one client and invalidates targeted prefixes from JS and Rust events', async () => {
    await act(async () =>
      root.render(
        <DataQueryProvider>
          <Probe />
        </DataQueryProvider>
      )
    );
    const firstClient = currentClient;
    const invalidate = vi.spyOn(firstClient, 'invalidateQueries');

    await act(async () => notifyCollectionChanged('messages'));
    await act(async () => {
      eventHandlers.get('september://records-changed')?.({
        payload: { collections: ['spaces', 'documents'] },
      });
    });
    await act(async () =>
      root.render(
        <DataQueryProvider>
          <Probe />
        </DataQueryProvider>
      )
    );

    expect(currentClient).toBe(firstClient);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['messages'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['spaces'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notes'] });
  });

  it('opens target-blank external links outside the desktop webview', async () => {
    openDesktopExternalUrl.mockResolvedValue(undefined);
    await act(async () =>
      root.render(
        <DataQueryProvider>
          <a href="https://september.to/help" target="_blank">
            Help
          </a>
        </DataQueryProvider>
      )
    );

    const link = container.querySelector('a') as HTMLAnchorElement;
    act(() => link.click());

    expect(openDesktopExternalUrl).toHaveBeenCalledWith('https://september.to/help');
  });
});
