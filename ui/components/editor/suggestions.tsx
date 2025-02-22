import { useEffect, useState } from 'react';

import { Button } from '@/components/catalyst/button';
import { useMessages } from '@/components/context/messages';
import { useDebounce } from '@/hooks/useDebounce';

import { useEditor } from './context';

interface SuggestionsProps {
  debounceMs?: number;
}

export default function Suggestions({ debounceMs = 300 }: SuggestionsProps) {
  const { suggestions, text, setSuggestions, appendText } = useEditor();
  const { messages } = useMessages();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const debouncedText = useDebounce(text, debounceMs);

  const fetchSuggestion = async (text: string) => {
    if (!text) return;

    setStatus('loading');

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: messages }),
      });
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (debouncedText) {
      fetchSuggestion(debouncedText);
    } else {
      setSuggestions([]);
    }
  }, [debouncedText]);

  return (
    <div className="mb-2 min-h-[52px]">
      {status === 'loading' ? (
        <div className="p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800">
          Loading suggestions...
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="p-2 flex flex-wrap gap-2">
          {suggestions.map((completion, index) => (
            <Button
              key={index}
              color="white"
              onClick={() => appendText(completion)}
              className="rounded-full"
            >
              {completion}
            </Button>
          ))}
        </div>
      ) : (
        <div className="p-2" />
      )}
    </div>
  );
}
