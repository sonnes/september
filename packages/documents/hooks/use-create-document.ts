'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { documentCollection } from '../db';
import type { Document } from '../types';

export interface UseCreateDocumentReturn {
  createDocument: (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => Promise<Document>;
  isCreating: boolean;
}

export function useCreateDocument(): UseCreateDocumentReturn {
  const [isCreating, setIsCreating] = useState(false);

  const createDocument = useCallback(
    async (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> => {
      setIsCreating(true);
      try {
        const now = new Date();
        const newDoc: Document = {
          ...data,
          id: uuidv4(),
          created_at: now,
          updated_at: now,
        };
        await documentCollection.insert(newDoc);
        toast.success('Document created');
        return newDoc;
      } catch (err) {
        console.error('Failed to create document:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create document');
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { createDocument, isCreating };
}
