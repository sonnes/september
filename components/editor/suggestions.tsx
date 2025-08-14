'use client';

import { useTextContext } from '@/components/context/text-provider';
import { PlayButton } from '@/components/talk/play-button';
import { useSuggestions } from '@/hooks/use-suggestions';
import { cn } from '@/lib/utils';

interface SuggestionsProps {
  className?: string;
  timeout?: number;
}

export default function Suggestions({ className = '', timeout = 3000 }: SuggestionsProps) {
  const { setText } = useTextContext();
  const { suggestions, isLoading } = useSuggestions(timeout);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setText(suggestion);
  };

  return (
    <div className={cn('flex flex-col gap-2 py-2 text-md', className)}>
      {isLoading && <div className="text-zinc-400 animate-pulse">Loading suggestions...</div>}
      {!isLoading && !suggestions.length && <div className="text-zinc-400"></div>}
      {!isLoading &&
        suggestions.slice(0, 10).map(({ text, audio_path }, index) => (
          <div
            className="flex items-center justify-between w-full gap-2"
            key={`suggestion-${index}`}
          >
            <button
              onClick={() => handleSuggestionClick(text)}
              className="px-4 py-2 text-sm font-medium text-black bg-white rounded-xl border border-blue-600 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200 text-left"
            >
              {text}
            </button>

            {audio_path && <PlayButton path={audio_path} />}
          </div>
        ))}
    </div>
  );
}
