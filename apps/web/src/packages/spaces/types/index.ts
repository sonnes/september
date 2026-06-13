import { z } from 'zod';

export const SpaceSchema = z.object({
  id: z.uuid(),
  user_id: z.string(),
  title: z.string().optional(),
  context: z.string().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Space = z.infer<typeof SpaceSchema>;

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
