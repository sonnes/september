import { useState } from 'react';

import { triplit } from '@/triplit/client';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async ({
    text,
    authorId,
    voiceId,
    modelId,
  }: {
    text: string;
    authorId: string;
    voiceId?: string;
    modelId?: string;
  }) => {
    setStatus('loading');
    try {
      const audio = await generateAudio({ text, voiceId, modelId });

      const createdMessage = await triplit.insert('messages', {
        text,
        authorId,
        createdAt: new Date(),
        audioBlob: audio || null,
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
  modelId,
}: {
  text: string;
  voiceId?: string;
  modelId?: string;
}): Promise<string> {
  const res = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, modelId }),
  });
  if (!res.ok) throw new Error('Failed to generate audio');
  const { audio } = await res.json();

  return audio;
}
