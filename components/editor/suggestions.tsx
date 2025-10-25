'use client';

import { useTextContext } from '@/components/context/text-provider';
import { PlayButton } from '@/components/talk/play-button';

import { useSearchHistory, useSuggestions } from '@/hooks/use-suggestions';

import { cn } from '@/lib/utils';

interface SuggestionsProps {
  className?: string;
  timeout?: number;
}

export default function Suggestions({ className = '', timeout = 3000 }: SuggestionsProps) {
  const { setText } = useTextContext();
  const { suggestions, isLoading } = useSuggestions(timeout);
  const { history, isLoading: isHistoryLoading } = useSearchHistory(300);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
  };

  return (
    <div className={cn('flex flex-col gap-2 py-2 text-md', className)}>
      {!isLoading &&
        suggestions.slice(0, 5).map(({ text, audio_path }, index) => (
          <div
            className="flex items-center justify-between w-full gap-2"
            key={`suggestion-${index}`}
          >
            <button
              onClick={() => handleSuggestionClick(text)}
              className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-indigo-600 hover:bg-zinc-100 hover:border-indigo-400 transition-colors duration-200 text-left"
            >
              {text}
            </button>

            {audio_path && <PlayButton id={`suggestion-${index}`} text={text} path={audio_path} />}
          </div>
        ))}
      {!isHistoryLoading &&
        history.slice(0, 5).map(({ text, audio_path }, index) => (
          <div
            className="flex items-center justify-between w-full gap-2"
            key={`suggestion-${index}`}
          >
            <button
              onClick={() => handleSuggestionClick(text)}
              className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-amber-500 hover:bg-zinc-100 hover:border-amber-600 transition-colors duration-200 text-left"
            >
              {text}
            </button>

            {audio_path && <PlayButton id={`suggestion-${index}`} text={text} path={audio_path} />}
          </div>
        ))}
    </div>
  );
}
