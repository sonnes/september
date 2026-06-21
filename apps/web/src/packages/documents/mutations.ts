import { v4 as uuidv4 } from 'uuid';

import { documentCollection } from './db';
import type { CreateDocumentData, Document, UpdateDocumentData } from './types';

/**
 * Insert a new document and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createDocument(data: CreateDocumentData): Promise<Document> {
  const now = new Date();
  const doc: Document = {
    ...data,
    id: data.id ?? uuidv4(),
    created_at: data.created_at ?? now,
    updated_at: data.updated_at ?? now,
  };
  const tx = documentCollection.insert(doc);
  await tx.isPersisted.promise;
  return doc;
}

/**
 * Update a document by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateDocument(id: string, updates: UpdateDocumentData): Promise<void> {
  const tx = documentCollection.update(id, draft => {
    Object.assign(draft, { ...updates, updated_at: new Date() });
  });
  await tx.isPersisted.promise;
}

/**
 * Delete a document by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteDocument(id: string): Promise<void> {
  const tx = documentCollection.delete(id);
  await tx.isPersisted.promise;
}

/**
 * Delete every document scoped to a space and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteDocumentsForSpace(spaceId: string): Promise<void> {
  const ids = documentCollection.toArray.filter(doc => doc.space_id === spaceId).map(doc => doc.id);
  const txs = ids.map(id => documentCollection.delete(id));
  await Promise.all(txs.map(tx => tx.isPersisted.promise));
}
