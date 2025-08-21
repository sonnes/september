'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

import { useDocuments } from '@/hooks/use-documents';
import { Document, PutDocumentData } from '@/types/document';

interface DocumentsContextType {
  documents: Document[];
  fetching: boolean;

  currentDocument: Document | null;
  setCurrentDocument: (document: Document | null) => void;

  // Document operations
  putDocument: (data: PutDocumentData) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  putContent: (id: string, content: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
  children: React.ReactNode;
}

export function DocumentsProvider({ children }: DocumentsProviderProps) {
  const { documents, fetching, putDocument, deleteDocument, putContent } = useDocuments();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const value: DocumentsContextType = {
    documents,
    fetching,
    currentDocument,
    setCurrentDocument,
    putDocument,
    deleteDocument,
    putContent,
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
