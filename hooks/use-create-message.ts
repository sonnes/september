import { useState } from 'react';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async ({
    text,
    voice_id,
  }: {
    text: string;

    voice_id?: string;
  }) => {
    setStatus('loading');
    try {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      return data;
    } finally {
      setStatus('idle');
    }
  };

  return { createMessage, status };
}
