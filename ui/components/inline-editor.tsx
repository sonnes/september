import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/catalyst/button";
import { useDebounce } from "@/hooks/useDebounce";

import type { Message } from "@/db/messages";

interface InlineEditorProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  history?: Message[];
}

export default function InlineEditor({
  onSubmit,
  placeholder = "Type something...",
  debounceMs = 300,
  history = [],
}: InlineEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [completions, setCompletions] = useState<string[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const debouncedText = useDebounce(text, debounceMs);

  const fetchSuggestion = async (text: string) => {
    if (!text) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history: history }),
      });
      const data = await response.json();
      setSuggestion(data.suggestion || "");
      setCompletions(data.completions || []);
    } catch (error) {
      console.error("Error fetching suggestion:", error);
      setError("Error fetching suggestion");
    } finally {
      setIsLoading(false);
    }
  };

  const appendSuggestion = (suggestion: string) => {
    setText(text + suggestion);
    setSuggestion("");
  };

  const addFirstWord = () => {
    setIsAddingWord(true);
    const firstWord = suggestion.split(" ")[0];
    setText(text + firstWord + " ");
    setSuggestion(suggestion.slice(firstWord.length + 1));
  };

  useEffect(() => {
    if (isAddingWord) {
      setIsAddingWord(false);
      return;
    }

    fetchSuggestion(text);
  }, [debouncedText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      appendSuggestion(suggestion);
    } else if (e.key === "ArrowRight" && e.metaKey && suggestion) {
      e.preventDefault();
      addFirstWord();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        handleSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText("");
      setSuggestion("");
    }
  };

  return (
    <div>
      <div className="flex gap-2 h-10">
        {error ? (
          <div className="mb-2 p-2 border rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            Error loading suggestions: {error}
          </div>
        ) : isLoading ? (
          <div className="mb-2 p-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800">
            Loading suggestions...
          </div>
        ) : completions && completions.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {completions.map((completion, index) => (
              <Button
                key={index}
                color="white"
                onClick={() => appendSuggestion(completion)}
                className="rounded-full"
              >
                {completion}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[100px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg"
            style={{ caretColor: "auto" }}
          />
          {suggestion && (
            <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words border">
              <span className="invisible">{text}</span>
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
    </div>
  );
}
