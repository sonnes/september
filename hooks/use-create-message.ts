import { useState } from 'react';

import { triplit } from '../triplit/client';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async ({
    text,
    authorId,
    audioBlob,
  }: {
    text: string;
    authorId: string;
    audioBlob?: string;
  }) => {
    setStatus('loading');
    try {
      await triplit.insert('messages', {
        text,
        authorId,
        createdAt: new Date(),
        audioBlob: audioBlob || null,
      });
    } finally {
      setStatus('idle');
    }
  };

  return { createMessage, status };
}
