'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import Autocomplete from './autocomplete';
import { useEditorContext } from './context';

type EditorProps = {
  placeholder?: string;
  onSubmit?: (text: string) => void;
  className?: string;
  children?: React.ReactNode;
};

export default function Editor({
  placeholder = 'What would you like to know?',
  onSubmit,
  className,
  children,
}: EditorProps) {
  const { text, setText } = useEditorContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit?.(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Autocomplete />

      <div
        className={cn(
          'w-full rounded-2xl border-2 border-input bg-background p-3 transition-colors focus-within:border-ring',
          className
        )}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">{children}</div>

          <Button type="button" onClick={handleSubmit} disabled={!text.trim()} size="icon">
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
