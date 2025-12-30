'use client';

import { useCallback, useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { webLLM } from '@built-in-ai/web-llm';
import { generateObject, generateText, wrapLanguageModel } from 'ai';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAccountContext } from '@/packages/account';
import { useAISettings } from '@/packages/ai/hooks/use-ai-settings';
import { logAIGeneration } from '@/packages/analytics';
import { cacheMiddleware } from '@/packages/ai/lib/middleware';
import { AI_PROVIDERS } from '@/packages/ai/lib/registry';
import { AIProvider } from '@/types/ai-config';

/**
 * Options for configuring the useGenerate hook
 */
export interface UseGenerateOptions {
  /** AI provider to use (default: 'gemini') */
  provider?: AIProvider;
  /** Model ID to use (default: 'gemini-2.5-flash-lite' for gemini) */
  model?: string;
}

/**
 * Base parameters for generation
 */
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
 * Uses the modern Vercel AI SDK Output API for type-safe structured generation.
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
  const { provider, model } = options;

  const { user } = useAccountContext();
  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  // Get provider configuration (API key, base URL)
  const providerConfig = provider ? getProviderConfig(provider) : undefined;
  const apiKey = providerConfig?.api_key;

  // Check if provider requires API key and has one
  const providerInfo = provider ? AI_PROVIDERS[provider] : undefined;
  const isReady = !!provider && (!providerInfo?.requires_api_key || !!apiKey);

  // Determine the model to use
  const modelId = model;

  // Memoize provider initialization
  const providerInstance = useMemo(() => {
    if (!provider) return null;
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
      if (!provider || !providerInfo) {
        toast.error('No AI provider specified.');
        return undefined;
      }

      // Validate API key for providers that require it
      if (providerInfo.requires_api_key && !apiKey) {
        toast.error(`API key is required for ${providerInfo.name}.`);
        return undefined;
      }

      // Validate model
      if (!modelId) {
        toast.error('No AI model specified.');
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

        if ('schema' in params && params.schema) {
          const { object, usage } = await generateObject({
            model,
            prompt,
            system,
            temperature,
            schema: params.schema,
            output: params.output,
          });

          // Log AI generation event
          if (user?.id && usage) {
            logAIGeneration(user.id, {
              generation_type: feature || 'suggestions',
              provider: provider === 'gemini' ? 'gemini' : undefined,
              model: modelId,
              input_length: prompt.length,
              output_length: JSON.stringify(object).length,
              latency_ms: 0,
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

          // Log AI generation event
          if (user?.id && usage) {
            logAIGeneration(user.id, {
              generation_type: feature || 'suggestions',
              provider: provider === 'gemini' ? 'gemini' : undefined,
              model: modelId,
              input_length: prompt.length,
              output_length: text.length,
              latency_ms: 0,
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
