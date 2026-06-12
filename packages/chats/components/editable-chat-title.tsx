'use client';

import { useEffect, useRef, useState } from 'react';

import { PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

import { Input } from '@september/ui/components/input';

import { updateChat } from '../mutations';

interface EditableChatTitleProps {
  chatId: string;
  title?: string;
  className?: string;
}

export function EditableChatTitle({ chatId, title, className }: EditableChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
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
      setIsUpdating(true);
      try {
        await updateChat(chatId, { title: newTitle });
        toast.success('Chat updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update chat');
        // Revert to original value on error
        setValue(title || '');
        setIsUpdating(false);
        return;
      } finally {
        setIsUpdating(false);
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
