'use client';

import React, { useState } from 'react';

import Image from 'next/image';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { GridButton } from '../types';

interface CustomKeyboardProps {
  keyboardId: string;
  className?: string;
  onKeyPress: (key: string) => void;
  onEdit?: (keyboardId: string) => void;
  onDelete?: (keyboardId: string) => void;
}

export function CustomKeyboard({ keyboardId, className = '', onKeyPress, onEdit, onDelete }: CustomKeyboardProps) {
  const { keyboard, isLoading, error } = useCustomKeyboard(keyboardId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return <div className={cn('p-4 text-center', className)}>Loading keyboard...</div>;
  }

  if (error || !keyboard) {
    return (
      <div className={cn('p-4 text-center text-red-600', className)}>
        {error?.message || 'Keyboard not found'}
      </div>
    );
  }

  // Sort buttons by order
  const sortedButtons = [...keyboard.buttons].sort((a, b) => a.order - b.order);

  // Use inline styles for true responsive grid columns
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.min(keyboard.columns, 3)}, minmax(0, 1fr))`,
    gap: '0.375rem',
    padding: '0.75rem',
  };

  const handleButtonClick = (button: GridButton) => {
    const value = button.value || button.text;
    onKeyPress(value);
  };

  const handleEdit = () => {
    onEdit?.(keyboardId);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false);
    onDelete?.(keyboardId);
  };

  return (
    <div className={cn('bg-white border-t border-zinc-200', className)}>
      <div className="max-w-4xl mx-auto">
        {/* Keyboard title with edit/delete buttons */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {keyboard.name}
          </span>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-6 w-6 p-0 hover:bg-zinc-100"
                title="Edit keyboard"
              >
                <PencilIcon className="h-4 w-4 text-zinc-600" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="h-6 w-6 p-0 hover:bg-red-100"
                title="Delete keyboard"
              >
                <TrashIcon className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Grid buttons */}
        <div style={gridStyle}>
          {sortedButtons.map(button => (
            <Button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              variant="outline"
              size="sm"
              className={cn(
                'h-12 px-2 py-1',
                'flex flex-col items-center justify-center',
                'text-md font-medium',
                'whitespace-normal',
                'hover:bg-zinc-100 active:bg-zinc-200'
              )}
            >
              {button.image_url && (
                <Image
                  src={button.image_url}
                  alt={button.text}
                  width={20}
                  height={20}
                  className="mb-0.5 object-contain"
                />
              )}
              <span className="text-center wrap-break-word line-clamp-2">{button.text}</span>
            </Button>
          ))}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete keyboard?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{keyboard.name}" keyboard? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
