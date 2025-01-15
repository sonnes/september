"use client";
import React, { useState } from "react";
import CircularKeyboardCanvas from "@/components/circular/canvas";
import { Button } from "@/components/catalyst/button";

interface CircularKeyboardProps {
  onSubmit: (input: string) => void;
}

const CircularKeyboard = ({ onSubmit }: CircularKeyboardProps) => {
  const [dimensions] = useState({ width: 400, height: 400 });
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isUpperCase, setIsUpperCase] = useState(false);
  const [isNumberMode, setIsNumberMode] = useState(false);

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
        setIsNumberMode(!isNumberMode);
        break;
    }
  };

  const handleSubmit = () => {
    onSubmit(inputText);
    setInputText("");
  };

  return (
    <div className="relative flex gap-4 w-full max-w-4xl mx-auto">
      <CircularKeyboardCanvas
        dimensions={dimensions}
        isUpperCase={isUpperCase}
        isNumberMode={isNumberMode}
        hoveredSection={hoveredSection}
        onLetterClick={handleLetterClick}
        onControlClick={handleControlClick}
        onHover={setHoveredSection}
      />
      <div className="flex-1 relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full min-h-[100px] p-3 bg-transparent dark:bg-zinc-800 border rounded-lg"
          style={{ caretColor: "auto" }}
          placeholder="Type something..."
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={handleSubmit} color="dark/zinc">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CircularKeyboard;
