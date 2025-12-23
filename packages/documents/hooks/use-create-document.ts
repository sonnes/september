'use client';

import { useCallback, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseCreateDocumentReturn {
  createDocument: (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => Promise<Document>;
  isCreating: boolean;
  error?: string;
}

export function useCreateDocument(): UseCreateDocumentReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();

  const createDocument = useCallback(
    async (data): Promise<Document> => {
      setIsCreating(true);
      setError(undefined);
      try {
        const now = new Date();
        const newDoc: Document = {
          ...data,
          id: uuidv4(),
          created_at: now,
          updated_at: now,
        };
        await documentCollection.insert(newDoc);
        return newDoc;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create document';
        setError(message);
        console.error('Failed to create document:', err);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createDocument, isCreating, error };
}
