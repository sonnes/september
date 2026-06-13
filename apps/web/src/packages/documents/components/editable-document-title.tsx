'use client';

import { EditableText } from '@/packages/ui/components/editable-text';

import { updateDocument } from '../mutations';

interface EditableDocumentTitleProps {
  documentId: string;
  name?: string;
  className?: string;
}

export function EditableDocumentTitle({ documentId, name, className }: EditableDocumentTitleProps) {
  return (
    <EditableText
      value={name}
      placeholder="Untitled"
      className={className}
      onSave={next => updateDocument(documentId, { name: next })}
    />
  );
}
