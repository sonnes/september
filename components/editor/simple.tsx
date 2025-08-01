'use client';

import { useTextContext } from '@/components/context/text-provider';
import { Button } from '@/components/ui/button';
import { useCreateMessage } from '@/hooks/use-create-message';

type EditorProps = {
  placeholder?: string;
};

export default function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const { text, setText, reset } = useTextContext();
  const { createMessage, status } = useCreateMessage();

  const handleSubmit = async () => {
    await createMessage({ text });

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
