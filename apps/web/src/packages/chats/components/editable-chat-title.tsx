'use client';

import { toast } from 'sonner';

import { EditableText } from '@/packages/ui/components/editable-text';

import { updateChat } from '../mutations';

interface EditableChatTitleProps {
  chatId: string;
  title?: string;
  className?: string;
}

export function EditableChatTitle({ chatId, title, className }: EditableChatTitleProps) {
  const handleSave = async (next: string | undefined) => {
    try {
      await updateChat(chatId, { title: next });
      toast.success('Chat updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update chat');
      throw error;
    }
  };

  return (
    <EditableText
      value={title}
      placeholder="Untitled"
      className={className}
      onSave={handleSave}
    />
  );
}
