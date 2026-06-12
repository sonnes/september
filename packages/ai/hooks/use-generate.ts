'use client';

import { useCallback, useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { webLLM } from '@built-in-ai/web-llm';
import { useAccount } from '@september/account';
import { track } from '@september/analytics';
import { AIProvider } from '@september/shared';
import { generateObject, generateText, wrapLanguageModel } from 'ai';
import { toast } from 'sonner';
import { z } from 'zod';

import { cacheMiddleware } from '../lib/middleware';
import { AI_PROVIDERS } from '../lib/registry';
import { useAISettings } from './use-ai-settings';

const DEFAULT_GENERATION_PROVIDER: AIProvider = 'gemini';
const DEFAULT_GENERATION_MODEL = 'gemini-2.5-flash-lite';

export interface UseGenerateOptions {
  /** AI provider to use (default: 'gemini') */
  provider?: AIProvider;
  /** Model ID to use (default: 'gemini-2.5-flash-lite' for gemini) */
  model?: string;
}

interface BaseGenerateParams {
  /** The user prompt */
  prompt: string;
  /** Optional system instructions */
  system?: string;
  /** Temperature for generation (0-2, default: 1) */
  temperature?: number;
  /** Feature being used for analytics tracking */
  feature?: 'suggestions' | 'transcription' | 'summary';
}

/**
 * Parameters for text generation
 */
export interface GenerateTextParams extends BaseGenerateParams {}

/**
 * Parameters for object generation with schema validation
 */
export interface GenerateObjectParams<T extends z.ZodType> extends BaseGenerateParams {
  schema: T;
  output?: 'object' | 'array' | 'enum' | 'no-schema';
}

/**
 * Return type for the useGenerate hook
 */
export interface UseGenerateReturn {
  /** Generate text (default) */
  generate(params: GenerateTextParams): Promise<string | undefined>;
  /** Generate structured object */
  generate<T extends z.ZodType>(params: GenerateObjectParams<T>): Promise<z.infer<T> | undefined>;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether the provider is ready (has API key if required) */
  isReady: boolean;
}

/**
 * Hook for generating text or structured objects using AI providers.
 * Reads provider settings from account and initializes the appropriate provider.
 *
 * @example Text generation
 * ```tsx
 * const { generate, isGenerating } = useGenerate();
 *
 * // Generate plain text (default)
 * const text = await generate({
 *   prompt: 'Write a haiku about coding',
 *   system: 'You are a creative writer.',
 * });
 * ```
 *
 * @example Object generation with schema
 * ```tsx
 * import { z } from 'zod';
 *
 * const { generate } = useGenerate();
 *
 * const recipe = await generate({
 *   prompt: 'Generate a lasagna recipe',
 *   schema: z.object({
 *     name: z.string(),
 *     ingredients: z.array(z.object({
 *       name: z.string(),
 *       amount: z.string(),
 *     })),
 *     steps: z.array(z.string()),
 *   }),
 * });
 * ```
 */
export function useGenerate(options: UseGenerateOptions = {}): UseGenerateReturn {
  const provider = options.provider ?? DEFAULT_GENERATION_PROVIDER;
  const modelId = options.model ?? DEFAULT_GENERATION_MODEL;

  const { user } = useAccount();
  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const providerConfig = getProviderConfig(provider);
  const apiKey = providerConfig?.api_key;

  const providerInfo = AI_PROVIDERS[provider];
  const isReady = !providerInfo.requires_api_key || !!apiKey;

  const providerInstance = useMemo(() => {
    if (provider === 'gemini') {
      return createGoogleGenerativeAI({
        apiKey: apiKey || '',
      });
    } else if (provider === 'webllm') {
      return webLLM;
    }
    return null;
  }, [provider, apiKey]);

  const generate = useCallback(
    async <T extends z.ZodType>(
      params: GenerateTextParams | GenerateObjectParams<T>
    ): Promise<string | z.infer<T> | undefined> => {
      const { prompt, system, temperature, feature } = params;

      // Validate provider support
      if (!providerInfo) {
        toast.error(`Provider "${provider}" is not registered.`);
        return undefined;
      }

      // Validate API key for providers that require it
      if (providerInfo.requires_api_key && !apiKey) {
        toast.error(`API key is required for ${providerInfo.name}.`);
        return undefined;
      }

      // Validate provider support
      if (!providerInstance) {
        toast.error(`Provider "${provider}" is not yet supported for generation.`);
        return undefined;
      }

      setIsGenerating(true);

      try {
        const model = wrapLanguageModel({
          model: providerInstance(modelId),
          middleware: cacheMiddleware,
        });

        const startTime = performance.now();

        if ('schema' in params && params.schema) {
          const { object, usage } = await generateObject({
            model,
            prompt,
            system,
            temperature,
            schema: params.schema,
            output: params.output,
          });

          const latencyMs = Math.round(performance.now() - startTime);

          // Log AI generation event
          if (user?.id && usage) {
            track(user.id, {
              type: 'ai_generation',
              generation_type: feature || 'suggestions',
              provider: provider === 'gemini' ? 'gemini' : undefined,
              model: modelId,
              input_length: prompt.length,
              output_length: JSON.stringify(object).length,
              latency_ms: latencyMs,
              success: true,
            });
          }

          return object as z.infer<T>;
        } else {
          const { text, usage } = await generateText({
            model,
            prompt,
            system,
            temperature,
          });

          const latencyMs = Math.round(performance.now() - startTime);

          // Log AI generation event
          if (user?.id && usage) {
            track(user.id, {
              type: 'ai_generation',
              generation_type: feature || 'suggestions',
              provider: provider === 'gemini' ? 'gemini' : undefined,
              model: modelId,
              input_length: prompt.length,
              output_length: text.length,
              latency_ms: latencyMs,
              success: true,
            });
          }

          return text;
        }
      } catch (error) {
        console.error('Generation error:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to generate content. Please try again.'
        );
        return undefined;
      } finally {
        setIsGenerating(false);
      }
    },
    [provider, providerInfo, apiKey, providerInstance, modelId, user]
  ) as UseGenerateReturn['generate'];

  return {
    generate,
    isGenerating,
    isReady,
  };
}
