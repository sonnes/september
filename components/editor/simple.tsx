'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useCreateMessage } from '@/hooks/use-create-message';

type EditorProps = {
  placeholder?: string;
};

export default function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const [text, setText] = useState('');
  const { createMessage, status } = useCreateMessage();
  const { enqueue } = useAudioPlayer();

  const handleSubmit = async () => {
    const createdMessage = await createMessage({ text, authorId: '123' });

    setText('');

    // Play the base64 encoded audio
    if (createdMessage.audioBlob) {
      enqueue({
        blob: createdMessage.audioBlob,
        alignment: createdMessage.alignment,
      });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 w-full p-3 rounded-xl border border-zinc-400"
            style={{ caretColor: 'auto' }}
          />
          <Button onClick={handleSubmit} color="zinc" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
