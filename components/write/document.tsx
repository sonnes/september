'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  DocumentDuplicateIcon,
  PaperClipIcon,
  PresentationChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useDocumentsContext } from '@/components/context/documents-provider';
import TiptapEditor from '@/components/editor/tiptap-editor';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';

import UploadForm from './upload-form';

interface DocumentProps {
  className?: string;
}

export default function Document({ className = '' }: DocumentProps) {
  const { current, putDocument } = useDocumentsContext();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (current) {
      setName(current.name || '');
      setContent(current.content || '');
    }
  }, [current]);

  const handleContentChange = useCallback(async (content: string, markdown: string) => {
    setContent(markdown);
    setIsDirty(true);
  }, []);

  const handleUploadFile = () => {
    setIsUploadDialogOpen(true);
  };

  const handleSlidesPreview = () => {
    if (current?.id) {
      window.open(`/write/preview/${current.id}`, '_blank', 'noopener,noreferrer');
    }
  };

  const closeUploadDialog = () => {
    setIsUploadDialogOpen(false);
  };

  const handleTextExtracted = async (text: string) => {
    const content = current?.content || '';
    await putDocument({ ...current, content: content + text });
    setIsUploadDialogOpen(false);
  };

  const handleSave = async () => {
    if (!current?.id) return;
    await putDocument({ ...current, content, name });
    setIsDirty(false);
  };
  return (
    <div className={`h-full flex flex-col bg-zinc-50 ${className}`}>
      {/* Main Content Card */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 flex-1 flex flex-col overflow-hidden">
          {/* Document Header */}
          <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-zinc-100">
            <TextInput
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Untitled Document"
              className="text-2xl sm:text-3xl font-bold text-zinc-900 border-0 shadow-none bg-transparent px-0 py-2 placeholder:text-zinc-400 focus:outline-none hover:bg-zinc-50/50 rounded-lg transition-all duration-200 -mx-2"
            />
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-0 flex flex-col">
            <TiptapEditor
              content={content}
              placeholder="Start writing your story..."
              onUpdate={handleContentChange}
              className="flex-1 min-h-0 border-0 shadow-none"
            />
          </div>
        </div>

        {/* Enhanced Action Bar */}
        <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-sm border border-zinc-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadFile}
                icon={<PaperClipIcon className="h-4 w-4" />}
                className="bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow transition-all duration-200"
              >
                <span className="hidden sm:inline">Upload</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSlidesPreview}
                disabled={!current?.id}
                icon={<PresentationChartBarIcon className="h-4 w-4" />}
                className="bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Slides</span>
              </Button>
            </div>

            {/* Enhanced Save Section */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {/* Enhanced Status indicator */}
              <div className="flex items-center gap-2 text-sm">
                <div className="relative">
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isDirty
                        ? 'bg-indigo-400 shadow-indigo-400/50 shadow-sm'
                        : 'bg-indigo-400 shadow-indigo-400/50 shadow-sm'
                    }`}
                  />
                  {isDirty && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
                <span className={`font-medium ${isDirty ? 'text-indigo-600' : 'text-indigo-600'}`}>
                  {isDirty ? 'Unsaved changes' : 'All changes saved'}
                </span>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!isDirty}
                icon={<DocumentDuplicateIcon className="h-4 w-4" />}
                color="indigo"
                className="shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Save Document</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Upload File Dialog */}
      <Dialog open={isUploadDialogOpen} onClose={closeUploadDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
              <DialogTitle className="text-xl font-semibold text-zinc-900">
                Upload File to Extract Text
              </DialogTitle>
              <Button
                type="button"
                variant="circular"
                size="sm"
                onClick={closeUploadDialog}
                className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/70 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6">
              <UploadForm onTextExtracted={handleTextExtracted} />
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
