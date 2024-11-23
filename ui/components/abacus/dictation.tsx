"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AbacusSession } from "./session";

interface DictationOptions {
  digits: 1 | 2 | 3 | 4;
  speed: "slow" | "medium" | "fast";
  numberCount: number;
  questionCount: number;
}

interface DictationQuestion {
  numbers: number[];
  answer: number;
  audio: string;
}

interface DictationResponse {
  digits: number;
  speed: string;
  dictation: DictationQuestion[];
}

export function AbacusDictation() {
  const [options, setOptions] = useState<DictationOptions>({
    digits: 1,
    speed: "medium",
    numberCount: 5,
    questionCount: 3,
  });
  const [session, setSession] = useState<DictationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSession = async () => {
    setIsLoading(true);
    try {
      console.log("Sending request with options:", options);
      const response = await fetch("/api/abacus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received response:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      setSession(data);
    } catch (error) {
      console.error("Failed to generate session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="grid gap-6">
          <div className="space-y-4">
            <Label>Digits</Label>
            <RadioGroup
              value={options.digits.toString()}
              onValueChange={(value: string) =>
                setOptions((prev) => ({
                  ...prev,
                  digits: parseInt(value) as DictationOptions["digits"],
                }))
              }
              className="grid grid-cols-4 gap-4"
            >
              {[1, 2, 3, 4].map((digit) => (
                <div key={digit} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={digit.toString()}
                    id={`digit-${digit}`}
                  />
                  <Label htmlFor={`digit-${digit}`}>{digit} Digit</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Speed</Label>
            <RadioGroup
              value={options.speed}
              onValueChange={(value: string) =>
                setOptions((prev) => ({
                  ...prev,
                  speed: value as DictationOptions["speed"],
                }))
              }
              className="grid grid-cols-3 gap-4"
            >
              {["slow", "medium", "fast"].map((speed) => (
                <div key={speed} className="flex items-center space-x-2">
                  <RadioGroupItem value={speed} id={`speed-${speed}`} />
                  <Label htmlFor={`speed-${speed}`} className="capitalize">
                    {speed}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="numberCount">Numbers per Question</Label>
              <Input
                id="numberCount"
                type="number"
                min={1}
                max={20}
                value={options.numberCount}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    numberCount: Math.min(
                      20,
                      Math.max(1, parseInt(e.target.value) || 1)
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={20}
                value={options.questionCount}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    questionCount: Math.min(
                      20,
                      Math.max(1, parseInt(e.target.value) || 1)
                    ),
                  }))
                }
              />
            </div>
          </div>
        </div>

        <Button
          onClick={generateSession}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Dictation Session"}
        </Button>
      </div>

      {session && (
        <div className="space-y-6">
          <AbacusSession session={session} onReset={() => setSession(null)} />
        </div>
      )}
    </div>
  );
}
