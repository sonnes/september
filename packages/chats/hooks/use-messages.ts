import { useContext } from 'react';
import { MessagesContext } from '../components/messages-provider';

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}

