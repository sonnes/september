import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { useEffect, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";

import type { Message } from "@/db/messages";

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  debounceMs?: number;
  history?: Message[];
}

export default function Autocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = "Type something...",
  debounceMs = 300,
  history = [],
}: AutocompleteProps) {
  const [status, setStatus] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedText = useDebounce(value, debounceMs);

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
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    }
  }, []);

  useEffect(() => {
    if (debouncedText.trim()) {
      getSuggestions(debouncedText);
    } else {
      setSuggestions([]);
      setStatus("");
    }
  }, [debouncedText, getSuggestions]);

  const appendSuggestion = (suggestion: string) => {
    onChange(value.trim() + " " + suggestion);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button onClick={onSubmit} color="dark/zinc">
          Send
        </Button>
      </div>

      {error ? (
        <div className="border-t bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
          Error loading suggestions: {error}
        </div>
      ) : status === "loading" ? (
        <div className="border-t bg-zinc-50 dark:bg-zinc-800 p-4">
          Loading suggestions...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="border-t bg-zinc-50 dark:bg-zinc-800">
          <div className="flex flex-wrap gap-2 p-4">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                color="white"
                onClick={() => appendSuggestion(suggestion)}
                className="rounded-full"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
