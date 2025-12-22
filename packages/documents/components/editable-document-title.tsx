'use client';

import { useEffect, useRef, useState } from 'react';

import { PencilIcon } from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/input';

import { triplit } from '@/triplit/client';

interface EditableDocumentTitleProps {
  documentId: string;
  name?: string;
  className?: string;
}

export function EditableDocumentTitle({ documentId, name, className }: EditableDocumentTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(name || '');
  }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedValue = value.trim();
    const newName = trimmedValue || undefined;

    // Only update if the name actually changed
    if (newName !== (name || undefined)) {
      setIsSaving(true);
      try {
        await triplit.update('documents', documentId, {
          name: newName,
          updated_at: new Date(),
        });
      } catch (error) {
        console.error('Failed to update document name:', error);
        // Revert to original value on error
        setValue(name || '');
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(name || '');
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
      <span className={className || 'text-sm font-medium'}>{name || 'Untitled'}</span>
      <PencilIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

