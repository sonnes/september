// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '@/packages/sync/lib/test-storage';

import { ChatPanelProvider, loadPanelState, useChatPanel } from './use-chat-panel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'september:chat-panel';

describe('loadPanelState', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));

  it('defaults to the rail on history with no stored state', () => {
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'history' });
  });

  it('migrates the legacy open panel to expanded/history', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, widthPct: 44 }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'history' });
  });

  it('migrates the legacy closed panel to the rail', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: false, widthPct: 44 }));
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'history' });
  });

  it('reads back the new shape and ignores unknown tabs', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'voice' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'voice' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'nope' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'history' });
  });

  it('migrates the retired provider/speech tabs to voice', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'provider' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'voice' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'speech' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'voice' });
  });

  it('falls back cleanly on malformed json', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'history' });
  });
});

// ---------------------------------------------------------------------------
// Provider actions
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let root: Root;

let api: ReturnType<typeof useChatPanel>;

function Probe() {
  api = useChatPanel();
  return null;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount() {
  act(() =>
    root.render(
      <ChatPanelProvider>
        <Probe />
      </ChatPanelProvider>
    )
  );
}

describe('ChatPanelProvider actions', () => {
  it('starts on the rail', () => {
    mount();
    expect(api.state).toBe('rail');
    expect(api.activeTab).toBe('history');
  });

  it('expandTab opens the panel on that tab', () => {
    mount();
    act(() => api.expandTab('voice'));
    expect(api.state).toBe('expanded');
    expect(api.activeTab).toBe('voice');
  });

  it('collapse returns to the rail but keeps the active tab', () => {
    mount();
    act(() => api.expandTab('voice'));
    act(() => api.collapse());
    expect(api.state).toBe('rail');
    expect(api.activeTab).toBe('voice');
  });

  it('toggle flips between rail and expanded', () => {
    mount();
    act(() => api.toggle());
    expect(api.state).toBe('expanded');
    act(() => api.toggle());
    expect(api.state).toBe('rail');
  });
});
