import { useState, useRef, useCallback } from "react";

interface Message {
  role: string;
  content: string;
}

export function useAutocomplete(debounceMs: number = 300) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const getSuggestions = useCallback(
    async (text: string, messages: Message[]) => {
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!text.trim()) {
        setSuggestions([]);
        return;
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      // Debounce the API call
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              messages,
            }),
            signal, // Add abort signal to fetch
          });

          if (!response.ok) {
            throw new Error("Failed to get suggestions");
          }

          const data = await response.json();

          // Only update suggestions if this request wasn't aborted
          if (!signal.aborted) {
            console.log("data", data.suggestions);
            setSuggestions(data.suggestions);
            setSelectedIndex(0);
          }
        } catch (error) {
          // Ignore aborted request errors
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          console.error("Error getting suggestions:", error);
          setSuggestions([]);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  const selectSuggestion = (index: number) => {
    setSelectedIndex(index);
  };

  const acceptFirstWord = (suggestion: string, currentText: string) => {
    const firstWord = suggestion.split(" ")[0];
    const currentWords = currentText.split(" ");
    currentWords[currentWords.length - 1] = firstWord;
    return currentWords.join(" ");
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setSelectedIndex(0);

    // Clean up any pending operations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    suggestions,
    selectedIndex,
    getSuggestions,
    selectSuggestion,
    acceptFirstWord,
    clearSuggestions,
  };
}
