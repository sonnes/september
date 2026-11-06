import { act, useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncPhrases } from '@september/app-ui/services/phrase-sync';
import { updateSetup } from '@september/app-ui/services/settings';

import { bodyOf, jsonReply, signalOf } from './model';
import { rows } from './platform';
import { addSpace, finishSetup, renderPart } from './render';

const ANSWER = { phrases: ['Please bring some water.'], starters: ['I would like to'] };

/** The writing service. Each request takes the next held answer, or answers at once. */
const queued: (() => Promise<Response>)[] = [];
const request = vi.fn((_url: string, _init: RequestInit) => (queued.shift() ?? (async () => jsonReply(ANSWER)))());

/** An answer that waits for the test. */
function held() {
  let answer!: () => void;
  queued.push(() => new Promise<Response>(done => (answer = () => done(jsonReply(ANSWER)))));
  return () => act(async () => answer());
}

const written = (spaceId: string) =>
  [...rows.phrases.values()].filter(row => row.space_id === spaceId).map(row => row.text);

interface Shown {
  id: string;
  count: number;
  synced?: number;
  context?: string;
}

let show!: (next: Partial<Shown>) => Promise<void>;

/** A Talk space whose messages the test sets. */
function Space({ first }: { first: Shown }) {
  const [shown, setShown] = useState(first);
  show = next => act(async () => setShown(held => ({ ...held, ...next })));
  useSyncPhrases({
    space: {
      id: shown.id,
      title: shown.id,
      user_id: 'local-user',
      created_at: 0,
      updated_at: 0,
      context: shown.context ?? '',
      phrases_synced_count: shown.synced,
    },
    phrases: [],
    messages: Array.from({ length: shown.count }, (_, index) => ({
      id: String(index),
      space_id: shown.id,
      user_id: 'local-user',
      type: 'user',
      text: 'Hello.',
      created_at: index,
    })),
  });
  return null;
}

/** Lets a request that would start reach the service. The client loads at once, since `beforeAll` loaded it. */
const settle = () => act(() => vi.dynamicImportSettled());

const render = (first: Partial<Shown> = {}) => renderPart(<Space first={{ id: 'space', count: 1, ...first }} />);

beforeAll(async () => {
  await import('@earendil-works/pi-ai');
  await import('@earendil-works/pi-ai/providers/openrouter');
});

beforeEach(async () => {
  queued.length = 0;
  request.mockClear();
  vi.stubGlobal('fetch', request);
  await finishSetup({ defaultModel: { service: 'openrouter', model: '' }, autoSuggestions: true, autoPhrases: true });
  addSpace('space', { id: 'space' });
  addSpace('other', { id: 'other' });
});

afterEach(() => vi.unstubAllGlobals());

describe('automatic phrases', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('follows its own switch (suggestions %s, phrases %s)', async (autoSuggestions, autoPhrases) => {
    await updateSetup({ autoSuggestions, autoPhrases });
    await render();

    if (autoPhrases) {
      await vi.waitFor(() => expect(written('space')).toEqual(['Please bring some water.', 'I would like to']));
    } else {
      await settle();
      expect(written('space')).toEqual([]);
    }
    expect(request).toHaveBeenCalledTimes(autoPhrases ? 1 : 0);
  });

  it('starts from the context and writes again after six more messages', async () => {
    await render({ count: 0, context: 'At home' });
    await vi.waitFor(() => expect(rows.spaces.get('space')?.phrases_synced_count).toBe(0));
    expect(request).toHaveBeenCalledTimes(1);

    await show({ count: 5, synced: 0, context: '' });
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    await show({ count: 6 });

    await vi.waitFor(() => expect(rows.spaces.get('space')?.phrases_synced_count).toBe(6));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('writes nothing late after it is switched off, and writes again when switched on', async () => {
    const answer = held();
    await render();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    await act(async () => {
      await updateSetup({ autoPhrases: false });
    });
    await answer();

    expect(signalOf(request).aborted).toBe(true);
    expect(written('space')).toEqual([]);
    expect(rows.spaces.get('space')?.phrases_synced_count).toBeUndefined();

    await act(async () => {
      await updateSetup({ autoPhrases: true });
    });
    await vi.waitFor(() => expect(rows.spaces.get('space')?.phrases_synced_count).toBe(1));
    expect(request).toHaveBeenCalledTimes(2);
    expect(written('space')).toEqual(['Please bring some water.', 'I would like to']);
  });

  it('ignores the answer for a space that is no longer open', async () => {
    const answer = held();
    await render();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    await show({ id: 'other' });
    await vi.waitFor(() => expect(rows.spaces.get('other')?.phrases_synced_count).toBe(1));
    await answer();

    expect(written('other')).toEqual(['Please bring some water.', 'I would like to']);
    expect(written('space')).toEqual([]);
    expect(rows.spaces.get('space')?.phrases_synced_count).toBeUndefined();
  });

  // OpenAI and Azure refuse JSON mode when no message says "json".
  it('names JSON in the messages of its JSON-mode request', async () => {
    await render();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    const body = bodyOf<{ messages: { content: unknown }[]; response_format?: unknown }>(request);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(JSON.stringify(body.messages)).toMatch(/json/i);
  });

  it('asks nothing without a writing service', async () => {
    await updateSetup({ defaultModel: { service: 'none', model: '' } });
    await render();
    await settle();

    expect(request).not.toHaveBeenCalled();
    expect(written('space')).toEqual([]);
  });

  it('keeps a request when only automatic suggestions changes', async () => {
    const answer = held();
    await render();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    await act(async () => {
      await updateSetup({ autoSuggestions: false });
    });
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(signalOf(request).aborted).toBe(false);
    await answer();

    await vi.waitFor(() => expect(written('space')).toEqual(['Please bring some water.', 'I would like to']));
  });
});
