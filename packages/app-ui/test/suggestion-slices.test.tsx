import { act, useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { InputLayer } from '@september/app-ui/blocks/input-layer';
import { SourceMark, Suggestions } from '@september/app-ui/blocks/suggestions';
import { usePinPhrase } from '@september/app-ui/services/data';
import { updateSpeech } from '@september/app-ui/services/speech';
import { updateSetup } from '@september/app-ui/services/settings';
import { DEFAULT_ACCESS } from '@september/core/rules/access';
import type { MoodKey } from '@september/core/rules/moods';
import type { PhraseKind } from '@september/core/rules/records';

import { bodyOf, jsonReply } from './model';
import { rows } from './platform';
import { finishSetup, press, renderPart, typeInto } from './render';

/** The writing service, answering each request with the rows `answer` holds then. */
function model(answer: { rows: string[] }) {
  const request = vi.fn(async (_url: string, _init: RequestInit) => jsonReply({ suggestions: answer.rows }));
  vi.stubGlobal('fetch', request);
  const systemPrompt = (call = 0) =>
    JSON.stringify(
      bodyOf(request, call).messages.find(one => one.role === 'system' || one.role === 'developer')?.content,
    );
  return { request, systemPrompt };
}

function phrase(text: string, code: string, extra: { kind?: PhraseKind; pinned?: boolean; space_id?: string } = {}) {
  const id = `p-${text}`;
  rows.phrases.set(id, {
    id,
    space_id: 'space',
    text,
    code,
    kind: 'phrase',
    pinned: true,
    created_at: 1,
    updated_at: 1,
    ...extra,
  });
}

const onSpeak = vi.fn();

/** A composer that holds the draft and shows the rows for it. */
function Composer({ initial, history = [], mood = null }: { initial: string; history?: string[]; mood?: MoodKey | null }) {
  const [text, setText] = useState(initial);
  const { pin } = usePinPhrase('space');
  return (
    <>
      <input aria-label="Draft" value={text} onChange={event => setText(event.target.value)} />
      <output>{text}</output>
      <Suggestions
        spaceId="space"
        context=""
        text={text}
        history={history}
        mood={mood}
        onTake={setText}
        onSpeak={onSpeak}
        onPin={pin}
      />
    </>
  );
}

const draftOf = (container: HTMLElement) => container.querySelector('output')?.textContent;
const type = (container: HTMLElement, words: string) => typeInto(container.querySelector('input')!, words);
const wait = (ms = 200) => act(async () => vi.advanceTimersByTimeAsync(ms));

function button(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll('button')].find(
    one =>
      one.getAttribute('aria-label') === label ||
      one.getAttribute('aria-label')?.startsWith(`${label} `) ||
      one.textContent === label,
  );
  expect(found).toBeDefined();
  return found!;
}

beforeEach(async () => {
  onSpeak.mockReset();
  await finishSetup();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('names each stripe, tile, and end key by what a press takes', async () => {
  const sentence = 'Please bring me some cold water from the kitchen.';
  const { container } = await renderPart(<Composer initial="" history={[sentence]} />);
  await type(container, 'Pl');

  const stripe = container.querySelector('[role="group"][aria-label^="Stripe 1 of"]');
  expect(stripe?.getAttribute('aria-label')).toBe(`Stripe 1 of 1, said before. ${sentence}`);
  expect(button(container, 'cold').getAttribute('aria-label')).toBe('cold. Takes: Please bring me some cold');
  expect(button(container, 'Insert:').getAttribute('aria-label')).toBe('Insert: Please bring me some cold water');
});

it('shows fewer stripes and shorter slices for eye gaze', async () => {
  const said = [
    'Please bring me some cold water from the kitchen.',
    'Please open the window in the bedroom for me.',
    'Please call my sister after lunch today.',
    'Please turn the television down a little.',
    'Please put the blanket over my legs now.',
    'Please read me the news from this morning.',
  ];
  const stripes = (container: HTMLElement) => [
    ...container.querySelectorAll('[role="group"][aria-label^="Stripe"]'),
  ];
  const pointer = await renderPart(<Composer initial="" history={said} />);
  await type(pointer.container, 'Pl');
  expect(stripes(pointer.container).length).toBeGreaterThan(4);

  await updateSetup({ access: { ...DEFAULT_ACCESS, input: 'eyes' } });
  const eyes = await renderPart(<Composer initial="" history={said} />);
  await type(eyes.container, 'Pl');
  expect(stripes(eyes.container)).toHaveLength(4);
  // A slice of four words, then its end key.
  expect(button(eyes.container, 'Insert:').getAttribute('aria-label')?.split(' ')).toHaveLength(5);
});

it('scans each stripe as one group', async () => {
  await updateSetup({ access: { ...DEFAULT_ACCESS, input: 'switch' } });
  const sentence = 'Please bring me some cold water from the kitchen.';
  const { container } = await renderPart(
    <>
      <InputLayer />
      <Composer initial="" history={[sentence]} />
    </>,
  );
  await type(container, 'Pl');

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  });

  const band = document.querySelector('[data-scan="group"]');
  expect(band?.getAttribute('aria-label')).toBe(`Stripe 1 of 1, said before. ${sentence}`);
});

it('names a chip by its phrase, then by where it came from', async () => {
  phrase('Yes', '');
  phrase('Thanks', '', { pinned: false });
  const { container } = await renderPart(<Composer initial="" />);

  await vi.waitFor(() => button(container, 'Yes. Kept phrase.'));
  expect(button(container, 'Thanks. Suggested phrase.')).toBeDefined();
  await press(button(container, 'Yes. Kept phrase.'));
  expect(draftOf(container)?.trim()).toBe('Yes');
});

it('keeps a suggested phrase when the person presses its pin key', async () => {
  phrase('Could I get a glass of water', '', { pinned: false });
  const { container } = await renderPart(<Composer initial="Could" />);

  await vi.waitFor(() => expect(button(container, 'Keep this phrase').getAttribute('aria-pressed')).toBe('false'));
  await press(button(container, 'Keep this phrase'));

  await vi.waitFor(() => expect(rows.phrases.get('p-Could I get a glass of water')?.pinned).toBe(true));
  await vi.waitFor(() => expect(button(container, 'Keep this phrase').getAttribute('aria-pressed')).toBe('true'));
  expect([...rows.phrases.values()]).toHaveLength(1);
});

it('says on the pin key whether the person keeps the row', async () => {
  phrase('Could I get a glass of water', '');
  const { container } = await renderPart(<Composer initial="Could" />);

  await vi.waitFor(() => expect(button(container, 'Keep this phrase').getAttribute('aria-pressed')).toBe('true'));
});

it('inserts successive slices before speaking the complete history sentence', async () => {
  const sentence = 'Please bring me some cold water from the kitchen.';
  const { container } = await renderPart(<Composer initial="Pl" history={[`Hello there. ${sentence}`]} />);

  await press(button(container, 'Insert:'));
  expect(draftOf(container)).toBe('Please bring me some cold water ');
  expect(onSpeak).not.toHaveBeenCalled();
  await press(button(container, 'Speak:'));
  expect(onSpeak).toHaveBeenCalledWith(sentence);
});

it('keeps a phrase-code continuation after the code is used up', async () => {
  phrase('Please bring me some cold water from the kitchen.', 'pb', { space_id: 'other-space' });
  const { container } = await renderPart(<Composer initial="pb" />);

  await vi.waitFor(() => button(container, 'water'));
  await press(button(container, 'water'));
  expect(draftOf(container)).toBe('Please bring me some cold water ');
  await press(button(container, 'kitchen'));
  expect(draftOf(container)).toBe('Please bring me some cold water from the kitchen ');
});

it('keeps the chosen model suggestion after a new answer', async () => {
  vi.useFakeTimers();
  await updateSetup({ defaultModel: { service: 'openrouter', model: '' } });
  const answer = { rows: ['Please bring me some cold water from the kitchen.'] };
  model(answer);
  const { container } = await renderPart(<Composer initial="Pl" />);

  await type(container, 'Please ');
  await wait();
  await vi.waitFor(() => button(container, 'Insert:'));
  await press(button(container, 'Insert:'));
  answer.rows = [];
  await wait();
  await press(button(container, 'Speak:'));

  expect(onSpeak).toHaveBeenCalledWith('Please bring me some cold water from the kitchen.');
});

it('keeps the insert action for the final slice of a starter', async () => {
  phrase('I would like to ask you about', 'iw', { kind: 'starter' });
  const { container } = await renderPart(<Composer initial="" />);

  await vi.waitFor(() => button(container, 'Insert:'));
  await press(button(container, 'Insert:'));
  await press(button(container, 'Start with:'));

  expect(draftOf(container)).toBe('I would like to ask you about ');
  expect(onSpeak).not.toHaveBeenCalled();
});

it('shows the tag of a model suggestion and puts it at the start of the draft', async () => {
  vi.useFakeTimers();
  await updateSetup({ defaultModel: { service: 'openrouter', model: '' } });
  await updateSpeech({ provider: 'dialogue', voiceId: 'voice' });
  model({ rows: ['[laughs] That is the funniest thing all week.'] });
  const { container } = await renderPart(<Composer initial="That" />);

  await type(container, 'That is ');
  await wait();

  await vi.waitFor(() => button(container, 'laughs, audio tag'));
  await press(button(container, 'the'));
  expect(draftOf(container)).toBe('[laughs] That is the ');
});

it('asks for tags only when the voice reads them', async () => {
  vi.useFakeTimers();
  await updateSetup({ defaultModel: { service: 'openrouter', model: '' } });
  const writer = model({ rows: [] });
  const { container } = await renderPart(<Composer initial="That" />);

  await type(container, 'That is ');
  await wait();
  await vi.waitFor(() => expect(writer.request).toHaveBeenCalledTimes(1));
  expect(writer.systemPrompt()).not.toContain('square brackets');

  await act(async () => {
    await updateSpeech({ provider: 'dialogue', voiceId: 'voice' });
  });
  await type(container, 'That is so ');
  await wait();
  await vi.waitFor(() => expect(writer.request).toHaveBeenCalledTimes(2));
  expect(writer.systemPrompt(1)).toContain('square brackets');
});

it('asks again at once when the mood changes', async () => {
  vi.useFakeTimers();
  await updateSetup({ defaultModel: { service: 'openrouter', model: '' } });
  const writer = model({ rows: [] });
  let choose!: (mood: MoodKey) => void;
  function Moody() {
    const [mood, setMood] = useState<MoodKey | null>(null);
    choose = setMood;
    return <Composer initial="That" mood={mood} />;
  }
  const { container } = await renderPart(<Moody />);

  await type(container, 'That is ');
  await wait();
  await vi.waitFor(() => expect(writer.request).toHaveBeenCalledTimes(1));

  await act(async () => choose('playful'));
  await wait();

  await vi.waitFor(() => expect(writer.request).toHaveBeenCalledTimes(2));
  expect(writer.systemPrompt(1)).toContain('The user feels playful.');
});

it('shows tag tiles after the words when the voice reads tags', async () => {
  await updateSpeech({ provider: 'dialogue', voiceId: 'voice' });
  const { container } = await renderPart(<Composer initial="so funny " mood="playful" />);

  const labels = [...container.querySelectorAll('[aria-label="Words"] button')].map(
    one => one.getAttribute('aria-label') ?? one.textContent,
  );
  expect(labels).toEqual(expect.arrayContaining(['giggles, audio tag', 'laughs, audio tag']));
  await press(button(container, 'giggles, audio tag'));
  expect(draftOf(container)).toBe('so funny [giggles] ');
});

it('shows no tag tiles when the voice says tags aloud', async () => {
  const { container } = await renderPart(<Composer initial="so funny " mood="playful" />);

  expect(container.querySelector('[aria-label$="audio tag"]')).toBeNull();
});

it('puts a saved phrase that holds the draft in its place, and keeps the rest to take', async () => {
  phrase('Could I get a glass of water', 'cg');
  const { container } = await renderPart(<Composer initial="water" />);

  await vi.waitFor(() => button(container, 'glass'));
  await press(button(container, 'glass'));
  expect(draftOf(container)).toBe('Could I get a glass ');
  await press(button(container, 'water'));
  expect(draftOf(container)).toBe('Could I get a glass of water ');
});

it('speaks a past sentence that holds the draft', async () => {
  const { container } = await renderPart(<Composer initial="wat" history={['Can I have some water please?']} />);

  await press(button(container, 'Speak:'));

  expect(onSpeak).toHaveBeenCalledWith('Can I have some water please?');
});

it('keeps a word that the word row clips out of the tab order', async () => {
  rows.messages.set('clip-1', {
    id: 'clip-1',
    space_id: 'space',
    user_id: 'local-user',
    text: 'so then later and',
    type: 'user',
    created_at: 1,
  });
  // jsdom has no layout, so the last word sits below the bottom of the row.
  let last = '';
  const rects = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const bottom = this.hasAttribute('data-word-row') ? 100 : this.textContent === last ? 160 : 60;
    return { top: bottom - 48, bottom, left: 0, right: 80, width: 80, height: 48, x: 0, y: bottom - 48, toJSON: () => ({}) } as DOMRect;
  });
  const { container } = await renderPart(<Composer initial="so " />);
  const words = () => [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Words"] button')];
  await vi.waitFor(() => expect(words().length).toBeGreaterThan(1));
  last = words().at(-1)!.textContent!;
  await type(container, 'so');
  await type(container, 'so ');

  await vi.waitFor(() => expect(words().at(-1)!.hasAttribute('inert')).toBe(true));
  expect(words()[0]!.hasAttribute('inert')).toBe(false);
  rects.mockRestore();
});

it('names the pin of a saved phrase by whether the person keeps it, where it cannot be pressed', async () => {
  const { container } = await renderPart(
    <>
      <SourceMark source="md" />
      <SourceMark source="md" kept />
    </>,
  );
  const names = [...container.querySelectorAll('[role="img"]')].map(mark => mark.getAttribute('aria-label'));
  expect(names).toEqual(['A saved phrase', 'You keep this phrase']);
});
