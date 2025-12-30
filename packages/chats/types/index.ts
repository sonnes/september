import { z } from 'zod';

export const ChatSchema = z.object({
  id: z.uuid(),
  user_id: z.string(),
  title: z.string().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Chat = z.infer<typeof ChatSchema>;

export const MessageSchema = z.object({
  id: z.uuid(),
  text: z.string(),
  type: z.string(),
  user_id: z.string(),
  chat_id: z.uuid().optional(),
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
