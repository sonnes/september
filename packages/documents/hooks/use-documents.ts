'use client';

import { useCallback, useMemo } from 'react';

import { ilike } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuidv4 } from 'uuid';

import { documentCollection } from '../db';
import { Document, PutDocumentData } from '../types';

export function useDocuments({ searchQuery }: { searchQuery?: string } = {}) {
  const {
    data: documents,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: documentCollection });
      if (searchQuery) {
        query = query.where(({ items }) => ilike(items.name, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [searchQuery]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  const putDocument = useCallback(
    async (data: PutDocumentData): Promise<Document> => {
      const now = new Date();

      if (data.id) {
        // Update existing document
        const current = documents?.find(d => d.id === data.id);
        if (!current) throw new Error('Document not found');

        const updatedDocument: Document = {
          ...current,
          name: data.name !== undefined ? data.name : current.name,
          content: data.content !== undefined ? data.content : current.content,
          updated_at: now,
        };

        await documentCollection.update(data.id, draft => {
          if (data.name !== undefined) draft.name = data.name;
          if (data.content !== undefined) draft.content = data.content;
          draft.updated_at = now;
        });

        return updatedDocument;
      } else {
        // Create new document
        const newDocument: Document = {
          id: uuidv4(),
          name: data.name,
          content: data.content || '',
          created_at: data.created_at || now,
          updated_at: now,
        };

        documentCollection.insert(newDocument);
        return newDocument;
      }
    },
    [documents]
  );

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    await documentCollection.delete(id);
  }, []);

  return {
    documents: (documents || []) as Document[],
    fetching: isLoading,
    error,
    putDocument,
    deleteDocument,
  };
}
