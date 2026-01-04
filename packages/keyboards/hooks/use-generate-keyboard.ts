'use client';

import { useCallback, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';

const KEYBOARD_GENERATION_PROMPT = `Generate an AAC keyboard with titles and 24 phrase starters using the User's point of view from the description given.

<output_format>
- chatTitle: Descriptive conversation name (max 50 chars)
- keyboardTitle: Tab label (max 2 words)
- buttons: Exactly 24 phrase starters (max 3 words each)
</output_format>

<rules>
- All phrases must be from the User's point of view (what THEY would say)
- Phrases should be practical sentence starters for efficient communication
- Cover common responses, follow-ups, and related topics
- Prioritize frequently-used phrases over complex ones
- STRICTLY maintain the same language as the input message
- Match the style and tone of the input message (e.g. casual, formal)
</rules>`;

const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z.string(),
  buttons: z.array(z.string().max(50)).length(24),
});

interface GenerateKeyboardParams {
  messageText: string;
  chatId: string;
}

interface GeneratedKeyboardData {
  chatTitle: string;
  keyboardTitle: string;
  buttons: string[];
}

interface UseGenerateKeyboardFromMessageReturn {
  generateKeyboard: (params: GenerateKeyboardParams) => Promise<GeneratedKeyboardData>;
  isGenerating: boolean;
  error?: { message: string };
}

export function useGenerateKeyboardFromMessage(): UseGenerateKeyboardFromMessageReturn {
  const [error, setError] = useState<{ message: string } | undefined>();

  const { suggestionsConfig } = useAISettings();
  const { generate, isGenerating, isReady } = useGenerate({
    provider: suggestionsConfig.provider,
    model: suggestionsConfig.model,
  });

  const generateKeyboard = useCallback(
    async (params: GenerateKeyboardParams): Promise<GeneratedKeyboardData> => {
      if (!isReady) {
        console.log('Google API key not configured, skipping keyboard generation');
        throw new Error('API key not configured');
      }

      setError(undefined);

      try {
        const result = await generate({
          prompt: `First message: "${params.messageText}"`,
          system: KEYBOARD_GENERATION_PROMPT,
          schema: KeyboardGenerationSchema,
        });

        if (!result?.chatTitle || !result?.keyboardTitle || !result?.buttons) {
          throw new Error('Invalid AI response format');
        }

        return {
          chatTitle: result.chatTitle,
          keyboardTitle: result.keyboardTitle,
          buttons: result.buttons,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate keyboard suggestions';
        console.error('Error generating keyboard:', err);
        setError({ message: errorMessage });
        throw err;
      }
    },
    [generate, isReady]
  );

  return {
    generateKeyboard,
    isGenerating,
    error,
  };
}
