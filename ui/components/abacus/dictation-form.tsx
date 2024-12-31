"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/card";
import { RadioGroup, RadioField, Radio } from "@/components/catalyst/radio";
import { Input } from "@/components/catalyst/input";
import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";

const digitOptions = [
  { value: "1", label: "1 Digit" },
  { value: "2", label: "2 Digits" },
  { value: "3", label: "3 Digits" },
  { value: "4", label: "4 Digits" },
];

const speedOptions = [
  { value: "slow", label: "Slow" },
  { value: "medium", label: "Medium" },
  { value: "fast", label: "Fast" },
];

export function DictationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    digits: 1,
    speed: "medium",
    numberCount: 5,
    questionCount: 5,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dictation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate dictation");
      }

      router.push(`/abacus/dictation/${data.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate dictation";
      setError(`${message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <RadioGroup
              value={formData.digits.toString()}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, digits: Number(value) }))
              }
              className="mt-2"
            >
              <Field>
                <Label>Number of Digits</Label>
                <div className="mt-2">
                  {digitOptions.map((option) => (
                    <RadioField key={option.value}>
                      <Radio value={option.value} />
                      <Label>{option.label}</Label>
                    </RadioField>
                  ))}
                </div>
              </Field>
            </RadioGroup>
          </div>

          <div>
            <RadioGroup
              value={formData.speed}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, speed: value }))
              }
              className="mt-2"
            >
              <Field>
                <Label>Speed</Label>
                <div className="mt-2">
                  {speedOptions.map((option) => (
                    <RadioField key={option.value}>
                      <Radio value={option.value} />
                      <Label>{option.label}</Label>
                    </RadioField>
                  ))}
                </div>
              </Field>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Numbers per Question</Label>
              <Input
                type="number"
                value={formData.numberCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    numberCount: Number(e.target.value),
                  }))
                }
                min="1"
                className="mt-2"
              />
            </Field>

            <Field>
              <Label>Number of Questions</Label>
              <Input
                type="number"
                value={formData.questionCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    questionCount: Number(e.target.value),
                  }))
                }
                min="1"
                className="mt-2"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          color="blue"
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Dictation"}
        </Button>
      </form>
    </Card>
  );
}
