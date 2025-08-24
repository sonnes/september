'use client';

import React, { useCallback, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  DocumentDuplicateIcon,
  EyeIcon,
  PaperClipIcon,
  PencilIcon,
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const handleContentSave = useCallback(
    async (content: string, markdown: string) => {
      if (!current?.id) return;

      await putDocument({ ...current, content: markdown });
    },
    [current, putDocument]
  );

  const handleNameChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!current?.id) return;
      await putDocument({ ...current, name: e.target.value });
    },
    [current, putDocument]
  );

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

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
    console.log(text);
    const content = current?.content || '';
    await putDocument({ ...current, content: content + text });
    setIsUploadDialogOpen(false);
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Document Header */}

      <TextInput
        value={current?.name || ''}
        onChange={handleNameChange}
        placeholder="Untitled Document"
        className="text-3xl font-bold text-gray-900 border-0 shadow-none bg-transparent px-0 py-0 placeholder:text-gray-400 focus:outline-none hover:bg-gray-50 rounded-md transition-colors duration-200"
      />

      {/* Editor Container */}
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <TiptapEditor
          content={current?.content || ''}
          placeholder="Start writing your story..."
          onSave={handleContentSave}
          className="flex-1 min-h-0 border-0 shadow-none"
          theme="indigo"
        />
      </div>

      {/* Action Bar */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePreview}
              icon={
                isPreviewMode ? <PencilIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />
              }
              className="bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <span className="hidden sm:inline">{isPreviewMode ? 'Edit' : 'Preview'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadFile}
              icon={<PaperClipIcon className="h-4 w-4" />}
              className="bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-colors duration-200"
            >
              <span className="hidden sm:inline">Upload File</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSlidesPreview}
              disabled={!current?.id}
              icon={<PresentationChartBarIcon className="h-4 w-4" />}
              className="bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Slides</span>
            </Button>
          </div>

          {/* Primary Action - Save */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${current?.id ? 'bg-green-500' : 'bg-yellow-500'}`}
              ></div>
              {current?.id ? 'Document saved' : 'New document'}
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleContentSave('', current?.content || '')}
              icon={<DocumentDuplicateIcon className="h-4 w-4" />}
              color="indigo"
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Upload File Dialog */}
      <Dialog open={isUploadDialogOpen} onClose={closeUploadDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Upload File to Extract Text
              </DialogTitle>
              <Button
                type="button"
                variant="circular"
                size="sm"
                onClick={closeUploadDialog}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
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
