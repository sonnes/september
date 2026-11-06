import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stopSpeaking } from '@september/app-ui/services/speech';
import { talkMoodKey } from '@september/core/rules/settings';

import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, PanelWindow, press, renderApp, typeInto } from './render';

beforeEach(async () => {
  await finishSetup();
  addSpace('Family', { context: 'Home', updated_at: 2 });
  addSpace('Work', { context: 'Office', updated_at: 1 });
  vi.mocked(platform.device.outputs.list).mockResolvedValue([{ uid: 'speakers', name: 'MacBook Pro Speakers' }]);
  vi.mocked(platform.device.outputs.current).mockResolvedValue('speakers');
});

afterEach(() => {
  act(() => stopSpeaking());
});

const field = () =>
  vi.waitFor(() => {
    const box = document.querySelector<HTMLTextAreaElement>('textarea');
    if (!box) throw new Error('No composer field');
    return box;
  });

/** Talk of Family in the browser shell, or in the panel. */
async function renderTalk({ panel = false } = {}) {
  const rendered = await renderApp('/spaces/family/talk', panel ? { shell: PanelWindow } : {});
  await field();
  return rendered;
}

const modeSwitch = () => document.querySelector('nav[aria-label="Space mode"]');
const spaceTabs = () => document.querySelector('nav[aria-label="Spaces"]');

describe('the chrome of a screen', () => {
  it('draws the dock with the mode switch and the space tabs in the shell', async () => {
    await renderTalk();

    expect(modeSwitch()).not.toBeNull();
    expect(spaceTabs()).not.toBeNull();
  });

  it('marks the open mode and the open space as the current page', async () => {
    await renderTalk();

    expect(spaceTabs()!.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Family');
    expect(modeSwitch()!.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Talk');
  });

  it('names the screen with a heading', async () => {
    await renderTalk();

    expect([...document.querySelectorAll('main h1')].map(one => one.textContent)).toEqual(['Family · Talk']);
  });

  it('keeps the heading of the screen in the panel', async () => {
    await renderTalk({ panel: true });

    expect([...document.querySelectorAll('main h1')].map(one => one.textContent)).toEqual(['Family · Talk']);
  });

  it('takes the space tabs that do not fit out of reach and offers one Switch space key', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(900);
    const client = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(300);
    try {
      await renderTalk();

      const row = [...document.querySelectorAll<HTMLElement>('nav[aria-label="Spaces"] [inert]')];
      expect(row).toHaveLength(1);
      expect(row[0].textContent).toContain('Work');
      expect(document.querySelector('button[aria-label^="Switch space"]')).not.toBeNull();
    } finally {
      scroll.mockRestore();
      client.mockRestore();
    }
  });

  it('leaves the dock to the panel header in the panel', async () => {
    await renderTalk({ panel: true });

    expect(spaceTabs()).toBeNull();
    expect(modeSwitch()!.closest('header')).not.toBeNull();
  });
});

function openMoodMenu() {
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"][aria-label^="Mood menu"]');
  expect(trigger).not.toBeNull();
  act(() => {
    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}

async function chooseInMenu(name: string) {
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find(one =>
    one.textContent?.includes(name),
  );
  expect(item).toBeDefined();
  await press(item!);
}

const savedMood = () => rows.settings.get(talkMoodKey('family'));
const moodMenuName = () => document.querySelector('button[aria-label^="Mood menu"]')?.getAttribute('aria-label');

describe('the mood menu', () => {
  it('sets the mood, and a second choice of the same mood clears it', async () => {
    await renderTalk();

    openMoodMenu();
    await chooseInMenu('Frustrated');
    await vi.waitFor(() => expect(savedMood()).toBe('frustrated'));
    await vi.waitFor(() => expect(moodMenuName()).toBe('Mood menu: Frustrated'));

    openMoodMenu();
    await chooseInMenu('Frustrated');
    await vi.waitFor(() => expect(savedMood()).toBeNull());
    await vi.waitFor(() => expect(moodMenuName()).toBe('Mood menu: no mood'));
  });

  it('clears the mood with No mood', async () => {
    rows.settings.set(talkMoodKey('family'), 'low');
    await renderTalk();
    await vi.waitFor(() => expect(moodMenuName()).toBe('Mood menu: Low'));

    openMoodMenu();
    await chooseInMenu('No mood');
    await vi.waitFor(() => expect(savedMood()).toBeNull());
  });
});

describe('the sound output key', () => {
  it('names the output and the state of the call microphone', async () => {
    await renderTalk();

    await findButton('Sound output: MacBook Pro Speakers. September Microphone off');
  });
});

const moodKeys = () => document.querySelectorAll('button[aria-label^="Mood: "]');
const moodMenu = () => document.querySelector('button[aria-label^="Mood menu"]');
const clearKey = () => document.querySelector('button[aria-label="Clear"]');

describe('the composer in the panel', () => {
  it('shows the five mood keys and Clear in the regular tier', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
    try {
      await renderTalk({ panel: true });

      await vi.waitFor(() => expect(moodKeys()).toHaveLength(5));
      expect(clearKey()).not.toBeNull();
      expect(moodMenu()).toBeNull();
    } finally {
      width.mockRestore();
    }
  });

  it('shows one mood menu key in the compact tier', async () => {
    await renderTalk({ panel: true });

    expect(moodMenu()).not.toBeNull();
    expect(moodKeys()).toHaveLength(0);
  });
});

const named = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('main button')].find(
    one => one.textContent?.trim() === name || one.getAttribute('aria-label') === name,
  );
/** The rows of past messages that a person can reach. Each name starts with what a press does. */
const messageKeys = () =>
  [...document.querySelectorAll<HTMLButtonElement>('main button')].filter(
    one => /^(Speak again|Stop): /.test(one.textContent ?? '') && !one.closest('[aria-hidden="true"]'),
  );
const spokenRows = () => messageKeys().map(row => row.querySelectorAll('span')[1]?.textContent);
/** The suggestions over the field. A kept phrase of the space is always among them. */
const suggestions = () => document.querySelector('main section[aria-label="Suggestions"]');

function addMessages(count: number) {
  rows.phrases.set('p1', {
    id: 'p1',
    space_id: 'family',
    text: 'Thank you',
    kind: 'phrase',
    pinned: true,
    created_at: 1,
    updated_at: 1,
  });
  for (let at = 0; at < count; at += 1) {
    rows.messages.set(`m${at + 1}`, {
      id: `m${at + 1}`,
      space_id: 'family',
      user_id: 'local-user',
      type: 'user',
      text: `Message ${at + 1}`,
      created_at: Date.now() - (count - at) * 60_000,
    });
  }
}

/** A voice that speaks until it is stopped. */
function voiceThatPlays() {
  vi.mocked(platform.voice.speakSystem).mockImplementation(() => new Promise(() => {}));
}

describe('the history of Talk', () => {
  it('shows the last three messages over the suggestions before it measures its space', async () => {
    addMessages(10);
    await renderTalk();

    await vi.waitFor(() => expect(spokenRows()).toEqual(['Message 8', 'Message 9', 'Message 10']));
    await vi.waitFor(() => expect(suggestions()).not.toBeNull());
  });

  it('shows a page of all messages in place of the suggestions, and goes back', async () => {
    addMessages(10);
    await renderTalk();
    await vi.waitFor(() => expect(suggestions()).not.toBeNull());

    await press(await findButton('See all', document.querySelector('main')!));
    expect(spokenRows()).toEqual([
      'Message 3',
      'Message 4',
      'Message 5',
      'Message 6',
      'Message 7',
      'Message 8',
      'Message 9',
      'Message 10',
    ]);
    expect(suggestions()).toBeNull();

    await press(named('Earlier messages')!);
    expect(spokenRows()).toEqual(['Message 1', 'Message 2']);

    await press(named('Back to suggestions')!);
    expect(spokenRows()).toEqual(['Message 8', 'Message 9', 'Message 10']);
    await vi.waitFor(() => expect(suggestions()).not.toBeNull());
  });

  it('goes back to the suggestions with Escape', async () => {
    addMessages(10);
    await renderTalk();

    await press(await findButton('See all', document.querySelector('main')!));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(spokenRows()).toHaveLength(3);
  });

  it('speaks a message again with a press on it', async () => {
    voiceThatPlays();
    addMessages(2);
    await renderTalk();
    await vi.waitFor(() => expect(messageKeys()).toHaveLength(2));

    await press(messageKeys()[0]);
    expect(vi.mocked(platform.voice.speakSystem).mock.calls.at(-1)?.[0]).toBe('Message 1');
    expect(messageKeys()[0].textContent).toMatch(/^Stop: /);
  });
});

async function typeAndSpeak(text: string) {
  const box = await field();
  await typeInto(box, text);
  await act(async () => {
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}

const speakingCard = () => document.querySelector('[role="region"][aria-label="Speaking"]');

describe('the speaking card', () => {
  it('shows the sentence that plays beside a field that stays, and Stop ends it', async () => {
    voiceThatPlays();
    await renderTalk();

    await typeAndSpeak('Hello there');
    expect(speakingCard()?.textContent).toContain('Hello there');
    expect(document.querySelector('textarea')).not.toBeNull();

    await press(named('Stop')!);
    expect(platform.voice.stop).toHaveBeenCalled();
    expect(speakingCard()).toBeNull();
  });

  it('moves to the field with Write next while the voice goes on', async () => {
    voiceThatPlays();
    await renderTalk();

    await typeAndSpeak('Hello there');
    const stops = vi.mocked(platform.voice.stop).mock.calls.length;
    await press(named('Write next')!);
    expect(document.activeElement).toBe(document.querySelector('textarea'));
    expect(platform.voice.stop).toHaveBeenCalledTimes(stops);
    expect(speakingCard()).not.toBeNull();
  });
});
