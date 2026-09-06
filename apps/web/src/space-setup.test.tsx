// @vitest-environment jsdom
import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { AgentScreen } from '@september/app-ui/pages/agent';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  ask: vi.fn(),
  patch: vi.fn(),
  space: { id: 's1', title: 'Untitled', context: '', updated_at: 1 },
  rows: [] as unknown[],
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => state.navigate }));

vi.mock('@platform/services/ai', () => ({
  hasWritingService: () => true,
  generate: vi.fn(),
  itemsFrom: () => [],
  userContext: () => '',
}));

vi.mock('@platform/services/agent', () => ({
  askAgent: state.ask,
  resolveAgentProposal: vi.fn(),
}));

vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: [state.space], isPending: false, isFetching: false }),
  useAgentMessages: () => ({ data: state.rows, error: null }),
  useAllMessages: () => ({ data: [] }),
  useUpdateSpace: () => ({ mutateAsync: state.patch, mutate: vi.fn() }),
  useCreateSpace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMessages: () => ({ data: [] }),
  usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: vi.fn() }),
}));

vi.mock('@platform/services/os', () => ({
  spaceModes: {},
  rememberModes: vi.fn(),
  listOutputs: vi.fn(async () => []),
  currentOutput: vi.fn(async () => ''),
  chooseOutput: vi.fn(),
  startVirtualMicrophone: vi.fn(),
  stopVirtualMicrophone: vi.fn(),
  virtualMicrophoneStatus: vi.fn(async () => ({ active: false, uid: '' })),
}));

vi.mock('@platform/services/suggest', () => ({
  useSuggestions: () => ({ data: [] }),
  applySuggestion: (text: string) => text,
}));

vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has neither of these, and the dock measures itself with one.
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = Observer as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView = () => undefined;

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  state.navigate.mockReset();
  state.ask.mockReset();
  state.patch.mockReset().mockResolvedValue(undefined);
  state.space = { id: 's1', title: 'Untitled', context: '', updated_at: 1 };
  state.rows = [];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

let client: QueryClient;

// A fresh element every time: React skips a render given the same one back.
const draw = () => (
  <QueryClientProvider client={client}>
    <SidebarProvider>
      <AgentScreen slug="untitled" />
    </SidebarProvider>
  </QueryClientProvider>
);

const show = async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(draw()));
};

/** The screen drawing again, the way a refreshed query makes it. */
const again = async () => {
  await act(async () => root.render(draw()));
};

const type = (text: string) => {
  const field = container.querySelector('textarea')!;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
    field,
    text
  );
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const press = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find(one =>
    one.textContent?.includes(label)
  );
  if (!button) throw new Error(`No button says ${label}`);
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

describe('the first message in a new space', () => {
  it('asks what the space is for', async () => {
    await show();

    expect(container.textContent).toContain('What is this space for?');
    expect(container.textContent).toContain('Set up space');
  });

  // The turn that sets a space up is a chain of model calls. A screen that
  // says nothing while it runs is a screen that looks like it lost the press.
  it('says that work is happening while the turn runs', async () => {
    let finish: () => void = () => undefined;
    state.ask.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));

    await show();
    await act(async () => type('I speak to my mum here.'));
    await press('Set up space');

    expect(state.ask).toHaveBeenCalledWith(
      state.space,
      'I speak to my mum here.',
      expect.objectContaining({ intro: true })
    );
    expect(container.textContent).toContain('Working…');

    await act(async () => finish());
  });

  // The description reaches the space before the model does, so the space
  // stops needing setup while the turn setting it up is still running.
  it('keeps the console it started in until the turn ends', async () => {
    let finish: () => void = () => undefined;
    state.ask.mockReturnValue(new Promise<void>(resolve => (finish = resolve)));
    state.patch.mockImplementation(async () => {
      state.space = { ...state.space, context: 'I speak to my mum here.' };
    });

    await show();
    await act(async () => type('I speak to my mum here.'));
    await press('Set up space');

    // The write asks for the space list again, and the space that comes back
    // is one that no longer needs setting up.
    await again();
    expect(container.textContent).toContain('Set up space');

    await act(async () => finish());
  });
});
