"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/catalyst/input";
import { Button } from "@/components/catalyst/button";

interface CircularKeyboardProps {
  onSubmit: (message: string) => void;
}

// Rearranged letters to match the image layout
const INNER_LETTERS = ["t", "c", "u", "m", "a", "o", "i", "e"];
const MIDDLE_LETTERS = [
  "d",
  "h",
  "j",
  "z",
  "q",
  "f",
  "p",
  "g",
  "w",
  "n",
  "s",
  "r",
];
const OUTER_LETTERS = ["v", "k", "x", "l", "b", "y"];

export default function CircularKeyboard({ onSubmit }: CircularKeyboardProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    setInputText((prev) => prev + letter);
  };

  const handleSpace = () => {
    setInputText((prev) => prev + " ");
  };

  const handleBackspace = () => {
    setInputText((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText.trim());
      setInputText("");
    }
  };

  const renderLetter = (
    letter: string,
    index: number,
    total: number,
    radius: number
  ) => {
    const angle = (index * 2 * Math.PI) / total;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    return (
      <button
        key={letter}
        onClick={() => handleLetterClick(letter)}
        className={cn(
          "absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2",
          "flex items-center justify-center",
          "text-white text-lg font-light",
          "hover:bg-zinc-700",
          selectedLetter === letter && "bg-zinc-600",
          "transition-colors duration-150"
        )}
        style={{
          left: `${x}%`,
          top: `${y}%`,
        }}
      >
        {letter}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Word suggestions */}
      <div className="flex gap-2">
        {["see", "have", "hear", "be", "know"].map((word) => (
          <button
            key={word}
            onClick={() => setInputText((prev) => prev + word + " ")}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors duration-150"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="relative w-[400px] h-[400px] bg-zinc-800 rounded-full">
        {/* Inner circle */}
        {INNER_LETTERS.map((letter, i) =>
          renderLetter(letter, i, INNER_LETTERS.length, 25)
        )}

        {/* Middle circle */}
        {MIDDLE_LETTERS.map((letter, i) =>
          renderLetter(letter, i, MIDDLE_LETTERS.length, 38)
        )}

        {/* Outer circle */}
        {OUTER_LETTERS.map((letter, i) =>
          renderLetter(letter, i, OUTER_LETTERS.length, 47)
        )}

        {/* Control bar */}
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-64 bg-zinc-700 rounded-full px-4 py-2 flex justify-between">
          <button className="p-2 text-white hover:bg-zinc-600 rounded transition-colors duration-150">
            ⇧
          </button>
          <button className="p-2 text-white hover:bg-zinc-600 rounded transition-colors duration-150">
            ☺
          </button>
          <button className="p-2 text-white hover:bg-zinc-600 rounded transition-colors duration-150">
            123
          </button>
          <button
            onClick={handleSpace}
            className="p-2 px-4 text-white hover:bg-zinc-600 rounded transition-colors duration-150"
          >
            ␣
          </button>
          <button
            onClick={handleBackspace}
            className="p-2 text-white hover:bg-zinc-600 rounded transition-colors duration-150"
          >
            ⌫
          </button>
        </div>
      </div>
      {/* Input display */}
      <div className="flex gap-2 items-center">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-[400px]"
        />
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
    </div>
  );
}
