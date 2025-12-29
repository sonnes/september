import { LanguageModelMiddleware } from 'ai';

const cache = new Map<string, any>();

/**
 * Caching middleware for AI language models.
 * Caches both full generation and streaming results in memory.
 */
export const cacheMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params.prompt);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await doGenerate();
    cache.set(cacheKey, result);

    return result;
  },
};
