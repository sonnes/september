'use client';

import React, { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { useAccountContext } from '@/packages/account';

import { useCreateKeyboard } from '../hooks/use-create-keyboard';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { useUpdateKeyboard } from '../hooks/use-update-keyboard';
import { CustomKeyboard } from '../types';

// Form validation schema - only name, columns, and buttons
const formSchema = z.object({
  name: z.string().min(1, 'Name required').max(50),
  columns: z.number().int().min(2).max(6),
  buttons: z
    .array(
      z.object({
        text: z.string().min(1, 'Text required').max(50),
        value: z.string().max(100).optional().or(z.literal('')),
        image_url: z.string().url().optional().or(z.literal('')),
      })
    )
    .min(1, 'At least one button required')
    .max(50),
});

type CustomKeyboardFormData = z.infer<typeof formSchema>;

interface CustomKeyboardEditorProps {
  keyboardId?: string; // If editing existing
  chatId?: string; // Chat ID to assign to keyboard
  onSave?: (keyboard: CustomKeyboard) => void;
  onCancel?: () => void;
}

export function CustomKeyboardEditor({
  keyboardId,
  chatId,
  onSave,
  onCancel,
}: CustomKeyboardEditorProps) {
  const { user } = useAccountContext();
  const { keyboard, isLoading: isLoadingKeyboard } = useCustomKeyboard(keyboardId);
  const { createKeyboard, isCreating } = useCreateKeyboard();
  const { updateKeyboard, isUpdating } = useUpdateKeyboard();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!keyboardId;

  // Initialize form
  const form = useForm<CustomKeyboardFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: keyboard
      ? {
          name: keyboard.name,
          columns: keyboard.columns,
          buttons: keyboard.buttons.map(b => ({
            text: b.text,
            value: b.value || '',
            image_url: b.image_url || '',
          })),
        }
      : {
          name: '',
          columns: 3,
          buttons: [{ text: '', value: '', image_url: '' }],
        },
  });

  // Update form when keyboard loads (for edit mode)
  useEffect(() => {
    if (keyboard && isEditing) {
      form.reset({
        name: keyboard.name,
        columns: keyboard.columns,
        buttons: keyboard.buttons.map(b => ({
          text: b.text,
          value: b.value || '',
          image_url: b.image_url || '',
        })),
      });
    }
  }, [keyboard, isEditing, form]);

  // Dynamic button fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'buttons',
  });

  const handleSubmit = async (data: CustomKeyboardFormData) => {
    setIsSaving(true);
    try {
      if (isEditing && keyboardId) {
        await updateKeyboard(keyboardId, {
          name: data.name,
          columns: data.columns,
          chat_id: chatId,
          buttons: data.buttons.map((btn, index) => ({
            id: keyboard?.buttons[index]?.id || '',
            text: btn.text,
            value: btn.value || btn.text,
            image_url: btn.image_url || undefined,
            order: index,
          })),
        });
        // Refetch to get updated keyboard
        if (keyboard) {
          onSave?.(keyboard);
        }
      } else {
        const newKeyboard = await createKeyboard({
          name: data.name,
          columns: data.columns,
          chat_id: chatId,
          user_id: user?.id || '',
          buttons: data.buttons.map(btn => ({
            text: btn.text,
            value: btn.value || btn.text,
            image_url: btn.image_url || undefined,
          })),
        });
        onSave?.(newKeyboard);
      }
    } catch {
      // Error handled by hooks (toast)
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingKeyboard) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
      {/* Keyboard Name */}
      <div>
        <Label htmlFor="name">Keyboard Name</Label>
        <Input id="name" {...form.register('name')} placeholder="e.g., Medical Terms" />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Columns */}
      <div>
        <Label htmlFor="columns">Columns</Label>
        <Select
          value={form.watch('columns').toString()}
          onValueChange={val => form.setValue('columns', parseInt(val))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6].map(num => (
              <SelectItem key={num} value={num.toString()}>
                {num} columns
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buttons Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Buttons</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ text: '', value: '', image_url: '' })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Button
          </Button>
        </div>

        {form.formState.errors.buttons && (
          <p className="text-sm text-red-600 mb-2">{form.formState.errors.buttons.message}</p>
        )}

        {/* Grid of button inputs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(form.watch('columns'), 3)}, minmax(0, 1fr))`,
            gap: '0.5rem',
          }}
          className="mb-4"
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                'relative p-2',
                'border border-zinc-300 rounded-md',
                'bg-white hover:bg-zinc-50',
                'transition-colors'
              )}
            >
              {/* Delete button - positioned in corner */}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className={cn(
                  'absolute top-1 right-1',
                  'p-1 rounded',
                  'hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed',
                  'text-red-600'
                )}
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {/* Button text input */}
              <div className="space-y-1 pr-6">
                <Input
                  {...form.register(`buttons.${index}.text`)}
                  placeholder="Text"
                  size={1}
                  className="text-xs h-7"
                />

                {/* Value input - optional */}
                <Input
                  {...form.register(`buttons.${index}.value`)}
                  placeholder="Value (opt)"
                  size={1}
                  className="text-xs h-7"
                />

                {/* Image URL input - optional */}
                <Input
                  {...form.register(`buttons.${index}.image_url`)}
                  placeholder="Image URL (opt)"
                  size={1}
                  className="text-xs h-7"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating || isUpdating || isSaving}>
          {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
