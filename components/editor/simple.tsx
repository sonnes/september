'use client';

import { useState } from 'react';

import { useTextContext } from '@/components/context/text-provider';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

type EditorProps = {
  placeholder?: string;
};

export default function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const { text, setText, reset } = useTextContext();
  const { createMessage } = useMessages();
  const { user } = useAccount();

  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const handleSubmit = async () => {
    setStatus('loading');
    await createMessage({ text, type: 'message', user_id: user.id });
    setStatus('idle');
    reset();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
      return;
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={onChange}
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
