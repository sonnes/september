import { useCallback, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';

import { buildPhrasesPrompt, sanitizeStarters } from '../lib/phrases';
import type { PromptPhrase } from '../lib/phrases';

const SpacePhrasesSchema = z.object({
  phrases: z.array(z.string()),
  // 3-5-word sentence-opening prefixes. Optional so a model that omits the
  // field degrades to phrases-only instead of failing validation.
  starters: z.array(z.string()).optional(),
});

interface GeneratePhrasesParams {
  /** Full current collection (pinned + AI), so the model sees the whole picture. */
  existing: PromptPhrase[];
  /** Current starters (pinned + AI). */
  existingStarters?: PromptPhrase[];
  /** Pre-formatted "Me:"/"Them:" conversation lines (formatPhraseHistory). */
  history: string[];
  context?: string;
}

export interface GeneratedPhrases {
  phrases: string[];
  starters: string[];
}

interface UseGenerateSpacePhrasesReturn {
  generatePhrases: (params: GeneratePhrasesParams) => Promise<GeneratedPhrases | undefined>;
  isGenerating: boolean;
  isReady: boolean;
  error?: { message: string };
}

/**
 * Generate a refreshed set of AI saved phrases and sentence starters from the
 * user's existing collection, the space context, and recent history. Mirrors
 * `useGenerateSpaceContext`: uses the suggestions provider/model and only runs
 * when the provider is ready.
 */
export function useGenerateSpacePhrases(): UseGenerateSpacePhrasesReturn {
  const [error, setError] = useState<{ message: string } | undefined>();

  const { suggestionsConfig } = useAISettings();
  const { generate, isGenerating, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const generatePhrases = useCallback(
    async (params: GeneratePhrasesParams): Promise<GeneratedPhrases | undefined> => {
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
          feature: 'phrases',
        });

        if (!result?.phrases) {
          throw new Error('Invalid AI response format');
        }

        return {
          phrases: result.phrases.map(p => p.trim()).filter(Boolean),
          starters: sanitizeStarters(result.starters ?? []),
        };
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
