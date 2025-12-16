'use client';

import { useEffect, useRef, useState } from 'react';

import { PencilIcon } from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/input';

import { triplit } from '@/triplit/client';

interface EditableChatTitleProps {
  chatId: string;
  title?: string;
  className?: string;
}

export function EditableChatTitle({ chatId, title, className }: EditableChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title || '');
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedValue = value.trim();
    const newTitle = trimmedValue || undefined;

    // Only update if the title actually changed
    if (newTitle !== (title || undefined)) {
      setIsSaving(true);
      try {
        await triplit.update('chats', chatId, {
          title: newTitle,
          updated_at: new Date(),
        });
      } catch (error) {
        console.error('Failed to update chat title:', error);
        // Revert to original value on error
        setValue(title || '');
      } finally {
        setIsSaving(false);
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
        disabled={isSaving}
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
