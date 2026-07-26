import { LanguageModelMiddleware } from 'ai';

import { GenerationFeature, recordApiCall } from '@/packages/usage';

import { GenerateParams, hasCached } from './middleware';

export interface MeteringContext {
  /** Nothing is recorded without a signed-in user. */
  userId?: string;
  provider: string;
  model: string;
  feature: GenerationFeature;
}

type GenerateResult = Awaited<ReturnType<NonNullable<LanguageModelMiddleware['wrapGenerate']>>>;

/**
 * Records every language-model call — success, failure, and cache hit alike.
 *
 * This lives in middleware rather than at each call site so that a new
 * generation path is metered the day it is written, and so failures (which the
 * call sites turn into toasts and forget) still leave a trace.
 *
 * Wrap with the meter first so it stays outermost:
 * `wrapLanguageModel({ model, middleware: [meteringMiddleware(ctx), cacheMiddleware] })`.
 * Inside the cache it would never see a cache hit at all.
 */
export function meteringMiddleware({
  userId,
  provider,
  model,
  feature,
}: MeteringContext): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      if (!userId) return doGenerate();

      // Asked before the call: afterwards the cache always holds the result.
      const cached = hasCached(params);
      const startedAt = performance.now();

      try {
        const result = await doGenerate();

        recordApiCall(userId, {
          kind: 'llm',
          provider,
          model,
          feature,
          // A cache hit reports the original call's usage. Charging it again
          // would double-count both the tokens and the money.
          input_tokens: cached ? undefined : (result.usage?.inputTokens ?? undefined),
          output_tokens: cached ? undefined : (result.usage?.outputTokens ?? undefined),
          cached_input_tokens: cached ? undefined : (result.usage?.cachedInputTokens ?? undefined),
          input_length: promptLength(params),
          output_length: contentLength(result),
          cached,
          reported_cost_usd: cached ? undefined : reportedCost(result),
          latency_ms: Math.round(performance.now() - startedAt),
          success: true,
        });

        return result;
      } catch (error) {
        recordApiCall(userId, {
          kind: 'llm',
          provider,
          model,
          feature,
          input_length: promptLength(params),
          cached: false,
          latency_ms: Math.round(performance.now() - startedAt),
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    },
  };
}

/**
 * The exact charge OpenRouter reports for the call, when usage accounting is on
 * (`usage: { include: true }`, set in `openRouterModelArgs`). Providers that
 * report nothing fall through to the price table.
 */
function reportedCost(result: GenerateResult): number | undefined {
  const usage = (
    result.providerMetadata as { openrouter?: { usage?: { cost?: unknown } } } | undefined
  )?.openrouter?.usage;

  return typeof usage?.cost === 'number' ? usage.cost : undefined;
}

function promptLength(params: GenerateParams): number {
  return params.prompt.reduce((total, message) => {
    if (typeof message.content === 'string') return total + message.content.length;

    return (
      total +
      message.content.reduce(
        (sum, part) => sum + (part.type === 'text' ? part.text.length : 0),
        0
      )
    );
  }, 0);
}

function contentLength(result: GenerateResult): number {
  return result.content.reduce(
    (sum, part) => sum + (part.type === 'text' ? part.text.length : 0),
    0
  );
}
