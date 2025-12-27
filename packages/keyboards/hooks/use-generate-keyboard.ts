'use client';

import { useCallback, useState, useMemo } from 'react';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { useAISettings } from '@/packages/ai';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string } | undefined>();

  const { getProviderConfig } = useAISettings();

  const providerConfig = useMemo(
    () => getProviderConfig('gemini'),
    [getProviderConfig]
  );

  const apiKey = providerConfig?.api_key;

  const google = useMemo(
    () =>
      createGoogleGenerativeAI({
        apiKey: apiKey || '',
      }),
    [apiKey]
  );

  const generateKeyboard = useCallback(
    async (params: GenerateKeyboardParams): Promise<GeneratedKeyboardData> => {
      if (!apiKey) {
        console.log('Google API key not configured, skipping keyboard generation');
        throw new Error('API key not configured');
      }

      setIsGenerating(true);
      setError(undefined);

      try {
        const { object } = await generateObject({
          model: google('gemini-2.5-flash-lite'),
          schema: KeyboardGenerationSchema,
          system: KEYBOARD_GENERATION_PROMPT,
          messages: [
            {
              role: 'user' as const,
              content: `First message: "${params.messageText}"\n\nGenerate a title and 24 phrase starters.`,
            },
          ],
        });

        if (!object?.chatTitle || !object?.keyboardTitle || !object?.buttons) {
          throw new Error('Invalid AI response format');
        }

        return {
          chatTitle: object.chatTitle,
          keyboardTitle: object.keyboardTitle,
          buttons: object.buttons,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate keyboard suggestions';
        console.error('Error generating keyboard:', err);
        setError({ message: errorMessage });
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [apiKey, google]
  );

  return {
    generateKeyboard,
    isGenerating,
    error,
  };
}
