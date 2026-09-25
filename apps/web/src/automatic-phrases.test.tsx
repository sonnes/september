import React, { act } from 'react';

import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncPhrases as useDesktopPhrases } from '../../desktop/src/services/phrase-sync';
import { useSyncPhrases as useWebPhrases } from './services/phrase-sync';

const state = vi.hoisted(() => ({
  setup: { autoSuggestions: true, autoPhrases: true },
  listeners: new Set<() => void>(),
  generate: vi.fn(),
  replace: vi.fn(),
  update: vi.fn(),
  writing: true,
}));
vi.mock('@platform/services/os', () => ({
  currentSetup: () => state.setup,
  currentSpeech: () => null,
  subscribeSetup: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock('../../desktop/src/services/os', () => ({
  currentSetup: () => state.setup,
  currentSpeech: () => null,
  subscribeSetup: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock('@platform/services/data', () => ({
  useReplaceAiPhrases: () => ({ mutateAsync: state.replace }),
  useUpdateSpace: () => ({ mutateAsync: state.update }),
}));
vi.mock('../../desktop/src/services/data', () => ({
  useReplaceAiPhrases: () => ({ mutateAsync: state.replace }),
  useUpdateSpace: () => ({ mutateAsync: state.update }),
}));
vi.mock('@platform/services/ai', () => ({
  generate: state.generate,
  hasWritingService: () => state.writing,
  itemsFrom: (answer: Record<string, string[]>, key: string) => answer[key] ?? [],
}));
vi.mock('../../desktop/src/services/ai', () => ({
  generate: state.generate,
  hasWritingService: () => state.writing,
  itemsFrom: (answer: Record<string, string[]>, key: string) => answer[key] ?? [],
}));
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
const answer = { phrases: ['Please bring some water.'], starters: ['I would like to'] };
beforeEach(() => {
  root = createRoot(document.createElement('div'));
  state.setup = { autoSuggestions: true, autoPhrases: true };
  state.writing = true;
  state.generate.mockReset().mockResolvedValue(answer);
  state.replace.mockReset().mockResolvedValue(undefined);
  state.update.mockReset().mockResolvedValue(undefined);
});
afterEach(() => act(() => root.unmount()));
async function enable(enabled: boolean) {
  await act(async () => {
    state.setup = { ...state.setup, autoPhrases: enabled };
    state.listeners.forEach(listener => listener());
  });
}

describe.each([
  ['web', useWebPhrases],
  ['desktop', useDesktopPhrases],
] as const)('%s automatic phrases', (_platform, usePhrases) => {
  function Harness({
    id = 'space',
    count = 1,
    synced,
    context = '',
  }: {
    id?: string;
    count?: number;
    synced?: number;
    context?: string;
  }) {
    usePhrases({
      space: {
        id,
        title: 'Family',
        user_id: 'person',
        created_at: 0,
        updated_at: 0,
        context,
        phrases_synced_count: synced,
      },
      phrases: [],
      messages: Array.from({ length: count }, (_, index) => ({
        id: String(index),
        space_id: id,
        user_id: 'person',
        type: 'user' as const,
        text: 'Hello.',
        created_at: index,
      })),
    });
    return null;
  }

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('respects independent switches (%s, %s)', async (autoSuggestions, autoPhrases) => {
    state.setup = { autoSuggestions, autoPhrases };
    await act(async () => root.render(<Harness />));
    expect(state.generate).toHaveBeenCalledTimes(autoPhrases ? 1 : 0);
    expect(state.replace).toHaveBeenCalledTimes(autoPhrases ? 1 : 0);
  });

  it('starts from context and refreshes after six additional messages', async () => {
    await act(async () => root.render(<Harness count={0} context="At home" />));
    expect(state.generate).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<Harness count={5} synced={0} />));
    expect(state.generate).toHaveBeenCalledTimes(1);
    await act(async () => root.render(<Harness count={6} synced={0} />));
    expect(state.generate).toHaveBeenCalledTimes(2);
    expect(state.update).toHaveBeenLastCalledWith({ id: 'space', phrases_synced_count: 6 });
  });

  it('prevents late writes after disable and resumes on enable', async () => {
    let resolve!: (value: typeof answer) => void;
    state.generate.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    await act(async () => root.render(<Harness />));
    const signal = state.generate.mock.calls[0][1].signal as AbortSignal;
    await enable(false);
    await act(async () => resolve(answer));
    expect(state.replace).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
    expect(signal.aborted).toBe(true);
    await enable(true);
    expect(state.generate).toHaveBeenCalledTimes(2);
    expect(state.replace).toHaveBeenCalledTimes(1);
  });

  it('ignores results for a space that is no longer active', async () => {
    let resolve!: (value: typeof answer) => void;
    state.generate.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    await act(async () => root.render(<Harness />));
    await act(async () => root.render(<Harness id="other" />));
    await act(async () => resolve(answer));
    expect(state.replace).toHaveBeenCalledTimes(1);
    expect(state.replace.mock.calls[0][0].spaceId).toBe('other');
    expect(state.update).toHaveBeenCalledTimes(1);
  });

  // OpenAI and Azure reject JSON mode when no message says "json".
  it('names JSON in the messages of its JSON-mode request', async () => {
    await act(async () => root.render(<Harness />));
    const request = state.generate.mock.calls[0][0];
    expect(request.response_format).toEqual({ type: 'json_object' });
    const text = request.messages.map((message: { content: string }) => message.content).join('\n');
    expect(text).toMatch(/json/i);
  });

  it('skips generation without a provider', async () => {
    state.writing = false;
    await act(async () => root.render(<Harness />));
    expect(state.generate).not.toHaveBeenCalled();
  });

  it('keeps a phrase request active when only automatic suggestions changes', async () => {
    let resolve!: (value: typeof answer) => void;
    state.generate.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    await act(async () => root.render(<Harness />));
    const signal = state.generate.mock.calls[0][1].signal as AbortSignal;
    await act(async () => {
      state.setup = { ...state.setup, autoSuggestions: false };
      state.listeners.forEach(listener => listener());
    });
    expect(state.generate).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(false);
    await act(async () => resolve(answer));
    expect(state.replace).toHaveBeenCalledTimes(1);
  });
});
