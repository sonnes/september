'use client';

import { useCallback, useState } from 'react';

import { z } from 'zod';

import { useAISettings, useGenerate } from '@/packages/ai';

const KEYBOARD_GENERATION_PROMPT = `Generate an AAC keyboard with titles and 24 phrase starters from a conversation's first message.

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
</rules>

<examples>
<example>
<input>First message: "I need to schedule my doctor appointment"</input>
<output>
{
  "chatTitle": "Medical Appointments",
  "keyboardTitle": "Medical",
  "buttons": ["Yes, please", "No, thanks", "What time?", "Morning works", "Afternoon better", "Can you call?", "I'll wait", "Too soon", "Next week?", "Is Monday?", "Need reminder", "Thank you", "Got it", "One moment", "Almost done", "Running late", "On my way", "Be right there", "Need help", "Feeling okay", "Not great", "Much better", "Same time?", "See you"]
}
</output>
</example>
<example>
<input>First message: "What should we have for dinner tonight?"</input>
<output>
{
  "chatTitle": "Dinner Planning",
  "keyboardTitle": "Dinner",
  "buttons": ["Sounds good", "I'm hungry", "Not sure", "Pizza?", "Chicken?", "Something light", "Order in?", "Cook together", "Your choice", "Anything works", "Not that", "Maybe later", "Too heavy", "Craving pasta", "Salad?", "Leftovers?", "What's quick?", "I'll cook", "You decide", "Surprise me", "Already ate", "Just snacks", "Dessert too?", "Perfect!"]
}
</output>
</example>
</examples>`;

const KeyboardGenerationSchema = z.object({
  chatTitle: z.string().min(1).max(50),
  keyboardTitle: z
    .string()
    .min(1)
    .max(50)
    .regex(/^(\w+\s)?(\w+)$/, 'Max 2 words'),
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
          prompt: `First message: "${params.messageText}"\n\nGenerate a title and 24 phrase starters.`,
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
