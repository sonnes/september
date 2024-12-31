import { Card } from "@/components/card";
import { DictationQuestion } from "@/types/dictation";
import { Heading } from "../catalyst/heading";

interface QuestionCardProps {
  question: DictationQuestion;
  index: number;
  showAnswer?: boolean;
}

export function QuestionCard({
  question,
  index,
  showAnswer = false,
}: QuestionCardProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex justify-center items-start">
          <Heading level={3} className="text-orange-500">
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

        {showAnswer && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-center font-mono text-xl">
              = {question.answer}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
