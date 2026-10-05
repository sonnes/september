// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@september/ui/components/sidebar';
import { ChromeContext, PanelContext, type Tier } from '@september/app-ui/blocks/chrome';
import { Composer } from '@september/app-ui/blocks/space';
import { TalkScreen } from '@september/app-ui/pages/talk';
import type { MoodKey } from '@september/core/rules/moods';

const messages = vi.hoisted(() => ({ list: [] as { id: string; type: string; text: string; created_at: number }[] }));

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
  currentOutput: async () => 'speakers',
  currentSetup: () => null,
  listOutputs: async () => [{ uid: 'speakers', name: 'MacBook Pro Speakers' }],
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
  useMessages: () => ({ data: messages.list }),
  usePhrases: () => ({ data: [] }),
  usePutPhrase: () => ({ mutate: () => {} }),
  useSendMessage: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock('@platform/services/ai', () => ({ hasWritingService: () => false }));
vi.mock('@platform/services/phrase-sync', () => ({ useSyncPhrases: () => {} }));
vi.mock('@platform/services/usage', () => ({ recordMessageUsage: async () => {} }));
const voice = vi.hoisted(() => ({ speaking: null as string | null, listeners: new Set<() => void>() }));
const setSpeaking = (id: string | null) => {
  voice.speaking = id;
  for (const listener of voice.listeners) listener();
};
vi.mock('@platform/services/speech', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    speak: async (_text: string, id = 'composer') => {
      setSpeaking(id);
      return true;
    },
    stopSpeaking: () => setSpeaking(null),
    useSpeaking: () =>
      useSyncExternalStore(
        (listener: () => void) => {
          voice.listeners.add(listener);
          return () => voice.listeners.delete(listener);
        },
        () => voice.speaking,
      ),
    useVoiceFallback: () => null,
  };
});
vi.mock('@september/app-ui/blocks/space-panel', () => ({ PanelRail: () => null }));
vi.mock('@september/app-ui/blocks/suggestions', () => ({
  Suggestions: () => <p>The suggestions</p>,
  TaggedText: ({ text }: { text: string }) => <>{text}</>,
}));

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

function InPanel({ tier, children }: { tier: Tier; children: React.ReactNode }) {
  return (
    <ChromeContext.Provider value="panel">
      <PanelContext.Provider
        value={{ tier, composer: { current: null }, outputOpen: false, setOutputOpen: () => {}, rail: null }}
      >
        {children}
      </PanelContext.Provider>
    </ChromeContext.Provider>
  );
}

const moodKeys = () => container.querySelectorAll('button[aria-label^="Mood: "]');
const moodMenu = () => container.querySelector('button[aria-label^="Mood menu"]');
const clearKey = () => container.querySelector('button[aria-label="Clear"]');

describe('the sound output key', () => {
  it('names the output and the state of the call microphone', async () => {
    await render(<Harness initial={null} />);

    await vi.waitFor(() =>
      expect(
        container.querySelector('button[aria-label="Sound output: MacBook Pro Speakers. September Microphone off"]'),
      ).not.toBeNull(),
    );
  });
});

describe('the composer in the panel', () => {
  it('shows the five mood keys and Clear in the regular tier', async () => {
    await render(
      <InPanel tier="regular">
        <Harness initial={null} />
      </InPanel>,
    );

    expect(moodKeys()).toHaveLength(5);
    expect(clearKey()).not.toBeNull();
    expect(moodMenu()).toBeNull();
  });

  it('shows one mood menu key in the compact tier', async () => {
    await render(
      <InPanel tier="compact">
        <Harness initial={null} />
      </InPanel>,
    );

    expect(moodMenu()).not.toBeNull();
    expect(moodKeys()).toHaveLength(0);
  });
});

const named = (name: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (one) => one.textContent?.trim() === name || one.getAttribute('aria-label') === name,
  );
const spokenRows = () =>
  [...container.querySelectorAll('button[aria-label="Speak this message again"]')].map(
    (row) => row.querySelector('span')?.textContent,
  );

async function renderTalk(count: number) {
  messages.list = Array.from({ length: count }, (_, at) => ({
    id: `m${at + 1}`,
    type: 'user',
    text: `Message ${at + 1}`,
    created_at: Date.now() - (count - at) * 60_000,
  }));
  await render(<TalkScreen slug="family" />);
  await vi.waitFor(() => expect(container.querySelector('textarea')).not.toBeNull());
}

describe('the history of Talk', () => {
  afterEach(() => {
    messages.list = [];
    setSpeaking(null);
  });

  it('shows the last three messages over the suggestions', async () => {
    await renderTalk(10);

    expect(spokenRows()).toEqual(['Message 8', 'Message 9', 'Message 10']);
    expect(container.textContent).toContain('The suggestions');
  });

  it('shows a page of all messages in place of the suggestions, and goes back', async () => {
    await renderTalk(10);

    act(() => named('See all')!.click());
    expect(spokenRows()).toEqual(['Message 3', 'Message 4', 'Message 5', 'Message 6', 'Message 7', 'Message 8', 'Message 9', 'Message 10']);
    expect(container.textContent).not.toContain('The suggestions');

    act(() => named('Earlier messages')!.click());
    expect(spokenRows()).toEqual(['Message 1', 'Message 2']);

    act(() => named('Back to suggestions')!.click());
    expect(spokenRows()).toEqual(['Message 8', 'Message 9', 'Message 10']);
    expect(container.textContent).toContain('The suggestions');
  });

  it('goes back to the suggestions with Escape', async () => {
    await renderTalk(10);

    act(() => named('See all')!.click());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(spokenRows()).toHaveLength(3);
  });

  it('speaks a message again with a press on it', async () => {
    await renderTalk(2);

    act(() => (container.querySelector('button[aria-label="Speak this message again"]') as HTMLButtonElement).click());
    expect(voice.speaking).toBe('m1');
  });
});

function typeAndSpeak(text: string) {
  const field = container.querySelector('textarea')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}

const speakingCard = () => container.querySelector('[role="region"][aria-label="Speaking"]');

describe('the speaking card', () => {
  afterEach(() => setSpeaking(null));

  it('takes the place of the field while the sentence plays, and Stop gives it back', async () => {
    await renderTalk(0);

    typeAndSpeak('Hello there');
    expect(speakingCard()?.textContent).toContain('Hello there');
    expect(container.querySelector('textarea')).toBeNull();

    act(() => named('Stop')!.click());
    expect(voice.speaking).toBeNull();
    expect(speakingCard()).toBeNull();
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('gives the field back with Write next while the voice goes on', async () => {
    await renderTalk(0);

    typeAndSpeak('Hello there');
    act(() => named('Write next')!.click());
    expect(container.querySelector('textarea')).not.toBeNull();
    expect(voice.speaking).toBe('composer');
  });
});
