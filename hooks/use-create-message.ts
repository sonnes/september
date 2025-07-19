import { useState } from 'react';

import { useToast } from './use-toast';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const { showError } = useToast();

  const createMessage = async ({ text, voice_id }: { text: string; voice_id?: string }) => {
    setStatus('loading');
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Failed to create message');
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      // Handle network errors or other exceptions
      if (error instanceof Error) {
        showError(error.message || 'An unexpected error occurred');
      } else {
        showError('An unexpected error occurred');
      }
      throw error;
    } finally {
      setStatus('idle');
    }
  };

  return { createMessage, status };
}
