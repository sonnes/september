'use client';

import { useCallback, useMemo, useState } from 'react';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { webLLM } from '@built-in-ai/web-llm';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAISettings } from '@/packages/ai/hooks/use-ai-settings';
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
}

/**
 * Parameters for text generation
 */
export interface GenerateTextParams extends BaseGenerateParams {
  output?: ReturnType<typeof Output.text>;
}

/**
 * Parameters for object generation with schema validation
 */
export interface GenerateObjectParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.object<T>>;
}

/**
 * Parameters for array generation with element schema
 */
export interface GenerateArrayParams<T extends z.ZodType> extends BaseGenerateParams {
  output: ReturnType<typeof Output.array<T>>;
}

/**
 * Return type for the useGenerate hook
 */
export interface UseGenerateReturn {
  /** Generate text (default) */
  generate(params: GenerateTextParams): Promise<string | undefined>;
  /** Generate structured object */
  generate<T extends z.ZodType>(params: GenerateObjectParams<T>): Promise<z.infer<T> | undefined>;
  /** Generate array of objects */
  generate<T extends z.ZodType>(params: GenerateArrayParams<T>): Promise<z.infer<T>[] | undefined>;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Whether the provider is ready (has API key if required) */
  isReady: boolean;
}

const DEFAULT_PROVIDER: AIProvider = 'gemini';
const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash-lite',
  webllm: 'Qwen3-0.6B-q0f16-MLC',
};

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
 * import { Output } from 'ai';
 * import { z } from 'zod';
 *
 * const { generate } = useGenerate();
 *
 * const recipe = await generate({
 *   prompt: 'Generate a lasagna recipe',
 *   output: Output.object({
 *     schema: z.object({
 *       name: z.string(),
 *       ingredients: z.array(z.object({
 *         name: z.string(),
 *         amount: z.string(),
 *       })),
 *       steps: z.array(z.string()),
 *     }),
 *   }),
 * });
 * ```
 *
 * @example Array generation
 * ```tsx
 * const { generate } = useGenerate();
 *
 * const heroes = await generate({
 *   prompt: 'Generate 3 RPG hero descriptions',
 *   output: Output.array({
 *     element: z.object({
 *       name: z.string(),
 *       class: z.string(),
 *       description: z.string(),
 *     }),
 *   }),
 * });
 * ```
 */
export function useGenerate(options: UseGenerateOptions = {}): UseGenerateReturn {
  const { provider = DEFAULT_PROVIDER, model } = options;

  const { getProviderConfig } = useAISettings();
  const [isGenerating, setIsGenerating] = useState(false);

  // Get provider configuration (API key, base URL)
  const providerConfig = getProviderConfig(provider);
  const apiKey = providerConfig?.api_key;

  // Check if provider requires API key and has one
  const providerInfo = AI_PROVIDERS[provider];
  const isReady = !providerInfo?.requires_api_key || !!apiKey;

  // Determine the model to use
  const modelId = model ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.gemini;

  // Memoize provider initialization
  const googleProvider = useMemo(() => {
    if (provider !== 'gemini') return null;
    return createGoogleGenerativeAI({
      apiKey: apiKey || '',
    });
  }, [provider, apiKey]);

  // Memoize webllm provider initialization
  const webllmProvider = useMemo(() => {
    if (provider !== 'webllm') return null;
    return webLLM;
  }, [provider]);

  const generate = useCallback(
    async <T extends z.ZodType>(
      params: GenerateTextParams | GenerateObjectParams<T> | GenerateArrayParams<T>
    ): Promise<string | z.infer<T> | z.infer<T>[] | undefined> => {
      const { prompt, system, temperature, output } = params;

      // Validate API key for providers that require it
      if (providerInfo?.requires_api_key && !apiKey) {
        toast.error(`API key is required for ${providerInfo.name}.`);
        return undefined;
      }

      // Validate provider support
      if (provider !== 'gemini' && provider !== 'webllm') {
        toast.error(`Provider "${provider}" is not yet supported for generation.`);
        return undefined;
      }

      if (provider === 'gemini' && !googleProvider) {
        toast.error('Failed to initialize AI provider.');
        return undefined;
      }

      if (provider === 'webllm' && !webllmProvider) {
        toast.error('Failed to initialize WebLLM provider.');
        return undefined;
      }

      setIsGenerating(true);

      try {
        let result;

        if (provider === 'gemini') {
          result = await generateText({
            model: googleProvider!(modelId),
            prompt,
            system,
            temperature,
            // Use Output.text() as default if no output specified
            output: output ?? Output.text(),
          });
        } else if (provider === 'webllm') {
          result = await generateText({
            model: webllmProvider!(modelId) as any,
            prompt,
            system,
            temperature,
            // Use Output.text() as default if no output specified
            output: output ?? Output.text(),
          });
        } else {
          toast.error(`Provider "${provider}" is not supported.`);
          return undefined;
        }

        // For text generation with Output.text(), result.output is the string
        // For object/array generation, result.output is the validated object/array
        const generatedOutput = result.output;

        if (generatedOutput === undefined || generatedOutput === null) {
          toast.error('Failed to generate content. Please try again.');
          return undefined;
        }

        return generatedOutput as string | z.infer<T> | z.infer<T>[] | undefined;
      } catch (error) {
        console.error('Generation error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to generate content. Please try again.'
        );
        return undefined;
      } finally {
        setIsGenerating(false);
      }
    },
    [provider, providerInfo, apiKey, googleProvider, webllmProvider, modelId]
  ) as UseGenerateReturn['generate'];

  return {
    generate,
    isGenerating,
    isReady,
  };
}
