'use client';

import { toast } from 'sonner';

import { EditableText } from '@/packages/ui/components/editable-text';

import { useUpdateSpaceMutation } from '../hooks/use-space-mutations';

interface EditableSpaceTitleProps {
  spaceId: string;
  title?: string;
  className?: string;
}

export function EditableSpaceTitle({ spaceId, title, className }: EditableSpaceTitleProps) {
  const updateSpace = useUpdateSpaceMutation();
  const handleSave = async (next: string | undefined) => {
    try {
      await updateSpace.mutateAsync({ id: spaceId, updates: { title: next } });
      toast.success('Space updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update space');
      throw error;
    }
  };

  return (
    <EditableText value={title} placeholder="Untitled" className={className} onSave={handleSave} />
  );
}
