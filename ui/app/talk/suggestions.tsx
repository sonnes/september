import { Button } from "@/components/catalyst/button";
import { useEffect, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";

import type { Message } from "@/db/messages";

interface SuggestionsProps {
  text: string;
  onSuggestionClick: (suggestion: string) => void;
  debounceMs?: number;
  history?: Message[];
}

export default function Suggestions({
  text,
  onSuggestionClick,
  debounceMs = 300,
  history = [],
}: SuggestionsProps) {
  const [status, setStatus] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce the input text
  const debouncedText = useDebounce(text, debounceMs);

  const getSuggestions = useCallback(async (text: string) => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, history }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setStatus("");
      console.log("Suggestions fetched:", data.suggestions);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }, []);

  // Get new suggestions whenever debounced text changes
  useEffect(() => {
    if (debouncedText.trim()) {
      getSuggestions(debouncedText);
    } else {
      setSuggestions([]);
      setStatus("");
    }
  }, [debouncedText, getSuggestions]);

  if (error) {
    return (
      <div className="border-t bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
        Error loading suggestions: {error}
      </div>
    );
  }

  if (status === "loading") {
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
