import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

// Input type for creating documents (omits auto-generated fields)
export type CreateDocumentData = Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

// Input type for updating documents
export type UpdateDocumentData = Partial<Omit<Document, 'id' | 'created_at'>>;
