export interface Document {
  id: string;
  name: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface PutDocumentData {
  id?: string;
  name: string;
  content?: string;
  created_at?: Date;
}

export type PartialDocument = Partial<Document>;
