import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Composer } from '@september/app-ui/blocks/space';
import { InputLayer } from '@september/app-ui/blocks/access';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import type { MoodKey } from '@september/core/rules/moods';

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));
vi.mock('@platform/services/os', () => ({
  chooseOutput: async () => undefined,
  currentOutput: async () => '',
  currentSetup: () => null,
  subscribeSetup: () => () => {},
  listOutputs: async () => [],
  rememberModes: async () => undefined,
  spaceModes: {},
  startVirtualMicrophone: async () => ({}),
  stopVirtualMicrophone: async () => ({}),
  virtualMicrophoneStatus: async () => ({ uid: 'unavailable-in-browser', active: false }),
}));
vi.mock('@platform/services/data', () => ({
  useCreateSpace: () => ({}), useSpaces: () => ({ data: [] }), useUpdateSpace: () => ({}),
}));
vi.mock('@platform/services/ai', () => ({ hasWritingService: () => false }));
vi.mock('@september/app-ui/blocks/suggestions', () => ({ Suggestions: () => null }));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
});

const onMood = vi.fn();

function Harness({ initial, mood = null }: { initial: string; mood?: MoodKey | null }) {
  const [draft, setDraft] = useState(initial);
  return (
    <>
      <output>{draft}</output>
      <Composer
        mode="talk"
        spaceId="space"
        context=""
        draft={draft}
        onDraft={setDraft}
        onAction={() => {}}
        onPin={() => {}}
        suggestions={false}
        mood={mood}
        onMood={onMood}
      />
    </>
  );
}

async function render(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(<QueryClientProvider client={client}>{element}</QueryClientProvider>));
}

const labelled = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const draft = () => container.querySelector('output')?.textContent;
/** The words a sighted user reads on a key, without hidden marks. */
const visibleText = (key: Element) =>
  [...key.childNodes]
    .filter(node => !(node instanceof Element && (node.getAttribute('aria-hidden') === 'true' || node.classList.contains('sr-only'))))
    .map(node => node.textContent)
    .join('')
    .trim();

describe('mood keys', () => {
  it('shows five mood keys in Talk and marks the mood in use', async () => {
    onMood.mockReset();
    await render(<Harness initial="" mood="low" />);

    for (const name of ['Warm', 'Playful', 'Low', 'Frustrated', 'Angry']) {
      expect(labelled(`Mood: ${name}`)).not.toBeNull();
    }
    expect(labelled('Mood: Low')?.getAttribute('aria-pressed')).toBe('true');
    expect(labelled('Mood: Warm')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the name of the mood in use on its key', async () => {
    await render(<Harness initial="" mood="low" />);
    expect(visibleText(labelled('Mood: Low')!)).toBe('Low');
  });

  it('chooses a mood, and a second press on it clears the mood', async () => {
    onMood.mockReset();
    await render(<Harness initial="" mood="low" />);

    await act(async () => labelled('Mood: Playful')!.click());
    expect(onMood).toHaveBeenLastCalledWith('playful');
    await act(async () => labelled('Mood: Low')!.click());
    expect(onMood).toHaveBeenLastCalledWith(null);
  });
});

describe('console keys', () => {
  it('shows a label that starts the name of each key', async () => {
    await render(<Harness initial="so far" />);
    for (const name of ['Undo', 'Delete last word', 'Clear']) {
      const key = labelled(name)!;
      expect(visibleText(key)).not.toBe('');
      expect(name.startsWith(visibleText(key))).toBe(true);
    }
  });
});

describe('tags in the composer', () => {
  it('draws each tag of the draft as a chip behind the field', async () => {
    await render(<Harness initial="[laughs] That is funny." />);
    const chips = [...container.querySelectorAll('[data-tag]')].map(one => one.textContent);
    expect(chips).toEqual(['[laughs]']);
  });

  it('removes a whole tag with Backspace', async () => {
    await render(<Harness initial="so [clears throat] " />);
    const field = container.querySelector('textarea')!;
    field.setSelectionRange(field.value.length, field.value.length);

    await act(async () => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    });

    expect(draft()).toBe('so ');
  });

  it('removes a whole tag with Delete last word', async () => {
    await render(<Harness initial="so [clears throat] " />);
    await act(async () => labelled('Delete last word')!.click());
    expect(draft()).toBe('so ');
  });
});

describe('tagged text', () => {
  it('shows each tag of a message as a chip with the words of the tag', async () => {
    const { TaggedText } = await vi.importActual<typeof import('@september/app-ui/blocks/suggestions')>(
      '@september/app-ui/blocks/suggestions',
    );
    await render(<p><TaggedText text="[laughs] That is funny." /></p>);

    expect([...container.querySelectorAll('[data-tag]')].map(one => one.textContent)).toEqual(['laughs']);
    expect(container.querySelector('p')?.textContent).toBe('laughs That is funny.');
  });
});

it('scans the edit keys, then the voice keys, as groups', async () => {
  await render(
    <>
      <InputLayer profile={{ ...DEFAULT_ACCESS, input: 'switch' }} />
      <Harness initial="Hello there" />
    </>,
  );
  const step = () =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
  const band = () => document.querySelector<HTMLElement>('[data-scan="group"]');

  step();
  expect(band()?.textContent).toContain('Undo');
  expect(band()?.textContent).not.toContain('Speak');
  step();
  expect(band()?.textContent).toContain('Speak');
});
