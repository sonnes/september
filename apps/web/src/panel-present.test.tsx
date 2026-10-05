// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { ChromeContext } from '@september/app-ui/blocks/chrome';
import { NotesScreen } from '@september/app-ui/pages/notes';

const NOTE = {
  id: 'note',
  space_id: 'space',
  user_id: 'user',
  name: 'Questions',
  content: 'Can we try a smaller dose?',
  created_at: 1,
  updated_at: 1,
};

const state = vi.hoisted(() => ({
  fullScreen: vi.fn(async (_on: boolean) => undefined),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));
vi.mock('@platform/services/os', () => ({
  fullScreen: state.fullScreen,
  currentPresent: () => ({ tone: 'indigo', spoken: false }),
  rememberPresent: async () => undefined,
  guardUnsavedChanges: () => () => {},
  currentSetup: () => null,
  spaceModes: {},
  rememberModes: async () => undefined,
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: [{ id: 'space', title: 'Family', context: 'Home' }], isPending: false, isFetching: false }),
  useCreateSpace: () => ({}),
  useUpdateSpace: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useNotes: () => ({ data: [NOTE] }),
  useCreateNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
  usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: vi.fn() }),
}));
vi.mock('@platform/services/ai', () => ({ hasWritingService: () => false }));
vi.mock('@platform/services/export', () => ({
  exportUnavailable: () => null,
  saveNoteAudio: vi.fn(),
  saveNoteText: vi.fn(),
  saveNoteVideo: vi.fn(),
}));
vi.mock('@platform/services/speech', () => ({
  speak: async () => true,
  stopSpeaking: () => {},
  useSpeaking: () => null,
  useVoiceFallback: () => null,
}));
vi.mock('@platform/services/usage', () => ({ recordPresentUsage: async () => undefined }));
vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));
vi.mock('@september/app-ui/blocks/suggestions', () => ({ Suggestions: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  state.fullScreen.mockClear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <SidebarProvider>{element}</SidebarProvider>
      </QueryClientProvider>,
    ),
  );
}

const stage = () => document.querySelector('[role="dialog"][aria-modal="true"]');

function present() {
  const button = document.querySelector<HTMLButtonElement>('button[aria-label="Present this note"]');
  expect(button).not.toBeNull();
  act(() => button!.click());
}

function close() {
  const button = document.querySelector<HTMLButtonElement>('button[aria-label="Close the presentation"]');
  expect(button).not.toBeNull();
  act(() => button!.click());
}

describe('Present', () => {
  it('fills the screen while the panel presents a note', async () => {
    await render(
      <ChromeContext.Provider value="panel">
        <NotesScreen slug="family" noteSlug="questions" />
      </ChromeContext.Provider>,
    );

    present();

    expect(stage()?.textContent).toContain('Can we try a smaller dose?');
    expect(state.fullScreen).toHaveBeenLastCalledWith(true);

    close();

    expect(stage()).toBeNull();
    expect(state.fullScreen).toHaveBeenLastCalledWith(false);
  });

  it('opens the overlay in the web app, as today', async () => {
    await render(<NotesScreen slug="family" noteSlug="questions" />);

    present();

    expect(stage()?.getAttribute('aria-label')).toBe('Presenting Questions');
  });
});
