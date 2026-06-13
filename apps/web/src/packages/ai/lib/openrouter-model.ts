import type { OpenRouterChatSettings } from '@openrouter/ai-sdk-provider';

/**
 * Sentinel model id for the curated free stack. Not a real OpenRouter model —
 * `openRouterModelArgs` expands it into a primary model plus a fallback chain.
 */
export const OPENROUTER_FREE_STACK_ID = 'september/free-stack';

/**
 * Curated free OpenRouter models, in fallback priority order (fastest-good first,
 * with a quality backstop). Verified against the OpenRouter /models API; refresh
 * here when ids rotate. Keep the list small.
 */
export const OPENROUTER_FREE_MODELS = [
  {
    id: 'qwen/qwen3-next-80b-a3b-instruct:free',
    name: 'Qwen3 Next 80B (free)',
    description: 'Fast MoE, strong quality',
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 26B (free)',
    description: 'Fast, good general chat',
  },
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b:free',
    name: 'Nemotron 3 Nano (free)',
    description: 'Fast, solid reasoning',
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT-OSS 20B (free)',
    description: 'Good all-rounder',
  },
] as const;

/** Free model ids in fallback priority order. */
export const OPENROUTER_FREE_STACK: string[] = OPENROUTER_FREE_MODELS.map(m => m.id);

/**
 * Resolve an OpenRouter model id into the arguments for `openrouter(id, settings)`.
 * The free-stack sentinel expands into the first model plus the rest as a `models`
 * fallback chain (used on 429/error), biased toward the fastest host per model.
 * Any concrete model id passes through unchanged.
 */
export function openRouterModelArgs(modelId: string): {
  id: string;
  settings?: OpenRouterChatSettings;
} {
  if (modelId === OPENROUTER_FREE_STACK_ID) {
    const [primary, ...rest] = OPENROUTER_FREE_STACK;
    return {
      id: primary,
      settings: { models: rest, provider: { sort: 'throughput' } },
    };
  }
  return { id: modelId };
}
