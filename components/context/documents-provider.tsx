'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

import { useDocuments } from '@/hooks/use-documents';
import { Document, PutDocumentData } from '@/types/document';

interface DocumentsContextType {
  // Document state
  documents: Document[] | undefined;
  fetching: boolean;
  error: any;

  // Current document
  currentDocument: Document | null;
  setCurrentDocument: (document: Document | null) => void;

  // Document operations
  putDocument: (data: PutDocumentData) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  createNewDocument: (name?: string) => Promise<Document>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
  children: React.ReactNode;
}

export function DocumentsProvider({ children }: DocumentsProviderProps) {
  const { documents, fetching, error, putDocument, deleteDocument } = useDocuments();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>) => {
      if (!documents) return;

      const existingDoc = documents.find(doc => doc.id === id);
      if (!existingDoc) return;

      const updatedData: PutDocumentData = {
        id,
        name: updates.name || existingDoc.name,
        content: updates.content || existingDoc.content,
        created_at: existingDoc.created_at,
      };

      await putDocument(updatedData);

      // Update current document if it's the one being updated
      if (currentDocument?.id === id) {
        setCurrentDocument({ ...existingDoc, ...updates, updated_at: new Date() });
      }
    },
    [documents, putDocument, currentDocument]
  );

  const createNewDocument = useCallback(
    async (name = 'Untitled Document'): Promise<Document> => {
      const newDoc: PutDocumentData = {
        name,
        content: '',
      };

      await putDocument(newDoc);

      // The new document will appear in the documents map after the mutation
      // For now, create a temporary document object
      const tempDoc: Document = {
        id: '', // Will be set by the database
        name,
        content: '',
        created_at: new Date(),
        updated_at: new Date(),
      };

      return tempDoc;
    },
    [putDocument]
  );

  const value: DocumentsContextType = {
    documents,
    fetching,
    error,
    currentDocument,
    setCurrentDocument,
    putDocument,
    deleteDocument,
    updateDocument,
    createNewDocument,
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
