'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAccountContext } from '@/packages/account';
import { useChats } from '@/packages/chats';
import { useCreateKeyboard } from '../hooks/use-create-keyboard';
import { useUpdateKeyboard } from '../hooks/use-update-keyboard';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { CustomKeyboard, CustomKeyboardFormData } from '../types';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, 'Name required').max(50),
  columns: z.number().int().min(2).max(6),
  chat_id: z.string().optional(),
  buttons: z.array(
    z.object({
      text: z.string().min(1, 'Text required').max(50),
      value: z.string().max(100).optional().or(z.literal('')),
      image_url: z.string().url().optional().or(z.literal('')),
    })
  ).min(1, 'At least one button required').max(50),
});

interface CustomKeyboardEditorProps {
  keyboardId?: string;      // If editing existing
  chatId?: string;          // If creating for specific chat
  onSave?: (keyboard: CustomKeyboard) => void;
  onCancel?: () => void;
}

export function CustomKeyboardEditor({
  keyboardId,
  chatId,
  onSave,
  onCancel
}: CustomKeyboardEditorProps) {
  const { user } = useAccountContext();
  const { chats } = useChats();
  const { keyboard, isLoading: isLoadingKeyboard } = useCustomKeyboard(keyboardId);
  const { createKeyboard, isCreating } = useCreateKeyboard();
  const { updateKeyboard, isUpdating } = useUpdateKeyboard();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!keyboardId;

  // Initialize form
  const form = useForm<CustomKeyboardFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: keyboard ? {
      name: keyboard.name,
      columns: keyboard.columns,
      chat_id: keyboard.chat_id,
      buttons: keyboard.buttons.map(b => ({
        text: b.text,
        value: b.value || '',
        image_url: b.image_url || '',
      })),
    } : {
      name: '',
      columns: 3,
      chat_id: chatId,
      buttons: [{ text: '', value: '', image_url: '' }],
    },
  });

  // Update form when keyboard loads (for edit mode)
  useEffect(() => {
    if (keyboard && isEditing) {
      form.reset({
        name: keyboard.name,
        columns: keyboard.columns,
        chat_id: keyboard.chat_id,
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
          chat_id: data.chat_id,
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
          chat_id: data.chat_id,
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
        <Input
          id="name"
          {...form.register('name')}
          placeholder="e.g., Medical Terms"
        />
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

      {/* Assign to Chat */}
      <div>
        <Label htmlFor="chat_id">Assign to Chat (optional)</Label>
        <Select
          value={form.watch('chat_id') || 'none'}
          onValueChange={val => form.setValue('chat_id', val === 'none' ? undefined : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {chats.map(chat => (
              <SelectItem key={chat.id} value={chat.id}>
                {chat.title || 'Untitled Chat'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buttons */}
      <div>
        <Label>Buttons</Label>
        <div className="space-y-2 mt-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start p-2 border rounded">
              <div className="flex-1 space-y-2">
                <Input
                  {...form.register(`buttons.${index}.text`)}
                  placeholder="Button text (required)"
                />
                <Input
                  {...form.register(`buttons.${index}.value`)}
                  placeholder="Value (optional, defaults to text)"
                />
                <Input
                  {...form.register(`buttons.${index}.image_url`)}
                  placeholder="Image URL (optional)"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {form.formState.errors.buttons && (
          <p className="text-sm text-red-600 mt-1">{form.formState.errors.buttons.message}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ text: '', value: '', image_url: '' })}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Button
        </Button>
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
