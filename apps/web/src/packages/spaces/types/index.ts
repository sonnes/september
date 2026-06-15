import { z } from 'zod';

export const SpaceSchema = z.object({
  id: z.uuid(),
  user_id: z.string(),
  title: z.string().optional(),
  context: z.string().optional(),
  // Message count at the last AI phrase generation. Absent = never seeded.
  phrases_synced_count: z.number().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Space = z.infer<typeof SpaceSchema>;

// Saved phrase — one ready-to-use phrase per space. The `pinned` flag is the
// AI/manual distinction: true = user-kept (durable), false = AI-generated
// (replaced on regeneration).
export const SavedPhraseSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  user_id: z.string(),
  text: z.string(),
  pinned: z.boolean(),
  created_at: z.coerce.date(),
});

export type SavedPhrase = z.infer<typeof SavedPhraseSchema>;

export const MessageSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  type: z.string(),
  user_id: z.string(),
  space_id: z.uuid().optional(),
  audio_path: z.string().optional(),
  created_at: z.coerce.date(),
});

export type Message = z.infer<typeof MessageSchema>;

export type CreateMessageData = Omit<z.input<typeof MessageSchema>, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
  editorStats?: {
    keysTyped: number;
    charsSaved: number;
  };
};
