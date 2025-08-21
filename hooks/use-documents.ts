'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@triplit/react';
import { v4 as uuidv4 } from 'uuid';

import { triplit } from '@/triplit/client';
import { Document, PutDocumentData } from '@/types/document';

export function useDocuments() {
  const query = triplit.query('documents').Order('updated_at', 'DESC');
  const { results: documents, fetching, error } = useQuery(triplit, query);

  const putDocument = async (data: PutDocumentData) => {
    await triplit.insert('documents', {
      id: data.id || uuidv4().toString(),
      name: data.name || '',
      content: data.content || '',
      created_at: data.created_at || new Date(),
      updated_at: new Date(),
    });
  };

  const deleteDocument = async (id: string) => {
    await triplit.delete('documents', id);
  };

  return {
    documents,
    fetching,
    error,
    putDocument,
    deleteDocument,
  };
}
