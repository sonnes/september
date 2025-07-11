import { useState } from 'react';

import { triplit } from '@/triplit/client';
import { Audio } from '@/types/audio';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async ({
    text,
    author_id,
    voice_id,
  }: {
    text: string;
    author_id: string;
    voice_id?: string;
  }) => {
    setStatus('loading');
    try {
      const audio = await generateAudio({ text, voice_id });

      const createdMessage = await triplit?.insert('messages', {
        text,
        author_id,
        created_at: new Date(),
        audio,
      });

      return createdMessage;
    } finally {
      setStatus('idle');
    }
  };

  return { createMessage, status };
}

export async function generateAudio({
  text,
  voice_id,
}: {
  text: string;
  voice_id?: string;
}): Promise<Audio> {
  const res = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id }),
  });
  if (!res.ok) throw new Error('Failed to generate audio');
  const { blob, alignment } = await res.json();

  return { blob, alignment };
}
