'use client';

import { useEffect, useRef } from 'react';

import { PencilIcon } from '@heroicons/react/24/outline';

import { Input } from '@/components/ui/input';

import { useEditableTitle } from '@/packages/documents/hooks/use-editable-title';

interface EditableDocumentTitleProps {
  documentId: string;
  name?: string;
  className?: string;
}

export function EditableDocumentTitle({ documentId, name, className }: EditableDocumentTitleProps) {
  const {
    value,
    setValue,
    isEditing,
    isSaving,
    startEditing,
    handleSave,
    handleKeyDown,
  } = useEditableTitle({
    documentId,
    initialName: name,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
      onClick={startEditing}
      className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
      type="button"
    >
      <span className={className || 'text-sm font-medium'}>{name || 'Untitled'}</span>
      <PencilIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
