import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Suggestions } from '@september/app-ui/blocks/suggestions';

const state = vi.hoisted(() => ({
  phrases: [] as { text: string; code: string; kind: string; pinned: boolean; space_id: string }[],
  speak: vi.fn(),
  writing: false,
  answer: [] as string[],
  generate: vi.fn(),
  words: [] as string[],
  speech: { provider: 'elevenlabs', modelId: 'eleven_flash_v2_5' } as Record<string, unknown>,
}));
vi.mock('@platform/services/data', () => ({
  useMessages: () => ({ data: [] }),
  usePhrases: (spaceId?: string) => ({ data: state.phrases.filter(one => !spaceId || one.space_id === spaceId) }),
}));
vi.mock('@platform/services/suggest', () => ({
  useSuggestions: () => state.words, applySuggestion: (_text: string, word: string) => word,
}));
vi.mock('@platform/services/ai', () => ({
  hasWritingService: () => state.writing,
  generate: async (request: unknown) => { state.generate(request); return state.answer; },
  itemsFrom: (answer: string[]) => answer, userContext: () => '',
}));
vi.mock('@platform/services/speech', () => ({ speechSettings: () => state.speech }));
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const container = document.createElement('div');
document.body.append(container);
let root = createRoot(container);
afterEach(() => {
  act(() => root.unmount());
  root = createRoot(container);
  state.phrases = [];
  state.speak.mockClear();
  state.writing = false;
  state.answer = [];
  state.generate.mockReset();
  state.words = [];
  state.speech = { provider: 'elevenlabs', modelId: 'eleven_flash_v2_5' };
  vi.useRealTimers();
});

function Composer({ initial, history = [], mood = null }: { initial: string; history?: string[]; mood?: string | null }) {
  const [text, setText] = useState(initial);
  return <><input aria-label="Draft" value={text} onChange={event => setText(event.target.value)} /><output>{text}</output><Suggestions spaceId="space" context="" text={text}
    history={history} mood={mood as never} onTake={setText} onSpeak={state.speak} onPin={() => {}} /></>;
}

async function type(words: string) {
  await act(async () => {
    const input = container.querySelector('input')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, words);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const systemPrompt = (call = 0) =>
  (state.generate.mock.calls[call][0] as { messages: { content: string }[] }).messages[0].content;

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find(one => one.getAttribute('aria-label') === label || one.textContent === label);
  expect(found).toBeDefined();
  return found!;
}

it('inserts successive slices before speaking the complete history sentence', async () => {
  const sentence = 'Please bring me some cold water from the kitchen.';
  await act(async () => root.render(<Composer initial="Pl" history={[`Hello there. ${sentence}`]} />));
  await act(async () => button('Insert this slice').click());
  expect(container.querySelector('output')?.textContent).toBe('Please bring me some cold water ');
  expect(state.speak).not.toHaveBeenCalled();
  await act(async () => button('Speak this suggestion').click());
  expect(state.speak).toHaveBeenCalledWith(sentence);
});

it('retains a phrase-code continuation after the code is consumed', async () => {
  state.phrases = [{ text: 'Please bring me some cold water from the kitchen.', code: 'pb', kind: 'phrase', pinned: true, space_id: 'other-space' }];
  await act(async () => root.render(<Composer initial="pb" />));
  await act(async () => button('water').click());
  expect(container.querySelector('output')?.textContent).toBe('Please bring me some cold water ');
  await act(async () => button('kitchen').click());
  expect(container.querySelector('output')?.textContent).toBe('Please bring me some cold water from the kitchen ');
});

it('retains the selected model suggestion after a new response', async () => {
  vi.useFakeTimers();
  state.writing = true;
  state.answer = ['Please bring me some cold water from the kitchen.'];
  await act(async () => root.render(<Composer initial="Pl" />));
  await act(async () => {
    const input = container.querySelector('input')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Please ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => vi.advanceTimersByTimeAsync(200));
  await act(async () => button('Insert this slice').click());
  state.answer = [];
  await act(async () => vi.advanceTimersByTimeAsync(200));
  await act(async () => button('Speak this suggestion').click());
  expect(state.speak).toHaveBeenCalledWith('Please bring me some cold water from the kitchen.');
});

it('keeps the insert action for the final slice of a starter', async () => {
  state.phrases = [{ text: 'I would like to ask you about', code: 'iw', kind: 'starter', pinned: true, space_id: 'space' }];
  await act(async () => root.render(<Composer initial="" />));
  await act(async () => button('Insert this slice').click());
  await act(async () => button('Start with this opening').click());
  expect(container.querySelector('output')?.textContent).toBe('I would like to ask you about ');
  expect(state.speak).not.toHaveBeenCalled();
});

it('shows the tag of a model suggestion and puts it at the start of the draft', async () => {
  vi.useFakeTimers();
  state.writing = true;
  state.speech = { provider: 'dialogue', modelId: 'eleven_flash_v2_5' };
  state.answer = ['[laughs] That is the funniest thing all week.'];
  await act(async () => root.render(<Composer initial="That" />));
  await type('That is ');
  await act(async () => vi.advanceTimersByTimeAsync(200));

  expect(button('laughs, audio tag')).toBeDefined();
  await act(async () => button('the').click());
  expect(container.querySelector('output')?.textContent).toBe('[laughs] That is the ');
});

it('asks for tags only when the voice reads them', async () => {
  vi.useFakeTimers();
  state.writing = true;
  await act(async () => root.render(<Composer initial="That" />));
  await type('That is ');
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(systemPrompt()).not.toContain('square brackets');

  state.speech = { provider: 'dialogue', modelId: 'eleven_flash_v2_5' };
  await type('That is so ');
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(systemPrompt(1)).toContain('square brackets');
});

it('sends a new request at once when the mood changes', async () => {
  vi.useFakeTimers();
  state.writing = true;
  await act(async () => root.render(<Composer initial="That" />));
  await type('That is ');
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(state.generate).toHaveBeenCalledTimes(1);

  await act(async () => root.render(<Composer initial="That" mood="playful" />));
  await act(async () => vi.advanceTimersByTimeAsync(200));

  expect(state.generate).toHaveBeenCalledTimes(2);
  expect(systemPrompt(1)).toContain('The user feels playful.');
});

it('shows tag tiles after the words when the voice reads tags', async () => {
  state.speech = { provider: 'dialogue', modelId: 'eleven_flash_v2_5' };
  state.words = ['and', '[giggles]'];
  await act(async () => root.render(<Composer initial="so funny " mood="playful" />));

  const row = [...container.querySelectorAll('button')].map(one => one.getAttribute('aria-label') ?? one.textContent);
  expect(row).toEqual(expect.arrayContaining(['and', 'giggles, audio tag', 'laughs, audio tag']));
  await act(async () => button('giggles, audio tag').click());
  expect(container.querySelector('output')?.textContent).toBe('[giggles]');
});

it('shows no tag tiles when the voice says tags aloud', async () => {
  state.words = ['and', '[giggles]'];
  await act(async () => root.render(<Composer initial="so funny " mood="playful" />));

  expect(container.textContent).not.toContain('giggles');
  expect(container.textContent).not.toContain('laughs');
});
