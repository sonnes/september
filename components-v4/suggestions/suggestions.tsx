'use client';

import { Loader2 } from 'lucide-react';

import { useEditorContext } from '@/components-v4/editor/context';
import { useMessageHistory } from '@/components-v4/messages/use-messages';
import { useSuggestions } from '@/components-v4/suggestions/use-suggestions';
import { cn } from '@/lib/utils';

interface SuggestionsProps {
  className?: string;
  timeout?: number;
}

export function Suggestions({ className, timeout = 800 }: SuggestionsProps) {
  const { text, setText } = useEditorContext();
  const { suggestions, isLoading, clearSuggestions } = useSuggestions({ text, timeout });
  const { messages, fetching: isLoadingMessages } = useMessageHistory({ query: text });

  const handleSuggestionClick = (text: string) => {
    setText(text);
    clearSuggestions();
  };

  if (!isLoading && suggestions.length === 0 && !isLoadingMessages && messages.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(isLoading || isLoadingMessages) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding suggestions...</span>
        </div>
      )}

      {!isLoading && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div key={`suggestion-${index}`} className="flex items-center gap-3">
              <div className="h-5 w-0.5 shrink-0 rounded-full bg-primary" />
              <button
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="rounded-lg px-3 py-1 font-medium transition-colors border hover:bg-gray-50"
              >
                {suggestion.text}
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoadingMessages && messages.length > 0 && (
        <div className="flex flex-col gap-2">
          {messages.slice(0, 5).map((message, index) => (
            <div key={`suggestion-${index}`} className="flex items-center gap-3">
              <div className="h-5 w-0.5 shrink-0 rounded-full bg-orange-500" />
              <button
                onClick={() => handleSuggestionClick(message.text)}
                className="rounded-lg px-3 py-1 font-medium transition-colors border hover:bg-gray-50"
              >
                {message.text}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
