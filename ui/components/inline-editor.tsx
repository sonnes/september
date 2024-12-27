import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/catalyst/button";
import { useDebounce } from "@/hooks/useDebounce";

import type { Message } from "@/db/messages";

interface InlineEditorProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  history?: Message[];
}

export default function InlineEditor({
  onSubmit,
  placeholder = "Type something...",
  history = [],
}: InlineEditorProps) {
  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isAddingWord, setIsAddingWord] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedText = useDebounce(text, 300);

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
    const newText = text + suggestion;
    setText(newText);
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

    const lastWord = text.split(" ").pop() || "";
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
  );
}
