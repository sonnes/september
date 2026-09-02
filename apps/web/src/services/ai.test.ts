import { readFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  setup: {
    defaultModel: { service: 'openrouter', model: '' },
    suggestionsModel: null as { service: 'openrouter'; model: string } | null,
  },
  usage: [] as Array<Record<string, unknown>>,
}));

vi.mock('./os', () => ({
  currentSetup: () => state.setup,
  providerKey: () => 'test-openrouter-key',
}));

vi.mock('./usage', () => ({
  recordAiUsage: (event: Record<string, unknown>) => {
    state.usage.push(event);
  },
}));

import { generate, openAgentWriter } from './ai';

beforeEach(() => {
  state.setup.defaultModel = { service: 'openrouter', model: '' };
  state.setup.suggestionsModel = null;
  state.usage.length = 0;
});

afterEach(() => vi.unstubAllGlobals());

/** One streamed OpenAI-compatible reply, which is what the client reads. */
function answer(
  deltas: Array<Record<string, unknown>>,
  {
    model = 'current/tool-model:free',
    finish = 'stop',
    usage = { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
  }: { model?: string; finish?: string; usage?: Record<string, number> } = {}
) {
  const events = [
    ...deltas.map(delta =>
      JSON.stringify({ id: '1', model, choices: [{ index: 0, delta, finish_reason: null }] })
    ),
    JSON.stringify({
      id: '1',
      model,
      choices: [{ index: 0, delta: {}, finish_reason: finish }],
      usage,
    }),
    '[DONE]',
  ];
  return new Response(events.map(event => `data: ${event}\n\n`).join(''), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

const text = (content: string) => answer([{ role: 'assistant', content }]);

const bodyOf = (request: ReturnType<typeof vi.fn>, call = 0) =>
  JSON.parse(String(request.mock.calls[call]?.[1]?.body)) as Record<string, unknown>;

describe('the browser writing service', () => {
  it('routes an automatic Agent request through OpenRouter’s current free tool models', async () => {
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    const writer = await openAgentWriter();
    await writer
      .stream(writer.model, { messages: [{ role: 'user', content: 'Hi', timestamp: 1 }] })
      .result();

    const body = bodyOf(request);
    expect(body.model).toBe('openrouter/free');
    expect(body).not.toHaveProperty('models');
    // The loop reads one call at a time, so the model may only make one.
    expect(body.parallel_tool_calls).toBe(false);
  });

  it('uses the Suggestions model override only for suggestion calls', async () => {
    state.setup.defaultModel = { service: 'openrouter', model: 'default/model' };
    state.setup.suggestionsModel = { service: 'openrouter', model: 'suggestions/model' };
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate(
      { messages: [{ role: 'user', content: 'Suggest something' }] },
      { feature: 'suggestions' }
    );
    await generate(
      { messages: [{ role: 'user', content: 'Describe this space' }] },
      { feature: 'context' }
    );

    expect(bodyOf(request, 0).model).toBe('suggestions/model');
    expect(bodyOf(request, 1).model).toBe('default/model');
  });

  it('uses the default model for Suggestions when no override is set', async () => {
    state.setup.defaultModel = { service: 'openrouter', model: 'default/model' };
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate(
      { messages: [{ role: 'user', content: 'Suggest something' }] },
      { feature: 'suggestions' }
    );

    expect(bodyOf(request, 0).model).toBe('default/model');
  });

  it('lets the service choose when the user named no model, and keeps JSON mode', async () => {
    const request = vi.fn(async () => text('{"items":[]}'));
    vi.stubGlobal('fetch', request);

    await generate(
      {
        messages: [
          { role: 'system', content: 'Be brief.' },
          { role: 'user', content: 'Suggest something' },
        ],
        response_format: { type: 'json_object' },
      },
      { feature: 'suggestions' }
    );

    const body = bodyOf(request);
    // A user who named no model gets the service's own choice, as before.
    expect(body).not.toHaveProperty('model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    const messages = body.messages as Array<Record<string, unknown>>;
    expect(messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
  });

  it('records what an Agent answer spent, and what a failed one did not', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => text('Hello.')));
    const writer = await openAgentWriter();
    const answer = await writer
      .stream(writer.model, { messages: [{ role: 'user', content: 'Hi', timestamp: 1 }] })
      .result();
    writer.spent?.(answer);

    // The model that answered is free, so the turn cost nothing and says so.
    expect(state.usage.at(-1)).toMatchObject({
      generation_type: 'agent',
      provider: 'openrouter',
      success: true,
      cost_usd: 0,
      cost_source: 'free',
    });

    // A client answers a failure with a message, so a failure is recorded from
    // one too, and never mistaken for an answer.
    writer.spent?.({
      ...answer,
      stopReason: 'error',
      errorMessage: 'That key did not work.',
    });
    expect(state.usage.at(-1)).toMatchObject({
      success: false,
      error_message: 'That key did not work.',
    });
  });

  it('prices a call from the catalog, and knows when it cannot', async () => {
    state.setup.defaultModel = { service: 'openrouter', model: 'openai/gpt-4o-mini' };
    const priced = vi.fn(async () =>
      answer([{ role: 'assistant', content: 'Hello.' }], { model: 'openai/gpt-4o-mini' })
    );
    vi.stubGlobal('fetch', priced);
    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' });
    expect(state.usage.at(-1)).toMatchObject({ cost_source: 'estimated' });

    state.setup.defaultModel = { service: 'openrouter', model: 'nobody/prices-this' };
    const unlisted = vi.fn(async () =>
      answer([{ role: 'assistant', content: 'Hello.' }], { model: 'nobody/prices-this' })
    );
    vi.stubGlobal('fetch', unlisted);
    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' });
    // Nobody publishes a rate for it, so September records no number at all.
    expect(state.usage.at(-1)).toMatchObject({ cost_source: 'unknown' });
    expect(state.usage.at(-1)).not.toHaveProperty('cost_usd');
  });

  it('raises the reason the service gave, and records the failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'That key did not work.' } }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
      )
    );

    await expect(
      generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' })
    ).rejects.toThrow('That key did not work.');
    expect(state.usage.at(-1)).toMatchObject({ success: false });
  });

  it('keeps the client out of the entry bundle', async () => {
    const source = await readFile('src/services/ai.ts', 'utf8');
    const statik = source.match(/^import .*'@earendil-works\/pi-ai'/gm) ?? [];
    // Only a type import may be static: a value import would reach the reader
    // who opened the landing page and never asked for writing help.
    expect(statik.every(line => line.startsWith('import type'))).toBe(true);
    expect(source).toContain("import('@earendil-works/pi-ai')");
  });
});
