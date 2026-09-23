import React, { act } from 'react';

import { Suggestions } from '@september/app-ui/blocks/suggestions';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setup: { autoSuggestions: true, autoPhrases: true },
  listeners: new Set<() => void>(),
  generate: vi.fn(),
  writing: true,
}));
vi.mock('@platform/services/os', () => ({
  currentSetup: () => state.setup,
  subscribeSetup: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock('@platform/services/data', () => ({
  useMessages: () => ({ data: [] }),
  usePhrases: () => ({ data: [] }),
}));
vi.mock('@platform/services/suggest', () => ({
  useSuggestions: () => ['localword'],
  applySuggestion: (_text: string, word: string) => word,
}));
vi.mock('@platform/services/ai', () => ({
  hasWritingService: () => state.writing,
  generate: state.generate,
  itemsFrom: (answer: string[]) => answer,
  userContext: () => '',
}));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  }
);
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  root = createRoot(container);
  state.setup = { autoSuggestions: true, autoPhrases: true };
  state.writing = true;
  state.generate.mockReset().mockResolvedValue(['hello fresh result']);
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});
async function render(text: string, spaceId = 'space') {
  await act(async () =>
    root.render(
      <Suggestions
        text={text}
        spaceId={spaceId}
        context=""
        history={[]}
        onTake={() => {}}
        onPin={() => {}}
        onSpeak={() => {}}
      />
    )
  );
}
async function advance(ms = 200) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}
async function enable(enabled: boolean) {
  await act(async () => {
    state.setup = { ...state.setup, autoSuggestions: enabled };
    state.listeners.forEach(listener => listener());
  });
}

it.each([' ', '\n', '.', ',', '!', '?', ';', ':'])(
  'requests after an edit ends with %j',
  async boundary => {
    await render('hello');
    await render(`hello${boundary}`);
    await advance(199);
    expect(state.generate).not.toHaveBeenCalled();
    await advance(1);
    expect(state.generate).toHaveBeenCalledTimes(1);
  }
);

it('keeps local completion while waiting for a boundary and skips empty input', async () => {
  await render('');
  for (const text of ['h', 'hello', "hello'", 'hello-', ' ', '\n', '']) {
    await render(text);
    await advance();
    expect(state.generate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('localword');
  }
});

it('waits for an edit after restoring a draft or changing spaces', async () => {
  await render('hello ');
  await advance();
  expect(state.generate).not.toHaveBeenCalled();
  await render('hello,');
  await advance();
  expect(state.generate).toHaveBeenCalledTimes(1);
  await render('hello ', 'other');
  await advance();
  expect(state.generate).toHaveBeenCalledTimes(1);
});

it('cancels a pending timer when typing resumes', async () => {
  await render('hello');
  await render('hello ');
  await advance(100);
  await render('hello w');
  await advance();
  expect(state.generate).not.toHaveBeenCalled();
});

it.each(['response', 'failure'])('ignores a late %s from an earlier request', async outcome => {
  let resolve!: (value: string[]) => void;
  let reject!: (error: Error) => void;
  state.generate.mockImplementationOnce(
    () =>
      new Promise<string[]>((done, fail) => {
        resolve = done;
        reject = fail;
      })
  );
  await render('hello');
  await render('hello ');
  await advance();
  const signal = state.generate.mock.calls[0][1].signal as AbortSignal;
  await render('hello,');
  await advance();
  expect(signal.aborted).toBe(true);
  await act(async () => {
    if (outcome === 'response') resolve(['hello stale result']);
    else reject(new Error('Earlier request failed'));
  });
  expect(container.textContent).toContain('fresh');
  expect(container.textContent).not.toContain('stale');
});

it('stops on disable and waits for another edit on enable', async () => {
  let resolve!: (value: string[]) => void;
  state.generate.mockImplementationOnce(
    () =>
      new Promise<string[]>(done => {
        resolve = done;
      })
  );
  await render('hello');
  await render('hello ');
  await advance();
  await enable(false);
  await act(async () => resolve(['hello stale result']));
  expect(container.textContent).not.toContain('stale');
  await enable(true);
  await advance();
  expect(state.generate).toHaveBeenCalledTimes(1);
  await render('hello,');
  await advance();
  expect(state.generate).toHaveBeenCalledTimes(2);
});

it('keeps a suggestion request active when only automatic phrases changes', async () => {
  let resolve!: (value: string[]) => void;
  state.generate.mockImplementationOnce(
    () =>
      new Promise<string[]>(done => {
        resolve = done;
      })
  );
  await render('hello');
  await render('hello ');
  await advance();
  const signal = state.generate.mock.calls[0][1].signal as AbortSignal;
  await act(async () => {
    state.setup = { ...state.setup, autoPhrases: false };
    state.listeners.forEach(listener => listener());
  });
  expect(signal.aborted).toBe(false);
  await act(async () => resolve(['hello fresh result']));
  expect(container.textContent).toContain('fresh');
});

it.each([
  [false, true, true],
  [true, false, true],
  [false, false, true],
  [true, true, false],
])(
  'respects switches and provider availability (%s, %s, %s)',
  async (autoSuggestions, autoPhrases, writing) => {
    state.setup = { autoSuggestions, autoPhrases };
    state.writing = writing;
    await render('hello');
    await render('hello ');
    await advance();
    expect(state.generate).toHaveBeenCalledTimes(autoSuggestions && writing ? 1 : 0);
  }
);
