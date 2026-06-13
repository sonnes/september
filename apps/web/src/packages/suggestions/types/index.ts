import { z } from 'zod';

export interface Suggestion {
  text: string;
  /** Provenance of the suggestion. Optional so existing callers without source remain valid. */
  source?: 'md' | 'history' | 'llm';
  audio_path?: string;
}

/**
 * Zod schema for Suggestions Configuration
 */
export const SuggestionsFormSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['gemini', 'webllm', 'openrouter']),
  model: z.string(),
  settings: z
    .object({
      temperature: z.number().min(0).max(1).optional(),
      max_suggestions: z.number().min(1).max(10).optional(),
      context_window: z.number().min(0).max(50).optional(),
    })
    .optional(),
});

export type SuggestionsFormData = z.infer<typeof SuggestionsFormSchema>;
