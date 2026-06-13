'use client';

import { useEffect, useRef, useState } from 'react';

import { Pencil } from 'lucide-react';

import { Input } from './input';

interface EditableTextProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onSave: (next: string | undefined) => Promise<void>;
}

/**
 * Inline editable text with pencil-on-hover affordance.
 * - Button → Input (autofocus + select) on click
 * - Saves on blur or Enter; cancels on Escape
 * - Skips save when value is unchanged
 * - Disables input while saving; reverts on error
 */
export function EditableText({ value, placeholder = 'Untitled', className, onSave }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when controlled value changes externally
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value ?? '');
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isSaving) return;

    const trimmed = draft.trim();
    const next = trimmed || undefined;

    // Skip save if unchanged
    if (next === (value?.trim() || undefined)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(next);
    } catch (err) {
      console.error('EditableText save error:', err);
      // Revert draft to original value on error; re-throw so call site can toast
      setDraft(value ?? '');
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? '');
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
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
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
      <span className={className ?? 'text-sm font-medium'}>{value || placeholder}</span>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
