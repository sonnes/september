"use client";
import React, { useState } from "react";
import CircularKeyboardFiber from "@/components/circular/fiber";
import { Button } from "@/components/catalyst/button";

interface CircularKeyboardProps {
  onSubmit: (input: string) => void;
}

const CircularKeyboard = ({ onSubmit }: CircularKeyboardProps) => {
  const [dimensions] = useState({ width: 500, height: 400 });
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isUpperCase, setIsUpperCase] = useState(false);
  const [isNumberMode, setIsNumberMode] = useState(false);
  const [isSmileyMode, setIsSmileyMode] = useState(false);

  const handleLetterClick = (letter: string) => {
    setInputText((prev) => prev + letter);
  };

  const handleControlClick = (control: string) => {
    switch (control) {
      case "⇧":
        setIsUpperCase(!isUpperCase);
        break;
      case "⎵":
        setInputText((prev) => prev + " ");
        break;
      case "⌫":
        setInputText((prev) => prev.slice(0, -1));
        break;
      case "return":
        setInputText((prev) => prev + "\n");
        break;
      case "123":
        setIsNumberMode(true);
        setIsSmileyMode(false);
        break;
      case "ABC":
        setIsNumberMode(false);
        setIsSmileyMode(false);
        break;
      case "☺":
        setIsSmileyMode(true);
        setIsNumberMode(false);
        break;
    }
  };

  const handleSubmit = () => {
    onSubmit(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl mx-auto">
      <div className="shrink-0">
        <CircularKeyboardFiber />
      </div>
      <div className="flex-1 flex flex-col min-w-[300px]">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full flex-1 min-h-[100px] lg:min-h-[400px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg resize-none focus:outline-hidden focus:ring-2 focus:ring-red-200 focus:border-transparent"
          style={{ caretColor: "auto" }}
          placeholder="Type something..."
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={handleSubmit} color="red">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CircularKeyboard;
