"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/catalyst/button";
import { DictationQuestion } from "@/types/dictation";

interface DictationPlayerProps {
  questions: DictationQuestion[];
}

export function DictationPlayer({ questions }: DictationPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationsRef = useRef<number[]>([]);

  // Calculate total duration when component mounts
  useEffect(() => {
    const calculateTotalDuration = async () => {
      let total = 0;
      const durations: number[] = [];

      for (const question of questions) {
        const audio = new Audio(`data:audio/mp3;base64,${question.audio}`);
        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            durations.push(audio.duration);
            total += audio.duration + 2; // Add 2 seconds for the pause between questions
            resolve(null);
          });
        });
      }
      durationsRef.current = durations;
      setTotalDuration(Math.ceil(total));
    };

    calculateTotalDuration();
  }, [questions]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const playQuestion = async (index: number) => {
    if (index >= questions.length) {
      setIsPlaying(false);
      setCurrentProgress(totalDuration);
      return;
    }

    const question = questions[index];
    const audio = new Audio(`data:audio/mp3;base64,${question.audio}`);
    audioRef.current = audio;

    try {
      // Calculate base progress (sum of previous questions' durations + pauses)
      const baseProgress = durationsRef.current
        .slice(0, index)
        .reduce((sum, duration) => sum + duration + 2, 0);

      // Update progress as audio plays
      audio.addEventListener("timeupdate", () => {
        const currentProgress = baseProgress + audio.currentTime;
        setCurrentProgress(currentProgress);
      });

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
    setCurrentQuestion(0);
    setElapsedTime(0);
    setCurrentProgress(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    playQuestion(0);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isPlaying]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4">
        <Button
          color="amber"
          onClick={startDictation}
          disabled={isPlaying}
          className="min-w-[48px] h-[48px] p-0 flex items-center justify-center"
        >
          {isPlaying ? "Playing..." : "Start"}
        </Button>

        <div className="flex-1 mx-8">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  totalDuration ? (currentProgress / totalDuration) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="text-lg font-bold">{formatTime(elapsedTime)}</div>
      </div>
    </div>
  );
}
