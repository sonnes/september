// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { ChromeContext } from '@september/app-ui/blocks/chrome';
import { Composer } from '@september/app-ui/blocks/space';
import { TalkScreen } from '@september/app-ui/pages/talk';
import type { MoodKey } from '@september/core/rules/moods';

const SPACES = [
  { id: 'space', title: 'Family', context: 'Home', updated_at: 2 },
  { id: 'other', title: 'Work', context: 'Office', updated_at: 1 },
];

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));
vi.mock('@platform/services/os', () => ({
  readTalkDraft: async () => '',
  saveTalkDraft: async () => undefined,
  readTalkMood: async () => null,
  saveTalkMood: async () => undefined,
  guardUnsavedChanges: () => () => {},
  chooseOutput: async () => undefined,
  currentOutput: async () => '',
  currentSetup: () => null,
  listOutputs: async () => [],
  rememberModes: async () => undefined,
  spaceModes: {},
  startVirtualMicrophone: async () => ({}),
  stopVirtualMicrophone: async () => ({}),
  virtualMicrophoneStatus: async () => ({ uid: 'unavailable-in-browser', active: false }),
}));
vi.mock('@platform/services/data', () => ({
  useSpaces: () => ({ data: SPACES, isPending: false, isFetching: false }),
  useCreateSpace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSpace: () => ({ mutate: vi.fn() }),
  useMessages: () => ({ data: [] }),
  usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: () => {} }),
  useSendMessage: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock('@platform/services/ai', () => ({ hasWritingService: () => false }));
vi.mock('@platform/services/phrase-sync', () => ({ useSyncPhrases: () => {} }));
vi.mock('@platform/services/usage', () => ({ recordMessageUsage: async () => {} }));
vi.mock('@platform/services/speech', () => ({
  speak: async () => true,
  stopSpeaking: () => {},
  useSpeaking: () => null,
  useVoiceFallback: () => null,
}));
vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));
vi.mock('@september/app-ui/blocks/suggestions', () => ({ Suggestions: () => null, TaggedText: ({ text }: { text: string }) => <>{text}</> }));

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

const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
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

const modeSwitch = () => container.querySelector('[role="tablist"][aria-label="Space mode"]');
const spaceTabs = () => container.querySelector('[role="group"][aria-label="Switch space"]');

describe('the chrome of a screen', () => {
  it('draws the dock with the mode switch and the space tabs in the shell', async () => {
    await render(<TalkScreen slug="family" />);
    await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull());

    expect(modeSwitch()).not.toBeNull();
    expect(spaceTabs()).not.toBeNull();
  });

  it('leaves the dock to the panel header in the panel', async () => {
    await render(
      <ChromeContext.Provider value="panel">
        <TalkScreen slug="family" />
      </ChromeContext.Provider>,
    );
    await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull());

    expect(modeSwitch()).toBeNull();
    expect(spaceTabs()).toBeNull();
  });
});

const onMood = vi.fn();

function Harness({ initial }: { initial: MoodKey | null }) {
  const [mood, setMood] = useState(initial);
  return (
    <Composer
      mode="talk"
      spaceId="space"
      context=""
      draft=""
      onDraft={() => {}}
      onAction={() => {}}
      onPin={() => {}}
      suggestions={false}
      mood={mood}
      onMood={(next) => {
        onMood(next);
        setMood(next);
      }}
    />
  );
}

function openMoodMenu() {
  const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"][aria-label^="Mood menu"]');
  expect(trigger).not.toBeNull();
  act(() => {
    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}

function chooseInMenu(name: string) {
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find((one) =>
    one.textContent?.includes(name),
  );
  expect(item).toBeDefined();
  act(() => item!.click());
}

describe('the mood menu', () => {
  it('sets the mood, and a second choice of the same mood clears it', async () => {
    onMood.mockReset();
    await render(<Harness initial={null} />);

    openMoodMenu();
    chooseInMenu('Frustrated');
    expect(onMood).toHaveBeenLastCalledWith('frustrated');

    openMoodMenu();
    chooseInMenu('Frustrated');
    expect(onMood).toHaveBeenLastCalledWith(null);
  });

  it('clears the mood with No mood', async () => {
    onMood.mockReset();
    await render(<Harness initial="low" />);

    openMoodMenu();
    chooseInMenu('No mood');
    expect(onMood).toHaveBeenLastCalledWith(null);
  });
});
