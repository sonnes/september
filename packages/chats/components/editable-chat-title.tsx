'use client';

import { useEffect, useRef, useState } from 'react';

import { PencilIcon } from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/input';

import { useUpdateChat } from '../hooks/use-update-chat';

interface EditableChatTitleProps {
  chatId: string;
  title?: string;
  className?: string;
}

export function EditableChatTitle({ chatId, title, className }: EditableChatTitleProps) {
  const { updateChat, isUpdating } = useUpdateChat();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title || '');
  const [prevTitle, setPrevTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  if (title !== prevTitle) {
    setPrevTitle(title);
    setValue(title || '');
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isUpdating) return;

    const trimmedValue = value.trim();
    const newTitle = trimmedValue || undefined;

    // Only update if the title actually changed
    if (newTitle !== (title || undefined)) {
      try {
        await updateChat(chatId, { title: newTitle });
      } catch (error) {
        // Revert to original value on error
        setValue(title || '');
        return;
      }
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(title || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="Untitled"
        disabled={isUpdating}
        className={className}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
      type="button"
    >
      <span className={className || 'text-sm font-medium'}>{title || 'Untitled'}</span>
      <PencilIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
