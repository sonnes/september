'use client';

import { useState } from 'react';

import clsx from 'clsx';

import { createUserMessage } from '@/app/actions/messages';
import { useSettings } from '@/app/app/talk/context';
import { Button } from '@/components/catalyst/button';
import { useMessages } from '@/components/context/messages';
import { usePlayer } from '@/components/context/player';

import Suggestions from '../autocomplete/suggestions';
import { EditorProvider, useEditor } from './context';
import EmotionsSelector from './emotions-selector';
import { Keyboard } from './keyboards';

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

  const { messages } = useMessages();
  const { text, setText, tone, appendText } = useEditor();
  const { addMessage } = useMessages();
  const { setPlaying } = usePlayer();
  const { settings } = useSettings();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const createMessage = async () => {
    setError(null);
    setStatus('loading');

    const previousText = messages
      .slice(0, 5)
      .map(message => message.text)
      .join('.\n');

    const request = {
      id: crypto.randomUUID(),
      text,
      tone,
      settings,
      previous_text: previousText,
      type: 'message',
    };

    try {
      const createdMessage = await createUserMessage(request);
      addMessage(createdMessage);
      setPlaying(createdMessage);
      setText('');
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
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    switch (key.toLowerCase()) {
      case 'space':
        setText(text + ' ');
        break;
      case 'backspace':
        setText(text.slice(0, -1));
        break;
      case 'enter':
        createMessage();
        break;
      default:
        setText(text + key);
        break;
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    appendText(suggestion);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1">
        <Suggestions text={text} onSelect={handleSuggestionSelect} />

        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 w-full p-3 rounded-xl border border-zinc-400"
            style={{ caretColor: 'auto' }}
          />
          <Button onClick={createMessage} color="dark/zinc" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
        <div className="mt-2">{error && <div className="text-red-500">{error}</div>}</div>
      </div>
      <Keyboard onKeyPress={handleVirtualKeyPress} />
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
