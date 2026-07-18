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

  it('defaults to the rail on phrases with no stored state', () => {
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'phrases' });
  });

  it('migrates the legacy open panel to expanded/phrases', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, widthPct: 44 }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
  });

  it('migrates the legacy closed panel to the rail', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: false, widthPct: 44 }));
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'phrases' });
  });

  it('reads back the new shape and ignores unknown tabs', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'phrases' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'nope' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
  });

  it('falls back to phrases for the retired provider/speech/voice tabs', () => {
    for (const tab of ['provider', 'speech', 'voice']) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: tab }));
      expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
    }
  });

  it('falls back to the default tab for the retired history/context tabs', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'history' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: 'expanded', activeTab: 'context' }));
    expect(loadPanelState()).toEqual({ state: 'expanded', activeTab: 'phrases' });
  });

  it('falls back cleanly on malformed json', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPanelState()).toEqual({ state: 'rail', activeTab: 'phrases' });
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
    expect(api.activeTab).toBe('phrases');
  });

  it('expandTab opens the panel on that tab', () => {
    mount();
    act(() => api.expandTab('phrases'));
    expect(api.state).toBe('expanded');
    expect(api.activeTab).toBe('phrases');
  });

  it('collapse returns to the rail but keeps the active tab', () => {
    mount();
    act(() => api.expandTab('phrases'));
    act(() => api.collapse());
    expect(api.state).toBe('rail');
    expect(api.activeTab).toBe('phrases');
  });

  it('toggle flips between rail and expanded', () => {
    mount();
    act(() => api.toggle());
    expect(api.state).toBe('expanded');
    act(() => api.toggle());
    expect(api.state).toBe('rail');
  });
});
