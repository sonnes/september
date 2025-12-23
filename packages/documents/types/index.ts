import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

export interface PutDocumentData {
  id?: string;
  name?: string;
  content?: string;
  created_at?: Date;
}

export type PartialDocument = Partial<Document>;
