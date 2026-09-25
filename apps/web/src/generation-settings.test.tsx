import React, { act } from 'react';

import { WritingSettings } from '@september/app-ui/pages/settings';
import { AGENT_MODELS, SUGGESTIONS_MODELS } from '@september/core/rules/model-config';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { DEFAULT_DRAFT } from './rules/onboarding';

const state = vi.hoisted(() => ({
  setup: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
  update: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params: _params, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
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
    readConnections: async () => ({
      ...actual.BLANK_CONNECTIONS,
      openrouter: { provider: 'openrouter', connected: true, label: 'Key', detail: null },
    }),
  };
});
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  state.setup = {
    ...DEFAULT_DRAFT,
    defaultModel: { service: 'openrouter', model: '' },
    suggestionsModel: null,
    autoSuggestions: true,
    autoPhrases: true,
    agentEnabled: true,
  };
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

async function render() {
  await act(async () => root.render(<WritingSettings />));
}

function switches() {
  return [...container.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
}

function section(title: string): HTMLElement {
  const found = [...container.querySelectorAll('section')].find(
    one => one.querySelector('h2')?.textContent === title,
  );
  if (!found) throw new Error(`No section named ${title}`);
  return found;
}

function row(within: HTMLElement, name: string): HTMLButtonElement {
  const found = [...within.querySelectorAll<HTMLButtonElement>('button')].find(button =>
    button.textContent?.startsWith(name),
  );
  if (!found) throw new Error(`No row named ${name}`);
  return found;
}

it('saves the suggestions, phrases, and agent switches independently and retains focus', async () => {
  await render();
  expect(switches()).toHaveLength(3);
  switches()[0].focus();
  await act(async () => switches()[0].click());
  expect(state.update).toHaveBeenLastCalledWith({ autoSuggestions: false });
  expect(document.activeElement).toBe(switches()[0]);
  await act(async () => switches()[1].click());
  expect(state.update).toHaveBeenLastCalledWith({ autoPhrases: false });
  await act(async () => switches()[2].click());
  expect(state.update).toHaveBeenLastCalledWith({ agentEnabled: false });
  expect(switches().map(button => button.getAttribute('aria-checked'))).toEqual([
    'false',
    'false',
    'false',
  ]);
});

it('keeps the saved switch value and reports a failed save', async () => {
  state.update.mockRejectedValue(new Error('Storage unavailable'));
  await render();
  await act(async () => switches()[0].click());
  expect(switches()[0].getAttribute('aria-checked')).toBe('true');
  expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
});

it('saves the suggestions model without changing the agent model', async () => {
  await render();
  const model = SUGGESTIONS_MODELS[0];
  await act(async () => row(section('Suggestions'), model.name).click());
  expect(state.update).toHaveBeenLastCalledWith({
    suggestionsModel: { service: 'openrouter', model: model.id },
  });
  expect(state.setup.defaultModel).toEqual({ service: 'openrouter', model: '' });
});

it('saves the agent and phrases model as the default model', async () => {
  await render();
  const model = AGENT_MODELS[0];
  await act(async () => row(section('Agent and phrases'), model.name).click());
  expect(state.update).toHaveBeenLastCalledWith({
    defaultModel: { service: 'openrouter', model: model.id },
  });
});

it('saves Automatic as an empty model', async () => {
  state.setup.defaultModel = { service: 'openrouter', model: AGENT_MODELS[0].id };
  await render();
  await act(async () => row(section('Agent and phrases'), 'Automatic').click());
  expect(state.update).toHaveBeenLastCalledWith({
    defaultModel: { service: 'openrouter', model: '' },
  });
});

it('shows a saved model that is not on the list as the chosen first row', async () => {
  state.setup.defaultModel = { service: 'openrouter', model: 'vendor/old-model' };
  await render();
  const chosen = section('Agent and phrases').querySelector('[aria-current="true"]');
  expect(chosen?.textContent).toContain('vendor/old-model');
});

it('moves both models to a new provider', async () => {
  state.setup.suggestionsModel = { service: 'openrouter', model: SUGGESTIONS_MODELS[0].id };
  await render();
  const none = [...section('Provider').querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    radio => radio.closest('label')?.textContent?.includes('No AI Assistance'),
  );
  await act(async () => none!.click());
  expect(state.update).toHaveBeenLastCalledWith({
    defaultModel: { service: 'none', model: '' },
    suggestionsModel: { service: 'none', model: SUGGESTIONS_MODELS[0].id },
  });
  expect(switches()).toHaveLength(0);
});

it('shows the instructions field only for a custom speaking style', async () => {
  await render();
  expect(container.querySelector('textarea')).toBeNull();
  await act(async () => row(section('Speaking style'), 'Custom').click());
  expect(container.querySelector('textarea')).not.toBeNull();
  await act(async () => row(section('Speaking style'), 'Plain').click());
  expect(container.querySelector('textarea')).toBeNull();
});
