'use client';

import { useQuery } from '@triplit/react';
import { v4 as uuidv4 } from 'uuid';

import { triplit } from '@/triplit/client';
import { PutDocumentData } from '../types';

export function useDocuments() {
  const query = triplit.query('documents').Order('updated_at', 'DESC');

  const { results: documents, fetching, error } = useQuery(triplit, query);

  const putDocument = async (data: PutDocumentData) => {
    const document = await triplit.insert('documents', {
      id: data.id || uuidv4().toString(),
      name: data.name || '',
      content: data.content || '',
      created_at: data.created_at || new Date(),
      updated_at: new Date(),
    });

    return document;
  };

  const deleteDocument = async (id: string) => {
    await triplit.delete('documents', id);
  };

  return {
    documents: documents || [],
    fetching,
    putDocument,
    deleteDocument,
  };
}

