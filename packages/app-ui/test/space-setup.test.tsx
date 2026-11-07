import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_MAX_WRITES } from '@september/core/rules/agent/loop';
import { agentSystemPrompt } from '@september/core/rules/prompts/agent';

import { textReply } from './model';
import { rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, typeInto } from './render';

/** A model that answers only when the test lets it. */
function heldModel() {
  const waiting: (() => void)[] = [];
  const request = vi.fn(
    (_url: string, _init: RequestInit) =>
      new Promise<Response>(done => {
        waiting.push(() => done(textReply('Done.')));
      }),
  );
  vi.stubGlobal('fetch', request);
  return { request, finish: () => act(async () => waiting.splice(0).forEach(answer => answer())) };
}

const field = (container: HTMLElement) =>
  vi.waitFor(() => {
    const box = container.querySelector<HTMLTextAreaElement>('textarea');
    if (!box) throw new Error('No composer field');
    return box;
  });

beforeEach(async () => {
  await finishSetup({ defaultModel: { service: 'openrouter', model: '' } });
  addSpace('Untitled', { context: '' });
});

afterEach(() => vi.unstubAllGlobals());

describe('the first message in a new space', () => {
  it('asks what the space is for', async () => {
    const { container } = await renderApp('/spaces/untitled/agent');

    await vi.waitFor(() => expect(container.textContent).toContain('What is this space for?'));
    expect(await findButton('Set up space', container)).toBeDefined();
  });

  it('says that work is happening while the setup turn runs', async () => {
    const model = heldModel();
    const { container } = await renderApp('/spaces/untitled/agent');
    await typeInto(await field(container), 'I speak to my mum here.');
    await press(await findButton('Set up space', container));

    // Typing also asks the model for suggestions, so find the setup turn.
    const setup = agentSystemPrompt({ intro: true, maxPhrases: AGENT_MAX_WRITES - 1 });
    const body = await vi.waitFor(() => {
      const found = model.request.mock.calls
        .map(call => JSON.parse(String(call[1].body)) as { messages: { role: string; content: unknown }[] })
        .find(one => one.messages.some(message => message.content === setup));
      if (!found) throw new Error('No setup turn');
      return found;
    });
    expect(JSON.stringify(body.messages.at(-1))).toContain('I speak to my mum here.');
    await vi.waitFor(() => expect(container.textContent).toContain('Working…'));

    await model.finish();
  });

  it('keeps the words as the description of the space before the model answers', async () => {
    const model = heldModel();
    const { container } = await renderApp('/spaces/untitled/agent');
    await typeInto(await field(container), 'I speak to my mum here.');
    await press(await findButton('Set up space', container));

    await vi.waitFor(() => expect(rows.spaces.get('untitled')?.context).toBe('I speak to my mum here.'));

    await model.finish();
  });

  it('keeps the setup console until the turn ends', async () => {
    const model = heldModel();
    const { container } = await renderApp('/spaces/untitled/agent');
    await typeInto(await field(container), 'I speak to my mum here.');
    await press(await findButton('Set up space', container));

    // The space list is read again with the description, so the space no
    // longer needs setup while the turn still runs.
    await vi.waitFor(() => expect(model.request).toHaveBeenCalled());
    expect(await findButton('Set up space', container)).toBeDefined();

    await model.finish();
  });
});
