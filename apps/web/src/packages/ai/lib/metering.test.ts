import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRecordApiCall } = vi.hoisted(() => ({ mockRecordApiCall: vi.fn() }));

vi.mock('@/packages/usage', () => ({ recordApiCall: mockRecordApiCall }));

import { meteringMiddleware } from './metering';
import { cacheMiddleware } from './middleware';

type Params = Parameters<NonNullable<typeof cacheMiddleware.wrapGenerate>>[0]['params'];

function paramsWith(text: string): Params {
  return {
    prompt: [{ role: 'user', content: [{ type: 'text', text }] }],
  } as unknown as Params;
}

function generated(overrides: Record<string, unknown> = {}) {
  return {
    content: [{ type: 'text', text: 'hello there' }],
    finishReason: 'stop',
    usage: { inputTokens: 412, outputTokens: 38, totalTokens: 450 },
    warnings: [],
    ...overrides,
  };
}

function run(
  middleware: typeof cacheMiddleware,
  doGenerate: () => Promise<unknown>,
  params: Params
) {
  return middleware.wrapGenerate!({
    doGenerate: doGenerate as never,
    doStream: (() => {
      throw new Error('not used');
    }) as never,
    params,
    model: {} as never,
  });
}

const context = {
  userId: 'user-1',
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  feature: 'suggestions' as const,
};

describe('meteringMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records the call and returns the result untouched', async () => {
    const result = generated();
    const returned = await run(
      meteringMiddleware(context),
      async () => result,
      paramsWith('write a haiku')
    );

    expect(returned).toBe(result);
    expect(mockRecordApiCall).toHaveBeenCalledOnce();

    const [userId, call] = mockRecordApiCall.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(call).toMatchObject({
      kind: 'llm',
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      feature: 'suggestions',
      input_tokens: 412,
      output_tokens: 38,
      success: true,
      cached: false,
    });
    expect(call.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('records the text lengths on both sides', async () => {
    await run(
      meteringMiddleware(context),
      async () => generated(),
      paramsWith('write a haiku')
    );

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.input_length).toBe('write a haiku'.length);
    expect(call.output_length).toBe('hello there'.length);
  });

  it('records cached input tokens when the provider reports them', async () => {
    await run(
      meteringMiddleware(context),
      async () => generated({ usage: { inputTokens: 900, outputTokens: 20, cachedInputTokens: 700 } }),
      paramsWith('long prompt')
    );

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.cached_input_tokens).toBe(700);
  });

  it('passes through the exact cost OpenRouter reports', async () => {
    await run(
      meteringMiddleware({ ...context, provider: 'openrouter', model: 'anthropic/claude-haiku-4.5' }),
      async () =>
        generated({
          providerMetadata: { openrouter: { usage: { cost: 0.0812, totalTokens: 450 } } },
        }),
      paramsWith('write a haiku')
    );

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.reported_cost_usd).toBe(0.0812);
  });

  it('records a failure and rethrows so the call site still handles it', async () => {
    const boom = new Error('Rate limited');

    await expect(
      run(
        meteringMiddleware(context),
        async () => {
          throw boom;
        },
        paramsWith('write a haiku')
      )
    ).rejects.toThrow('Rate limited');

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.success).toBe(false);
    expect(call.error_message).toBe('Rate limited');
    expect(call.input_tokens).toBeUndefined();
  });

  it('records a cache hit as cached, with no tokens to charge for', async () => {
    const params = paramsWith('a prompt that will be cached');

    // Prime the shared generation cache the way a real first call would.
    await run(cacheMiddleware, async () => generated(), params);
    vi.clearAllMocks();

    // The meter wraps the cache, so it still sees the (cached) call.
    const meter = meteringMiddleware(context);
    await run(meter, () => run(cacheMiddleware, async () => generated(), params) as never, params);

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.cached).toBe(true);
    expect(call.input_tokens).toBeUndefined();
    expect(call.output_tokens).toBeUndefined();
  });

  it('records nothing when there is no user ID', async () => {
    await run(
      meteringMiddleware({ ...context, userId: undefined }),
      async () => generated(),
      paramsWith('write a haiku')
    );

    expect(mockRecordApiCall).not.toHaveBeenCalled();
  });
});
