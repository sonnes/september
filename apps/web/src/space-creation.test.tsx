// @vitest-environment jsdom
import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { SpacesScreen } from '@september/app-ui/pages/spaces';
import { SpaceDock, useSpaceBySlug } from '@september/app-ui/blocks/space';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  create: vi.fn(),
  hasWriting: true,
  agentEnabled: true,
  fetching: false,
  spaces: [] as { id: string; title: string; updated_at: number }[],
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => state.navigate }));

vi.mock('@platform/services/ai', () => ({
  hasWritingService: () => state.hasWriting,
  generate: vi.fn(),
  itemsFrom: () => [],
  userContext: () => '',
}));

vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({
    data: state.spaces,
    isPending: false,
    isFetching: state.fetching,
    error: null,
  }),
  useCreateSpace: () => ({ mutateAsync: state.create, isPending: false }),
  useDeleteSpace: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSpace: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useMessages: () => ({ data: [] }),
  usePhrases: () => ({ data: [] }),
}));

vi.mock('@platform/services/os', () => ({
  currentSetup: () => ({ agentEnabled: state.agentEnabled }),
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
  useSuggestions: () => [],
  applySuggestion: (text: string) => text,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The sidebar asks the window how wide it is. jsdom has no media queries.
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
  state.create.mockReset();
  state.hasWriting = true;
  state.agentEnabled = true;
  state.fetching = false;
  state.spaces = [];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

let client: QueryClient;

const show = async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <SidebarProvider>
          <SpacesScreen />
        </SidebarProvider>
      </QueryClientProvider>
    )
  );
};

const press = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find(
    one => one.textContent?.includes(label) || one.getAttribute('aria-label') === label
  );
  if (!button) throw new Error(`No button says ${label}`);
  await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

describe('making a space', () => {
  it('makes the space at once and opens its agent', async () => {
    state.create.mockResolvedValue({ id: 's2', title: 'Amber Cedar Meadow' });

    await show();
    await press('Create your first space');

    expect(state.create).toHaveBeenCalledWith(expect.any(String));
    expect(state.navigate).toHaveBeenCalledWith({
      to: '/spaces/$slug/agent',
      params: { slug: 'amber-cedar-meadow' },
    });
  });

  // With no service to ask what the space is for, the space opens where the
  // user can use it straight away.
  it('opens Talk when no writing service is connected', async () => {
    state.hasWriting = false;
    state.create.mockResolvedValue({ id: 's2', title: 'Amber Cedar Meadow' });

    await show();
    await press('Create your first space');

    expect(state.navigate).toHaveBeenCalledWith({
      to: '/spaces/$slug/talk',
      params: { slug: 'amber-cedar-meadow' },
    });
  });
  it('opens Talk when the agent is off', async () => {
    state.agentEnabled = false;
    state.create.mockResolvedValue({ id: 's2', title: 'Amber Cedar Meadow' });

    await show();
    await press('Create your first space');

    expect(state.navigate).toHaveBeenCalledWith({
      to: '/spaces/$slug/talk',
      params: { slug: 'amber-cedar-meadow' },
    });
  });
});

describe('opening the space that was just made', () => {
  // The screen it opens finds its space by slug in the cached list. Arriving
  // before that list holds the space would send the user straight back here.
  it('puts the space in the list before it goes there', async () => {
    const space = { id: 's2', title: 'Amber Cedar Meadow', updated_at: 3 };
    state.create.mockResolvedValue(space);

    let listed: unknown;
    state.navigate.mockImplementation(() => {
      listed = client.getQueryData(['spaces']);
    });

    await show();
    await press('Create your first space');

    expect(state.navigate).toHaveBeenCalled();
    expect(listed).toEqual([space]);
  });

  it('keeps the space it already knows about once', async () => {
    const space = { id: 's2', title: 'Amber Cedar Meadow', updated_at: 3 };
    state.create.mockResolvedValue(space);

    let listed: unknown;
    state.navigate.mockImplementation(() => {
      listed = client.getQueryData(['spaces']);
    });

    await show();
    client.setQueryData(['spaces'], [space]);
    await press('Create your first space');

    expect(listed).toEqual([space]);
  });
});

function Probe({ slug }: { slug: string }) {
  const { space } = useSpaceBySlug(slug, 'agent');
  return <span>{space?.title ?? 'none'}</span>;
}

describe('a space whose name changes under the address', () => {
  // The first turn of a new space renames it while the user watches.
  it('follows the rename instead of leaving the space', async () => {
    state.spaces = [{ id: 's1', title: 'Amber Cedar Meadow', updated_at: 1 }];
    await act(async () => root.render(<Probe slug="amber-cedar-meadow" />));
    expect(container.textContent).toBe('Amber Cedar Meadow');

    state.spaces = [{ id: 's1', title: 'Mum', updated_at: 2 }];
    await act(async () => root.render(<Probe slug="amber-cedar-meadow" />));

    expect(state.navigate).toHaveBeenCalledWith({
      to: '/spaces/$slug/agent',
      params: { slug: 'mum' },
      replace: true,
    });
    expect(container.textContent).toBe('Mum');
  });

  it('goes back to the list when the space is really gone', async () => {
    state.spaces = [];
    await act(async () => root.render(<Probe slug="deleted" />));

    expect(state.navigate).toHaveBeenCalledWith({ to: '/spaces', replace: true });
  });

  // A list still being read says nothing about whether a space is there.
  it('waits for the list before it calls a space gone', async () => {
    state.spaces = [];
    state.fetching = true;
    await act(async () => root.render(<Probe slug="amber-cedar-meadow" />));
    expect(state.navigate).not.toHaveBeenCalled();

    state.fetching = false;
    await act(async () => root.render(<Probe slug="amber-cedar-meadow" />));
    expect(state.navigate).toHaveBeenCalledWith({ to: '/spaces', replace: true });
  });
});

describe('the space mode control', () => {
  const space = { id: 's1', title: 'Mum', updated_at: 1 } as Parameters<typeof SpaceDock>[0]['current'];
  const tabs = async () => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    client = new QueryClient();
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <SpaceDock current={space} spaces={[space]} mode="talk" onMode={vi.fn()} />
        </QueryClientProvider>
      )
    );
    return [...container.querySelectorAll('[role="tab"]')].map(tab => tab.textContent);
  };

  it('offers Agent while the agent is on', async () => {
    expect(await tabs()).toContain('Agent');
  });

  it('hides Agent when the agent is off', async () => {
    state.agentEnabled = false;
    expect(await tabs()).toEqual(['Talk', 'Notes']);
  });
});
