'use client';

import { useState } from 'react';

import { Button } from '@/components/catalyst/button';

import { EditorProvider, useEditor } from './context';
import Suggestions from './suggestions';

const emotions = [
  { emoji: '😡', name: 'angry' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😐', name: 'neutral' },
  { emoji: '😊', name: 'happy' },
  { emoji: '🤩', name: 'excited' },
];

type EditorProps = {
  placeholder?: string;
  onSubmit: (text: string, tone: string) => void;
};

function Editor({ placeholder = 'Start typing...', onSubmit }: EditorProps) {
  const { text, setText, suggestions, tone, setTone } = useEditor();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = () => {
    onSubmit(text, tone);
  };

  return (
    <div>
      <Suggestions />
      <div className="relative">
        <div className="relative">
          <textarea
            value={text}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full p-3 bg-transparent dark:bg-zinc-800 border rounded-lg"
            style={{ caretColor: 'auto' }}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words border">
              <span className="invisible">{text}</span>
              <span className="text-zinc-400 italic dark:text-zinc-500">{suggestions[0]}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-end items-center gap-2">
        <div className="flex gap-1">
          {emotions.map(emotion => (
            <div key={emotion.name} className="relative group">
              <button
                onClick={() => setTone(emotion.name)}
                className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                  tone === emotion.name ? 'bg-zinc-200 dark:bg-zinc-600' : ''
                }`}
              >
                {emotion.emoji}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {emotion.name.charAt(0).toUpperCase() + emotion.name.slice(1)}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSubmit} color="dark/zinc">
          Submit
        </Button>
      </div>
    </div>
  );
}

export default function EditorComponent(props: EditorProps) {
  return (
    <EditorProvider>
      <Editor {...props} />
    </EditorProvider>
  );
}
