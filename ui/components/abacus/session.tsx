"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DictationQuestion {
  numbers: number[];
  answer: number;
  audio: string;
}

interface SessionProps {
  session: {
    digits: number;
    speed: string;
    dictation: DictationQuestion[];
  };
  onReset: () => void;
}

export function AbacusSession({ session, onReset }: SessionProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [userAnswers, setUserAnswers] = useState<string[]>(
    new Array(session.dictation.length).fill("")
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playQuestion = async (index: number) => {
    if (index >= session.dictation.length) {
      setIsPlaying(false);
      setShowAnswers(true);
      return;
    }

    const question = session.dictation[index];
    const audio = new Audio(`data:audio/mp3;base64,${question.audio}`);
    audioRef.current = audio;

    try {
      await audio.play();
      await new Promise((resolve) => {
        audio.onended = () => {
          setTimeout(resolve, 2000);
        };
      });

      setCurrentQuestion(index + 1);
      playQuestion(index + 1);
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  const startDictation = () => {
    setIsPlaying(true);
    setShowAnswers(false);
    setCurrentQuestion(0);
    setUserAnswers(new Array(session.dictation.length).fill(""));
    playQuestion(0);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {showAnswers ? "Results" : "Dictation Session"}
        </h2>
        <Button variant="outline" onClick={onReset}>
          New Session
        </Button>
      </div>

      {!isPlaying && !showAnswers && (
        <Button onClick={startDictation} className="w-full">
          Start Dictation
        </Button>
      )}

      <div className="grid gap-8">
        {session.dictation.map((question, index) => (
          <div key={index} className="space-y-4 p-4 border rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium">Question {index + 1}</div>
              {showAnswers && (
                <div className="text-sm text-muted-foreground">
                  Correct answer: {question.answer}
                </div>
              )}
            </div>

            <div className="flex justify-center mb-4">
              <div className="inline-flex flex-col items-end space-y-2 font-mono text-lg">
                {question.numbers.map((num, numIndex) => (
                  <div
                    key={numIndex}
                    className={`${num < 0 ? "text-red-500" : "text-green-500"}`}
                  >
                    {num.toString().padStart(6, "\u00A0")}
                  </div>
                ))}
                <div className="border-t border-border pt-2 font-bold">
                  {showAnswers &&
                    question.answer.toString().padStart(6, "\u00A0")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
