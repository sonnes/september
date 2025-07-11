import { useState } from 'react';

import { triplit } from '@/triplit/client';
import { Audio } from '@/types/audio';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async ({
    text,
    authorId,
    voiceId,
  }: {
    text: string;
    authorId: string;
    voiceId?: string;
  }) => {
    setStatus('loading');
    try {
      const audio = await generateAudio({ text, voiceId });

      const createdMessage = await triplit.insert('messages', {
        text,
        authorId,
        createdAt: new Date(),
        audio,
      });

      return createdMessage;
    } finally {
      setStatus('idle');
    }
  };

  return { createMessage, status };
}

async function generateAudio({
  text,
  voiceId,
}: {
  text: string;
  voiceId?: string;
}): Promise<Audio> {
  const res = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  });
  if (!res.ok) throw new Error('Failed to generate audio');
  const { blob, alignment } = await res.json();

  return { blob, alignment };
}
