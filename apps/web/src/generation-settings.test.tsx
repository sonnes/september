import React, { act } from 'react';

import { WritingSettings } from '@september/app-ui/pages/settings';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DEFAULT_DRAFT } from './rules/onboarding';

const state = vi.hoisted(() => ({
  setup: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
  update: vi.fn(),
}));
vi.mock('@platform/services/os', async original => {
  const actual = await original<typeof import('./services/os')>();
  return {
    ...actual,
    currentSetup: () => state.setup,
    subscribeSetup: (listener: () => void) => {
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    updateSetup: state.update,
    readConnections: async () => actual.BLANK_CONNECTIONS,
  };
});
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  state.setup = { ...DEFAULT_DRAFT, autoSuggestions: true, autoPhrases: true };
  state.update.mockReset().mockImplementation(async patch => {
    state.setup = { ...state.setup, ...patch };
    state.listeners.forEach(listener => listener());
    return state.setup;
  });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function switches() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
}

it('saves each automatic generation switch independently and retains focus', async () => {
  await act(async () => root.render(<WritingSettings />));
  expect(switches()).toHaveLength(2);
  switches()[0].focus();
  await act(async () => switches()[0].click());
  expect(state.update).toHaveBeenLastCalledWith({ autoSuggestions: false });
  expect(switches().map(button => button.getAttribute('aria-checked'))).toEqual(['false', 'true']);
  expect(document.activeElement).toBe(switches()[0]);
  await act(async () => switches()[1].click());
  expect(state.update).toHaveBeenLastCalledWith({ autoPhrases: false });
  expect(switches().map(button => button.getAttribute('aria-checked'))).toEqual(['false', 'false']);
});

it('keeps the saved switch value and reports a failed save', async () => {
  state.update.mockRejectedValue(new Error('Storage unavailable'));
  await act(async () => root.render(<WritingSettings />));
  expect(switches()).toHaveLength(2);
  await act(async () => switches()[0].click());
  expect(switches()[0].getAttribute('aria-checked')).toBe('true');
  expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
});
