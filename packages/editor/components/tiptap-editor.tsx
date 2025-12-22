'use client';

import {
  BoldIcon,
  ChatBubbleBottomCenterTextIcon,
  CodeBracketIcon,
  ItalicIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

import { cn } from '@/lib/utils';

interface MarkdownStorage {
  markdown?: {
    getMarkdown(): string;
  };
}

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (content: string, markdown: string) => void;
  className?: string;
}

export function TiptapEditor({
  content = '',
  placeholder = 'Start writing...',
  onUpdate,
  className = '',
}: TiptapEditorProps) {
  const editor = useEditor(
    {
      content,
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
              class:
                'border-l-4 pl-6 py-2 my-4 italic text-zinc-700 bg-zinc-50 rounded-r-md border-indigo-400',
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class:
                'bg-zinc-900 text-zinc-100 rounded-lg p-4 font-mono text-sm my-4 overflow-x-auto',
            },
          },
          heading: {
            levels: [1, 2, 3],
            HTMLAttributes: {
              class: 'font-bold text-zinc-900 tracking-tight',
            },
          },
          paragraph: {
            HTMLAttributes: {
              class: 'text-zinc-800 leading-relaxed my-2',
            },
          },
          listItem: {
            HTMLAttributes: {
              class: 'text-zinc-800',
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
            'prose-headings:font-bold prose-headings:text-zinc-900',
            'prose-p:text-zinc-800 prose-p:leading-relaxed',
            'prose-strong:text-zinc-900 prose-strong:font-semibold',
            'prose-em:text-zinc-700',
            'prose-code:text-zinc-900 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
            'prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline',
            'placeholder:text-zinc-400'
          ),
        },
      },
      onUpdate: ({ editor }) => {
        if (!onUpdate) return;
        if (editor.isFocused) return;

        const html = editor.getHTML();
        const markdown = (editor.storage as MarkdownStorage)?.markdown?.getMarkdown() || '';

        onUpdate?.(html, markdown);
      },
      onBlur: ({ editor }) => {
        const html = editor.getHTML();
        const markdown = (editor.storage as MarkdownStorage)?.markdown?.getMarkdown() || '';

        onUpdate?.(html, markdown);
      },
    },
    [content]
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        // Only apply default styling if no custom className is provided
        !className.includes('border-0') &&
          !className.includes('shadow-none') &&
          'border rounded-xl shadow-sm border-indigo-300',
        className
      )}
    >
      {/* Seamless Toolbar */}
      <div className="flex items-center px-4 py-2 border-b border-zinc-100 bg-zinc-50/30">
        <div className="flex items-center gap-0.5">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('bold')
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <BoldIcon className="h-4 w-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('italic')
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <ItalicIcon className="h-4 w-4" />
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-zinc-200 mx-2" />

          {/* H1 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'flex items-center justify-center px-2 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('heading', { level: 1 })
                ? 'bg-indigo-100 text-indigo-700 shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <span className="text-sm font-medium">H1</span>
          </button>

          {/* H2 */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'flex items-center justify-center px-2 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('heading', { level: 2 })
                ? 'bg-indigo-100 text-indigo-700 shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <span className="text-sm font-medium">H2</span>
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-zinc-200 mx-2" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('bulletList')
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('blockquote')
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
          </button>

          {/* Code Block */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 hover:bg-zinc-100',
              editor.isActive('codeBlock')
                ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <CodeBracketIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative flex-1 min-h-0">
        <EditorContent editor={editor} className="h-full overflow-auto" />
      </div>
    </div>
  );
}
