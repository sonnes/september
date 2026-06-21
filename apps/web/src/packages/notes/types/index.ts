import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid().optional(),
  name: z.string().optional(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Note = z.infer<typeof NoteSchema>;

// Input type for creating notes (omits auto-generated fields)
export type CreateNoteData = Omit<Note, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

// Input type for updating notes
export type UpdateNoteData = Partial<Omit<Note, 'id' | 'created_at'>>;
