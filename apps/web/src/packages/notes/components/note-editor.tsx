'use client';

import { useCallback, useMemo, useRef } from 'react';

import {
  PaperClipIcon,
  PlayCircleIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline';
import { Save } from 'lucide-react';

import { TiptapEditor } from '@/packages/editor';
import { cn } from '@/packages/shared';
import { Button } from '@/packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/packages/ui/components/dialog';
import { Separator } from '@/packages/ui/components/separator';

import { useNoteEditor } from '../hooks/use-note-editor';
import { SlidesPresentation } from './slides-presentation';
import { UploadForm } from './upload-form';

type NoteEditorProps = {
  noteId: string;
  className?: string;
  variant?: 'full' | 'note';
  autoSave?: boolean;
};

export function NoteEditor({
  noteId,
  className,
  variant = 'full',
  autoSave = false,
}: NoteEditorProps) {
  const {
    content,
    isDirty,
    isSaving,
    note: current,
    isUploadDialogOpen,
    isSlidesDialogOpen,
    handleContentChange,
    handleSave,
    handleUploadFile,
    handleSlidesPreview,
    handleTextExtracted,
    setIsUploadDialogOpen,
    setIsSlidesDialogOpen,
  } = useNoteEditor({ noteId, autoSave });

  const popupRef = useRef<Window | null>(null);

  const handlePresent = useCallback(() => {
    if (!current?.id) return;
    const url = `/present/${current.id}`;
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    popupRef.current = window.open(
      url,
      `present-${current.id}`,
      'width=1280,height=720,left=100,top=100,popup=1'
    );
  }, [current?.id]);

  const uploadDialog = useMemo(
    () => (
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-xl">
          <DialogHeader className="pb-2">
            <DialogTitle>Upload file to extract text</DialogTitle>
            <DialogDescription>
              We will extract the text and append it to your current note.
            </DialogDescription>
          </DialogHeader>
          <UploadForm onTextExtracted={handleTextExtracted} />
        </DialogContent>
      </Dialog>
    ),
    [handleTextExtracted, isUploadDialogOpen, setIsUploadDialogOpen]
  );

  const slidesDialog = useMemo(
    () => (
      <Dialog open={isSlidesDialogOpen} onOpenChange={setIsSlidesDialogOpen}>
        <DialogContent
          showCloseButton
          className="sm:max-w-[95vw] h-[95vh] p-0 flex flex-col"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Slides presentation</DialogTitle>
          <div className="h-full bg-linear-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
            <SlidesPresentation noteId={noteId} className="h-full" />
          </div>
        </DialogContent>
      </Dialog>
    ),
    [isSlidesDialogOpen, noteId, setIsSlidesDialogOpen]
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

        {variant === 'full' && (
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePresent}
                  disabled={!current?.id}
                  className="min-w-[120px]"
                >
                  <PlayCircleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Present</span>
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
                    {isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'All changes saved'}
                  </span>
                </div>
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="min-w-[120px]"
                >
                  <Save className="h-4 w-4" />
                  Save note
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {variant === 'full' && uploadDialog}
      {variant === 'full' && slidesDialog}
    </div>
  );
}
