// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { NotesScreen } from '@september/app-ui/pages/notes';
import { axeViolations } from './axe';

const note = (id: string, name: string, content: string, updated_at: number) => ({
  id,
  space_id: 'space',
  user_id: 'user',
  name,
  content,
  created_at: 1,
  updated_at,
});

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  create: vi.fn(async () => ({ id: 'new', name: null, content: '' })),
  notes: [] as unknown[],
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => state.navigate }));
vi.mock('@platform/services/os', () => ({
  fullScreen: async () => undefined,
  currentPresent: () => ({ tone: 'indigo', spoken: false }),
  rememberPresent: async () => undefined,
  guardUnsavedChanges: () => () => {},
  currentSetup: () => null,
  spaceModes: {},
  rememberModes: async () => undefined,
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({
    data: [{ id: 'space', title: 'Family', context: 'Home and school' }],
    isPending: false,
    isFetching: false,
  }),
  useCreateSpace: () => ({}),
  useUpdateSpace: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useNotes: () => ({ data: state.notes }),
  useCreateNote: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateNote: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
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
  state.navigate.mockReset();
  state.create.mockClear();
  state.notes = [
    note('holiday', 'Holiday', 'Holiday\nI want you to bring a paper.', Date.now()),
    note('doctor', 'Questions for Dr. Rao', 'Can we try a smaller dose?', Date.now() - 86_400_000),
  ];
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(noteSlug?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <SidebarProvider>
          <NotesScreen slug="family" noteSlug={noteSlug} />
        </SidebarProvider>
      </QueryClientProvider>,
    ),
  );
}

const list = () => container.querySelector('nav[aria-label="Notes"]')!;
const rows = () => [...list().querySelectorAll<HTMLButtonElement>('[data-note-row]')];
const button = (name: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (one) => (one.getAttribute('aria-label') ?? one.textContent?.trim()) === name,
  )!;

describe('the list of notes', () => {
  it('shows About first, then each note with its first line of words', async () => {
    await render('holiday');
    const text = rows().map((row) => row.textContent);
    expect(text[0]).toContain('About this space');
    expect(text[0]).toContain('Home and school');
    expect(text[1]).toContain('Holiday');
    expect(text[1]).toContain('I want you to bring a paper.');
    expect(text[2]).toContain('Questions for Dr. Rao');
  });

  it('marks the open note, and opens another note from its row', async () => {
    await render('holiday');
    expect(rows()[1].getAttribute('aria-current')).toBe('page');
    await act(async () => rows()[2].click());
    expect(state.navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: { slug: 'family', noteSlug: 'questions-for-dr-rao' } }),
    );
  });

  it('opens About from its row', async () => {
    await render('holiday');
    await act(async () => rows()[0].click());
    expect(container.querySelector('[aria-label="About this space"][role="textbox"]')).not.toBeNull();
    expect(rows()[0].getAttribute('aria-current')).toBe('page');
  });

  it('makes a note from New note', async () => {
    await render('holiday');
    await act(async () => button('New note').click());
    expect(state.create).toHaveBeenCalled();
  });

  it('goes back to the list from the note, and to the note from a row', async () => {
    await render('holiday');
    const pane = () => container.querySelector('[data-pane]')?.getAttribute('data-pane');
    expect(pane()).toBe('note');
    await act(async () => button('All notes').click());
    expect(pane()).toBe('list');
    await act(async () => rows()[1].click());
    expect(pane()).toBe('note');
  });

  it('names the key back to the list by the words it shows', async () => {
    await render('holiday');
    const back = button('All notes');
    expect(back.hasAttribute('aria-label')).toBe(false);
    expect(back.textContent?.trim()).toBe('All notes');
  });

  it('finds a note by its words when the list is long', async () => {
    state.notes = ['One', 'Two', 'Three', 'Four', 'Five'].map((name, index) =>
      note(name.toLowerCase(), name, `${name} words`, index),
    );
    await render('one');
    // The field is found by its visible label, as a user finds it.
    const search = [...container.querySelectorAll('label')].find(
      (label) => label.textContent?.trim() === 'Search notes',
    )?.control as HTMLInputElement;
    expect(search).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'four');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(rows().map((row) => row.textContent)).toEqual([expect.stringContaining('Four')]);
  });
});

it('passes the axe rules that jsdom can run', async () => {
  await render('one');
  expect(await axeViolations(container)).toEqual([]);
});
