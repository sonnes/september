'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DocumentDuplicateIcon,
  PaperClipIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { cn } from '@/lib/utils';
import { SlidesPresentation } from '@/packages/documents/components/slides-presentation';
import { UploadForm } from '@/packages/documents/components/upload-form';
import { useDocuments } from '@/packages/documents/hooks/use-documents';
import { TiptapEditor } from '@/packages/editor';

type DocumentEditorProps = {
  documentId: string;
  className?: string;
};

export function DocumentEditor({ documentId, className }: DocumentEditorProps) {
  const { documents, putDocument } = useDocuments();
  const current = documents.find(doc => doc.id === documentId) || null;

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSlidesDialogOpen, setIsSlidesDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!current) return;
    setContent(current.content || '');
    setIsDirty(false);
  }, [current]); // reset when the selected document changes

  const handleContentChange = useCallback(async (_content: string, markdown: string) => {
    setContent(markdown);
    setIsDirty(true);
  }, []);

  const handleUploadFile = () => {
    setIsUploadDialogOpen(true);
  };

  const handleSlidesPreview = () => {
    setIsSlidesDialogOpen(true);
  };

  const handleTextExtracted = async (text: string) => {
    if (!current) return;
    const existing = current?.content || '';
    await putDocument({ ...current, content: existing + text });
    setIsUploadDialogOpen(false);
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!current?.id) return;
    await putDocument({ ...current, content });
    setIsDirty(false);
  };

  const uploadDialog = useMemo(
    () => (
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-xl">
          <DialogHeader className="pb-2">
            <DialogTitle>Upload file to extract text</DialogTitle>
            <DialogDescription>
              We will extract the text and append it to your current document.
            </DialogDescription>
          </DialogHeader>
          <UploadForm onTextExtracted={handleTextExtracted} />
        </DialogContent>
      </Dialog>
    ),
    [handleTextExtracted, isUploadDialogOpen]
  );

  const slidesDialog = useMemo(
    () => (
      <Dialog open={isSlidesDialogOpen} onOpenChange={setIsSlidesDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-[95vw] h-[95vh] p-0 flex flex-col">
          <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
            <SlidesPresentation documentId={documentId} className="h-full" />
          </div>
        </DialogContent>
      </Dialog>
    ),
    [isSlidesDialogOpen, documentId]
  );

  return (
    <div className={cn('h-full w-full', className)}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex-1 overflow-hidden">
            <TiptapEditor
              content={content}
              placeholder="Start writing your story..."
              onUpdate={handleContentChange}
              className="flex-1 border-0 shadow-none"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card/80 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadFile}
                className="min-w-[120px]"
              >
                <PaperClipIcon className="h-4 w-4" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSlidesPreview}
                disabled={!current?.id}
                className="min-w-[120px]"
              >
                <PresentationChartBarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Slides</span>
                <span className="sm:hidden">Preview</span>
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-opacity',
                    isDirty ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                />
                <span className="font-medium">
                  {isDirty ? 'Unsaved changes' : 'All changes saved'}
                </span>
              </div>
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                className="min-w-[140px]"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                Save document
              </Button>
            </div>
          </div>
        </div>
      </div>

      {uploadDialog}
      {slidesDialog}
    </div>
  );
}
