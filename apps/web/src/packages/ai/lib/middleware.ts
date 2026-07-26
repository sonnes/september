import { LanguageModelMiddleware } from 'ai';

/** Call params as handed to `wrapGenerate` (the SDK does not export the type). */
export type GenerateParams = Parameters<
  NonNullable<LanguageModelMiddleware['wrapGenerate']>
>[0]['params'];

const cache = new Map<string, any>();

/** The key a set of call params caches under. */
export function cacheKeyFor(params: GenerateParams): string {
  return JSON.stringify(params.prompt);
}

/**
 * Whether these params would be served from the cache.
 *
 * The metering middleware wraps this one, so it asks before the call to tell a
 * cache hit (free) from a real provider call. Checking is synchronous and
 * immediately precedes the call, so the only way to be wrong is a concurrent
 * generation resolving in between — which mislabels a hit as a miss, and is
 * harmless.
 */
export function hasCached(params: GenerateParams): boolean {
  return cache.has(cacheKeyFor(params));
}

/**
 * Caching middleware for AI language models.
 * Caches both full generation and streaming results in memory.
 */
export const cacheMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = cacheKeyFor(params);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await doGenerate();
    cache.set(cacheKey, result);

    return result;
  },
};
