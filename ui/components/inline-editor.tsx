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
  const [cursorPosition, setCursorPosition] = useState(0);
  const [skipNextSuggestion, setSkipNextSuggestion] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedText = useDebounce(text, 300);

  useEffect(() => {
    if (!debouncedText.trim() || skipNextSuggestion) {
      setSuggestion("");
      setSkipNextSuggestion(false);
      return;
    }

    const fetchSuggestion = async () => {
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

    fetchSuggestion();
  }, [debouncedText, history, skipNextSuggestion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      const newText = text + suggestion;
      setText(newText);
      setSuggestion("");
    } else if (e.key === "ArrowRight" && e.metaKey && suggestion) {
      e.preventDefault();
      const firstWord = suggestion.split(" ")[0];
      setSkipNextSuggestion(true);
      setText(text + firstWord + " ");
      setSuggestion("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPosition(e.target.selectionStart);
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
          className="w-full min-h-[100px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg resize-y"
          style={{ caretColor: "auto" }}
        />
        {suggestion && (
          <div className="absolute top-0 left-0 w-full min-h-[100px] p-3 pointer-events-none text-zinc-400 dark:text-zinc-500 whitespace-pre-wrap break-words">
            <span className="text-zinc-50">{text}</span>
            <span className="text-zinc-400 dark:text-zinc-500">
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
