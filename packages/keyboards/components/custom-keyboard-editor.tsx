'use client';

import React, { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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

import { useAccountContext } from '@/packages/account';

import { useCreateKeyboard } from '../hooks/use-create-keyboard';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { useGenerateKeyboardFromMessage } from '../hooks/use-generate-keyboard';
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
  const [generationContext, setGenerationContext] = useState('');
  const { generateKeyboard, isGenerating, error: generationError } = useGenerateKeyboardFromMessage();

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
          columns: 4,
          buttons: Array.from({ length: 4 }, () => ({ text: '', value: '', image_url: '' })),
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
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'buttons',
  });

  const handleSubmit = async (data: CustomKeyboardFormData) => {
    setIsSaving(true);
    try {
      if (isEditing && keyboardId) {
        const updatedKeyboard = await updateKeyboard(keyboardId, {
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
        onSave?.(updatedKeyboard);
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

  const handleGenerateButtons = async () => {
    if (!generationContext.trim()) {
      return;
    }

    try {
      const result = await generateKeyboard({
        messageText: generationContext,
        chatId: '', // Not used in manual creation
      });

      // Auto-populate keyboard name
      form.setValue('name', result.keyboardTitle);

      // Replace all buttons with generated ones
      replace(
        result.buttons.map(text => ({
          text,
          value: '',
          image_url: '',
        }))
      );

      toast.success('Buttons generated successfully');
    } catch (err) {
      // Error already handled by hook and displayed in UI
      console.error('Failed to generate buttons:', err);
    }
  };

  if (isLoadingKeyboard) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEditing ? `Edit Keyboard: ${keyboard?.name}` : 'Create New Keyboard'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyboard Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Keyboard Name</Label>
          <Input id="name" {...form.register('name')} placeholder="e.g., Medical Terms" />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Columns */}
        <div className="space-y-2">
          <Label htmlFor="columns">Columns</Label>
          <Select
            value={form.watch('columns').toString()}
            onValueChange={val => form.setValue('columns', parseInt(val))}
          >
            <SelectTrigger id="columns">
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
      </div>

      {/* AI Generation Section */}
      <div className="space-y-2">
        <Label htmlFor="generation-context">Generate Buttons with AI (Optional)</Label>

        <div className="flex gap-2">
          <Input
            id="generation-context"
            value={generationContext}
            onChange={(e) => setGenerationContext(e.target.value)}
            placeholder="Describe the conversation topic (e.g., 'medical appointments')"
            disabled={isGenerating}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateButtons}
            disabled={isGenerating || !generationContext.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Error state */}
        {generationError && (
          <p className="text-sm text-red-600">
            {generationError.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          AI will generate 24 contextual phrase buttons and suggest a keyboard name based on your description.
        </p>
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
            gridTemplateColumns: `repeat(${form.watch('columns')}, minmax(0, 1fr))`,
            gap: '0.5rem',
          }}
          className="mb-4"
        >
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-1">
              <Input
                {...form.register(`buttons.${index}.text`)}
                placeholder="Text"
                className="text-xs h-8"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="p-1.5 rounded-md hover:bg-red-100 disabled:opacity-50 text-red-600 transition-colors"
                title="Remove button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
