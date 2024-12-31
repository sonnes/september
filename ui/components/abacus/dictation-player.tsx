"use client";

import { useState } from "react";
import { Button } from "@/components/catalyst/button";
import { Dictation } from "@/types/dictation";
import { QuestionCard } from "./question-card";

interface DictationPlayerProps {
  dictation: Dictation;
}

export function DictationPlayer({ dictation }: DictationPlayerProps) {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button color="blue" onClick={() => setShowAnswers(!showAnswers)}>
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dictation.questions.map((question, index) => (
          <QuestionCard
            key={index}
            question={question}
            index={index}
            showAnswer={showAnswers}
          />
        ))}
      </div>
    </div>
  );
}
