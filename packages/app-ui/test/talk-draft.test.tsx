import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stopSpeaking } from '@september/app-ui/services/speech';
import type { Message } from '@september/core/rules/records';
import { talkDraftKey, talkMoodKey } from '@september/core/rules/settings';

import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, typeInto } from './render';

const field = (container: HTMLElement) =>
  vi.waitFor(() => {
    const box = container.querySelector<HTMLTextAreaElement>('textarea');
    if (!box) throw new Error('No composer field');
    return box;
  });

/** Puts a message the person said in the space. */
function said(spaceId: string, id: string, text: string): Message {
  const message = { id, space_id: spaceId, user_id: 'local-user', text, type: 'user', created_at: Date.now() };
  rows.messages.set(id, message);
  return message;
}

/** The Speak key of the composer, not a Speak again row. */
const speakKey = (container: HTMLElement) =>
  findButton(/^Speak$/, container.querySelector('[role="group"][aria-label="Voice"]')!);

/** Opens Talk in Family, types `words`, and presses Speak. The voice keeps playing. */
async function speakWords(words: string) {
  vi.mocked(platform.voice.speakSystem).mockReturnValue(new Promise(() => {}));
  const { container } = await renderApp('/spaces/family/talk');
  await typeInto(await field(container), words);
  await press(await speakKey(container));
  return container;
}

afterEach(() => act(() => stopSpeaking()));

describe('the unfinished words of Talk', () => {
  it('keeps the words typed in a space and brings them back', async () => {
    await finishSetup();
    const space = addSpace('Family');
    rows.settings.set(talkDraftKey(space.id), 'hello ');

    const { container } = await renderApp('/spaces/family/talk');
    expect((await field(container)).value).toBe('hello ');

    await typeInto(await field(container), 'hello there');
    await vi.waitFor(() => expect(rows.settings.get(talkDraftKey(space.id))).toBe('hello there'));
  });

  it('keeps a phrase put in from the rail', async () => {
    await finishSetup();
    const space = addSpace('Family');
    rows.phrases.set('p1', {
      id: 'p1',
      space_id: space.id,
      text: 'Thank you',
      kind: 'phrase',
      pinned: true,
      created_at: 1,
      updated_at: 1,
    });

    const { container } = await renderApp('/spaces/family/talk');
    await field(container);
    await press(await findButton('Phrases', document.querySelector('[aria-label="Panel rail"]')!));
    const card = await vi.waitFor(() => {
      const aside = document.querySelector('aside');
      if (!aside) throw new Error('No rail card');
      return aside;
    });
    await press(await findButton('Thank you', card));

    expect((await field(container)).value).toBe('Thank you');
    await vi.waitFor(() => expect(rows.settings.get(talkDraftKey(space.id))).toBe('Thank you'));
  });

  it('clears the words, trailing spaces too, once the message is kept', async () => {
    await finishSetup();
    const space = addSpace('Family');
    rows.settings.set(talkDraftKey(space.id), 'hello ');

    const { container } = await renderApp('/spaces/family/talk');
    expect((await field(container)).value).toBe('hello ');
    await press(await speakKey(container));

    await vi.waitFor(() => expect([...rows.messages.values()].map(message => message.text)).toEqual(['hello']));
    await vi.waitFor(() => expect(container.querySelector('textarea')?.value).toBe(''));
    await vi.waitFor(() => expect(rows.settings.get(talkDraftKey(space.id))).toBe(''));
  });

  it('keeps words typed while the message is being kept', async () => {
    await finishSetup();
    const space = addSpace('Family');
    let keep!: () => void;
    vi.mocked(platform.store.putMessage).mockImplementationOnce(
      message =>
        new Promise(done => {
          keep = () => {
            rows.messages.set(message.id, message);
            done(message);
          };
        }),
    );

    const { container } = await renderApp('/spaces/family/talk');
    await typeInto(await field(container), 'hello');
    await press(await speakKey(container));
    await typeInto(await field(container), 'next thought');
    await act(async () => keep());

    expect(container.querySelector('textarea')?.value).toBe('next thought');
    await vi.waitFor(() => expect(rows.settings.get(talkDraftKey(space.id))).toBe('next thought'));
  });

  it('keeps the words and says so when the store refuses the message', async () => {
    await finishSetup();
    addSpace('Family');
    vi.mocked(platform.store.putMessage).mockRejectedValueOnce(new Error('disk full'));

    const { container } = await renderApp('/spaces/family/talk');
    await typeInto(await field(container), 'hello');
    await press(await speakKey(container));

    await vi.waitFor(() => expect(container.textContent).toMatch(/could not save the message/i));
    expect(rows.messages.size).toBe(0);
    expect(container.querySelector('textarea')?.value).toBe('hello');
  });

  it('says so when the store refuses to keep a phrase', async () => {
    await finishSetup();
    const space = addSpace('Family');
    rows.phrases.set('p1', {
      id: 'p1',
      space_id: space.id,
      text: 'Could I get a glass of water',
      kind: 'phrase',
      pinned: false,
      created_at: 1,
      updated_at: 1,
    });
    vi.mocked(platform.store.putPhrase).mockRejectedValueOnce(new Error('disk full'));

    const { container } = await renderApp('/spaces/family/talk');
    await typeInto(await field(container), 'Could');
    await press(await findButton('Keep this phrase', container));

    await vi.waitFor(() => expect(container.textContent).toMatch(/could not keep the phrase/i));
    expect(rows.phrases.get('p1')?.pinned).toBe(false);
  });
});

describe('the mood of a Talk space', () => {
  it('brings back the mood of the space and keeps a new one', async () => {
    await finishSetup();
    const space = addSpace('Family');
    rows.settings.set(talkMoodKey(space.id), 'low');

    const { container } = await renderApp('/spaces/family/talk');
    const low = await findButton('Mood: Low', container);
    await vi.waitFor(() => expect(low.getAttribute('aria-pressed')).toBe('true'));

    await press(await findButton('Mood: Playful', container));

    await vi.waitFor(() => expect(rows.settings.get(talkMoodKey(space.id))).toBe('playful'));
    await vi.waitFor(async () =>
      expect((await findButton('Mood: Playful', container)).getAttribute('aria-pressed')).toBe('true'),
    );
    expect((await findButton('Mood: Low', container)).getAttribute('aria-pressed')).toBe('false');
  });

  it('puts the mood back and says so when the store refuses it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await finishSetup();
    const space = addSpace('Family');
    rows.settings.set(talkMoodKey(space.id), 'low');
    vi.mocked(platform.store.putSetting).mockImplementation(async key => {
      if (key === talkMoodKey(space.id)) throw new Error('disk full');
    });

    const { container } = await renderApp('/spaces/family/talk');
    const low = await findButton('Mood: Low', container);
    await vi.waitFor(() => expect(low.getAttribute('aria-pressed')).toBe('true'));
    await press(await findButton('Mood: Playful', container));

    await vi.waitFor(() => expect(container.textContent).toContain('did not keep the mood'));
    expect((await findButton('Mood: Low', container)).getAttribute('aria-pressed')).toBe('true');
    expect(rows.settings.get(talkMoodKey(space.id))).toBe('low');
  });
});

describe('the messages of Talk', () => {
  beforeEach(async () => {
    await finishSetup();
    addSpace('Family', { context: 'Home' });
  });

  it('names a past message by what a press does, then its words', async () => {
    said('family', 'one', 'Could you open the window?');
    const { container } = await renderApp('/spaces/family/talk');

    const row = await findButton('open the window', container);
    expect(row.hasAttribute('aria-label')).toBe(false);
    expect(row.textContent).toMatch(/^Speak again: Could you open the window\?/);
  });

  it('speaks a past message again on a press', async () => {
    said('family', 'one', 'Could you open the window?');
    const { container } = await renderApp('/spaces/family/talk');

    await press(await findButton('open the window', container));

    expect(platform.voice.speakSystem).toHaveBeenCalledWith(
      'Could you open the window?',
      expect.anything(),
      expect.any(Function),
    );
  });

  it('announces the sentence that plays through a status that was already there', async () => {
    vi.mocked(platform.voice.speakSystem).mockReturnValue(new Promise(() => {}));
    const { container } = await renderApp('/spaces/family/talk');
    await field(container);
    const before = [...container.querySelectorAll('[role="status"]')];

    await typeInto(await field(container), 'Good morning');
    await press(await speakKey(container));

    const status = [...container.querySelectorAll('[role="status"]')].find(
      one => one.textContent === 'Speaking: Good morning',
    );
    expect(status).toBeDefined();
    expect(before).toContain(status);
  });

  it('shows the sentence that plays below the messages and above the field', async () => {
    said('family', 'one', 'Could you open the window?');
    const container = await speakWords('Good morning');

    const card = container.querySelector('[role="region"][aria-label="Speaking"]');
    const follows = (later: Element | null, earlier: Element | null) =>
      Boolean(earlier && later && earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(card?.textContent).toContain('Good morning');
    expect(follows(card, container.querySelector('[aria-label="Messages"]'))).toBe(true);
    expect(follows(container.querySelector('textarea'), card)).toBe(true);
  });

  it('stops the sentence on Stop', async () => {
    const container = await speakWords('Good morning');

    await press(await findButton(/^Stop$/, container.querySelector('[role="region"][aria-label="Speaking"]')!));

    expect(platform.voice.stop).toHaveBeenCalled();
    expect(container.querySelector('[role="region"][aria-label="Speaking"]')).toBeNull();
  });

  it('moves to the field on Write next while the sentence plays on', async () => {
    const container = await speakWords('Good morning');

    await press(await findButton('Write next', container));

    expect(document.activeElement).toBe(container.querySelector('textarea'));
    expect(container.querySelector('[role="region"][aria-label="Speaking"]')).not.toBeNull();
  });
});

describe('the history in the space it has', () => {
  const visibleRows = (container: HTMLElement) =>
    [...container.querySelectorAll('button')]
      .filter(one => one.textContent?.startsWith('Speak again') && !one.closest('[aria-hidden="true"]'))
      .map(one => one.textContent?.match(/Message [A-E]/)?.[0]);
  const hasButton = (container: HTMLElement, text: string) =>
    [...container.querySelectorAll('button')].some(one => one.textContent === text);
  let space = 0;

  // jsdom has no layout, so each row is 50 pixels high and the history gets `space`.
  beforeEach(async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(50);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => space);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly react: () => void) {}
        observe() {
          this.react();
        }
        unobserve() {}
        disconnect() {}
      },
    );
    await finishSetup();
    addSpace('Family', { context: 'Home' });
    for (const [at, letter] of [...'ABCDE'].entries()) said('family', `m${at}`, `Message ${letter}`);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function open(height: number) {
    space = height;
    const { container } = await renderApp('/spaces/family/talk');
    await findButton('Message E', container);
    return container;
  }

  it('shows the newest messages that fit whole, and See all for the rest', async () => {
    const container = await open(160);

    await vi.waitFor(() => expect(visibleRows(container)).toEqual(['Message D', 'Message E']));
    expect(hasButton(container, 'See all')).toBe(true);
  });

  it('keeps the history one press away when not even the newest message fits', async () => {
    const container = await open(60);

    await vi.waitFor(() => expect(visibleRows(container)).toEqual([]));
    expect(hasButton(container, 'See all (5)')).toBe(true);
  });

  it('shows more of the history when it has more space', async () => {
    const container = await open(400);

    await vi.waitFor(() =>
      expect(visibleRows(container)).toEqual(['Message A', 'Message B', 'Message C', 'Message D', 'Message E']),
    );
    expect(hasButton(container, 'See all')).toBe(false);
  });
});
