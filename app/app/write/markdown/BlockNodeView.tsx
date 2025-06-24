import React, { type FC } from 'react';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

import ActionMenu from './action-menu';

interface BlockNodeViewProps {
  node: any;
  getPos: () => number;
  editor: any;
  onPlay: (text: string) => Promise<void>;
  loadingKey: string | null;
}

const headingClassMap: Record<number, string> = {
  1: 'text-4xl font-bold mt-6 mb-2',
  2: 'text-3xl font-bold mt-5 mb-2',
  3: 'text-2xl font-semibold mt-4 mb-2',
  4: 'text-xl font-semibold mt-3 mb-1',
  5: 'text-lg font-medium mt-2 mb-1',
  6: 'text-base font-medium mt-2 mb-1',
};

const BlockNodeView: FC<BlockNodeViewProps> = ({ node, editor, onPlay, loadingKey }) => {
  const text = node.textContent;
  const isLoading = loadingKey === text;

  const handlePlay = async () => {
    await onPlay(text);
  };

  if (node.type.name === 'heading') {
    let level = Number(node.attrs.level) || 1;
    if (level < 1 || level > 6) level = 1;
    const Tag = `h${level}`;
    const headingClass = headingClassMap[level] || headingClassMap[1];
    return (
      <NodeViewWrapper className="flex items-center group block-node-view">
        <button
          onClick={handlePlay}
          disabled={isLoading}
          className="mr-2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow border border-zinc-200 hover:bg-blue-100 focus:bg-blue-200 focus:ring-2 focus:ring-blue-400 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
          aria-label="Play block as speech"
          tabIndex={0}
          type="button"
        >
          {isLoading ? (
            <span
              className="inline-block w-4 h-4 border-2 border-zinc-200 border-t-blue-500 rounded-full animate-spin"
              aria-label="Loading..."
            />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="10" fill="#e0e7ef" />
              <polygon points="8,6 17,11 8,16" fill="#2563eb" />
            </svg>
          )}
        </button>
        {React.createElement(
          Tag as keyof JSX.IntrinsicElements,
          { className: `flex-1 min-w-0 ${headingClass}` },
          <NodeViewContent as="span" />
        )}
      </NodeViewWrapper>
    );
  }

  // Default: paragraph, listItem, etc.
  return (
    <NodeViewWrapper className="flex items-center group block-node-view">
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className="mr-2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow border border-zinc-200 hover:bg-blue-100 focus:bg-blue-200 focus:ring-2 focus:ring-blue-400 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
        aria-label="Play block as speech"
        tabIndex={0}
        type="button"
      >
        {isLoading ? (
          <span
            className="inline-block w-4 h-4 border-2 border-zinc-200 border-t-blue-500 rounded-full animate-spin"
            aria-label="Loading..."
          />
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="11" cy="11" r="10" fill="#e0e7ef" />
            <polygon points="8,6 17,11 8,16" fill="#2563eb" />
          </svg>
        )}
      </button>
      <NodeViewContent className="flex-1 min-w-0" />
    </NodeViewWrapper>
  );
};

export default BlockNodeView;
