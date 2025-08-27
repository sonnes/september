'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

import { useDocuments } from '@/hooks/use-documents';
import { Document, PutDocumentData } from '@/types/document';

interface DocumentsContextType {
  documents: Document[];
  fetching: boolean;

  current: Document | null;
  setCurrentId: (id: string) => void;

  // Document operations
  putDocument: (data: PutDocumentData) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
  initialId?: string;
  children: React.ReactNode;
}

export function DocumentsProvider({ initialId, children }: DocumentsProviderProps) {
  const { documents, fetching, putDocument, deleteDocument } = useDocuments();

  const [currentId, setCurrentId] = useState<string | undefined>(initialId);
  const currentDocument = useMemo(() => {
    return documents.find(document => document.id === currentId) || null;
  }, [documents, currentId]);

  const value: DocumentsContextType = {
    documents,
    fetching,
    current: currentDocument,
    setCurrentId,
    putDocument,
    deleteDocument,
  };

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocumentsContext() {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocumentsContext must be used within a DocumentsProvider');
  }
  return context;
}
