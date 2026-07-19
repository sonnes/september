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
let mockPhrases: Array<Record<string, unknown>> = [];

vi.mock('@/packages/editor', () => ({
  useEditorContext: () => ({ text: mockText }),
}));

vi.mock('@/packages/account', () => ({
  useAccount: () => ({ account: { context: 'global md' } }),
}));

vi.mock('@/packages/spaces', async () => {
  // The pure helpers are safe to use for real (no db import); only the
  // live-query hooks are stubbed.
  const codes = await vi.importActual<object>('@/packages/spaces/lib/codes');
  const phrases = await vi.importActual<object>('@/packages/spaces/lib/phrases');
  return {
    ...codes,
    ...phrases,
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
    useSavedPhrases: ({ spaceId }: { spaceId?: string } = {}) => ({
      phrases: spaceId ? mockPhrases.filter(p => p.space_id === spaceId) : mockPhrases,
    }),
  };
});

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
  mockPhrases = [];
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

  it('surfaces a code match as the top stripe with the trigger consumed', () => {
    mockPhrases = [
      {
        id: 'p1',
        space_id: 'space-1',
        user_id: 'u',
        text: 'Thank you',
        code: 'ty',
        pinned: true,
        created_at: new Date(0),
      },
    ];
    mockText = 'I made it, ty';
    render(<Probe chatId="space-1" />);

    const [first] = latest.stripes;
    expect(first).toMatchObject({ source: 'code', code: 'ty', text: 'I made it, Thank you' });
    // Only the phrase's tokens remain visible — the typed prefix is hidden.
    expect(first.tokens.slice(first.hidden)).toEqual(['Thank', 'you']);
  });

  it('matches codes from other spaces', () => {
    mockPhrases = [
      {
        id: 'p2',
        space_id: 'space-2',
        user_id: 'u',
        text: 'I want to go to the bathroom',
        code: 'iwb',
        pinned: true,
        created_at: new Date(0),
      },
    ];
    mockText = 'iwb';
    render(<Probe chatId="space-1" />);

    expect(latest.stripes[0]).toMatchObject({ source: 'code', code: 'iwb' });
  });

  it('shows no code stripe without an exact trailing-word match', () => {
    mockPhrases = [
      {
        id: 'p1',
        space_id: 'space-1',
        user_id: 'u',
        text: 'Thank you',
        code: 'ty',
        pinned: true,
        created_at: new Date(0),
      },
    ];
    mockText = 'ty '; // completed word — no longer a live trigger
    render(<Probe chatId="space-1" />);

    expect(latest.stripes.some(s => s.source === 'code')).toBe(false);
  });

  it('mixes starter rows after phrase rows when the composer is empty', () => {
    mockPhrases = [
      { id: 'a', space_id: 'space-1', user_id: 'u', text: 'Please call the nurse', pinned: true, created_at: new Date(0) },
      { id: 'b', space_id: 'space-1', user_id: 'u', text: "I'm feeling a bit", kind: 'starter', pinned: false, created_at: new Date(0) },
      { id: 'c', space_id: 'space-1', user_id: 'u', text: 'Can you please check', kind: 'starter', pinned: true, created_at: new Date(0) },
    ];
    mockText = '';
    render(<Probe chatId="space-1" />);

    const sources = latest.stripes.map(s => s.source);
    expect(sources).toContain('starter');
    expect(sources.indexOf('md')).toBeLessThan(sources.indexOf('starter'));
    // Pinned starter first within the starter group.
    const starterTexts = latest.stripes.filter(s => s.source === 'starter').map(s => s.text);
    expect(starterTexts[0]).toBe('Can you please check');
  });
});
