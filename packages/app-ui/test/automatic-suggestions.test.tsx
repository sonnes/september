import { act, useState } from 'react';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import { Suggestions } from '@september/app-ui/blocks/suggestions';
import { updateSetup } from '@september/app-ui/services/settings';

import { bodyOf, jsonReply, signalOf } from './model';
import { finishSetup, renderPart } from './render';

type Answer = (init: RequestInit) => Promise<Response>;

/** The writing service. Each request takes the next held answer, or a fresh row. */
const queued: Answer[] = [];
const request = vi.fn((_url: string, init: RequestInit) =>
  (queued.shift() ?? (async () => jsonReply({ suggestions: ['hello fresh result'] })))(init),
);

/** An answer that waits for the test. */
function held() {
  let answer!: (rows: string[]) => void;
  let fail!: (error: Error) => void;
  queued.push(
    () =>
      new Promise<Response>((done, refuse) => {
        answer = rows => done(jsonReply({ suggestions: rows }));
        fail = refuse;
      }),
  );
  return {
    answer: (rows: string[]) => act(async () => answer(rows)),
    fail: (error: Error) => act(async () => fail(error)),
  };
}

let show!: (text: string, spaceId?: string) => Promise<void>;

/** Draws the rows for the text and the space that `show` gives. */
async function render({
  initial = '',
  ...props
}: { initial?: string; document?: { before: string; after: string }; finishLabel?: string } = {}) {
  function Composer() {
    const [shown, setShown] = useState({ text: initial, spaceId: 'space' });
    show = (text, spaceId = 'space') => act(async () => setShown({ text, spaceId }));
    return (
      <Suggestions
        text={shown.text}
        spaceId={shown.spaceId}
        context=""
        history={[]}
        onTake={() => {}}
        onSpeak={() => {}}
        {...props}
      />
    );
  }
  const { container } = await renderPart(<Composer />);
  return container;
}

const advance = (ms = 200) => act(async () => vi.advanceTimersByTimeAsync(ms));
const writingStatus = (container: HTMLElement) =>
  container.querySelector('[role="status"][aria-label="AI Assistance is writing"]');

// The writing service loads its client on the first request. Under fake
// timers a slow first load lands after the timer steps, so load it first.
beforeAll(async () => {
  await import('@earendil-works/pi-ai');
  await import('@earendil-works/pi-ai/providers/openrouter');
});

beforeEach(async () => {
  vi.useFakeTimers();
  queued.length = 0;
  request.mockClear();
  vi.stubGlobal('fetch', request);
  await finishSetup({ defaultModel: { service: 'openrouter', model: '' }, autoSuggestions: true, autoPhrases: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('asks after an audio tag', async () => {
  await render();
  await show('hello [laughs');
  await show('hello [laughs]');

  await advance();
  expect(request).toHaveBeenCalledTimes(1);
});

it.each([' ', '\n', '.', ',', '!', '?', ';', ':'])('asks after an edit that ends with %j', async boundary => {
  await render();
  await show('hello');
  await show(`hello${boundary}`);

  await advance(199);
  expect(request).not.toHaveBeenCalled();
  await advance(1);
  expect(request).toHaveBeenCalledTimes(1);
});

it('waits for a boundary and skips empty words, with the local words still there', async () => {
  const container = await render();
  for (const text of ['h', 'hello', "hello'", 'hello-', ' ', '\n', '']) {
    await show(text);
    await advance();
    expect(request).not.toHaveBeenCalled();
  }
  await show('h');
  expect(container.querySelector('[aria-label="Words"] button')).not.toBeNull();
});

it('waits for an edit after a draft comes back or the space changes', async () => {
  await render({ initial: 'hello ' });
  await advance();
  expect(request).not.toHaveBeenCalled();
  await show('hello,');
  await advance();
  expect(request).toHaveBeenCalledTimes(1);
  await show('hello ', 'other');
  await advance();
  expect(request).toHaveBeenCalledTimes(1);
});

it('drops a waiting request when typing goes on', async () => {
  await render();
  await show('hello');
  await show('hello ');
  await advance(100);
  await show('hello w');
  await advance();

  expect(request).not.toHaveBeenCalled();
});

it.each(['answer', 'failure'])('ignores a late %s from an earlier request', async outcome => {
  const first = held();
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();
  await show('hello,');
  await advance();
  expect(signalOf(request).aborted).toBe(true);

  if (outcome === 'answer') await first.answer(['hello stale result']);
  else await first.fail(new Error('Earlier request failed'));

  await vi.waitFor(() => expect(container.textContent).toContain('fresh'));
  expect(container.textContent).not.toContain('stale');
  expect(container.textContent).not.toContain('Earlier request failed');
});

it('stops when switched off and waits for another edit when switched on', async () => {
  const first = held();
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();

  await act(async () => {
    await updateSetup({ autoSuggestions: false });
  });
  expect(signalOf(request).aborted).toBe(true);
  await first.answer(['hello stale result']);
  expect(container.textContent).not.toContain('stale');

  await act(async () => {
    await updateSetup({ autoSuggestions: true });
  });
  await advance();
  expect(request).toHaveBeenCalledTimes(1);
  await show('hello,');
  await advance();
  expect(request).toHaveBeenCalledTimes(2);
});

it('keeps a request when only automatic phrases changes', async () => {
  const first = held();
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();

  await act(async () => {
    await updateSetup({ autoPhrases: false });
  });
  expect(signalOf(request).aborted).toBe(false);
  await first.answer(['hello fresh result']);

  await vi.waitFor(() => expect(container.textContent).toContain('fresh'));
});

it.each([
  [false, true, true],
  [true, false, true],
  [false, false, true],
  [true, true, false],
])('follows the switches and the service (suggestions %s, phrases %s, service %s)', async (autoSuggestions, autoPhrases, writing) => {
  await updateSetup({
    autoSuggestions,
    autoPhrases,
    defaultModel: { service: writing ? 'openrouter' : 'none', model: '' },
  });
  await render();
  await show('hello');
  await show('hello ');
  await advance();

  expect(request).toHaveBeenCalledTimes(autoSuggestions && writing ? 1 : 0);
});

it('says that AI Assistance is writing until the answer comes', async () => {
  const first = held();
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();
  expect(writingStatus(container)).not.toBeNull();

  await first.answer(['hello fresh result']);

  await vi.waitFor(() => expect(writingStatus(container)).toBeNull());
});

it('stops saying it is writing and says the request failed', async () => {
  queued.push(async () => {
    throw new Error('No answer');
  });
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();

  await vi.waitFor(() => expect(writingStatus(container)).toBeNull());
  expect([...container.querySelectorAll('[role="status"]')].map(one => one.textContent)).toEqual([
    expect.stringContaining('AI Assistance did not answer.'),
  ]);
});

it('marks a row that AI Assistance wrote', async () => {
  const container = await render();
  await show('hello');
  await show('hello ');
  await advance();

  const mark = await vi.waitFor(() => {
    const found = container.querySelector('[aria-label="From AI Assistance"]');
    if (!found) throw new Error('No mark');
    return found;
  });
  expect(mark.getAttribute('role')).toBe('img');
});

it('sends the note and the caret with a request from a note', async () => {
  await render({ document: { before: 'Intro.\nhello ', after: '\nEnd.' } });
  await show('hello');
  await show('hello ');
  await advance();

  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(JSON.stringify(bodyOf(request).messages)).toContain(JSON.stringify('Intro.\nhello <caret/>\nEnd.').slice(1, -1));
});

it('names the end key of a row with the label it is given', async () => {
  const container = await render({ finishLabel: 'Add to the note' });
  await show('hello');
  await show('hello ');
  await advance();

  await vi.waitFor(() => expect(container.querySelector('[aria-label^="Add to the note:"]')).not.toBeNull());
  expect(container.querySelector('[aria-label^="Speak:"]')).toBeNull();
});
