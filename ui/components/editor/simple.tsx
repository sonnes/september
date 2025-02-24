'use client';

import { useState } from 'react';

import clsx from 'clsx';

import { createUserMessage } from '@/app/actions/messages';
import { Button } from '@/components/catalyst/button';
import { useMessages } from '@/components/context/messages';
import { usePlayer } from '@/components/context/player';

import { KeyboardType } from '../keyboard/types';
import { EditorProvider, useEditor } from './context';
import EmotionsSelector from './emotions-selector';
import { ABCKeyboard, EmojiKeyboard, KeyboardSelector, NumberKeyboard } from './keyboards';
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
};

function Editor({ placeholder = 'Start typing...' }: EditorProps) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [activeKeyboard, setActiveKeyboard] = useState<KeyboardType>(null);
  const { text, setText, suggestions, tone, setTone, setSuggestions } = useEditor();
  const { addMessage } = useMessages();
  const { setPlaying } = usePlayer();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const createMessage = async () => {
    setStatus('loading');
    const message = {
      id: crypto.randomUUID(),
      text,
      tone,
      type: 'message',
    };

    const createdMessage = await createUserMessage(message);
    addMessage(createdMessage);
    setPlaying(createdMessage);
    setStatus('idle');
    setText('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createMessage();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        const newText = text.trim() + ' ' + suggestions[0];
        setText(newText);
        setSuggestions([]);
      }
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    switch (key) {
      case 'space':
        setText(text + ' ');
        break;
      case '⌫':
        setText(text.slice(0, -1));
        break;
    }
  };

  return (
    <div className={clsx('flex gap-2', activeKeyboard && ' flex-col md:flex-row', 'gap-2')}>
      <div className="flex flex-row items-center gap-2">
        <KeyboardSelector activeKeyboard={activeKeyboard} setActiveKeyboard={setActiveKeyboard} />

        {activeKeyboard && (
          <div className="md:border-r border-zinc-200 dark:border-zinc-700">
            {activeKeyboard === 'abc' ? (
              <ABCKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : activeKeyboard === 'numbers' ? (
              <NumberKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : activeKeyboard === 'emojis' ? (
              <EmojiKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1">
        <Suggestions />
        <div className="relative">
          <div
            className={`relative z-10 overflow-hidden rounded-xl border border-zinc-500 dark:border-zinc-700 ${
              status === 'loading' ? 'p-[1.5px]' : ''
            }`}
          >
            {status === 'loading' && (
              <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(#71717a_20deg,transparent_120deg)] dark:bg-[conic-gradient(#3f3f46_20deg,transparent_120deg)]"></div>
            )}
            <div
              className={`relative z-20 flex ${
                status === 'loading' ? 'rounded-[0.60rem] bg-white dark:bg-zinc-900' : ''
              }`}
            >
              <textarea
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 w-full p-3 bg-transparent rounded-md"
                style={{ caretColor: 'auto' }}
              />
              {suggestions.length > 0 && (
                <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words">
                  <span className="invisible">{text}</span>
                  <span className="text-zinc-400 italic dark:text-zinc-500">{suggestions[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex justify-end items-center gap-2">
          <EmotionsSelector emotions={emotions} />
          <Button onClick={createMessage} color="dark/zinc" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
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
