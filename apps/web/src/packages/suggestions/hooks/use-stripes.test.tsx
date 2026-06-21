// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';

import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseStripesReturn } from './use-stripes';
import { useStripes } from './use-stripes';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUseSuggestions = vi.fn(() => ({
  suggestions: [],
  isLoading: false,
  clearSuggestions: vi.fn(),
}));

let mockText = 'Doc';

vi.mock('@/packages/editor', () => ({
  useEditorContext: () => ({ text: mockText }),
}));

vi.mock('@/packages/account', () => ({
  useAccount: () => ({ account: { context: 'global md' } }),
}));

vi.mock('@/packages/spaces', () => ({
  useMessages: () => ({
    messages: [
      {
        id: 'chat-history',
        text: 'Doc from chat history',
        type: 'user',
        created_at: new Date('2026-01-01T00:00:00Z'),
      },
    ],
  }),
  useSpaces: () => ({ spaces: [{ id: 'space-1', context: 'space md' }] }),
  useSavedPhrases: () => ({ phrases: [] }),
  topPhrases: () => [],
}));

vi.mock('./use-suggestions', () => ({
  useSuggestions: (args: unknown) => mockUseSuggestions(args),
}));

let container: HTMLDivElement;
let root: Root;
let latest: UseStripesReturn;

function Probe(props: { chatId: string; historyText?: string }) {
  latest = useStripes(props);
  return null;
}

beforeEach(() => {
  mockUseSuggestions.mockClear();
  mockText = 'Doc';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(ui: React.ReactElement) {
  act(() => root.render(ui));
}

describe('useStripes', () => {
  it('uses provided history text instead of chat history for LLM suggestions', () => {
    render(<Probe chatId="space-1" historyText="Doc content continues" />);

    expect(mockUseSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [expect.objectContaining({ text: 'Doc content continues' })],
      })
    );
    expect(mockUseSuggestions.mock.calls[0][0].history[0].text).not.toBe('Doc from chat history');
  });

  it('uses provided history text for history stripe matches', () => {
    render(<Probe chatId="space-1" historyText="Doc content continues" />);

    expect(latest.stripes).toEqual([
      expect.objectContaining({ text: 'Doc content continues', source: 'history' }),
    ]);
  });
});
