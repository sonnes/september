import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/catalyst/button';
import { useDebounce } from '@/hooks/useDebounce';
import type { Message } from '@/supabase/types';

interface InlineEditorProps {
  onSubmit: (text: string, emotion?: string) => void;
  placeholder?: string;
  debounceMs?: number;
  history?: Message[];
}

export default function Autocomplete({
  onSubmit,
  placeholder = 'Type something...',
  debounceMs = 300,
  history = [],
}: InlineEditorProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [completions, setCompletions] = useState<string[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState('');
  const debouncedText = useDebounce(text, debounceMs);

  const [selectedEmotion, setSelectedEmotion] = useState<string>('neutral');

  const emotions = [
    { emoji: '😐', name: 'neutral' },
    { emoji: '😡', name: 'angry' },
    { emoji: '😢', name: 'sad' },
    { emoji: '😊', name: 'happy' },
    { emoji: '🤔', name: 'confused' },
    { emoji: '😤', name: 'shouting' },
    { emoji: '🤩', name: 'excited' },
  ];

  const fetchSuggestion = async (text: string) => {
    if (!text) return;

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: history }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion || '');
      setCompletions(data.completions || []);
    } catch (error) {
      setStatus('error');
      setError(`Error fetching suggestion: ${error}`);
    } finally {
      setStatus('idle');
    }
  };

  const appendSuggestion = (suggestion: string) => {
    setText(text + suggestion);
    setSuggestion('');
  };

  const addFirstWord = () => {
    setIsAddingWord(true);
    const firstWord = suggestion.split(' ')[0];
    setText(text + firstWord + ' ');
    setSuggestion(suggestion.slice(firstWord.length + 1));
  };

  useEffect(() => {
    if (isAddingWord) {
      setIsAddingWord(false);
      return;
    }

    fetchSuggestion(text);
  }, [debouncedText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      appendSuggestion(suggestion);
    } else if (e.key === 'ArrowRight' && e.metaKey && suggestion) {
      e.preventDefault();
      addFirstWord();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        handleSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text, selectedEmotion);
      setText('');
      setSuggestion('');
      setError(null);
      setCompletions([]);
      setStatus('idle');
      setSelectedEmotion('neutral');
    }
  };

  return (
    <div>
      <div className="mb-2">
        {status === 'error' ? (
          <div className="p-2 border rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            Error loading suggestions: {error}
          </div>
        ) : status === 'loading' ? (
          <div className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800">
            Loading suggestions...
          </div>
        ) : completions && completions.length > 0 ? (
          <div className="p-2 flex flex-wrap gap-2">
            {completions.map((completion, index) => (
              <Button
                key={index}
                color="white"
                onClick={() => appendSuggestion(completion)}
                className="rounded-full"
              >
                {completion}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[100px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg"
            style={{ caretColor: 'auto' }}
          />
          {suggestion && (
            <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words border">
              <span className="invisible">{text}</span>
              <span className="text-zinc-400 italic dark:text-zinc-500">{suggestion}</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end items-center gap-2">
          <div className="flex gap-1">
            {emotions.map(emotion => (
              <div key={emotion.name} className="relative group">
                <button
                  onClick={() => setSelectedEmotion(emotion.name)}
                  className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                    selectedEmotion === emotion.name ? 'bg-zinc-200 dark:bg-zinc-600' : ''
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
    </div>
  );
}
