import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/catalyst/button";
import { useDebounce } from "@/hooks/useDebounce";

import type { Message } from "@/db/messages";

interface InlineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  debounceMs?: number;
  history?: Message[];
}

export default function InlineEditor({
  value,
  onChange,
  onSubmit,
  placeholder = "Type something...",
  debounceMs = 300,
  history = [],
}: InlineEditorProps) {
  const [suggestion, setSuggestion] = useState("");
  const [isAddingWord, setIsAddingWord] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedText = useDebounce(value, debounceMs);

  const fetchSuggestion = async () => {
    if (!debouncedText) return;

    try {
      const response = await fetch("/api/suggestions/inline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: debouncedText, history: history }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion || "");
    } catch (error) {
      console.error("Error fetching suggestion:", error);
    }
  };

  const insertSuggestion = () => {
    const newText = value + suggestion;
    onChange(newText);
    setSuggestion("");
  };

  const addFirstWord = () => {
    setIsAddingWord(true);
    const firstWord = suggestion.split(" ")[0];
    onChange(value + firstWord + " ");
    setSuggestion(suggestion.slice(firstWord.length + 1));
  };

  useEffect(() => {
    if (isAddingWord) {
      setIsAddingWord(false);
      return;
    }

    const lastWord = value.split(" ").pop() || "";
    const suggestionFirstWord = suggestion.split(" ")[0] || "";

    if (
      lastWord === suggestionFirstWord ||
      suggestionFirstWord?.startsWith(lastWord)
    ) {
      return;
    }

    fetchSuggestion();
  }, [debouncedText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      insertSuggestion();
    } else if (e.key === "ArrowRight" && e.metaKey && suggestion) {
      e.preventDefault();
      addFirstWord();
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit();
      setSuggestion("");
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-[100px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg"
          style={{ caretColor: "auto" }}
        />
        {suggestion && (
          <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words border">
            <span className="invisible">{value}</span>
            <span className="text-zinc-400 italic dark:text-zinc-500">
              {suggestion}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button onClick={handleSubmit} color="dark/zinc">
          Submit
        </Button>
      </div>
    </div>
  );
}
