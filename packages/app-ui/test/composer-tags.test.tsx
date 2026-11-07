import { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Composer } from '@september/app-ui/blocks/composer';
import { InputLayer } from '@september/app-ui/blocks/input-layer';
import { TaggedText } from '@september/app-ui/blocks/tagged-text';
import { updateSetup } from '@september/app-ui/services/settings';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import type { MoodKey } from '@september/core/rules/moods';

import { press, renderPart } from './render';

/** A screen that holds the draft, the way Talk does. */
function Talk({
  initial,
  mood = null,
  onMood = () => {},
}: {
  initial: string;
  mood?: MoodKey | null;
  onMood?: (mood: MoodKey | null) => void;
}) {
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
        suggestions={false}
        mood={mood}
        onMood={onMood}
      />
    </>
  );
}

const labelled = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const draftOf = (container: HTMLElement) => container.querySelector('output')?.textContent;

/** The words a sighted person reads on a key, without hidden marks. */
const visibleText = (key: Element) =>
  [...key.childNodes]
    .filter(
      node =>
        !(node instanceof Element && (node.getAttribute('aria-hidden') === 'true' || node.classList.contains('sr-only'))),
    )
    .map(node => node.textContent)
    .join('')
    .trim();

describe('mood keys', () => {
  it('shows five mood keys in Talk and marks the mood in use', async () => {
    const { container } = await renderPart(<Talk initial="" mood="low" />);

    for (const name of ['Warm', 'Playful', 'Low', 'Frustrated', 'Angry']) {
      expect(labelled(container, `Mood: ${name}`)).not.toBeNull();
    }
    expect(labelled(container, 'Mood: Low')?.getAttribute('aria-pressed')).toBe('true');
    expect(labelled(container, 'Mood: Warm')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the name of the mood in use on its key', async () => {
    const { container } = await renderPart(<Talk initial="" mood="low" />);
    expect(visibleText(labelled(container, 'Mood: Low')!)).toBe('Low');
  });

  it('chooses a mood, and a second press on it clears the mood', async () => {
    const onMood = vi.fn();
    const { container } = await renderPart(<Talk initial="" mood="low" onMood={onMood} />);

    await press(labelled(container, 'Mood: Playful')!);
    expect(onMood).toHaveBeenLastCalledWith('playful');
    await press(labelled(container, 'Mood: Low')!);
    expect(onMood).toHaveBeenLastCalledWith(null);
  });
});

describe('console keys', () => {
  it('shows a label that starts the name of each key', async () => {
    const { container } = await renderPart(<Talk initial="so far" />);
    for (const name of ['Undo', 'Delete last word', 'Clear']) {
      const key = labelled(container, name)!;
      expect(visibleText(key)).not.toBe('');
      expect(name.startsWith(visibleText(key))).toBe(true);
    }
  });
});

describe('tags in the composer', () => {
  it('draws each tag of the draft as a chip behind the field', async () => {
    const { container } = await renderPart(<Talk initial="[laughs] That is funny." />);
    expect([...container.querySelectorAll('[data-tag]')].map(one => one.textContent)).toEqual(['[laughs]']);
  });

  it('removes a whole tag with Backspace', async () => {
    const { container } = await renderPart(<Talk initial="so [clears throat] " />);
    const field = container.querySelector('textarea')!;
    field.setSelectionRange(field.value.length, field.value.length);

    await act(async () => {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    });

    expect(draftOf(container)).toBe('so ');
  });

  it('removes a whole tag with Delete last word', async () => {
    const { container } = await renderPart(<Talk initial="so [clears throat] " />);
    await press(labelled(container, 'Delete last word')!);
    expect(draftOf(container)).toBe('so ');
  });
});

describe('tagged text', () => {
  it('shows each tag of a message as a chip with the words of the tag', async () => {
    const { container } = await renderPart(
      <p>
        <TaggedText text="[laughs] That is funny." />
      </p>,
    );

    expect([...container.querySelectorAll('[data-tag]')].map(one => one.textContent)).toEqual(['laughs']);
    expect(container.querySelector('p')?.textContent).toBe('laughs That is funny.');
  });
});

it('scans the edit keys, then the voice keys, as groups', async () => {
  await updateSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
  await renderPart(
    <>
      <InputLayer />
      <Talk initial="Hello there" />
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
