'use client';

import { useCallback, useState } from 'react';

import { Output } from 'ai';
import { z } from 'zod';

import { useGenerate } from '@/packages/ai';

const KEYBOARD_GENERATION_PROMPT = `You are an assistive communication expert designing custom AAC (Augmentative and Alternative Communication) keyboards for users with speech difficulties.

Your task is to generate a full chat title, a concise keyboard title, and 24 phrase starters based on the user's first message in a conversation.

Requirements:
1. Chat Title: Short, descriptive name for this conversation (max 50 characters) - used for chat context
2. Keyboard Title: Concise reference name (MAX 2 WORDS) - displayed on keyboard tabs for quick recognition
3. Buttons: Exactly 24 contextually relevant phrase starters
4. Each button text must be MAX 3 words
5. Each button text must be MAX 50 characters
6. Phrases should be complete sentence starters that help the user communicate efficiently
7. Phrases should cover common responses, follow-ups, and related topics
8. Prioritize practical, frequently-used phrases over complex sentences

Examples:
- Message: "I need to schedule my doctor appointment"
  - Chat Title: "Medical Appointments"
  - Keyboard Title: "Medical"
  - Buttons: ["Yes, please", "No, thanks", "What time?", "Morning works", "Afternoon better", ...]

- Message: "What should we have for dinner tonight?"
  - Chat Title: "Dinner Planning"
  - Keyboard Title: "Dinner"
  - Buttons: ["Sounds good", "I'm hungry", "Not sure", "Pizza?", "Chicken?", ...]`;

const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z.string().min(1).max(50).regex(/^(\w+\s)?(\w+)$/, 'Max 2 words'),
  buttons: z.array(z.string().max(50)).length(24),
});

type KeyboardGenerationType = z.infer<typeof KeyboardGenerationSchema>;

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
  const { generate, isGenerating, isReady } = useGenerate();

  const generateKeyboard = useCallback(
    async (params: GenerateKeyboardParams): Promise<GeneratedKeyboardData> => {
      if (!isReady) {
        console.log('Google API key not configured, skipping keyboard generation');
        throw new Error('API key not configured');
      }

      setError(undefined);

      try {
        const result = (await generate({
          prompt: `First message: "${params.messageText}"\n\nGenerate a title and 24 phrase starters.`,
          system: KEYBOARD_GENERATION_PROMPT,
          output: Output.object({
            schema: KeyboardGenerationSchema,
          }),
        } as unknown as Parameters<typeof generate>[0])) as KeyboardGenerationType | undefined;

        if (!result?.chatTitle || !result?.keyboardTitle || !result?.buttons) {
          throw new Error('Invalid AI response format');
        }

        return {
          chatTitle: result.chatTitle,
          keyboardTitle: result.keyboardTitle,
          buttons: result.buttons,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate keyboard suggestions';
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
