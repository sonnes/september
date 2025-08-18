'use client';

import { ReactNode, createContext, useContext } from 'react';

import { StorageProvider } from '@/services/storage/provider';

const StorageProviderContext = createContext<StorageProvider | undefined>(undefined);

interface StorageProviderProviderProps {
  provider: StorageProvider;
  children: ReactNode;
}

export function StorageProviderProvider({ provider, children }: StorageProviderProviderProps) {
  return (
    <StorageProviderContext.Provider value={provider}>{children}</StorageProviderContext.Provider>
  );
}

export function useStorageProvider() {
  const context = useContext(StorageProviderContext);
  if (context === undefined) {
    throw new Error('useStorageProvider must be used within a StorageProviderProvider');
  }
  return context;
}
