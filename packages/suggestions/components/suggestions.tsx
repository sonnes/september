'use client';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useMessages } from '@/packages/chats';
import { useEditorContext } from '@/packages/editor';
import { useSuggestions } from '@/packages/suggestions/hooks/use-suggestions';

interface SuggestionsProps {
  chatId?: string;
  className?: string;
  timeout?: number;
}

export function Suggestions({ chatId, className, timeout = 2000 }: SuggestionsProps) {
  const { text, setText } = useEditorContext();
  const { messages: searchMessages, isLoading: isLoadingSearchMessages } = useMessages({
    searchQuery: text,
    limit: 5,
  });
  const { messages: historyMessages } = useMessages({
    chatId,
    limit: 10,
  });
  const { suggestions, isLoading, clearSuggestions } = useSuggestions({
    text,
    timeout,
    history: historyMessages,
  });

  const handleSuggestionClick = (text: string) => {
    setText(text);
    clearSuggestions();
  };

  if (
    !isLoading &&
    suggestions.length === 0 &&
    !isLoadingSearchMessages &&
    searchMessages.length === 0
  ) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(isLoading || isLoadingSearchMessages) && (
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
                className="rounded-lg px-3 py-1 font-medium transition-colors border hover:bg-gray-50 text-left"
              >
                {suggestion.text}
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoadingSearchMessages && text.length > 0 && searchMessages.length > 0 && (
        <div className="flex flex-col gap-2">
          {searchMessages.slice(0, 5).map((message, index) => (
            <div key={`msg-${index}`} className="flex items-center gap-3">
              <div className="h-5 w-0.5 shrink-0 rounded-full bg-orange-500" />
              <button
                onClick={() => handleSuggestionClick(message.text)}
                className="rounded-lg px-3 py-1 font-medium transition-colors border hover:bg-gray-50 text-left"
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
