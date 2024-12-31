import { Dictation, DictationQuestion } from "@/types/dictation";
import { randomUUID } from "crypto";
import { ElevenLabsClient } from "elevenlabs";
import { saveDictation } from "@/db/dictations";

interface DictationRequest {
  digits: 1 | 2 | 3 | 4;
  speed: "slow" | "medium" | "fast";
  numberCount: number;
  questionCount: number;
}

// Speed to break time mapping (in seconds)
const speedBreakTime = {
  slow: 2.0,
  medium: 1.0,
  fast: 0.5,
};

function generateNumber(digits: number): number {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(
  digits: number,
  numberCount: number
): DictationQuestion {
  let numbers: number[] = [];
  let sum = 0;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops

  while (numbers.length < numberCount && attempts < maxAttempts) {
    attempts++;
    const remaining = numberCount - numbers.length;
    const isLast = remaining === 1;

    if (isLast && sum <= 0) {
      // If it's the last number and sum is not positive, add a positive number
      const num = generateNumber(digits);
      numbers.push(num);
      sum += num;
    } else {
      // Randomly decide if number should be negative
      const shouldBeNegative = Math.random() < 0.5 && sum > 0;
      const num = generateNumber(digits) * (shouldBeNegative ? -1 : 1);

      // Only add if it won't make the final sum negative
      if (!isLast || (isLast && sum + num > 0)) {
        numbers.push(num);
        sum += num;
      }
    }
  }

  // Ensure we have enough numbers
  while (numbers.length < numberCount) {
    const num = generateNumber(digits);
    numbers.push(num);
    sum += num;
  }

  console.log("Generated numbers:", numbers, "with sum:", sum);

  return {
    numbers,
    answer: sum,
  };
}

async function generateAudio(
  numbers: number[],
  breakTime: number
): Promise<string> {
  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVEN_LABS_API_KEY,
  });

  // Create text with SSML breaks
  const text = numbers
    .map((n) => n.toString())
    .join(` <break time="${breakTime}s" />`);

  const voiceId = "3vXjdKMDgxJoOLbElGxC";

  try {
    const response = await client.textToSpeech.convert(voiceId, {
      text: `${text}. <break time="1s" /> Answer is.`,
      model_id: "eleven_turbo_v2",
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.1,
        style: 0,
      },
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString("base64");
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DictationRequest;
    const { digits, speed, numberCount, questionCount } = body;

    // Add validation
    if (
      !numberCount ||
      !questionCount ||
      numberCount < 1 ||
      questionCount < 1
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid parameters",
          details: "Number count and question count must be greater than 0",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate questions with logging
    console.log("Generating questions with params:", {
      digits,
      numberCount,
      questionCount,
    });

    const questions: DictationQuestion[] = Array(questionCount)
      .fill(null)
      .map(() => {
        const question = generateQuestion(digits, numberCount);
        console.log("Generated question:", question);
        return question;
      });

    // Generate audio for all questions in parallel
    const breakTime = speedBreakTime[speed];
    const audioPromises = questions.map((q) =>
      generateAudio(q.numbers, breakTime)
    );
    const audioResults = await Promise.all(audioPromises);

    // Combine questions with audio
    const questionsWithAudio = questions.map((q, i) => ({
      ...q,
      audio: audioResults[i],
    }));

    const dictation: Dictation = {
      id: randomUUID(),
      digits,
      speed,
      numbers: numberCount,
      questions: questionsWithAudio,
      createdAt: new Date(),
    };

    // Save the dictation to cache
    saveDictation(dictation);

    return new Response(JSON.stringify(dictation), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in abacus API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate dictation",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
