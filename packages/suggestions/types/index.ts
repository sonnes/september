import { z } from 'zod';

export interface Suggestion {
  text: string;
  audio_path?: string;
}

/**
 * Zod schema for Suggestions Configuration
 */
export const SuggestionsFormSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['gemini']),
  model: z.enum(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']),
  settings: z
    .object({
      system_instructions: z.string().max(1000).optional(),
      temperature: z.number().min(0).max(1).optional(),
      max_suggestions: z.number().min(1).max(10).optional(),
      context_window: z.number().min(0).max(50).optional(),
      ai_corpus: z.string().max(20000).optional(),
    })
    .optional(),
});

export type SuggestionsFormData = z.infer<typeof SuggestionsFormSchema>;
