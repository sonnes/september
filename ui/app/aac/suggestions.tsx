import { Button } from "@/components/catalyst/button";
import { useEffect, useState, useCallback } from "react";

interface SuggestionsProps {
  text: string;
  onSuggestionClick: (suggestion: string) => void;
}

export default function Suggestions({
  text,
  onSuggestionClick,
}: SuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !worker) {
      const newWorker = new Worker(
        new URL("../../workers/fill-mask.js", import.meta.url),
        {
          type: "module",
        }
      );

      newWorker.addEventListener("message", (e) => {
        if (e.data.status === "complete") {
          setIsLoading(false);
          // Extract the top 5 suggestions
          const newSuggestions = e.data.suggestions
            .slice(0, 5)
            .map((result: any) => result.token_str);
          setSuggestions(newSuggestions);
        } else if (e.data.status === "error") {
          setIsLoading(false);
          setError(e.data.error);
          setSuggestions([]);
        } else {
          // Handle progress updates if needed
          console.log("Loading model:", e.data);
        }
      });

      setWorker(newWorker);

      return () => {
        newWorker.terminate();
      };
    }
  }, []);

  const getSuggestions = useCallback(
    (text: string) => {
      if (!worker) return;
      setIsLoading(true);
      setError(null);
      worker.postMessage({ text });
    },
    [worker]
  );

  // Get new suggestions whenever input changes
  useEffect(() => {
    if (text.trim()) {
      getSuggestions(text);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [text, getSuggestions]);

  if (error) {
    return (
      <div className="border-t bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
        Error loading suggestions: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-t bg-zinc-50 dark:bg-zinc-800 p-4">
        Loading suggestions...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t bg-zinc-50 dark:bg-zinc-800">
      <div className="flex flex-wrap gap-2 p-4">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            color="white"
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
