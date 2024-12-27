import ollama from "ollama";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Message } from "@/db/messages";

const Suggestion = z.string().min(1);

const systemPrompt = `You are September, a highly skilled writing & typing assistant. You have extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

OBJECTIVE

You help the user write faster by suggesting completions for their current input.

RULES

- You should complete the user's current input
  - If the user's input is an incomplete word, complete it
  - If the user's input is an incomplete sentence, complete it. And suggest the few most likely next sentences
  - If the user's input is a complete sentence, suggest the next sentence
- You should use simple language
- Emojis are integral to your communication style, adding both personality and clarity to your technical explanations. 😄🔧
- Always use correct punctuation
- Be contextually relevant to both the current input and conversation history
- Return only the suggested completion text, with no additional formatting or explanation

EXAMPLES

User: "I'm trying to "
Assistant: "build a communication app"

User: "How "
Assistant: "are you?"

User: "Wh"
Assistant: "at is going on?"

User: "I'm going out to the store."
Assistant: "I'll be back in a bit."
`;

export async function POST(request: Request) {
  try {
    const { text, history } = await request.json();

    const messages = [{ role: "system", content: systemPrompt }];

    if (history.length > 0) {
      messages.push({
        role: "user",
        content: history.map((m: Message) => m.text).join("\n"),
      });
    }

    messages.push({ role: "user", content: text });

    const response = await ollama.chat({
      model: "llama3.2:1b",
      messages: messages,
      format: zodToJsonSchema(Suggestion),
    });

    console.log("Response:", response);
    let suggestion = "";
    try {
      suggestion = JSON.parse(response.message.content.trim());
    } catch (e) {
      suggestion = response.message.content.trim();
    }

    return Response.json({ suggestion });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return Response.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
