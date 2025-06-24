import React, { useEffect, useState } from 'react';

import { PlayIcon } from '@heroicons/react/24/outline';
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';

import { createUserMessage } from '@/app/actions/messages';

// Global variable to track currently playing paragraph
let currentlyPlayingId: string | null = null;
let listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notify() {
  listeners.forEach(l => l());
}

function getNodeId(node: any) {
  return node.attrs.id || `${node.textContent}-${node.nodeSize}`;
}

const ParagraphPlayNodeView: React.FC<NodeViewProps> = props => {
  const { node } = props;
  const id = getNodeId(node);
  const text = node.textContent;
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');

  useEffect(() => {
    // Subscribe to global playing state changes
    const unsub = subscribe(() => {
      if (currentlyPlayingId !== id && state === 'playing') {
        setState('idle');
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state]);

  const handlePlay = async () => {
    if (state === 'loading' || state === 'playing') return;
    setState('loading');
    try {
      currentlyPlayingId = id;
      notify();
      setState('playing');
      // Call createUserMessage with the paragraph text
      const message = {
        id: uuidv4(),
        text,
        type: 'message',
      };
      const result = await createUserMessage(message);
      const audioUrl = `data:audio/mp3;base64,${result.audio.blob}`;
      const audioElement = new Audio(audioUrl);
      await audioElement.play();
      setState('idle');
      currentlyPlayingId = null;
      notify();
    } catch (e) {
      setState('error');
      setTimeout(() => setState('idle'), 1200);
    }
  };

  useEffect(() => {
    // On unmount, if this was playing, clear global
    return () => {
      if (currentlyPlayingId === id) {
        currentlyPlayingId = null;
        notify();
      }
    };
  }, [id]);

  return (
    <NodeViewWrapper className="flex flex-row items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-transparent bg-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors p-1"
        aria-label="Play paragraph"
        aria-pressed={state === 'playing'}
        onClick={handlePlay}
        disabled={state === 'loading' || state === 'playing'}
      >
        <PlayIcon className="w-5 h-5" />
      </button>
      <NodeViewContent className="flex-1 outline-none" />
      {/* Visual feedback */}
      {state === 'loading' && <span className="ml-2 text-xs text-gray-400">Loading...</span>}
      {state === 'playing' && <span className="ml-2 text-xs text-green-500">Playing</span>}
      {state === 'error' && <span className="ml-2 text-xs text-red-500">Error</span>}
    </NodeViewWrapper>
  );
};

export default ParagraphPlayNodeView;
