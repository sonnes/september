'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomKeyboards } from '../hooks/use-custom-keyboards';
import { useDeleteKeyboard } from '../hooks/use-delete-keyboard';

interface CustomKeyboardListProps {
  onEdit?: (keyboardId: string) => void;
  onSelect?: (keyboardId: string) => void;
}

export function CustomKeyboardList({ onEdit, onSelect }: CustomKeyboardListProps) {
  const { keyboards, isLoading, error } = useCustomKeyboards();
  const { deleteKeyboard, isDeleting } = useDeleteKeyboard();

  const handleDelete = async (id: string) => {
    if (confirm('Delete this keyboard?')) {
      await deleteKeyboard(id);
    }
  };

  if (isLoading) return <div className="p-4">Loading keyboards...</div>;
  if (error) return <div className="p-4 text-red-600">{error.message}</div>;
  if (keyboards.length === 0) {
    return <div className="p-4 text-muted-foreground">No custom keyboards yet.</div>;
  }

  return (
    <div className="space-y-2 p-4">
      {keyboards.map(keyboard => (
        <div key={keyboard.id} className="flex items-center gap-2 p-2 border rounded">
          <button
            onClick={() => onSelect?.(keyboard.id)}
            className="flex-1 text-left hover:bg-zinc-50 p-1 rounded"
          >
            <div className="font-medium">{keyboard.name}</div>
            <div className="text-sm text-muted-foreground">
              {keyboard.buttons.length} buttons
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit?.(keyboard.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(keyboard.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
