'use client';

import { useEffect, useState } from 'react';

import {
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ItalicIcon,
  ListBulletIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { Button } from '@/components/ui/button';
import { type ThemeColor, themes } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface MarkdownStorage {
  markdown?: {
    getMarkdown(): string;
  };
}

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onSave?: (content: string, markdown: string) => void;
  className?: string;
  theme?: ThemeColor;
}

export default function TiptapEditor({
  content = '',
  placeholder = 'Start writing...',
  onSave,
  className = '',
  theme = 'indigo',
}: TiptapEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const themeConfig = themes[theme];

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-disc list-inside my-4 space-y-2',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-decimal list-inside my-4 space-y-2',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: cn(
              'border-l-4 pl-6 py-2 my-4 italic text-gray-700 bg-gray-50 rounded-r-md',
              `border-${theme}-400`
            ),
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              'bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm my-4 overflow-x-auto',
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold text-gray-900 tracking-tight',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'text-gray-800 leading-relaxed my-2',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'text-gray-800',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-lg max-w-none focus:outline-none h-full p-6',
          'prose-headings:font-bold prose-headings:text-gray-900',
          'prose-p:text-gray-800 prose-p:leading-relaxed',
          'prose-strong:text-gray-900 prose-strong:font-semibold',
          'prose-em:text-gray-700',
          'prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
          `prose-a:text-${theme}-600 prose-a:no-underline hover:prose-a:underline`,
          'placeholder:text-gray-400'
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content && editor.isInitialized) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const getMarkdownContent = () => {
    return (editor?.storage as MarkdownStorage)?.markdown?.getMarkdown() || '';
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        `border rounded-xl shadow-sm flex flex-col h-full`,
        themeConfig.border,
        className
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-start sm:items-center justify-between border-b p-3 rounded-t-xl gap-3 sm:gap-0 flex-shrink-0',
          themeConfig.border,
          `bg-${theme}-50`
        )}
      >
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('bold') ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<BoldIcon />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('italic') ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<ItalicIcon />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('heading', { level: 1 }) ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('heading', { level: 2 }) ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('bulletList') ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={<ListBulletIcon />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('blockquote') ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={<ChatBubbleBottomCenterTextIcon />}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            color={editor.isActive('codeBlock') ? theme : 'gray'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            icon={<CodeBracketIcon />}
          />
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative flex-1 min-h-0">
        {isPreviewMode ? (
          <div className="p-4 h-full overflow-auto">
            <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none">
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-medium text-gray-700">Markdown Source</h3>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border overflow-auto">
                  {getMarkdownContent()}
                </pre>
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-medium text-gray-700">Rendered Preview</h3>
                </div>
                <div
                  className="prose prose-sm max-w-none bg-white p-4 border rounded"
                  dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
                />
              </div>
            </div>
          </div>
        ) : (
          <EditorContent editor={editor} className="h-full overflow-auto" />
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div
        className={cn(
          'flex items-center justify-end gap-2 border-t p-3 rounded-b-xl flex-shrink-0',
          themeConfig.border,
          `bg-${theme}-50`
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={togglePreview}
          icon={isPreviewMode ? <PencilIcon /> : <EyeIcon />}
        >
          <span className="hidden sm:inline">{isPreviewMode ? 'Edit' : 'Preview'}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSave?.(editor.getHTML(), getMarkdownContent())}
          icon={<DocumentDuplicateIcon />}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
