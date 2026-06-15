import { useCallback, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';

import { buildPhrasesPrompt } from '../lib/phrases';

const SpacePhrasesSchema = z.object({
  phrases: z.array(z.string()),
});

interface GeneratePhrasesParams {
  /** Full current collection (pinned + AI), so the model sees the whole picture. */
  existing: string[];
  history: string[];
  context?: string;
}

interface UseGenerateSpacePhrasesReturn {
  generatePhrases: (params: GeneratePhrasesParams) => Promise<string[] | undefined>;
  isGenerating: boolean;
  isReady: boolean;
  error?: { message: string };
}

/**
 * Generate a refreshed set of AI saved phrases from the user's existing phrases,
 * the space context, and recent history. Mirrors `useGenerateSpaceContext`:
 * uses the suggestions provider/model and only runs when the provider is ready.
 */
export function useGenerateSpacePhrases(): UseGenerateSpacePhrasesReturn {
  const [error, setError] = useState<{ message: string } | undefined>();

  const { suggestionsConfig } = useAISettings();
  const { generate, isGenerating, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const generatePhrases = useCallback(
    async (params: GeneratePhrasesParams): Promise<string[] | undefined> => {
      if (!isReady) {
        throw new Error('API key not configured');
      }

      setError(undefined);

      try {
        const { system, prompt } = buildPhrasesPrompt(params);
        const result = await generate({
          prompt,
          system,
          schema: SpacePhrasesSchema,
        });

        if (!result?.phrases) {
          throw new Error('Invalid AI response format');
        }

        return result.phrases.map(p => p.trim()).filter(Boolean);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate phrases';
        console.error('Error generating space phrases:', err);
        setError({ message });
        throw err;
      }
    },
    [generate, isReady]
  );

  return { generatePhrases, isGenerating, isReady, error };
}
