import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generate, openAgentWriter } from '@september/app-ui/services/ai';
import { setup } from '@september/app-ui/services/settings';
import { DEFAULT_ANSWERS, type SavedSetup } from '@september/core/rules/onboarding';

import { bodyOf, streamedReply, textReply } from './model';
import { platform } from './platform';

type Body = Record<string, unknown>;

async function chooseModels(
  models: Partial<Pick<SavedSetup, 'defaultModel' | 'suggestionsModel'>>
) {
  await setup.set({
    ...DEFAULT_ANSWERS,
    id: 'ravi',
    name: 'Ravi',
    defaultModel: { service: 'openrouter', model: '' },
    suggestionsModel: null,
    ...models,
  });
}

/** The data of the last usage event. */
const lastUsage = () => vi.mocked(platform.store.putUsageEvent).mock.calls.at(-1)?.[0].data;

beforeEach(() => chooseModels({}));

afterEach(() => vi.unstubAllGlobals());

const text = (content: string) => textReply(content, { model: 'current/tool-model:free' });
const answer = (deltas: Array<Record<string, unknown>>, options: Parameters<typeof streamedReply>[1] = {}) =>
  streamedReply(deltas, { model: 'current/tool-model:free', ...options });

describe('the writing service', () => {
  it('routes an automatic Agent request through OpenRouter’s current free tool models', async () => {
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    const writer = await openAgentWriter();
    const stream = await writer.stream(writer.model, {
      messages: [{ role: 'user', content: 'Hi', timestamp: 1 }],
    });
    await stream.result();

    const body = bodyOf<Body>(request);
    expect(body.model).toBe('openrouter/free');
    expect(body).not.toHaveProperty('models');
    // The loop reads one call at a time, so the model may only make one.
    expect(body.parallel_tool_calls).toBe(false);
  });

  it('uses the Suggestions model override only for suggestion calls', async () => {
    await chooseModels({
      defaultModel: { service: 'openrouter', model: 'default/model' },
      suggestionsModel: { service: 'openrouter', model: 'suggestions/model' },
    });
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate(
      { messages: [{ role: 'user', content: 'Suggest something' }] },
      { feature: 'suggestions' }
    );
    await generate(
      { messages: [{ role: 'user', content: 'Describe this space' }] },
      { feature: 'phrases' }
    );

    expect(bodyOf<Body>(request, 0).model).toBe('suggestions/model');
    expect(bodyOf<Body>(request, 1).model).toBe('default/model');
  });

  it('uses the default model for Suggestions when no override is set', async () => {
    await chooseModels({ defaultModel: { service: 'openrouter', model: 'default/model' } });
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate(
      { messages: [{ role: 'user', content: 'Suggest something' }] },
      { feature: 'suggestions' }
    );

    expect(bodyOf<Body>(request, 0).model).toBe('default/model');
  });

  it.each(['', '   '])(
    'routes an automatic model (%j) through the free router and keeps JSON mode',
    async model => {
      await chooseModels({ defaultModel: { service: 'openrouter', model } });
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

      const body = bodyOf<Body>(request);
      expect(body.model).toBe('openrouter/free');
      expect(body.response_format).toEqual({ type: 'json_object' });
      const messages = body.messages as Array<Record<string, unknown>>;
      expect(messages[0]).toEqual({ role: 'system', content: 'Be brief.' });
    }
  );

  it('uses the free router for an automatic Suggestions override and other automatic requests', async () => {
    await chooseModels({
      defaultModel: { service: 'openrouter', model: 'default/model' },
      suggestionsModel: { service: 'openrouter', model: '' },
    });
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate(
      { messages: [{ role: 'user', content: 'Suggest something' }] },
      { feature: 'suggestions' }
    );
    expect(bodyOf<Body>(request).model).toBe('openrouter/free');

    await chooseModels({});
    await generate(
      { messages: [{ role: 'user', content: 'Describe this space' }] },
      { feature: 'phrases' }
    );
    expect(bodyOf<Body>(request, 1).model).toBe('openrouter/free');
  });

  it('records what an Agent answer spent, and what a failed one did not', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => text('Hello.'))
    );
    const writer = await openAgentWriter();
    const stream = await writer.stream(writer.model, {
      messages: [{ role: 'user', content: 'Hi', timestamp: 1 }],
    });
    const answer = await stream.result();
    writer.spent?.(answer);

    // The model that answered is free, so the turn cost nothing and says so.
    expect(lastUsage()).toMatchObject({
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
    expect(lastUsage()).toMatchObject({
      success: false,
      error_message: 'That key did not work.',
    });
  });

  it('prices a call from the catalog, and knows when it cannot', async () => {
    await chooseModels({ defaultModel: { service: 'openrouter', model: 'openai/gpt-4o-mini' } });
    const priced = vi.fn(async () =>
      answer([{ role: 'assistant', content: 'Hello.' }], { model: 'openai/gpt-4o-mini' })
    );
    vi.stubGlobal('fetch', priced);
    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' });
    expect(lastUsage()).toMatchObject({ cost_source: 'estimated' });

    await chooseModels({ defaultModel: { service: 'openrouter', model: 'nobody/prices-this' } });
    const unlisted = vi.fn(async () =>
      answer([{ role: 'assistant', content: 'Hello.' }], { model: 'nobody/prices-this' })
    );
    vi.stubGlobal('fetch', unlisted);
    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' });
    // Nobody publishes a rate for it, so September records no number at all.
    expect(lastUsage()).toMatchObject({ cost_source: 'unknown' });
    expect(lastUsage()).not.toHaveProperty('cost_usd');
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
    expect(lastUsage()).toMatchObject({ success: false });
  });

  it('calls the endpoint of the platform with its key', async () => {
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'suggestions' });

    const [url, init] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe('https://openrouter.test/api/v1/chat/completions');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-key');
  });

  it('asks Apple Intelligence for its one model at the address of the platform', async () => {
    platform.writing.apple = {
      status: async () => ({ supported: true, available: true, reason: null }),
      endpoint: async () => ({ baseUrl: 'http://127.0.0.1:9/apple/v1', key: 'run-token' }),
    };
    await chooseModels({ defaultModel: { service: 'apple', model: '' } });
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'phrases' });

    expect(String((request.mock.calls[0] as unknown[])[0])).toBe('http://127.0.0.1:9/apple/v1/chat/completions');
    expect(bodyOf<Body>(request).model).toBe('apple-foundationmodel');
    expect(lastUsage()).toMatchObject({ provider: 'apple', cost_source: 'free', success: true });
  });

  it('refuses Apple Intelligence on a platform without it, and records the failure', async () => {
    await chooseModels({ defaultModel: { service: 'apple', model: '' } });
    const request = vi.fn(async () => text('Hello.'));
    vi.stubGlobal('fetch', request);

    await expect(
      generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'phrases' })
    ).rejects.toThrow('Apple Intelligence is not available on this device.');
    expect(request).not.toHaveBeenCalled();
    expect(lastUsage()).toMatchObject({ provider: 'apple', success: false });
  });

  it('refuses to write before a service is chosen', async () => {
    await chooseModels({ defaultModel: { service: 'none', model: '' } });
    await expect(
      generate({ messages: [{ role: 'user', content: 'Hi' }] }, { feature: 'phrases' })
    ).rejects.toThrow('AI Assistance is not set up.');
  });
});
