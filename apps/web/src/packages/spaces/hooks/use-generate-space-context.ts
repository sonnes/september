import { useCallback, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';

const SPACE_CONTEXT_GENERATION_PROMPT = `Produce a title and a starter note for one conversation space of a communication app.

<context>
- The User is using a communication app to speak out loud
- The words below are the User's own. They are either the first thing the User said in this space, or the User's answer to "what is this space for?"
- The note you write goes UNDER those words, after a blank line. The words of the User stay above it, and nothing replaces them.
- The suggestion engine and the phrase engine both read the whole note, so what you write decides the words this space offers.
</context>

<output_format>
- title: Short descriptive name for this space (max 50 chars)
- context: Markdown note with:
  - One or two prose sentences (first person, from the User's perspective) capturing who they are talking to, the situation, and the intent
  - A short list of bullet phrases the User is likely to want to say (using "- " prefix), in the same language and tone as the input
</output_format>

<rules>
- All content must be from the User's point of view (what THEY would say or convey)
- Do NOT repeat the words the User already wrote — add only what they leave unsaid
- Everything you add must follow from those words. Where they are silent, stay silent: do NOT add needs, care, health, or thanks that the words do not raise.
- Bullet phrases are speakable sentence starters or full short phrases
- Keep the context concise — prose: 1-2 sentences; bullets: 4-8 items
- STRICTLY maintain the same language as the input
- Match the style and tone of the input (e.g. casual, formal)
- The context markdown is written in first person as the User
- The title names the person, the place, or the subject — never the health of the User
</rules>`;

const SpaceContextGenerationSchema = z.object({
  title: z.string().max(50),
  context: z.string(),
});

interface GenerateContextParams {
  messageText: string;
}

interface GeneratedContextData {
  title: string;
  context: string;
}

interface UseGenerateSpaceContextReturn {
  generateContext: (params: GenerateContextParams) => Promise<GeneratedContextData | undefined>;
  isGenerating: boolean;
  error?: { message: string };
}

export function useGenerateSpaceContext(): UseGenerateSpaceContextReturn {
  const [error, setError] = useState<{ message: string } | undefined>();

  const { suggestionsConfig } = useAISettings();
  const { generate, isGenerating, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const generateContext = useCallback(
    async (params: GenerateContextParams): Promise<GeneratedContextData | undefined> => {
      if (!isReady) {
        console.log('API key not configured, skipping space context generation');
        throw new Error('API key not configured');
      }

      setError(undefined);

      try {
        const result = await generate({
          prompt: `Words from the User:\n${params.messageText}`,
          system: SPACE_CONTEXT_GENERATION_PROMPT,
          schema: SpaceContextGenerationSchema,
          feature: 'context',
        });

        if (!result?.title || !result?.context) {
          throw new Error('Invalid AI response format');
        }

        return {
          title: result.title,
          context: result.context,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate space context';
        console.error('Error generating space context:', err);
        setError({ message: errorMessage });
        throw err;
      }
    },
    [generate, isReady]
  );

  return {
    generateContext,
    isGenerating,
    error,
  };
}
