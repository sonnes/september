"use client";

import { DictationQuestion } from "@/types/dictation";
import { Heading } from "@/components/catalyst/heading";
import { PlayCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/catalyst/button";

interface QuestionCardProps {
  question: DictationQuestion;
  index: number;
  showAnswer?: boolean;
  isActive?: boolean;
}

export function QuestionCard({
  question,
  index,
  showAnswer = false,
  isActive,
}: QuestionCardProps) {
  const playAudio = (question: DictationQuestion) => {
    const audio = new Audio(question.audio);
    audio.play();
  };
  return (
    <div
      className={`p-4 border rounded-lg ${
        isActive ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <div className="space-y-4">
        <div className="flex justify-center items-start gap-2">
          <Heading
            level={3}
            className="text-orange-500 cursor-pointer"
            onClick={() => playAudio(question)}
          >
            #{index + 1}
          </Heading>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 gap-2 text-xl font-mono">
            {question.numbers.map((num, i) => (
              <div
                key={i}
                className={`text-right ${num < 0 ? "text-red-500" : ""}`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-center font-mono text-xl">
            = {question.answer}
          </div>
        </div>
      </div>
    </div>
  );
}
