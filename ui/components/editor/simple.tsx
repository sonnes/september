'use client';

import { useState } from 'react';

import clsx from 'clsx';

import { createUserMessage } from '@/app/actions/messages';
import { useSettings } from '@/app/app/talk/context';
import { Button } from '@/components/catalyst/button';
import { useMessages } from '@/components/context/messages';
import { usePlayer } from '@/components/context/player';
import { QwertyKeyboard } from '@/components/keyboard/qwerty';

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
  const [error, setError] = useState<string | null>(null);
  const [activeKeyboard, setActiveKeyboard] = useState<KeyboardType>(null);
  const { text, setText, suggestions, tone, setSuggestions } = useEditor();
  const { addMessage } = useMessages();
  const { setPlaying } = usePlayer();
  const { settings } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const createMessage = async () => {
    setError(null);
    setStatus('loading');
    const request = {
      id: crypto.randomUUID(),
      text,
      tone,
      settings,
      type: 'message',
    };

    try {
      const createdMessage = await createUserMessage(request);
      addMessage(createdMessage);
      setPlaying(createdMessage);
      setText('');
      setSuggestions([]);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setStatus('idle');
    }
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
      case 'Enter':
        createMessage();
        break;
      default:
        setText(text + key);
        break;
    }
  };

  return (
    <div className={clsx('flex gap-2', activeKeyboard && ' flex-col md:flex-row', 'gap-2')}>
      <div className="flex flex-row items-center gap-2">
        <KeyboardSelector activeKeyboard={activeKeyboard} setActiveKeyboard={setActiveKeyboard} />

        {activeKeyboard && (
          <div className="md:border-r border-zinc-200">
            {activeKeyboard === 'abc' ? (
              <ABCKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : activeKeyboard === 'numbers' ? (
              <NumberKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : activeKeyboard === 'emojis' ? (
              <EmojiKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : activeKeyboard === 'qwerty' ? (
              <QwertyKeyboard onKeyPress={handleVirtualKeyPress} />
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1">
        <Suggestions />
        <div className="relative">
          <div
            className={`relative z-2 overflow-hidden rounded-xl border border-zinc-500 ${
              status === 'loading' ? 'p-[1.5px]' : ''
            }`}
          >
            {status === 'loading' && (
              <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(#71717a_20deg,transparent_120deg)]"></div>
            )}
            <div
              className={`relative z-3 flex ${
                status === 'loading' ? 'rounded-[0.60rem] bg-white' : ''
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
                <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 whitespace-pre-wrap break-words z-2">
                  <span className="invisible">{text}</span>
                  <span className="text-zinc-400 italic">{suggestions[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center gap-2 relative">
          <EmotionsSelector emotions={emotions} />
          {error && <div className="text-red-500">{error}</div>}
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
