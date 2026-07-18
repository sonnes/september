// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '@/packages/sync/lib/test-storage';

import { PanelRail } from './right-panel';
import { ChatPanelProvider } from './use-chat-panel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Tab bodies pull live data — stub the packages they read so the rail renders.
vi.mock('@/packages/spaces', () => ({
  useMessages: () => ({ messages: [], isLoading: false }),
  useSavedPhrases: () => ({ phrases: [] }),
  useSpaces: () => ({ spaces: [] }),
  MessageList: () => null,
  updateSpace: vi.fn(),
  addManualPhrase: vi.fn(),
  setPhrasePinned: vi.fn(),
  removePhrase: vi.fn(),
}));

vi.mock('@/packages/account', () => ({
  useAccount: () => ({ account: {}, updateAccount: vi.fn(), user: { id: 'u1' } }),
}));

vi.mock('@/packages/editor', () => ({
  TiptapEditor: () => null,
  useEditorContext: () => ({ text: '', setText: vi.fn() }),
}));

vi.mock('@/packages/speech', () => ({
  SpeechSettings: () => null,
}));

let container: HTMLDivElement;
let root: Root;

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

function render(onOpenDisplay = vi.fn()) {
  act(() =>
    root.render(
      <ChatPanelProvider>
        <PanelRail chatId="space-1" onOpenDisplay={onOpenDisplay} />
      </ChatPanelProvider>
    )
  );
  return onOpenDisplay;
}

function railButton(label: string) {
  return container.querySelector<HTMLButtonElement>(`nav[aria-label="Panel rail"] button[aria-label="${label}"]`);
}

describe('PanelRail', () => {
  it('renders the four tab icons plus Display', () => {
    render();
    for (const label of ['History', 'Phrases', 'Voice', 'Context', 'Display']) {
      expect(railButton(label)).toBeTruthy();
    }
  });

  it('no longer renders the retired Provider and Speech tabs', () => {
    render();
    expect(railButton('Provider')).toBeNull();
    expect(railButton('Speech')).toBeNull();
  });

  it('expands to the clicked tab and marks it pressed', () => {
    render();
    const voice = railButton('Voice')!;
    expect(voice.getAttribute('aria-pressed')).toBe('false');
    act(() => voice.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(railButton('Voice')!.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[aria-label="Collapse panel"]')).toBeTruthy();
  });

  it('collapses when the active tab icon is clicked again', () => {
    render();
    act(() => railButton('Voice')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    act(() => railButton('Voice')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(railButton('Voice')!.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[aria-label="Collapse panel"]')).toBeNull();
  });

  it('collapses on Escape', () => {
    render();
    act(() => railButton('History')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('[aria-label="Collapse panel"]')).toBeTruthy();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(container.querySelector('[aria-label="Collapse panel"]')).toBeNull();
  });

  it('Display opens the second screen without expanding the panel', () => {
    const onOpenDisplay = render();
    act(() => railButton('Display')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpenDisplay).toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Collapse panel"]')).toBeNull();
  });
});
