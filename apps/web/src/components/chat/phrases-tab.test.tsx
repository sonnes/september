// @vitest-environment jsdom
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '@/test/storage';

import { PanelRail } from './right-panel';
import { ChatPanelProvider } from './use-chat-panel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mockAddManualPhrase, mockSetPhraseCode, mockData } = vi.hoisted(() => ({
  mockAddManualPhrase: vi.fn(async () => {}),
  mockSetPhraseCode: vi.fn(async () => {}),
  mockData: {
    phrases: [] as Array<Record<string, unknown>>,
    messages: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/packages/spaces', async () => {
  const codes = await vi.importActual<object>('@/packages/spaces/lib/codes');
  const phrases = await vi.importActual<object>('@/packages/spaces/lib/phrases');
  const mine = await vi.importActual<object>('@/packages/spaces/lib/mine');
  return {
    ...codes,
    ...phrases,
    ...mine,
    useMessages: () => ({ messages: mockData.messages, isLoading: false }),
    useSavedPhrases: ({ spaceId }: { spaceId?: string } = {}) => ({
      phrases: spaceId ? mockData.phrases.filter(p => p.space_id === spaceId) : mockData.phrases,
    }),
    useSpaces: () => ({ spaces: [] }),
    MessageList: () => null,
    updateSpace: vi.fn(),
    addManualPhrase: mockAddManualPhrase,
    setPhrasePinned: vi.fn(async () => {}),
    setPhraseCode: mockSetPhraseCode,
    removePhrase: vi.fn(async () => {}),
  };
});

vi.mock('@/packages/account', () => ({
  useAccount: () => ({ account: {}, updateAccount: vi.fn(), user: { id: 'u1' } }),
}));

vi.mock('@/packages/editor', () => ({
  TiptapEditor: () => null,
  useEditorContext: () => ({ text: '', setText: vi.fn() }),
}));

let container: HTMLDivElement;
let root: Root;

let seq = 0;
function userMsg(text: string) {
  return { id: `m-${seq++}`, text, type: 'user', user_id: 'u1', created_at: new Date() };
}

function phraseRow(overrides: Record<string, unknown>) {
  return {
    id: String(overrides.text),
    space_id: 'space-1',
    user_id: 'u1',
    pinned: true,
    created_at: new Date(0),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  mockAddManualPhrase.mockClear();
  mockSetPhraseCode.mockClear();
  mockData.phrases = [];
  mockData.messages = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderTab() {
  act(() =>
    root.render(
      <ChatPanelProvider>
        <PanelRail chatId="space-1" onOpenDisplay={vi.fn()} />
      </ChatPanelProvider>
    )
  );
  const phrasesBtn = container.querySelector<HTMLButtonElement>(
    'nav[aria-label="Panel rail"] button[aria-label="Phrases"]'
  )!;
  act(() => phrasesBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function input(label: string) {
  return container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
}

function setInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('PhrasesTab codes', () => {
  it('shows a code badge on coded rows', () => {
    mockData.phrases = [phraseRow({ text: 'Thank you', code: 'ty' })];
    renderTab();
    expect(container.textContent).toContain('ty');
  });

  it('marks starters', () => {
    mockData.phrases = [phraseRow({ text: 'Can you please', kind: 'starter' })];
    renderTab();
    expect(container.textContent).toContain('starter');
  });

  it('adds a phrase with a valid code', () => {
    renderTab();
    setInput(input('Add a phrase'), 'What is for dinner');
    setInput(input('Code (optional)'), 'WFD');
    const form = container.querySelector('form')!;
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(mockAddManualPhrase).toHaveBeenCalledWith('space-1', 'u1', 'What is for dinner', {
      code: 'wfd',
    });
  });

  it('warns and blocks when the code is a common word', () => {
    renderTab();
    setInput(input('Add a phrase'), 'It is what it is');
    setInput(input('Code (optional)'), 'its');

    expect(container.textContent).toContain('common word');
    const form = container.querySelector('form')!;
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(mockAddManualPhrase).not.toHaveBeenCalled();
  });

  it('warns when the code is already in use', () => {
    mockData.phrases = [phraseRow({ text: 'Thank you', code: 'ty' })];
    renderTab();
    setInput(input('Add a phrase'), 'Thanks a lot friend');
    setInput(input('Code (optional)'), 'ty');
    expect(container.textContent).toContain('already');
  });
});

describe('PhrasesTab shortcut ideas (mining)', () => {
  it('proposes a repeated message with its code and keeps it on demand', () => {
    mockData.messages = Array.from({ length: 6 }, () => userMsg('Can you turn the volume down'));
    renderTab();

    expect(container.textContent).toContain('Can you turn the volume down');
    expect(container.textContent).toContain('6×');

    const keep = container.querySelector<HTMLButtonElement>('[aria-label="Keep shortcut"]')!;
    act(() => keep.click());
    expect(mockAddManualPhrase).toHaveBeenCalledWith(
      'space-1',
      'u1',
      'Can you turn the volume down',
      { code: expect.any(String) }
    );
  });

  it('dismissing a proposal hides it and persists', () => {
    mockData.messages = Array.from({ length: 6 }, () => userMsg('Can you turn the volume down'));
    renderTab();

    const dismiss = container.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss shortcut idea"]'
    )!;
    act(() => dismiss.click());

    expect(container.textContent).not.toContain('6×');
    expect(localStorage.getItem('september:mined-dismissed')).toContain(
      'can you turn the volume down'
    );
  });

  it('shows no ideas section when nothing repeats', () => {
    mockData.messages = [userMsg('hello there my friend')];
    renderTab();
    expect(container.textContent).not.toContain('Shortcut ideas');
  });
});
